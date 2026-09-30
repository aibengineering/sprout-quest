import { describe, expect, test } from 'bun:test';
import { PROJECTS } from '../src/data';
import { LOGS_PER_PLANK, SAW, SAW_LOGS, SAW_MAX, SAW_SECONDS, canOrder, nextPlankIn, sawCollect, sawLogs, sawOrder, sawSeconds, sawUpdate } from '../src/sawmill';
import { newState, type SaveState } from '../src/state';

const T0 = 1_000_000;
const later = (s: number) => T0 + s * 1000;
/** A save with Bram's Sawmill built to `level`. */
const mill = (level = 1): SaveState => {
  const s = newState();
  s.build.sawmill = level;
  return s;
};
const ready = (s: SaveState, at: number) => Object.values(sawUpdate(s, at).ready).reduce((a, n) => a + (n ?? 0), 0);

describe("Bram's Sawmill", () => {
  test('takes two logs a plank, and only what you can pay for', () => {
    const s = mill();
    s.mats.bark = 5;
    expect(canOrder(s, 'bark', T0)).toBe(2);
    expect(sawOrder(s, 5, 'bark', T0)).toBe(2);
    expect(s.mats.bark).toBe(5 - 2 * LOGS_PER_PLANK);
    expect(sawOrder(s, 1, 'bark', T0)).toBe(0);
  });

  test('saws one plank every SAW_SECONDS of real time, even while you are away', () => {
    const s = mill();
    s.mats.bark = 20;
    sawOrder(s, 3, 'bark', T0);
    expect(nextPlankIn(s, T0)).toBe(SAW_SECONDS);
    expect(ready(s, later(SAW_SECONDS - 1))).toBe(0);
    expect(ready(s, later(SAW_SECONDS))).toBe(1);
    // A long time away: everything's done, and no more.
    const w = sawUpdate(s, later(SAW_SECONDS * 50));
    expect({ queued: w.queue.length, ready: w.ready }).toEqual({ queued: 0, ready: { plank: 3 } });
  });

  test('collecting puts the planks in your bag', () => {
    const s = mill();
    s.mats.bark = 20;
    sawOrder(s, 2, 'bark', T0);
    expect(sawCollect(s, later(SAW_SECONDS * 2))).toEqual({ plank: 2 });
    expect(s.mats.plank).toBe(2);
    expect(sawCollect(s, later(SAW_SECONDS * 3))).toEqual({});
  });

  test('an order made later starts its own clock', () => {
    const s = mill();
    s.mats.bark = 20;
    sawOrder(s, 1, 'bark', T0);
    sawUpdate(s, later(1000));
    sawOrder(s, 1, 'bark', later(1000));
    expect(ready(s, later(1000 + SAW_SECONDS - 1))).toBe(1);
    expect(ready(s, later(1000 + SAW_SECONDS))).toBe(2);
  });

  test('the bench holds at most SAW_MAX planks, sawing or waiting', () => {
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
    expect(sawCollect(s, later(sawSeconds(s) * 10))).toEqual({ plank: 1, glimplank: 2, emberplank: 1 });
    expect([s.mats.plank, s.mats.glimplank, s.mats.emberplank, s.mats.pineplank]).toEqual([1, 2, 1, 0]);
  });

  test("a save from before plank kinds keeps its sawing: it was all Oak", () => {
    const s = mill(1);
    (s as unknown as { sawmill: unknown }).sawmill = { queued: 2, ready: 3, since: T0 };
    const w = sawUpdate(s, later(SAW_SECONDS));
    expect({ queue: w.queue, ready: w.ready }).toEqual({ queue: ['bark'], ready: { plank: 4 } });
  });
});
