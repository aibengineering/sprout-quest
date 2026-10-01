import { describe, expect, test } from 'bun:test';
import { sceneModel } from './sceneModel';
import { readFileSync } from 'node:fs';
import { GEAR } from '../src/data';
import coppermail from '../src/crafting/items/coppermail';
import ironplate from '../src/crafting/items/ironplate';
import crystalmail from '../src/crafting/items/crystalmail';

const armors = ['coppermail', 'ironplate', 'crystalmail'] as const;
const recipes = { coppermail: { copper: 36, stone: 24 }, ironplate: { iron: 24, copper: 18, stone: 18, pine: 9 }, crystalmail: { crystal: 28, iron: 12, stone: 18 } };
const presentations = [coppermail, ironplate, crystalmail];

describe('ingredient-led ore armor assets', () => {
  test('the existing recipe economy is preserved', () => {
    for (const id of armors) expect(GEAR[id].recipe).toEqual(recipes[id]);
  });

  test('all real ingredients have visible destinations and all parts settle before the reveal', () => {
    for (const definition of presentations) {
      const manifest = { stack: Object.keys(sceneModel(`assets/crafting3d/${definition.id}.glb`).layers) };
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
      }
      for (const target of definition.targets) {
        expect(target.at + target.duration).toBeLessThan(reveal.at);
        expect(Object.keys(recipe)).toContain(target.material);
      }
    }
  });

});
