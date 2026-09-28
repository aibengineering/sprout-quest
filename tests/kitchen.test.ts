import { describe, expect, test } from 'bun:test';
import { afterChop, afterWin, cook, kitchenOpen, knownMeals, mealLeft, mealTick, repelBelow, sweetBoost, xpBoost } from '../src/kitchen';
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
    s.mats.goo = 50;
    expect(cook(s, 'goojelly')).toBe('unknown');
    s.stories.poppy = 6;
    expect(knownMeals(s)).toEqual(['pancakes', 'tea', 'goojelly']);
    expect(cook(s, 'goojelly')).toBe('ok');
    expect(s.mats.goo).toBe(42);
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

  test('Fluff Pancakes: more XP for five fights, then gone', () => {
    const s = fed();
    cook(s, 'pancakes');
    for (let i = 0; i < 5; i++) {
      expect(xpBoost(s)).toBeGreaterThan(1);
      afterWin(s, 100);
    }
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

  test('Goo Jelly keeps monsters two levels below you away for three minutes of walking', () => {
    const s = fed();
    s.lv = 8;
    expect(repelBelow(s)).toBeNull();
    cook(s, 'goojelly');
    expect(repelBelow(s)).toBe(6);
    expect(mealLeft(s)?.left).toBe('3m');
    // Fights don't use it up; time on the map does.
    afterWin(s, 100);
    expect(repelBelow(s)).toBe(6);
    mealTick(s, 179);
    expect(repelBelow(s)).toBe(6);
    mealTick(s, 2);
    expect(repelBelow(s)).toBeNull();
  });

  test("Woodcutter's Stew widens the sweet spot for ten chops", () => {
    const s = fed();
    s.flags.push('bram:stew');
    cook(s, 'stew');
    for (let i = 0; i < 10; i++) {
      expect(sweetBoost(s)).toBeGreaterThan(1);
      afterChop(s);
    }
    expect(sweetBoost(s)).toBe(1);
  });
});
