import { describe, expect, test } from 'bun:test';
import { EchoCave, ECHO_OUTSIDE } from '../src/echoCave';
import { MOUTH, POPPY_AT, LANDING } from '../src/procession';
import { loadState, newState, saveState } from '../src/state';
import { T, World } from '../src/world';

describe('the separate underground cave', () => {
  test('the chamber and recovery tunnel exist only underground, with a reachable outside mouth', () => {
    const outside = new World(), inside = new EchoCave();
    for (const p of [POPPY_AT, LANDING]) {
      expect(outside.tile(Math.floor(p.x), Math.floor(p.y))).toBe(T.OBST);
      expect(inside.blocked(p.x, p.y, .28)).toBe(false);
    }
    expect(outside.blocked(ECHO_OUTSIDE.x, ECHO_OUTSIDE.y, .28)).toBe(false);
    expect(inside.blocked(MOUTH.x, MOUTH.y, .28)).toBe(false);
    expect(inside.solidAt(inside.x0 - .5, 3)).toBe(true);
    expect(inside.solidAt(inside.x0 + inside.w + .5, 3)).toBe(true);
  });

  test('old tunnel saves migrate without replaying the quest or losing rewards', () => {
    const store: Record<string, string> = {};
    globalThis.localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } } as Storage;
    const s = newState();
    s.pos = { ...POPPY_AT }; s.stories.drums = 4; s.perks.push('echoanklet'); s.mats.iron = 17;
    saveState(s);
    const loaded = loadState()!;
    expect(loaded.underground).toEqual({ id: 'echo', ...POPPY_AT });
    expect(loaded.pos).toEqual(ECHO_OUTSIDE);
    expect(loaded.stories.drums).toBe(4);
    expect(loaded.perks).toEqual(['echoanklet']);
    expect(loaded.mats.iron).toBe(17);
    saveState(loaded);
    expect(loadState()).toEqual(loaded);
  });
});
