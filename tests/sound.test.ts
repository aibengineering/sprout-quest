import { afterEach, describe, expect, test } from 'bun:test';
import { loadSound, saveSound } from '../src/sound';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
afterEach(() => store.clear());

describe('sound settings', () => {
  test('default to everything on (the music at 70%, under the effects), and carry an old save’s mute over', () => {
    expect(loadSound()).toEqual({ muted: false, music: 0.7, effects: 1 });
    expect(loadSound(true).muted).toBe(true);
  });

  test('are kept, and a broken or out-of-range entry falls back to the defaults', () => {
    saveSound({ muted: true, music: 0, effects: 0.35 });
    expect(loadSound()).toEqual({ muted: true, music: 0, effects: 0.35 });
    store.set('sprout-quest-sound', JSON.stringify({ music: 7, effects: 'loud' }));
    expect(loadSound()).toEqual({ muted: false, music: 0.7, effects: 1 });
    store.set('sprout-quest-sound', '{nope');
    expect(loadSound()).toEqual({ muted: false, music: 0.7, effects: 1 });
  });
});
