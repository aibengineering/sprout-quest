import { describe, expect, test } from 'bun:test';
import { addToPot, afterWin, cook, cooked, kitchenOpen, knownMeals, mealLeft, mealTick, oreBoost, repelBelow, startDish, stillNeeded, stir, STIRS, sweetBoost, xpBoost, type Cooking } from '../src/kitchen';
import { NODES, type NodeKind } from '../src/data';
import { harvest } from '../src/rules';
import { newState } from '../src/state';

/** A save that's finished Poppy's story, with plenty of everything. */
function fed() {
  const s = newState();
  s.stories.poppy = 6;
  for (const k in s.mats) s.mats[k as keyof typeof s.mats] = 50;
  return s;
}

describe("Granny's Kitchen", () => {
  test('opens once Mr. Floppers is home, with her three light recipes', () => {
    const s = newState();
    expect(kitchenOpen(s)).toBe(false);
    s.mats.goo = 150;
    expect(cook(s, 'goojelly')).toBe('unknown');
    s.stories.poppy = 6;
    expect(knownMeals(s)).toEqual(['pancakes', 'tea', 'goojelly']);
    expect(cook(s, 'goojelly')).toBe('ok');
    expect(s.mats.goo).toBe(126);
  });

  test("newcomers teach her more: Bram's stew once he has", () => {
    const s = fed();
    expect(cook(s, 'stew')).toBe('unknown');
    s.flags.push('bram:stew');
    expect(knownMeals(s)).toContain('stew');
    expect(cook(s, 'stew')).toBe('ok');
  });

  test('one meal at a time: a new one replaces the old', () => {
    const s = fed();
    cook(s, 'pancakes');
    cook(s, 'tea');
    expect(s.meal?.id).toBe('tea');
    expect(xpBoost(s)).toBe(1);
  });

  test('Fluff Pancakes: more XP for five minutes of play, however many fights, then gone', () => {
    const s = fed();
    cook(s, 'pancakes');
    expect(mealLeft(s)?.left).toBe('5m');
    for (let i = 0; i < 20; i++) afterWin(s, 100);
    expect(xpBoost(s)).toBeGreaterThan(1);
    mealTick(s, 299);
    expect(mealLeft(s)?.left).toBe('1s');
    mealTick(s, 2);
    expect(xpBoost(s)).toBe(1);
    expect(mealLeft(s)).toBeNull();
  });

  test('Clover Tea heals a little after a win, never past full', () => {
    const s = fed();
    cook(s, 'tea');
    s.hp = 50;
    expect(afterWin(s, 100)).toBe(15);
    s.hp = 95;
    expect(afterWin(s, 100)).toBe(5);
    expect(s.hp).toBe(100);
  });

  test('Goo Jelly keeps monsters two levels below you away for three minutes', () => {
    const s = fed();
    s.lv = 8;
    expect(repelBelow(s)).toBeNull();
    cook(s, 'goojelly');
    expect(repelBelow(s)).toBe(6);
    expect(mealLeft(s)?.left).toBe('3m');
    // Fights don't use it up; time does.
    afterWin(s, 100);
    expect(repelBelow(s)).toBe(6);
    mealTick(s, 179);
    expect(repelBelow(s)).toBe(6);
    mealTick(s, 2);
    expect(repelBelow(s)).toBeNull();
  });

  test("Woodcutter's Stew widens the sweet spot for four minutes", () => {
    const s = fed();
    s.flags.push('bram:stew');
    cook(s, 'stew');
    expect(sweetBoost(s)).toBeGreaterThan(1);
    mealTick(s, 241);
    expect(sweetBoost(s)).toBe(1);
  });

  test("Pip teaches her Rock Candy when he moves in: stone and copper", () => {
    const s = fed();
    expect(cook(s, 'rockcandy')).toBe('unknown');
    s.flags.push('pip:candy');
    expect(knownMeals(s)).toContain('rockcandy');
    expect(cook(s, 'rockcandy')).toBe('ok');
    expect({ stone: s.mats.stone, copper: s.mats.copper }).toEqual({ stone: 38, copper: 44 });
    expect(mealLeft(s)?.left).toBe('4m');
  });

  test('Rock Candy: an extra handful of ore from every rock you mine for four minutes, and nothing extra from trees', () => {
    const s = fed();
    s.flags.push('pip:candy');
    const mines = (Object.keys(NODES) as NodeKind[]).filter((k) => NODES[k].skill === 'mine');
    expect(mines).toEqual(expect.arrayContaining(['rock', 'copper', 'iron', 'crystal', 'obsidian']));
    const plain = (kind: NodeKind) => harvest(s, kind, `plain:${kind}`, false, false, () => 1, 0).drops[NODES[kind].mat];
    const before = Object.fromEntries(mines.map((k) => [k, plain(k)]));
    const oak = plain('oak');
    cook(s, 'rockcandy');
    expect(oreBoost(s)).toBe(1);
    for (const kind of mines) {
      const mat = NODES[kind].mat, had = s.mats[mat];
      const r = harvest(s, kind, `candy:${kind}`, false, false, () => 1, 0);
      const handful = NODES[kind].safe.yield;
      expect({ kind, got: r.drops[mat] }).toEqual({ kind, got: before[kind]! + handful });
      expect(s.mats[mat]).toBe(had + before[kind]! + handful);
    }
    // A flawless job still adds its own extra on top.
    expect(harvest(s, 'rock', 'flawless', false, true, () => 1, 0).drops.stone).toBe(NODES.rock.safe.yield * 3);
    expect(harvest(s, 'oak', 'candy:oak', false, false, () => 1, 0).drops.bark).toBe(oak);
    mealTick(s, 241);
    expect(oreBoost(s)).toBe(0);
    expect(harvest(s, 'rock', 'after', false, false, () => 1, 0).drops.stone).toBe(before.rock);
  });
});

