import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { FLUFFY_DURATION, FLUFFY_PARTS, fluffyFlights } from '../src/crafting';
import { GEAR } from '../src/data';
import { craftGear, equip } from '../src/rules';
import { newState } from '../src/state';

describe('Fluffy Vest crafting', () => {
  test('bundles account for exactly the recipe, even if its quantities change', () => {
    for (const recipe of [GEAR.fluffvest.recipe!, { fluff: 3, goo: 3 }, { fluff: 51, goo: 21 }, { fluff: 0, goo: 0 }]) {
      const flights = fluffyFlights(recipe);
      for (const material of ['fluff', 'goo'] as const) expect(flights.filter((f) => f.material === material).reduce((n, f) => n + f.count, 0)).toBe(recipe[material] ?? 0);
      for (const f of flights) {
        expect(f.count).toBeGreaterThan(0);
        expect(f.at + f.duration).toBeLessThan(FLUFFY_DURATION);
        expect(f.x).toBeGreaterThan(0);
        expect(f.x).toBeLessThan(1);
      }
    }
  });

  test('wool makes every garment component before goo binds it', () => {
    const flights = fluffyFlights(GEAR.fluffvest.recipe!);
    expect(flights.filter((f) => f.material === 'fluff').map((f) => f.part)).toEqual(FLUFFY_PARTS.slice(0, 5));
    const lastWool = Math.max(...flights.filter((f) => f.material === 'fluff').map((f) => f.at + f.duration));
    expect(lastWool).toBeLessThan(Math.min(...flights.filter((f) => f.material === 'goo').map((f) => f.at)));
  });

  test('every assembly layer is shipped with the game', () => {
    for (const part of [...FLUFFY_PARTS, 'complete']) expect(existsSync(`public/assets/crafting/fluffvest-${part}.webp`)).toBe(true);
  });

  test('ownership and costs are committed once; keeping and equipping do not craft again', () => {
    const s = newState();
    s.lv = 4;
    s.build.forge = 1;
    Object.assign(s.mats, { fluff: 72, goo: 24 });
    expect(craftGear(s, 'fluffvest')).toBe('ok');
    expect(s.mats.fluff).toBe(36);
    expect(s.mats.goo).toBe(12);
    expect(s.equip.armor).toBe('tunic');
    expect(craftGear(s, 'fluffvest')).toBe('owned');
    expect(s.owned.filter((id) => id === 'fluffvest')).toHaveLength(1);
    expect(equip(s, 'fluffvest')).toBe(true);
    expect(s.mats.fluff).toBe(36);
    expect(s.mats.goo).toBe(12);
  });
});
