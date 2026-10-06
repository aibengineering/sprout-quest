import { describe, expect, test } from 'bun:test';
import { sceneModel } from '../sceneModel';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { GEAR } from '../../src/data';
import { craftGear, equip } from '../../src/rules';
import { newState } from '../../src/state';
import stonesword from '../../src/crafting/items/stonesword';
import stonehammer from '../../src/crafting/items/stonehammer';
import jellywhip from '../../src/crafting/items/jellywhip';
import jellywand from '../../src/crafting/items/jellywand';
const presentations = { stonesword, stonehammer, jellywhip, jellywand };

const recipes = {
  stonesword: { stone: 12, bark: 6 }, stonehammer: { stone: 15, bark: 6 },
  jellywhip: { goo: 18, fluff: 6 }, jellywand: { goo: 15, fluff: 9 },
};

describe('ingredient-led meadow weapons', () => {
  for (const presentation of Object.values(presentations)) {
    test(`${presentation.id}: assembly follows real materials and registered destinations`, () => {
      const recipe = GEAR[presentation.id].recipe!;
      const manifest = { stack: Object.keys(sceneModel(`assets/crafting3d/${presentation.id}.glb`).layers) };
      expect(Object.keys(presentation.roles).sort()).toEqual(Object.keys(recipe).sort());
      const materials: string[] = [...new Set(presentation.targets.map((t) => t.material))];
      expect(materials.sort()).toEqual(Object.keys(recipe).sort());
      expect(presentation.layers.map((l) => l.id)).toEqual(manifest.stack);
      const reveal = presentation.phases.find((p) => p.stage === 'reveal')!;
      expect(reveal.at).toBeLessThan(presentation.duration - 400);
      expect(presentation.phases[0].at).toBe(0);
      for (const target of presentation.targets) {
        expect(target.at + target.duration).toBeLessThan(reveal.at);
      }
      const ordered = presentation.phases.map((p) => p.at);
      expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    });
  }
  for (const [id, recipe] of Object.entries(recipes)) {
    test(`${id}: recipe and ownership remain unchanged`, () => {
      expect(GEAR[id].recipe).toEqual(recipe);
      const s = newState();
      s.lv = 5;
      s.build.forge = 1;
      s.skills.mine.lv = 2;
      Object.assign(s.mats, Object.fromEntries(Object.entries(recipe).map(([key, n]) => [key, n * 2])));
      expect(craftGear(s, id)).toBe('ok');
      for (const [key, n] of Object.entries(recipe)) expect(s.mats[key as keyof typeof s.mats]).toBe(n);
      expect(craftGear(s, id)).toBe('owned');
      expect(equip(s, id)).toBe(true);
      expect(s.owned.filter((owned) => owned === id)).toHaveLength(1);
      for (const [key, n] of Object.entries(recipe)) expect(s.mats[key as keyof typeof s.mats]).toBe(n);
    });

    test(`${id}: equipped model keeps the vertex shader contract and phone budget`, () => {
      const file = readFileSync(`public/assets/models/wpn_${id}.glb`);
      expect(file.readUInt32LE(0)).toBe(0x46546c67);
      expect(file.readUInt32LE(4)).toBe(2);
      expect(file.length).toBeLessThan(32 * 1024);
      const gltf = JSON.parse(file.toString('utf8', 20, 20 + file.readUInt32LE(12)));
      expect(gltf.nodes.some((n: any) => n.name === 'weapon')).toBe(true);
      let triangles = 0, colored = 0;
      for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
        // gltfpack omits a constant white COLOR_0; the renderer defaults it to white.
        if (primitive.attributes.COLOR_0 !== undefined) colored++;
        expect(primitive.attributes.COLOR_1).toBeDefined();
        triangles += gltf.accessors[primitive.indices].count / 3;
      }
      expect(triangles).toBeGreaterThan(0);
      expect(colored).toBeGreaterThan(0);
      expect(triangles).toBeLessThan(4000);
      expect(existsSync(`public/assets/icons/${id}.webp`)).toBe(true);
    });
  }
});
