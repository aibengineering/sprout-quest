import { describe, expect, test } from 'bun:test';
import { sceneModel } from '../sceneModel';
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
import herbtonic from '../../src/crafting/items/herbtonic';
import tart from '../../src/crafting/items/tart';
import meadowtea from '../../src/crafting/items/meadowtea';
import trailbuns from '../../src/crafting/items/trailbuns';

const presentations: CraftPresentation[] = [jellypot, shroombrew, embertonic, herbtonic, pancakes, tea, goojelly, stew, rockcandy, tart, meadowtea, trailbuns];
const recipes = Object.fromEntries([...POTION_RECIPES, ...Object.values(MEALS)].map((item) => [item.id, item.recipe]));

describe('recipe-faithful potion and Kitchen timelines', () => {
  test('the contribution covers exactly every potion and meal', () => {
    expect(presentations.map((p) => p.id).sort()).toEqual([...POTION_RECIPES.map((p) => p.id), ...MEAL_ORDER].sort());
  });

  for (const presentation of presentations) {
    test(`${presentation.id}: ingredient destinations match actual recipes and registered geometry`, () => {
      const recipe = recipes[presentation.id];
      const data = { stack: Object.keys(sceneModel(`assets/crafting3d/${presentation.id}.glb`).layers) };
      expect(Object.keys(presentation.roles).sort()).toEqual((Object.keys(recipe) as MatId[]).sort());
      expect([...new Set(presentation.targets.map((t) => t.material))].sort()).toEqual((Object.keys(recipe) as MatId[]).sort());
      expect(presentation.layers.map((p) => p.id).sort()).toEqual([...data.stack].sort());
      for (const target of presentation.targets) {
        expect(['soft', 'bind', 'solid', 'energy']).toContain(target.contact);
        expect(target).not.toHaveProperty('count');
      }
      // The shared allocator can give every component a real bundle with the current recipe quantities.
      for (const material of Object.keys(recipe) as MatId[]) {
        expect(presentation.targets.filter((t) => t.material === material).length).toBeLessThanOrEqual(recipe[material]!);
      }
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

  test('pine goes on before the caps, as fuel', () => {
    const wood = stew.targets.find((t) => t.material === 'pine')!;
    const caps = stew.targets.filter((t) => t.material === 'cap');
    for (const cap of caps) {
      expect(wood.at + wood.duration).toBeLessThan(cap.at);
    }
    expect(stew.layers[0].id).toBe('pine-fuel');
    expect(stew.sceneLabel).toContain('fuel');
  });

  test('presentation definitions preserve the one-potion craft and exact consumption costs', () => {
    for (const item of POTION_RECIPES) {
      const save = newState();
      save.potions = 0;
      Object.assign(save.mats, { goo: 150, fluff: 150, cap: 150, ember: 150, herb: 100 });
      const before = { ...save.mats };
      expect(craftPotion(save, item.id)).toBe('ok');
      expect(save.potions).toBe(1);
      for (const material of Object.keys(before) as MatId[]) expect(save.mats[material]).toBe(before[material] - (item.recipe[material] ?? 0));
    }
    for (const id of MEAL_ORDER) {
      const save = newState();
      save.stories.poppy = 6;
      save.flags.push('bram:stew', 'pip:candy', 'garden:berries', 'hazel:recipe', 'moss:recipe');
      Object.assign(save.mats, { goo: 150, fluff: 150, clover: 50, pine: 150, cap: 150, stone: 150, copper: 150, berry: 100, herb: 50, flower: 50 });
      const before = { ...save.mats };
      expect(cook(save, id)).toBe('ok');
      expect(save.meal).toEqual({ id, left: MEALS[id].seconds });
      for (const material of Object.keys(before) as MatId[]) expect(save.mats[material]).toBe(before[material] - (MEALS[id].recipe[material] ?? 0));
    }
  });
});
