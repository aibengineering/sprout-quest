import { describe, expect, test } from 'bun:test';
import pkg from '../package.json';
import { newerThan } from '../src/semver';
import { PATCH_NOTES, VERSION } from '../src/version';

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
});
