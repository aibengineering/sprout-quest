import { describe, expect, test } from 'bun:test';
import { craftFlights } from '../src/crafting';
import fluffvest, { FLUFFY_DURATION, FLUFFY_PARTS } from '../src/crafting/items/fluffvest';
import { GEAR } from '../src/data';
import { craftGear, equip } from '../src/rules';
import { newState } from '../src/state';

describe('Fluffy Vest crafting', () => {
  test('bundles account for exactly the recipe, even if its quantities change', () => {
    for (const recipe of [GEAR.fluffvest.recipe!, { fluff: 3, goo: 3 }, { fluff: 51, goo: 21 }, { fluff: 0, goo: 0 }]) {
      const flights = craftFlights(fluffvest, recipe);
      for (const material of ['fluff', 'goo'] as const) expect(flights.filter((f) => f.material === material).reduce((n, f) => n + f.count, 0)).toBe(recipe[material] ?? 0);
      for (const f of flights) {
        expect(f.count).toBeGreaterThan(0);
        expect(f.at + f.duration).toBeLessThan(FLUFFY_DURATION);
      }
    }
  });

  test('wool makes every garment component before goo binds it', () => {
    const flights = craftFlights(fluffvest, GEAR.fluffvest.recipe!);
    expect(flights.filter((f) => f.material === 'fluff').map((f) => f.part)).toEqual([...FLUFFY_PARTS]);
    const lastWool = Math.max(...flights.filter((f) => f.material === 'fluff').map((f) => f.at + f.duration));
    expect(lastWool).toBeLessThan(Math.min(...flights.filter((f) => f.material === 'goo').map((f) => f.at)));
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