describe('cooking by hand in the Kitchen', () => {
  test('the book only opens at recipes she knows and you can make', () => {
    const s = fed();
    expect(startDish(s, 'stew')).toBe('unknown');
    s.mats.fluff = 0;
    expect(startDish(s, 'pancakes')).toBe('missing');
    expect(startDish(s, 'tea')).toEqual({ dish: 'tea', added: [], stirs: 0 });
    expect(startDish(newState(), 'tea')).toBe('unknown');
  });

  test('each ingredient goes in once, in any order, then it takes three good stirs', () => {
    const c = startDish(fed(), 'pancakes') as Cooking;
    expect(stillNeeded(c)).toEqual(['fluff', 'goo']);
    expect(stir(c)).toBe(false);
    expect(c.stirs).toBe(0);
    expect(addToPot(c, 'clover')).toBe(false);
    expect(addToPot(c, 'goo')).toBe(true);
    expect(addToPot(c, 'goo')).toBe(false);
    expect(stillNeeded(c)).toEqual(['fluff']);
    expect(addToPot(c, 'fluff')).toBe(true);
    for (let i = 1; i < STIRS; i++) expect(stir(c)).toBe(false);
    expect(cooked(c)).toBe(false);
    expect(stir(c)).toBe(true);
    expect(cooked(c)).toBe(true);
  });

  test('nothing is spent until it is served, and then it costs what her menu does', () => {
    const s = fed(), byHand = fed();
    const c = startDish(byHand, 'pancakes') as Cooking;
    for (const m of stillNeeded(c)) addToPot(c, m);
    while (!stir(c));
    expect(byHand.mats).toEqual(s.mats);
    expect(cook(byHand, c.dish)).toBe('ok');
    expect(cook(s, 'pancakes')).toBe('ok');
    expect(byHand.mats).toEqual(s.mats);
    expect(byHand.meal).toEqual(s.meal);
  });
});
