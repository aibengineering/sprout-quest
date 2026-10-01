import { describe, expect, test } from 'bun:test';
import { PROJECTS } from '../src/data';
import { ARMFUL, PLANKS_PER_LOG, SAW, SAW_LOGS, SAW_MAX, SAW_SECONDS, canCarry, canOrder, nextPlankIn, pullLever, sawCollect, sawLogs, sawOrder, sawReady, sawSeconds, sawUpdate, type Bench } from '../src/sawmill';
import { MATERIAL_SCALE, SAVE_KEY, loadState, newState, type SaveState } from '../src/state';

const T0 = 1_000_000;
const later = (s: number) => T0 + s * 1000;
/** A save with Bram's Sawmill built to `level`. */
const mill = (level = 1): SaveState => {
  const s = newState();
  s.build.sawmill = level;
  return s;
};

describe("Bram's Sawmill", () => {
  test('takes the logs you hand over, and only those you have', () => {
    const s = mill();
    s.mats.bark = 5;
    expect(canOrder(s, 'bark', T0)).toBe(5);
    expect(sawOrder(s, 8, 'bark', T0)).toBe(5);
    expect(s.mats.bark).toBe(0);
    expect(sawOrder(s, 1, 'bark', T0)).toBe(0);
  });

  test('saws a log every SAW_SECONDS of real time into planks, even while you are away', () => {
    const s = mill();
    s.mats.bark = 20;
    sawOrder(s, 3, 'bark', T0);
    expect(nextPlankIn(s, T0)).toBe(SAW_SECONDS);
    expect(sawReady(s, later(SAW_SECONDS - 1))).toBe(0);
    expect(sawReady(s, later(SAW_SECONDS))).toBe(PLANKS_PER_LOG);
    // A long time away: everything's done, and no more.
    const w = sawUpdate(s, later(SAW_SECONDS * 50));
    expect({ queued: w.queue.length, ready: w.ready }).toEqual({ queued: 0, ready: { plank: 3 * PLANKS_PER_LOG } });
  });

  test('collecting puts the planks in your bag', () => {
    const s = mill();
    s.mats.bark = 20;
    sawOrder(s, 2, 'bark', T0);
    expect(sawCollect(s, later(SAW_SECONDS * 2))).toEqual({ plank: 2 * PLANKS_PER_LOG });
    expect(s.mats.plank).toBe(2 * PLANKS_PER_LOG);
    expect(sawCollect(s, later(SAW_SECONDS * 3))).toEqual({});
  });

  test('an order made later starts its own clock', () => {
    const s = mill();
    s.mats.bark = 20;
    sawOrder(s, 1, 'bark', T0);
    sawUpdate(s, later(1000));
    sawOrder(s, 1, 'bark', later(1000));
    expect(sawReady(s, later(1000 + SAW_SECONDS - 1))).toBe(PLANKS_PER_LOG);
    expect(sawReady(s, later(1000 + SAW_SECONDS))).toBe(2 * PLANKS_PER_LOG);
  });

  test('the bench holds at most SAW_MAX logs waiting', () => {
    const s = mill();
    s.mats.bark = 999;
    expect(sawOrder(s, 999, 'bark', T0)).toBe(SAW_MAX);
    expect(canOrder(s, 'bark', T0)).toBe(0);
  });

  test('each blade saws the next wood into its own plank, and faster', () => {
    const s = mill(1);
    Object.assign(s.mats, { bark: 10, pine: 10, glimwood: 10, emberwood: 10 });
    for (const [level, log] of SAW_LOGS.map((l) => [SAW[l].level, l] as const)) {
      s.build.sawmill = level - 1;
      expect({ log, before: canOrder(s, log, T0) }).toEqual({ log, before: 0 });
      s.build.sawmill = level;
      expect({ log, at: sawLogs(s).includes(log) }).toEqual({ log, at: true });
    }
    // Every Sawmill level exists as a village upgrade, one per wood.
    expect(PROJECTS.sawmill.levels.length).toBe(SAW_LOGS.length);
    const secs = [1, 2, 3, 4].map((lv) => sawSeconds(mill(lv)));
    expect(secs).toEqual([...secs].sort((a, b) => b - a));
    expect(new Set(secs).size).toBe(4);
  });

  test('planks keep their wood: a mixed order comes out as each kind', () => {
    const s = mill(4);
    Object.assign(s.mats, { bark: 10, pine: 10, glimwood: 10, emberwood: 10 });
    sawOrder(s, 1, 'bark', T0);
    sawOrder(s, 2, 'glimwood', T0);
    sawOrder(s, 1, 'emberwood', T0);
    const k = PLANKS_PER_LOG;
    expect(sawCollect(s, later(sawSeconds(s) * 10))).toEqual({ plank: k, glimplank: 2 * k, emberplank: k });
    expect([s.mats.plank, s.mats.glimplank, s.mats.emberplank, s.mats.pineplank]).toEqual([k, 2 * k, k, 0]);
  });
});

