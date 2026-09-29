import { describe, expect, test } from 'bun:test';
import pkg from '../package.json';
import { newerThan } from '../src/semver';
import { NOTE_STYLE, PATCH_NOTES, VERSION, noteProblems } from '../src/version';

describe('version and patch notes', () => {
  test('package.json, VERSION and the newest patch notes agree', () => {
    expect(pkg.version).toBe(VERSION);
    expect(PATCH_NOTES[0].version).toBe(VERSION);
  });

  test('patch notes run newest first, each with a date and notes', () => {
    for (let i = 1; i < PATCH_NOTES.length; i++) expect(newerThan(PATCH_NOTES[i - 1].version, PATCH_NOTES[i].version)).toBe(true);
    for (const p of PATCH_NOTES) {
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.notes.length).toBeGreaterThan(0);
    }
  });

  test('versions compare by number, not as text', () => {
    expect(newerThan('0.10.0', '0.9.0')).toBe(true);
    expect(newerThan('0.2.0', '0.2.0')).toBe(false);
    expect(newerThan('0.1.0', '0.2.0')).toBe(false);
  });

  test('new games start caught up; saves from before patch notes have 0.2.0 to read', async () => {
    const store: Record<string, string> = {};
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v), removeItem: (k: string) => delete store[k] };
    const { loadState, newState, saveState } = await import('../src/state');
    expect(newState().seenVersion).toBe(VERSION);
    const old = newState() as Partial<ReturnType<typeof newState>>;
    delete old.seenVersion;
    saveState(old as ReturnType<typeof newState>);
    expect(loadState()!.seenVersion).toBe('0.1.0');
  });

  test('saves from before the Echo Queen keep their place: past her, she counts as beaten; before her, you meet her', async () => {
    const { loadState, newState, saveState } = await import('../src/state');
    const { QUESTS } = await import('../src/data');
    const at = QUESTS.findIndex((q) => q.id === 'echoqueen');
    const load = (quest: number, visited: string[]) => {
      const old = newState() as Partial<ReturnType<typeof newState>>;
      delete old.echoQueen;
      old.quest = quest;
      old.visited = visited as never;
      saveState(old as ReturnType<typeof newState>);
      return loadState()!;
    };
    // Old quest `at` was "Glimmer Hollow": not there yet, so you meet the Queen first.
    let s = load(at, ['glade', 'village', 'cave']);
    expect({ quest: QUESTS[s.quest].id, beaten: s.bosses.includes('echoqueen') }).toEqual({ quest: 'echoqueen', beaten: false });
    // Already in the Hollow on that quest: the Queen is behind you.
    s = load(at, ['glade', 'village', 'cave', 'hollow']);
    expect({ quest: QUESTS[s.quest].id, beaten: s.bosses.includes('echoqueen'), camp: s.camps.includes('hollow') }).toEqual({ quest: 'hollow', beaten: true, camp: true });
    // Further along (old "The Crystal King"): same quest as before.
    s = load(at + 1, ['glade', 'village', 'cave', 'hollow']);
    expect(QUESTS[s.quest].id).toBe('crystalking');
    // Earlier (old "The Waystone"): untouched.
    s = load(at - 1, ['glade', 'village']);
    expect({ quest: QUESTS[s.quest].id, beaten: s.bosses.includes('echoqueen') }).toEqual({ quest: 'warp', beaten: false });
  });

  test('saves from the three-level Forge keep every recipe they had (Smithy → Crystal Kiln, Master → Master)', async () => {
    const { loadState, newState, saveState } = await import('../src/state');
    for (const [was, now] of [[1, 1], [2, 4], [3, 5]]) {
      const old = newState() as Partial<ReturnType<typeof newState>>;
      delete old.forgeLevels;
      old.build!.forge = was;
      saveState(old as ReturnType<typeof newState>);
      expect({ was, now: loadState()!.build.forge }).toEqual({ was, now });
    }
    const fresh = newState();
    fresh.build.forge = 2;
    saveState(fresh);
    expect(loadState()!.build.forge).toBe(2);
  });

  test(`every release's notes are snappy: one line each (≤${NOTE_STYLE.maxLength} characters, one sentence), and not too many`, () => {
    expect(PATCH_NOTES.flatMap(noteProblems)).toEqual([]);
  });
});
