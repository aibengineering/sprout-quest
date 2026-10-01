import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { Box3, Color, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GEAR } from '../src/data';
import { hammerHead, weaponLength } from '../src/weaponPose';
import crystalsword from '../src/crafting/items/crystalsword';
import crystalhammer from '../src/crafting/items/crystalhammer';
import glimmerwhip from '../src/crafting/items/glimmerwhip';
import glimmerwand from '../src/crafting/items/glimmerwand';
const presentations = [crystalsword, crystalhammer, glimmerwhip, glimmerwand];

const ids = ['crystalsword', 'crystalhammer', 'glimmerwhip', 'glimmerwand'] as const;
const expected = {
  crystalsword: { crystal: 10, iron: 9, glimwood: 6 },
  crystalhammer: { crystal: 12, iron: 9 },
  glimmerwhip: { glimmer: 24, core: 1 },
  glimmerwand: { glimmer: 21, core: 1 },
};

/** Read the dimensions of the canonical alpha WebP, without requiring a browser/image library. */
function webpSize(path: string) {
  const b = readFileSync(path);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  for (let p = 12; p < b.length;) {
    const tag = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4);
    if (tag === 'VP8X') return [b.readUIntLE(p + 12, 3) + 1, b.readUIntLE(p + 15, 3) + 1];
    if (tag === 'VP8L') { const v = b.readUInt32LE(p + 9); return [(v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1]; }
    if (tag === 'VP8 ') return [b.readUInt16LE(p + 14) & 0x3fff, b.readUInt16LE(p + 16) & 0x3fff];
    p += 8 + n + (n % 2);
  }
  throw new Error(`No image dimensions: ${path}`);
}

describe('crystal/glimmer weapon assets', () => {
  test('recipes remain the existing ingredient quantities', () => {
    for (const id of ids) expect(GEAR[id].recipe).toEqual(expected[id]);
  });

  test('automatic sequences account for every ingredient and settle before reveal', () => {
    for (const presentation of presentations) {
      const recipe = GEAR[presentation.id].recipe!;
      const layers = new Set(presentation.layers.map(l => l.id));
      const reveal = presentation.phases.find(p => p.stage === 'reveal')!;
      expect(presentation.phases[0].at).toBe(0);
      expect(reveal.at).toBeLessThan(presentation.duration - 400);
      expect(Object.keys(presentation.roles).sort()).toEqual(Object.keys(recipe).sort());
      expect([...new Set(presentation.targets.map(t => String(t.material)))].sort()).toEqual(Object.keys(recipe).sort());
      for (const target of presentation.targets) {
        expect(layers.has(target.part)).toBe(true);
        expect(target.at + target.duration + 350).toBeLessThanOrEqual(reveal.at);
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(1);
        expect(target.y).toBeGreaterThan(0);
        expect(target.y).toBeLessThan(1);
      }
      for (const layer of presentation.layers) {
        expect(presentation.targets.some(t => t.part === layer.id)).toBe(true);
        expect(Bun.file(`public/${layer.src}`).size).toBeGreaterThan(0);
      }
    }
  });

  test('layers share 512px registration and stay within the item asset budget', () => {
    let bytes = 0;
    for (const id of ids) {
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8'));
      expect(manifest.size).toEqual([512, 512]);
      expect(manifest.stack.length).toBeGreaterThanOrEqual(3);
      for (const part of [...manifest.stack, 'complete']) {
        const entry = manifest.parts[part];
        expect(webpSize(`public/${entry.src}`)).toEqual([512, 512]);
        const [x0, y0, x1, y1] = entry.bounds;
        expect(x0).toBeGreaterThan(0);
        expect(y0).toBeGreaterThan(0);
        expect(x1).toBeLessThan(512);
        expect(y1).toBeLessThan(512);
        expect(entry.center[0]).toBeCloseTo((x0 + x1) / 1024, 3);
        expect(entry.center[1]).toBeCloseTo((y0 + y1) / 1024, 3);
        bytes += statSync(`public/${entry.src}`).size;
      }
      expect(webpSize(`public/assets/icons/${id}.webp`)).toEqual([128, 128]);
    }
    // No shared atlas growth; these layers load only for their item.
    expect(bytes).toBeLessThan(350_000);
  });

  test('compressed equipped meshes retain the attachment axis and cel attributes', async () => {
    let totalBytes = 0;
    for (const id of ids) {
      const path = `public/assets/models/wpn_${id}.glb`;
      totalBytes += statSync(path).size;
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await Bun.file(path).arrayBuffer(), '');
      const bounds = new Box3().setFromObject(gltf.scene);
      const meshes: Mesh[] = [];
      gltf.scene.traverse(o => { if ((o as Mesh).isMesh) meshes.push(o as Mesh); });
      expect(meshes.length).toBeGreaterThan(0);
      let triangles = 0;
      let coreInWhipGrip = false;
      const mint = new Color('#91e9dd');
      for (const mesh of meshes) {
        const g = mesh.geometry, p = g.getAttribute('position'), c = g.getAttribute('color');
        expect(c).toBeDefined();
        expect(g.getAttribute('color_1')).toBeDefined();
        triangles += (g.index?.count ?? p.count) / 3;
        for (let i = 0; i < p.count; i++) {
          const color = new Color(c.getX(i), c.getY(i), c.getZ(i));
          expect(Math.hypot(color.r - 1, color.g, color.b - 1)).toBeGreaterThan(.02);
          if (id === 'glimmerwhip' && new Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).x < .225 && Math.hypot(color.r - mint.r, color.g - mint.g, color.b - mint.b) < .025) coreInWhipGrip = true;
        }
      }
      expect(triangles).toBeLessThan(5000);
      if (id === 'crystalsword' || id === 'glimmerwand') expect(bounds.max.x).toBeCloseTo(weaponLength(GEAR[id]), 3);
      if (id === 'crystalhammer') {
        expect(bounds.max.x).toBeCloseTo(hammerHead(GEAR[id]) + .20, 3);
        expect(bounds.max.y + bounds.min.y).toBeCloseTo(0, 3);
      }
      if (id === 'glimmerwhip') expect(coreInWhipGrip).toBe(true);
      expect(bounds.min.x).toBeLessThan(0);
    }
    expect(totalBytes).toBeLessThan(60_000);
  });
});
