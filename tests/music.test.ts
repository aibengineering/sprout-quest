import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { ZONES } from '../src/data';
import { orchestrate, parseChords, parseLine, pick, samplesFor, type SampleIndex } from '../src/music/orchestra';
import { FIRST_THEMES, THEMES, battleTheme, BATTLE_THEMES, zoneTheme, type ThemeId } from '../src/music/scores';

const index = JSON.parse(readFileSync('public/music/index.json', 'utf8')) as SampleIndex;
const size = (files: Iterable<string>) => [...files].reduce((n, f) => n + statSync(`public/music/${f}`).size, 0);
const MB = 1024 * 1024;

describe('music', () => {
  test('every note of every theme has its recording shipped, re-pitched by at most a few semitones', () => {
    for (const [id, score] of Object.entries(THEMES)) {
      const { notes, length } = orchestrate(score);
      expect({ id, loopBars: length / score.beatsPerBar }).toEqual({ id, loopBars: 16 });
      for (const n of notes) {
        const s = pick(index, n.inst, n.midi, n.vel);
        expect({ id, inst: n.inst, shipped: !!s && existsSync(`public/music/${s.file}`) }).toEqual({ id, inst: n.inst, shipped: true });
        // Stretched further than this, a recording starts to sound like a different instrument. (The horn has no
        // recordings between middle C and D5, so its tunes stretch further.)
        const most = n.inst === 'horn' ? 7 : 4;
        if (n.midi != null) expect({ id, inst: n.inst, midi: n.midi, far: Math.abs(n.midi - s!.midi!) > most }).toEqual({ id, inst: n.inst, midi: n.midi, far: false });
      }
    }
  });

  test('nothing is shipped that no theme plays (re-run `bun run music` after changing a score)', () => {
    const played = new Set(Object.values(THEMES).flatMap((s) => [...samplesFor(index, s)]));
    const shipped = Object.values(index).flat().map((e) => e.file);
    expect(shipped.filter((f) => !played.has(f))).toEqual([]);
  });

  test('it stays small: the opening loads quickly, and the whole orchestra is a few MB', () => {
    const first = new Set(FIRST_THEMES.flatMap((id) => [...samplesFor(index, THEMES[id])]));
    const all = Object.values(index).flat().map((e) => e.file);
    expect(size(first)).toBeLessThan(1.5 * MB);
    expect(size(all)).toBeLessThan(3.5 * MB);
  });

  test('ordinary fights use their arena region, with bosses taking priority and meadow as fallback', () => {
    for (const [zone, theme] of Object.entries(BATTLE_THEMES)) {
      expect(battleTheme(zone)).toBe(theme);
      expect(battleTheme(zone, true)).toBe('guardian');
    }
    expect(battleTheme('unknown')).toBe('battleMeadow');
    expect(battleTheme('toString')).toBe('battleMeadow');
    expect(battleTheme('unknown', true)).toBe('guardian');
    expect(FIRST_THEMES).toEqual(['glade', 'battleMeadow']);
  });

  test('regional phrases fit their bars and preserve breathing room, without the old heavy opening', () => {
    const scores = [...new Set(Object.values(BATTLE_THEMES))].map((id) => THEMES[id]);
    expect(new Set(scores.map((s) => s.lines.theme)).size).toBe(5);
    for (const score of scores) {
      const length = parseChords(score.chords).length;
      for (const line of Object.values(score.lines)) {
        expect(parseLine(line).length).toBe(length);
        for (const bar of line.split('|')) expect(parseLine(bar.trim()).length).toBe(score.beatsPerBar);
      }
      expect(orchestrate(score).notes.every((n) => n.t >= 0 && n.t < length && n.dur > 0 && n.vel > 0 && n.vel <= 1)).toBe(true);
    }
    expect(THEMES.battleMeadow.parts.every((p) => !['horn', 'trumpet', 'trombone', 'timpani', 'bassdrum', 'snare', 'crash'].includes(p.inst))).toBe(true);
  });

  test('every area has a theme', () => {
    for (const z of ZONES) expect(Object.keys(THEMES)).toContain(zoneTheme(z.id) satisfies ThemeId);
  });
});