describe('counting materials in handfuls (0.4.0)', () => {
  test("an older save's bag and half-sawn order grow by the same factors, so nothing is worth less", () => {
    const store: Record<string, string> = {};
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v), removeItem: (k: string) => delete store[k] };
    const old = newState() as Partial<SaveState> & Record<string, unknown>;
    delete old.units;
    old.build = { ...old.build!, sawmill: 1 };
    Object.assign(old.mats!, { fluff: 10, bark: 4, crystal: 5, plank: 3, core: 2 });
    // Two planks ordered (each was two old logs) and one waiting, from before planks came in kinds.
    (old as Record<string, unknown>).sawmill = { queued: 2, ready: 1, since: T0 };
    store[SAVE_KEY] = JSON.stringify(old);
    const s = loadState()!;
    expect([s.mats.fluff, s.mats.bark, s.mats.crystal, s.mats.plank, s.mats.core]).toEqual([
      10 * MATERIAL_SCALE.fluff!, 4 * MATERIAL_SCALE.bark!, 5 * MATERIAL_SCALE.crystal!, 3 * MATERIAL_SCALE.plank!, 2,
    ]);
    expect(s.units).toBe(2);
    // Each old plank order is now enough logs for the planks it's worth.
    expect(s.sawmill!.queue.length * PLANKS_PER_LOG).toBe(2 * MATERIAL_SCALE.plank!);
    expect(s.sawmill!.ready).toEqual({ plank: MATERIAL_SCALE.plank! });
    // Loading again doesn't scale twice.
    store[SAVE_KEY] = JSON.stringify(s);
    expect(loadState()!.mats.fluff).toBe(10 * MATERIAL_SCALE.fluff!);
  });
});

describe('working the Sawmill by hand', () => {
  test('an armful at a time, only logs that are in the bag and not already carried or benched', () => {
    const s = mill();
    s.mats.bark = 12;
    const bench: Bench = {};
    expect(canCarry(s, 'bark', 0, bench, T0)).toBe(ARMFUL);
    expect(canCarry(s, 'bark', 10, bench, T0)).toBe(2);
    bench.bark = 10;
    expect(canCarry(s, 'bark', 0, bench, T0)).toBe(2);
    expect(canCarry(s, 'bark', 2, bench, T0)).toBe(0);
    // Pine needs the next blade.
    s.mats.pine = 9;
    expect(canCarry(s, 'pine', 0, {}, T0)).toBe(0);
    s.build.sawmill = 2;
    expect(canCarry(s, 'pine', 0, {}, T0)).toBe(ARMFUL);
  });

  test('never more than the saw has room for', () => {
    const s = mill();
    s.mats.bark = 200;
    sawOrder(s, SAW_MAX - 7, 'bark', T0);
    expect(canCarry(s, 'bark', 0, { bark: 4 }, T0)).toBe(3);
  });

  test('the lever hands the bench to the saw, exactly as handing the logs to Bram', () => {
    const byHand = mill(2), byMenu = mill(2);
    for (const s of [byHand, byMenu]) Object.assign(s.mats, { bark: 10, pine: 6 });
    const bench: Bench = { bark: 10, pine: 5 };
    expect(pullLever(byHand, bench, T0)).toBe(15);
    expect(bench).toEqual({});
    sawOrder(byMenu, 10, 'bark', T0);
    sawOrder(byMenu, 5, 'pine', T0);
    expect(byHand.sawmill).toEqual(byMenu.sawmill);
    expect(byHand.mats).toEqual(byMenu.mats);
    expect(pullLever(byHand, {}, T0)).toBe(0);
  });
});
