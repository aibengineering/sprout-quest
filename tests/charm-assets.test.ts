import { describe, expect, test } from 'bun:test';
import { sceneModel } from './sceneModel';
import { readFileSync, statSync } from 'node:fs';
import { GEAR } from '../src/data';
import clover from '../src/crafting/items/clovercharm';
import tooth from '../src/crafting/items/toothcharm';
import heart from '../src/crafting/items/crystalheart';
import ring from '../src/crafting/items/impring';

const recipes = {
  clovercharm: { clover: 3, goo: 9 },
  toothcharm: { fang: 8, cap: 6 },
  crystalheart: { glimmer: 12, wing: 6, clover: 1 },
  impring: { horn: 8, ember: 9 },
};

describe('ingredient-led charm assets', () => {
  test('timeline covers real ingredients, registered destinations and every rendered component', () => {
    for (const p of [clover, tooth, heart, ring]) {
      const recipe = GEAR[p.id].recipe!;
      const m = { stack: Object.keys(sceneModel(`assets/crafting3d/${p.id}.glb`).layers) };
      expect(p.layers.map(layer => layer.id)).toEqual(m.stack);
      expect(Object.keys(p.roles).sort()).toEqual(Object.keys(recipe).sort());
      expect([...new Set(p.targets.map(t => String(t.material)))].sort()).toEqual(Object.keys(recipe).sort());
      expect([...new Set(p.targets.map(t => t.part))].sort()).toEqual([...m.stack].sort());
      const reveal = p.phases.find(phase => phase.stage === 'reveal')!;
      expect(reveal).toBeDefined();
      expect(p.phases[0].at).toBe(0);
      expect(reveal.at).toBeGreaterThan(Math.max(...p.targets.map(t => t.at+t.duration)));
      expect(p.duration-reveal.at).toBeGreaterThanOrEqual(650);
      for (const t of p.targets) {
      }
      for (const [mat, cost] of Object.entries(recipe)) {
        const targets = p.targets.filter(t => t.material === mat);
        expect(targets.length).toBeLessThanOrEqual(cost!);
      }
    }
  });
  test('covers exactly the four existing craftable charms and preserves their recipes', () => {
    expect(Object.values(GEAR).filter((g) => g.slot === 'charm' && g.recipe).map((g) => g.id).sort()).toEqual(Object.keys(recipes).sort());
    for (const [id, recipe] of Object.entries(recipes)) expect(GEAR[id].recipe).toEqual(recipe);
    expect(GEAR.crystalheart.recipe?.crystal).toBeUndefined();
  });

});
