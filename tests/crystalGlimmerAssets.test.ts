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
      }
      for (const layer of presentation.layers) {
        expect(presentation.targets.some(t => t.part === layer.id)).toBe(true);
      }
    }
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
