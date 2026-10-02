import { describe, expect, test } from 'bun:test';
import { NODES, POTION_RECIPES, PROJECTS } from '../src/data';
import {
  CROPS, FLOWER_GIFT, GIFT_SECONDS, PLOTS_BY_LEVEL, WEED_SLOW, WELCOME_SEEDS, garden, gardenOpen, gardenUpdate, giftDue, growthStage, isReady, pick,
  plant, plotCount, pullWeeds, readyIn, takeGift, takeWelcome, water, plotJob, plotTile, plotAt, nextSeed, targetPlot, FIELD_PLOTS, FIELD_COLS, FIELD_ROWS,
} from '../src/garden';
import { World } from '../src/world';
import { FIELD_SHIFT } from '../src/state';
import { cook, hpBoost, knownMeals, mealTick } from '../src/kitchen';
import { craftPotion, harvest, playerStats } from '../src/rules';
import { loadState, newState, SAVE_KEY, type SaveState } from '../src/state';

const T0 = 1_000_000;
const later = (s: number) => T0 + s * 1000;
/** No thirst, no weeds: every roll misses. */
const calm = () => 0.99;
/** Rolls in turn from a list (then 0.99): thirst?, weeds?, and when each comes up. */
const rolls = (...r: number[]) => () => r.shift() ?? 0.99;

/** A save where Poppy tends a Garden of this level, with seeds to plant. */
function tended(level = 1): SaveState {
  const s = newState();
  s.stories.poppy = 6;
  s.build.garden = level;
  Object.assign(s.mats, { berryseed: 5, herbseed: 5, flowerseed: 5 });
  return s;
}

