import { describe, expect, test } from 'bun:test';
import { LOGS_PER_PLANK, SAW_MAX, SAW_SECONDS, canOrder, nextPlankIn, sawCollect, sawOrder, sawUpdate } from '../src/sawmill';
import { newState } from '../src/state';

const T0 = 1_000_000;
const later = (s: number) => T0 + s * 1000;

describe("Bram's Sawmill", () => {
  test('takes two logs a plank, and only what you can pay for', () => {
    const s = newState();
    s.mats.bark = 5;
    expect(canOrder(s, T0)).toBe(2);
    expect(sawOrder(s, 5, T0)).toBe(2);
    expect(s.mats.bark).toBe(5 - 2 * LOGS_PER_PLANK);
    expect(sawOrder(s, 1, T0)).toBe(0);
  });

  test('saws one plank every SAW_SECONDS of real time, even while you are away', () => {
    const s = newState();
    s.mats.bark = 20;
    sawOrder(s, 3, T0);
    expect(nextPlankIn(s, T0)).toBe(SAW_SECONDS);
    expect(sawUpdate(s, later(SAW_SECONDS - 1)).ready).toBe(0);
    expect(sawUpdate(s, later(SAW_SECONDS)).ready).toBe(1);
    // A long time away: everything's done, and no more.
    const w = sawUpdate(s, later(SAW_SECONDS * 50));
    expect({ queued: w.queued, ready: w.ready }).toEqual({ queued: 0, ready: 3 });
  });

  test('collecting puts the planks in your bag', () => {
    const s = newState();
    s.mats.bark = 20;
    sawOrder(s, 2, T0);
    expect(sawCollect(s, later(SAW_SECONDS * 2))).toBe(2);
    expect(s.mats.plank).toBe(2);
    expect(sawCollect(s, later(SAW_SECONDS * 3))).toBe(0);
  });

  test('an order made later starts its own clock', () => {
    const s = newState();
    s.mats.bark = 20;
    sawOrder(s, 1, T0);
    sawUpdate(s, later(1000));
    sawOrder(s, 1, later(1000));
    expect(sawUpdate(s, later(1000 + SAW_SECONDS - 1)).ready).toBe(1);
    expect(sawUpdate(s, later(1000 + SAW_SECONDS)).ready).toBe(2);
  });

  test('the bench holds at most SAW_MAX planks, sawing or waiting', () => {
    const s = newState();
    s.mats.bark = 999;
    expect(sawOrder(s, 999, T0)).toBe(SAW_MAX);
    expect(canOrder(s, T0)).toBe(0);
  });
});
