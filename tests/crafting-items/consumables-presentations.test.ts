import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { CraftPresentation } from '../../src/crafting/types';
import { POTION_RECIPES, type MatId } from '../../src/data';
import { MEALS, MEAL_ORDER, cook } from '../../src/kitchen';
import { craftPotion } from '../../src/rules';
import { newState } from '../../src/state';
import jellypot from '../../src/crafting/items/jellypot';
import shroombrew from '../../src/crafting/items/shroombrew';
import embertonic from '../../src/crafting/items/embertonic';
import pancakes from '../../src/crafting/items/pancakes';
import tea from '../../src/crafting/items/tea';
import goojelly from '../../src/crafting/items/goojelly';
import stew from '../../src/crafting/items/stew';
import rockcandy from '../../src/crafting/items/rockcandy';

const presentations: CraftPresentation[] = [jellypot, shroombrew, embertonic, pancakes, tea, goojelly, stew, rockcandy];
const recipes = Object.fromEntries([...POTION_RECIPES, ...Object.values(MEALS)].map((item) => [item.id, item.recipe]));

describe('recipe-faithful potion and Kitchen timelines', () => {
  test('the contribution covers exactly the three potions and every meal', () => {
    expect(presentations.map((p) => p.id).sort()).toEqual([...POTION_RECIPES.map((p) => p.id), ...MEAL_ORDER].sort());
  });

  for (const presentation of presentations) {
    test(`${presentation.id}: ingredient destinations match actual recipes and registered geometry`, () => {
      const recipe = recipes[presentation.id];
      const data = JSON.parse(readFileSync(`public/assets/crafting/${presentation.id}.json`, 'utf8'));
      expect(Object.keys(presentation.roles).sort()).toEqual((Object.keys(recipe) as MatId[]).sort());
      expect([...new Set(presentation.targets.map((t) => t.material))].sort()).toEqual((Object.keys(recipe) as MatId[]).sort());
      expect(presentation.layers.map((p) => p.id).sort()).toEqual(data.stack.toSorted());
      for (const target of presentation.targets) {
        expect(data.ingredientRoles[target.material]).toContain(target.part);
        expect(presentation.layers.find((p) => p.id === target.part)?.src).toBe(data.parts[target.part].src);
        const [x0, y0, x1, y1] = data.parts[target.part].bounds;
        expect(target.x * 512).toBeGreaterThanOrEqual(x0);
        expect(target.x * 512).toBeLessThanOrEqual(x1);
        expect(target.y * 512).toBeGreaterThanOrEqual(y0);
        expect(target.y * 512).toBeLessThanOrEqual(y1);
        expect(['soft', 'bind', 'solid', 'energy']).toContain(target.contact);
        expect(target).not.toHaveProperty('count');
      }
      // The shared allocator can give every component a real bundle with the current recipe quantities.
      for (const material of Object.keys(recipe) as MatId[]) {
        expect(presentation.targets.filter((t) => t.material === material).length).toBeLessThanOrEqual(recipe[material]!);
      }
      expect(presentation.complete).toBe(data.parts.complete.src);
    });

    test(`${presentation.id}: all physical contacts finish before reveal, with time to settle`, () => {
      expect(presentation.phases[0].at).toBe(0);
      for (let i = 1; i < presentation.phases.length; i++) expect(presentation.phases[i].at).toBeGreaterThan(presentation.phases[i - 1].at);
      const reveal = presentation.phases.find((p) => p.stage === 'reveal')!;
      expect(reveal).toBeDefined();
      for (const target of presentation.targets) {
        expect(target.at).toBeGreaterThanOrEqual(0);
        expect(target.duration).toBeGreaterThan(0);
        expect(target.at + target.duration).toBeLessThan(reveal.at);
      }
      expect(presentation.duration - reveal.at).toBeGreaterThanOrEqual(700);
      expect(presentation.duration).toBeLessThanOrEqual(3500);
    });
  }

  test('pine lands below the pot and never flies into the broth', () => {
    const wood = stew.targets.find((t) => t.material === 'pine')!;
    const caps = stew.targets.filter((t) => t.material === 'cap');
    expect(wood.y).toBeGreaterThan(.75);
    for (const cap of caps) {
      expect(wood.at + wood.duration).toBeLessThan(cap.at);
      expect(cap.y).toBeLessThan(.5);
    }
    expect(stew.layers[0].id).toBe('pine-fuel');
    expect(stew.sceneLabel).toContain('fuel');
  });

  test('presentation definitions preserve the one-potion craft and exact consumption costs', () => {
    for (const item of POTION_RECIPES) {
      const save = newState();
      save.potions = 0;
      Object.assign(save.mats, { goo: 50, fluff: 50, cap: 50, ember: 50 });
      const before = { ...save.mats };
      expect(craftPotion(save, item.id)).toBe('ok');
      expect(save.potions).toBe(1);
      for (const material of Object.keys(before) as MatId[]) expect(save.mats[material]).toBe(before[material] - (item.recipe[material] ?? 0));
    }
    for (const id of MEAL_ORDER) {
      const save = newState();
      save.stories.poppy = 6;
      save.flags.push('bram:stew', 'pip:candy');
      Object.assign(save.mats, { goo: 50, fluff: 50, clover: 50, pine: 50, cap: 50, stone: 50, copper: 50 });
      const before = { ...save.mats };
      expect(cook(save, id)).toBe('ok');
      expect(save.meal).toEqual({ id, left: MEALS[id].seconds });
      for (const material of Object.keys(before) as MatId[]) expect(save.mats[material]).toBe(before[material] - (MEALS[id].recipe[material] ?? 0));
    }
  });
});