describe("Poppy's Garden", () => {
  test('opens once the Garden is built and Poppy is home with Mr. Floppers', () => {
    const s = newState();
    s.build.garden = 1;
    expect(gardenOpen(s)).toBe(false);
    s.mats.berryseed = 1;
    expect(plant(s, 0, 'berry', T0)).toBe('closed');
    s.stories.poppy = 6;
    expect(gardenOpen(s)).toBe(true);
    expect(plant(s, 0, 'berry', T0, calm)).toBe('ok');
  });

  test('six plots at the Sprout Patch, twelve at the Berry Garden, twenty at the Bloom Garden', () => {
    expect(PLOTS_BY_LEVEL.slice(1)).toEqual([6, 12, 20]);
    expect(PROJECTS.garden.levels.map((_, i) => plotCount(tended(i + 1)))).toEqual([6, 12, 20]);
    expect(PROJECTS.garden.levels.map((l) => l.perk.match(/six|Twelve|Twenty/i)?.[0].toLowerCase())).toEqual(['six', 'twelve', 'twenty']);
    const s = tended(1);
    expect([plant(s, 0, 'berry', T0, calm), plant(s, 5, 'berry', T0, calm), plant(s, 6, 'berry', T0, calm)]).toEqual(['ok', 'ok', 'closed']);
    expect(plant(s, 0, 'herb', T0, calm)).toBe('busy');
  });

  test('planting takes one seed from your bag, and needs one', () => {
    const s = tended();
    s.mats.herbseed = 1;
    expect(plant(s, 0, 'herb', T0, calm)).toBe('ok');
    expect(s.mats.herbseed).toBe(0);
    expect(plant(s, 1, 'herb', T0, calm)).toBe('seed');
  });

  test('grows in real time, even while you are away, and is ready after its crop time', () => {
    const s = tended();
    plant(s, 0, 'berry', T0, calm);
    const half = gardenUpdate(s, later(CROPS.berry.seconds / 2)).plots[0]!;
    expect(growthStage(half)).toBe(2);
    expect(readyIn(half)).toBe(CROPS.berry.seconds / 2);
    // Away for a day: ready, and no further along than that.
    const g = gardenUpdate(s, later(86_400));
    expect(isReady(g.plots[0]!)).toBe(true);
    expect(growthStage(g.plots[0]!)).toBe(3);
  });

  test('a sprout, then growing, then ready', () => {
    const s = tended();
    plant(s, 0, 'flower', T0, calm);
    const at = (secs: number) => growthStage(gardenUpdate(s, later(secs)).plots[0]!);
    expect([at(0), at(CROPS.flower.seconds / 3 - 1), at(CROPS.flower.seconds / 3 + 1), at(CROPS.flower.seconds)]).toEqual([1, 1, 2, 3]);
    expect(growthStage(null)).toBe(0);
  });

  test('a thirsty plot stops growing until you water it, however long you are away', () => {
    const s = tended();
    // Thirsty (roll 0 < 0.5) at the very start of its window (roll 0), no weeds.
    plant(s, 0, 'herb', T0, rolls(0, 0, 0.99));
    const thirstAt = garden(s).plots[0]!.thirstAt!;
    expect(thirstAt).toBe(CROPS.herb.seconds * 0.25);
    let p = gardenUpdate(s, later(10_000)).plots[0]!;
    expect({ thirsty: p.thirsty, grown: p.grown }).toEqual({ thirsty: true, grown: thirstAt });
    expect(water(s, 0, later(10_000))).toBe(true);
    expect(water(s, 0, later(10_000))).toBe(false);
    p = gardenUpdate(s, later(10_000 + CROPS.herb.seconds - thirstAt)).plots[0]!;
    expect(isReady(p)).toBe(true);
  });

  test('weeds slow it to half speed until you pull them', () => {
    const s = tended();
    // No thirst; weeds (roll 0) at the start of the window (roll 0).
    plant(s, 0, 'berry', T0, rolls(0.99, 0, 0));
    const weedsAt = garden(s).plots[0]!.weedsAt!;
    let p = gardenUpdate(s, later(weedsAt + 20)).plots[0]!;
    expect(p.weeds).toBe(true);
    expect(p.grown).toBeCloseTo(weedsAt + 20 * WEED_SLOW, 5);
    expect(readyIn(p)).toBe(Math.ceil((CROPS.berry.seconds - p.grown) / WEED_SLOW));
    expect(pullWeeds(s, 0, later(weedsAt + 20))).toBe(true);
    p = gardenUpdate(s, later(weedsAt + 30)).plots[0]!;
    expect(p.grown).toBeCloseTo(weedsAt + 10 + 10, 5);
  });

  test('left weedy while you are away, it still gets there, slowly', () => {
    const s = tended();
    plant(s, 0, 'berry', T0, rolls(0.99, 0, 0));
    const weedsAt = garden(s).plots[0]!.weedsAt!, total = weedsAt + (CROPS.berry.seconds - weedsAt) / WEED_SLOW;
    expect(isReady(gardenUpdate(s, later(total - 1)).plots[0]!)).toBe(false);
    expect(isReady(gardenUpdate(s, later(total)).plots[0]!)).toBe(true);
  });

  test('picking puts the crop in your bag and leaves the soil empty; only when ready', () => {
    const s = tended();
    plant(s, 0, 'herb', T0, calm);
    expect(pick(s, 0, later(10))).toBeNull();
    expect(pick(s, 0, later(CROPS.herb.seconds))).toEqual({ mat: 'herb', n: CROPS.herb.yield });
    expect(s.mats.herb).toBe(CROPS.herb.yield);
    expect(garden(s).plots[0]).toBeNull();
    expect(plant(s, 0, 'flower', later(CROPS.herb.seconds), calm)).toBe('ok');
  });

  test('Poppy hands over Flower Seeds when you have none, at most once per interval', () => {
    const s = tended();
    s.mats.flowerseed = 0;
    expect(takeGift(s, T0)).toBe(FLOWER_GIFT);
    expect(s.mats.flowerseed).toBe(FLOWER_GIFT);
    // Not while you still have some, and not again too soon after you've planted them all.
    expect(giftDue(s, T0)).toBe(false);
    s.mats.flowerseed = 0;
    expect(takeGift(s, later(GIFT_SECONDS - 1))).toBe(0);
    expect(takeGift(s, later(GIFT_SECONDS))).toBe(FLOWER_GIFT);
    expect(takeGift(newState(), T0)).toBe(0);
  });

  test("the Berry Seeds she saved for the Garden's first day, once", () => {
    const s = tended();
    s.mats.berryseed = 0;
    expect(takeWelcome(s)).toBe(WELCOME_SEEDS);
    expect(takeWelcome(s)).toBe(0);
    expect(s.mats.berryseed).toBe(WELCOME_SEEDS);
  });

  test('felled oaks and pines can drop seeds, once the Garden is Poppy’s', () => {
    expect([NODES.oak.seed?.mat, NODES.pine.seed?.mat]).toEqual(['berryseed', 'herbseed']);
    const lucky = () => 0;
    const s = newState();
    expect(harvest(s, 'oak', 'a', false, false, lucky, T0).drops.berryseed).toBeUndefined();
    s.stories.poppy = 6;
    s.build.garden = 1;
    expect(harvest(s, 'oak', 'b', false, false, lucky, T0).drops.berryseed).toBe(1);
    expect(harvest(s, 'pine', 'c', true, false, lucky, T0).drops.herbseed).toBe(1);
    expect(harvest(s, 'oak', 'd', false, false, () => 0.99, T0).drops.berryseed).toBeUndefined();
    expect(harvest(s, 'rock', 'e', false, false, lucky, T0).drops).toEqual({ stone: 3 });
    expect(s.mats.berryseed).toBe(1);
  });

  test('saves from before the Garden load without one, and grow one when first used', () => {
    const store: Record<string, string> = {};
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v), removeItem: (k: string) => delete store[k] };
    const old = newState() as Partial<SaveState>;
    old.stories = { poppy: 6 };
    old.build = { ...old.build!, garden: 2 };
    delete old.garden;
    const mats = { ...old.mats! } as Record<string, number>;
    for (const m of ['berryseed', 'herbseed', 'flowerseed', 'berry', 'herb', 'flower']) delete mats[m];
    store[SAVE_KEY] = JSON.stringify({ ...old, mats });
    const s = loadState()!;
    expect(s.garden).toBeUndefined();
    expect(s.mats.berryseed).toBe(0);
    expect(gardenUpdate(s, T0)).toEqual({ plots: [], gift: 0 });
    s.mats.berryseed = 1;
    expect(plant(s, 11, 'berry', T0, calm)).toBe('ok');
    expect(garden(s).plots).toHaveLength(12);
  });
});

