import { describe, expect, test } from 'bun:test';
import { GEAR } from '../src/data';
import barkvest from '../src/crafting/items/barkvest';
import shroomhood from '../src/crafting/items/shroomhood';
import batcloak from '../src/crafting/items/batcloak';
import glimmershawl from '../src/crafting/items/glimmershawl';

const ids = ['barkvest', 'shroomhood', 'batcloak', 'glimmershawl'] as const;

describe('ingredient-led woodland armor assets', () => {
  test('presentations cover actual ingredients, registered layers and completed contacts before reveal', () => {
    for (const p of [barkvest, shroomhood, batcloak, glimmershawl]) {
      const recipe = GEAR[p.id].recipe!;
      expect(Object.keys(p.roles).sort()).toEqual(Object.keys(recipe).sort());
      const layers = new Set(p.layers.map(l => l.id));
      expect(layers.size).toBe(p.layers.length);
      expect(p.phases[0].at).toBe(0);
      const reveal = p.phases.find(phase => phase.stage === 'reveal')!;
      expect(reveal).toBeDefined();
      expect(p.duration - reveal.at).toBeGreaterThanOrEqual(650);
      for (const material of Object.keys(recipe)) {
        const targets = p.targets.filter(t => t.material === material);
        expect(targets.length).toBeGreaterThan(0);
        expect(targets.length).toBeLessThanOrEqual(recipe[material as keyof typeof recipe]!);
      }
      for (const t of p.targets) {
        expect(layers.has(t.part)).toBe(true);
        expect(t.at + t.duration).toBeLessThan(reveal.at);
      }
    }
  });
  test('expanded recipes include lining and bindings while keeping combat stats', () => {
    expect(ids.map(id => ({ id, recipe: GEAR[id].recipe, def: GEAR[id].def, hp: GEAR[id].hp,
      spd: GEAR[id].spd, regen: GEAR[id].regen }))).toEqual([
      { id: 'barkvest', recipe: { bark: 42, stone: 18, fluff: 3, goo: 6 }, def: 4, hp: 6, spd: undefined, regen: undefined },
      { id: 'shroomhood', recipe: { cap: 42, fang: 8, fluff: 3, goo: 6 }, def: 6, hp: 12, spd: undefined, regen: undefined },
      { id: 'batcloak', recipe: { wing: 30, fang: 12, fluff: 3, goo: 9, copper: 6 }, def: 10, hp: 10, spd: 12, regen: undefined },
      { id: 'glimmershawl', recipe: { glimmer: 48, core: 1, fluff: 2, goo: 9 }, def: 15, hp: 22, spd: undefined, regen: 1 },
    ]);
  });

});
