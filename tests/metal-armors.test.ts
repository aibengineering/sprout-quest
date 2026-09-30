import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { GEAR } from '../src/data';
import coppermail from '../src/crafting/items/coppermail';
import ironplate from '../src/crafting/items/ironplate';
import crystalmail from '../src/crafting/items/crystalmail';

const armors = ['coppermail', 'ironplate', 'crystalmail'] as const;
const recipes = { coppermail: { copper: 12, stone: 8 }, ironplate: { iron: 8, copper: 6, stone: 6, pine: 3 }, crystalmail: { crystal: 14, iron: 4, stone: 6 } };
const presentations = [coppermail, ironplate, crystalmail];

describe('ingredient-led ore armor assets', () => {
  test('the existing recipe economy is preserved', () => {
    for (const id of armors) expect(GEAR[id].recipe).toEqual(recipes[id]);
  });

  test('all real ingredients have visible destinations and all parts settle before the reveal', () => {
    for (const definition of presentations) {
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${definition.id}.json`, 'utf8'));
      const recipe = GEAR[definition.id].recipe!;
      expect(definition.layers.map((layer) => layer.id)).toEqual(manifest.stack);
      for (const material of Object.keys(recipe)) {
        expect((definition.roles as Record<string, string>)[material]?.length).toBeGreaterThan(0);
        expect(definition.targets.some((target) => target.material === material)).toBe(true);
      }
      const reveal = definition.phases.find((phase) => phase.stage === 'reveal')!;
      expect(definition.phases[0].at).toBe(0);
      expect(definition.duration - reveal.at).toBeGreaterThanOrEqual(600);
      for (const layer of definition.layers) {
        expect(definition.targets.some((target) => target.part === layer.id)).toBe(true);
        expect(layer.src).toBe(manifest.parts[layer.id].src);
      }
      for (const target of definition.targets) {
        expect(target.at + target.duration).toBeLessThan(reveal.at);
        expect(Object.keys(recipe)).toContain(target.material);
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(1);
        expect(target.y).toBeGreaterThan(0);
        expect(target.y).toBeLessThan(1);
      }
    }
  });

  test('registered layers have transparent 512px canvases, no clipped silhouettes, and bounded downloads', () => {
    for (const id of armors) {
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8'));
      expect(manifest.size).toEqual([512, 512]);
      expect(manifest.stack).toHaveLength(5);
      let bytes = 0;
      for (const layer of [...manifest.stack, 'complete']) {
        const part = manifest.parts[layer];
        const data = readFileSync(`public/${part.src}`);
        bytes += data.length;
        expect(data.toString('ascii', 0, 4)).toBe('RIFF');
        expect(data.toString('ascii', 8, 12)).toBe('WEBP');
        expect(data.toString('ascii', 12, 16)).toBe('VP8X');
        expect(data[20] & 0x10).toBe(0x10); // Alpha flag.
        expect([data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1]).toEqual([512, 512]);
        const [x0, y0, x1, y1] = part.bounds;
        expect(x0).toBeGreaterThan(0);
        expect(y0).toBeGreaterThan(0);
        expect(x1).toBeLessThan(512);
        expect(y1).toBeLessThan(512);
        expect(part.center[0]).toBeCloseTo((x0 + x1) / 1024, 3);
        expect(part.center[1]).toBeCloseTo((y0 + y1) / 1024, 3);
      }
      expect(bytes).toBeLessThan(80 * 1024);
    }
  });

  test('optimized equipped models retain the animated attachment rig and cel-shader attributes', () => {
    for (const id of armors) {
      const data = readFileSync(`public/assets/models/hero_${id}.glb`);
      expect(data.length).toBeLessThan(140 * 1024);
      expect(data.readUInt32LE(0)).toBe(0x46546c67);
      const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8'));
      expect(gltf.extensionsRequired).toContain('EXT_meshopt_compression');
      const names = gltf.nodes.map((node: { name?: string }) => node.name);
      for (const pivot of ['hero', 'bodyPivot', 'head', 'arm-1', 'arm1', 'foot-1', 'foot1']) expect(names).toContain(pivot);
      expect(gltf.animations.map((a: { name: string }) => a.name).sort()).toEqual(['idle', 'walk']);
      for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
        // gltfpack removes all-white COLOR_0 (eye highlights); the renderer
        // intentionally fills absent base color with white.
        expect(primitive.attributes.COLOR_1).toBeDefined();
      }
      expect(gltf.meshes.some((mesh: { primitives: { attributes: { COLOR_0?: number } }[] }) => mesh.primitives.some((p) => p.attributes.COLOR_0 !== undefined))).toBe(true);
      for (const arm of ['arm-1', 'arm1']) {
        const index = names.indexOf(arm);
        // Shoulder guards and hands travel together; weaponPose attaches to this exact arm.
        expect(gltf.nodes[index].children.length).toBeGreaterThanOrEqual(3);
        for (const animation of gltf.animations) expect(animation.channels.some((c: { target: { node: number; path: string } }) => c.target.node === index && c.target.path === 'rotation')).toBe(true);
      }
    }
  });
});