describe('Sowerby grew for the field', () => {
  test("older saves out past the village move east with their area; ones in the village stay put", () => {
    const store: Record<string, string> = {};
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v), removeItem: (k: string) => delete store[k] };
    const load = (pos: { x: number; y: number }, spirit?: { x: number; y: number }) => {
      const old = { ...newState(), pos, spirit } as Partial<SaveState>;
      delete old.field;
      store[SAVE_KEY] = JSON.stringify(old);
      return loadState()!;
    };
    expect(load({ x: 50.5, y: 18 }).pos).toEqual({ x: 50.5 + FIELD_SHIFT, y: 18 });
    expect(load({ x: 29.4, y: 12.6 }).pos).toEqual({ x: 29.4, y: 12.6 });
    expect(load({ x: 30, y: 13 }, { x: 100, y: 12 }).spirit).toEqual({ x: 100 + FIELD_SHIFT, y: 12 });
    // Once moved, never again.
    const s = load({ x: 60, y: 10 });
    store[SAVE_KEY] = JSON.stringify(s);
    expect(loadState()!.pos.x).toBe(60 + FIELD_SHIFT);
  });
});

describe('what the Garden grows is for', () => {
  test("Granny learns her Berry Tart from the Garden's first berries: +10% max HP for 5 minutes", () => {
    const s = tended();
    s.mats.fluff = 30;
    expect(knownMeals(s)).not.toContain('tart');
    plant(s, 0, 'berry', T0, calm);
    pick(s, 0, later(CROPS.berry.seconds));
    expect(knownMeals(s)).toContain('tart');
    s.mats.berry = 8;
    const before = playerStats(s).maxHp;
    s.hp = before;
    expect(cook(s, 'tart')).toBe('ok');
    expect({ berry: s.mats.berry, fluff: s.mats.fluff }).toEqual({ berry: 0, fluff: 24 });
    expect(hpBoost(s)).toBe(1.1);
    const boosted = playerStats(s).maxHp;
    expect(boosted).toBe(Math.round(before * 1.1));
    // The extra comes filled, and goes again when it wears off.
    expect(s.hp).toBe(boosted);
    mealTick(s, 301);
    expect(playerStats(s).maxHp).toBe(before);
    expect(s.hp).toBe(before);
  });

  test('Herb Tonic: a potion from four Herbs', () => {
    expect(POTION_RECIPES.find((p) => p.id === 'herbtonic')?.recipe).toEqual({ herb: 4 });
    const s = newState();
    s.potions = 0;
    s.mats.herb = 6;
    expect(craftPotion(s, 'herbtonic')).toBe('ok');
    expect({ potions: s.potions, herb: s.mats.herb }).toEqual({ potions: 1, herb: 2 });
    expect(craftPotion(s, 'herbtonic')).toBe('missing');
  });

  test('Flowers build the finest buildings: the Bloom Garden and the Manor', () => {
    expect(PROJECTS.garden.levels[2].cost.flower).toBe(8);
    expect(PROJECTS.home.levels[2].cost.flower).toBe(8);
  });
});

