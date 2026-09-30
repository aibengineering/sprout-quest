import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { Box3, Color, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GEAR } from '../../src/data';
import { weaponLength, hammerHead } from '../../src/weaponPose';
import emberblade from '../../src/crafting/items/emberblade';
import wyrmbreaker from '../../src/crafting/items/wyrmbreaker';
import dragontail from '../../src/crafting/items/dragontail';
import wyrmfire from '../../src/crafting/items/wyrmfire';
import type { CraftPresentation } from '../../src/crafting/types';

const ids = ['emberblade', 'wyrmbreaker', 'dragontail', 'wyrmfire'] as const;
const recipes = {
  emberblade: { ember: 8, horn: 4, crystal: 4, iron: 4 },
  wyrmbreaker: { scale: 3, ember: 6, crystal: 4, iron: 6 },
  dragontail: { scale: 3, ember: 6, horn: 4, pine: 6 },
  wyrmfire: { scale: 2, horn: 4, ember: 6, crystal: 3 },
};

describe('legendary weapon ingredient art', () => {
  test('assembly definitions cover the real ingredients and leave a quiet final lift after all contacts', () => {
    for (const item of [emberblade, wyrmbreaker, dragontail, wyrmfire] as CraftPresentation[]) {
      expect(Object.keys(item.roles).sort()).toEqual(Object.keys(GEAR[item.id].recipe!).sort());
      expect([...new Set(item.targets.map(t => String(t.material)))].sort()).toEqual(Object.keys(item.roles).sort());
      expect(item.layers.map(l => l.id)).toEqual(JSON.parse(readFileSync(`public/assets/crafting/${item.id}.json`, 'utf8')).stack);
      const reveal = item.phases.find(p => p.stage === 'reveal')!;
      expect(reveal.at).toBeGreaterThan(Math.max(...item.targets.map(t => t.at + t.duration)));
      expect(item.duration - reveal.at).toBeGreaterThanOrEqual(500);
      expect(item.duration).toBeLessThanOrEqual(3400);
      expect(item.phases[0].at).toBe(0);
      for (let i = 1; i < item.phases.length; i++) expect(item.phases[i].at).toBeGreaterThan(item.phases[i - 1].at);
      for (const t of item.targets) {
        expect(item.layers.some(l => l.id === t.part)).toBe(true);
        expect(t.x).toBeGreaterThan(0); expect(t.x).toBeLessThan(1);
        expect(t.y).toBeGreaterThan(0); expect(t.y).toBeLessThan(1);
        expect(t.duration).toBeGreaterThan(0);
      }
    }
  });

  test('all four craftable tier-five weapons retain their recipes and each material has a visible layer', () => {
    expect(Object.values(GEAR).filter(g => g.slot === 'weapon' && g.tier === 5 && g.recipe).map(g => g.id)).toEqual([...ids]);
    for (const id of ids) {
      expect(GEAR[id].recipe).toEqual(recipes[id]);
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8'));
      expect(manifest.size).toEqual([512, 512]);
      expect([...manifest.stack].sort()).toEqual(Object.keys(recipes[id]).sort());
      let total = 0;
      for (const [part, layer] of Object.entries(manifest.parts) as [string, any][]) {
        expect(layer.src).toBe(`assets/crafting/${id}-${part}.webp`);
        const path = `public/${layer.src}`, bytes = readFileSync(path);
        expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
        const format = bytes.toString('ascii', 12, 16);
        expect(['VP8X', 'VP8L']).toContain(format);
        const lossless = format === 'VP8L' ? bytes.readUInt32LE(21) : 0;
        const dimensions = format === 'VP8L'
          ? [(lossless & 0x3fff) + 1, ((lossless >>> 14) & 0x3fff) + 1]
          : [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
        expect(dimensions).toEqual([512, 512]);
        expect(bytes.byteLength).toBeLessThan(100 * 1024);
        total += bytes.byteLength;
        const [x0, y0, x1, y1] = layer.bounds;
        expect(x0).toBeGreaterThan(0); expect(y0).toBeGreaterThan(0);
        expect(x1).toBeLessThan(512); expect(y1).toBeLessThan(512);
        expect(x1).toBeGreaterThan(x0); expect(y1).toBeGreaterThan(y0);
      }
      expect(total).toBeLessThan(250 * 1024);
    }
  });

  test('compressed equipped models decode, preserve +X rig dimensions, and remain within mobile budgets', async () => {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    for (const id of ids) {
      const path = `public/assets/models/wpn_${id}.glb`;
      expect(statSync(path).size).toBeLessThan(70 * 1024);
      const bytes = readFileSync(path);
      const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      gltf.scene.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(gltf.scene);
      expect(bounds.min.x).toBeLessThan(0);
      expect(bounds.min.x).toBeGreaterThan(-.23);
      const tip = { emberblade: 1.15, wyrmbreaker: 1.4, dragontail: .49, wyrmfire: 1.06 }[id];
      expect(bounds.max.x).toBeCloseTo(tip, 1);
      let triangles = 0, gripTriangles = 0;
      gltf.scene.traverse(o => {
        if (!(o instanceof Mesh)) return;
        const g = o.geometry;
        expect(g.getAttribute('color')).toBeDefined();
        const p = g.getAttribute('position');
        triangles += (g.index?.count ?? p.count) / 3;
        if (id === 'dragontail') for (let i = 0; i < (g.index?.count ?? p.count); i += 3) {
          const vertices = [0, 1, 2].map(k => g.index ? g.index.getX(i + k) : i + k);
          const color = g.getAttribute('color'), coil = new Color('#c83a3a');
          const k = vertices[0];
          const isCoil = Math.hypot(color.getX(k) - coil.r, color.getY(k) - coil.g, color.getZ(k) - coil.b) < .025;
          if (!isCoil && vertices.every(k => new Vector3().fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld).x <= .225)) gripTriangles++;
        }
      });
      expect(triangles).toBeLessThan(10000);
      if (id === 'dragontail') expect(gripTriangles).toBeGreaterThan(100);
      if (id !== 'dragontail') expect(weaponLength(GEAR[id])).toBe(tip);
      if (id === 'wyrmbreaker') expect(hammerHead(GEAR[id])).toBe(1.05);
    }
  });
});
