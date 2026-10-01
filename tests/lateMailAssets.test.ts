import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { GEAR } from '../src/data';
import magmamail from '../src/crafting/items/magmamail';
import dragonmail from '../src/crafting/items/dragonmail';

const presentations = { magmamail, dragonmail };

const expected = {
  magmamail: { recipe: { ember: 42, horn: 8, crystal: 12, iron: 12 }, def: 24, hp: 34,
    parts: ['iron-shell', 'ember-seams', 'left-horns', 'right-horns', 'crystal-clasps'] },
  dragonmail: { recipe: { scale: 4, ember: 24, crystal: 12, iron: 18 }, def: 30, hp: 50,
    parts: ['iron-shell', 'back-scales', 'front-scales', 'left-mantle', 'right-mantle', 'ember-seams', 'crystal-clasps'] },
};

describe('ingredient-built late armor assets', () => {
  for (const [id, item] of Object.entries(expected)) {
    test(`${id} gives every recipe material an automatic, finite assembly destination`, () => {
      const spec = presentations[id as keyof typeof presentations];
      const ids = spec.layers.map((layer) => layer.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(Object.keys(spec.roles).sort()).toEqual(Object.keys(item.recipe).sort());
      expect([...new Set(spec.targets.map((target) => String(target.material)))].sort()).toEqual(Object.keys(item.recipe).sort());
      const reveal = spec.phases.find((phase) => phase.stage === 'reveal')!;
      expect(spec.phases[0].at).toBe(0);
      for (let i = 1; i < spec.phases.length; i++) expect(spec.phases[i].at).toBeGreaterThan(spec.phases[i - 1].at);
      for (const target of spec.targets) {
        expect(ids).toContain(target.part);
        expect(target.at).toBeGreaterThanOrEqual(0);
        expect(target.duration).toBeGreaterThan(0);
        expect(target.at + target.duration).toBeLessThan(reveal.at);
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(1);
        expect(target.y).toBeGreaterThan(0);
        expect(target.y).toBeLessThan(1);
      }
      expect(spec.duration - reveal.at).toBeGreaterThanOrEqual(600);
      expect(spec.duration).toBeLessThanOrEqual(4500);
      // All crystals set their chunky clasps in one assembly step, instead of six
      // separate clipped specks; the recipe quantity is allocated to that one contact.
      expect(spec.targets.filter((target) => target.material === 'crystal').map((target) => target.part))
        .toEqual(['crystal-clasps']);
      expect(spec.layers.some((layer) => 'clip' in layer)).toBe(false);
      for (const layer of spec.layers) expect(readFileSync(`public/${layer.src}`).length).toBeGreaterThan(0);
    });
    test(`${id} preserves the recipe and combat balance`, () => {
      expect(GEAR[id].recipe).toEqual(item.recipe);
      expect(GEAR[id].def).toBe(item.def);
      expect(GEAR[id].hp).toBe(item.hp);
    });

    test(`${id} layers stay on one registered canvas within the mobile download budget`, () => {
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8'));
      expect(manifest.size).toEqual([512, 512]);
      expect(manifest.stack).toEqual(item.parts);
      expect(Object.keys(manifest.parts).sort()).toEqual([...item.parts, 'complete'].sort());
      let bytes = 0;
      for (const [name, raw] of Object.entries(manifest.parts)) {
        const part = raw as { src: string; center: number[]; bounds: number[] };
        expect(part.src).toBe(`assets/crafting/${id}-${name}.webp`);
        const file = readFileSync(`public/${part.src}`);
        expect(file.toString('ascii', 0, 4)).toBe('RIFF');
        expect(file.toString('ascii', 8, 12)).toBe('WEBP');
        // VP8X carries the uncropped WebP canvas, regardless of this part's alpha bounds.
        expect(file.toString('ascii', 12, 16)).toBe('VP8X');
        expect(file.readUIntLE(24, 3) + 1).toBe(512);
        expect(file.readUIntLE(27, 3) + 1).toBe(512);
        const [x0, y0, x1, y1] = part.bounds;
        expect(x0).toBeGreaterThan(0);
        expect(y0).toBeGreaterThan(0);
        expect(x1).toBeLessThan(512);
        expect(y1).toBeLessThan(512);
        expect(x1).toBeGreaterThan(x0);
        expect(y1).toBeGreaterThan(y0);
        expect(part.center[0]).toBeCloseTo((x0 + x1) / 1024, 3);
        expect(part.center[1]).toBeCloseTo((y0 + y1) / 1024, 3);
        bytes += file.length;
      }
      expect(bytes).toBeLessThan(160_000);
      expect(statSync(`public/assets/icons/${id}.webp`).size).toBeLessThan(16_000);
    });

    test(`${id} equipped model retains the animated hero and weapon pivots`, () => {
      const file = readFileSync(`public/assets/models/hero_${id}.glb`);
      expect(file.toString('ascii', 0, 4)).toBe('glTF');
      expect(file.length).toBeLessThan(128_000);
      const gltf = JSON.parse(file.toString('utf8', 20, 20 + file.readUInt32LE(12)));
      const names = gltf.nodes.map((node: { name?: string }) => node.name);
      for (const joint of ['hero', 'bodyPivot', 'head', 'arm-1', 'arm1', 'foot-1', 'foot1']) {
        expect(names).toContain(joint);
      }
      expect(gltf.animations.map((animation: { name: string }) => animation.name).sort()).toEqual(['idle', 'walk']);
      // Toon settings travel in the second color attribute, rather than texture downloads.
      let colored = 0;
      for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
        // gltfpack omits COLOR_0 for pure-white eye highlights; the renderer defaults to white.
        if (primitive.attributes.COLOR_0 !== undefined) colored++;
        expect(primitive.attributes.COLOR_1).toBeDefined();
      }
      expect(colored).toBeGreaterThan(10);
      expect(gltf.textures ?? []).toHaveLength(0);
    });
  }
});