describe('tending the Garden by hand', () => {
  test('a bed asks for what it needs, given what you hold', () => {
    const s = tended(2);
    plant(s, 0, 'berry', T0, calm);
    const p = gardenUpdate(s, T0).plots[0]!;
    expect(plotJob(null, null, s)).toBe('empty');
    expect(plotJob(null, { seed: 'herb' }, s)).toBe('plant');
    s.mats.herbseed = 0;
    expect(plotJob(null, { seed: 'herb' }, s)).toBe('empty');
    expect(plotJob(p, null, s)).toBe('growing');
    p.thirsty = true;
    expect(plotJob(p, null, s)).toBe('thirsty');
    expect(plotJob(p, { can: 0 }, s)).toBe('thirsty');
    expect(plotJob(p, { can: 2 }, s)).toBe('water');
    p.weeds = true;
    expect(plotJob(p, { can: 2 }, s)).toBe('weed');
    p.grown = CROPS.berry.seconds;
    expect(plotJob(p, null, s)).toBe('pick');
  });

  test('the action button works the plot under your feet, else the one just in front of you', () => {
    const o = { x: 10, y: 20 }, n = 6;
    // Plot 0 is the Sprout Patch's top-left: column 1, row 0.
    expect(plotTile(o, 0)).toEqual({ x: 11, y: 20 });
    expect(targetPlot(o, n, 11.5, 20.8, Math.PI / 2)).toBe(0);
    // Standing on the path above it, facing down: the plot in front.
    expect(targetPlot(o, n, 11.5, 19.9, Math.PI / 2)).toBe(0);
    // Facing away from it: nothing.
    expect(targetPlot(o, n, 11.5, 19.9, -Math.PI / 2)).toBe(null);
    // Untilled ground (a later level's plot) isn't a plot yet.
    expect(plotAt(o, n, 10.5, 20.5)).toBe(null);
    expect(plotAt(o, 12, 10.5, 20.5)).not.toBe(null);
  });

  test("the basket hands out the next seed you have, round and round", () => {
    const s = tended();
    expect(nextSeed(s, null)).toBe('berry');
    expect(nextSeed(s, 'berry')).toBe('herb');
    expect(nextSeed(s, 'flower')).toBe('berry');
    s.mats.herbseed = 0;
    expect(nextSeed(s, 'berry')).toBe('flower');
    s.mats.berryseed = s.mats.flowerseed = 0;
    expect(nextSeed(s, null)).toBe(null);
  });

  test("the field: each level's plots are the one before's plus a row and a column, numbered so nothing moves", () => {
    expect(FIELD_PLOTS).toHaveLength(FIELD_COLS * FIELD_ROWS);
    expect(new Set(FIELD_PLOTS.map(([c, r]) => `${c},${r}`)).size).toBe(FIELD_PLOTS.length);
    const block = (n: number) => {
      const cs = FIELD_PLOTS.slice(0, n).map(([c]) => c), rs = FIELD_PLOTS.slice(0, n).map(([, r]) => r);
      return { cols: Math.max(...cs) - Math.min(...cs) + 1, rows: Math.max(...rs) - Math.min(...rs) + 1 };
    };
    expect([6, 12, 20].map(block)).toEqual([{ cols: 3, rows: 2 }, { cols: 4, rows: 3 }, { cols: 5, rows: 4 }]);
    // Every plot is a tile of the Garden's field on the map, and the field's rows start just inside its gate.
    const w = new World(), o = w.objs.find((o) => o.project === 'garden')!;
    expect({ w: o.w, h: o.h, walkable: o.walkable }).toEqual({ w: FIELD_COLS, h: FIELD_ROWS, walkable: true });
    for (let i = 0; i < FIELD_PLOTS.length; i++) {
      const t = plotTile(o, i);
      expect(t.x >= o.x && t.x < o.x + o.w && t.y >= o.y && t.y < o.y + o.h).toBe(true);
      expect(w.blocked(t.x + 0.5, t.y + 0.7, 0.28)).toBe(false);
    }
  });

  test("an older save's beds carry over onto the field's first plots, as they were", () => {
    const s = tended(3);
    s.mats.berryseed = 6;
    for (let i = 0; i < 6; i++) plant(s, i, 'berry', T0, calm);
    const before = JSON.stringify(garden(s).plots);
    // The old Bloom Garden had six beds: they're the field's first six plots, and the fourteen after them are new soil.
    expect(plotCount(s)).toBe(20);
    expect(JSON.stringify(garden(s).plots.slice(0, 6))).toBe(before);
    expect(plant(s, 19, 'herb', T0, calm)).toBe('ok');
    expect(garden(s).plots.filter(Boolean)).toHaveLength(7);
  });
});
