// Music as code, played by a real orchestra: scores are written as sections doing jobs over a chord progression, and
// each note is a recording from VSCO 2 Community Edition (CC0), re-pitched to the nearest sample. Pure functions here
// (no browser), so the sample packer (art/music/pack.ts) and the tests can work out exactly which recordings play.

/** One section's job in a score. Exactly one of `from`, `pad`, `ostinato` or `hits` says what it does. */
export interface Part {
  inst: string;
  vel?: number;
  /** Bars it plays in (1-based, inclusive): sections come in and drop out, so each loop builds. */
  bars?: [number, number];
  /** Play a written line, shifted by `octave`; notes of `shortBelow` beats or less use the `short` instrument. */
  from?: string;
  octave?: number;
  short?: string;
  shortBelow?: number;
  /** Hold each chord, voiced around this pitch. */
  pad?: number;
  /** A repeating figure of chord degrees (R 3 5 7 8 10 12 -5 -3 -8, - rests), a note every `rate` beats. */
  ostinato?: string;
  rate?: number;
  centre?: number;
  hold?: number;
  /** Which of the ostinato's notes lean in (>) and which sit back (.). */
  accents?: string;
  /** Build the ostinato on a slash chord's bass note rather than its root. */
  slash?: boolean;
  /** A one-bar rhythm in 16ths (X loud, x soft); `fill` replaces it every `every` bars; `onBars` limits it. */
  hits?: string;
  fill?: string;
  every?: number;
  onBars?: number[];
  /** For pitched hits (timpani): the chord degree to play, and its length in beats. */
  degree?: string;
  len?: number;
}

export interface Score {
  bpm: number;
  beatsPerBar: number;
  /** Chord symbols with beats: "Dm:4 Bb:4 C/E:4". */
  chords: string;
  /** Melodies: "D5:1.5 E5:.5 F5 | A5:2 -:2" (note:beats; the length carries on; - is a rest; + stacks notes). */
  lines: Record<string, string>;
  parts: Part[];
}

export interface Note {
  t: number;
  dur: number;
  inst: string;
  midi: number | null;
  vel: number;
}

export interface Sample {
  file: string;
  midi: number | null;
  vel: 'soft' | 'loud';
  gain: number;
}
export type SampleIndex = Record<string, Sample[]>;

// ------------------------------------------------------------------ notation

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pitchClass = (name: string) => LETTER[name[0]] + (name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0);

export function midiOf(name: string) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (Number(m[2]) + 1) + pitchClass(m[1]);
}

export function parseLine(text: string) {
  const events: { t: number; dur: number; midis: number[] }[] = [];
  let t = 0, dur = 1;
  for (const tok of text.split(/\s+/).filter((x) => x && x !== '|')) {
    const [what, d] = tok.split(':');
    if (d) dur = Number(d);
    if (what !== '-') events.push({ t, dur, midis: what.split('+').map(midiOf) });
    t += dur;
  }
  return { events, length: t };
}

const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus4: [0, 5, 7], sus2: [0, 2, 7], dim: [0, 3, 6], add9: [0, 4, 7, 14],
};

export interface Chord { t: number; dur: number; root: number; bass: number; tones: number[] }

export function parseChords(text: string) {
  const chords: Chord[] = [];
  let t = 0;
  for (const tok of text.split(/\s+/).filter((x) => x && x !== '|')) {
    const [sym, d] = tok.split(':');
    const m = /^([A-G][#b]?)(maj7|m7|m|7|sus4|sus2|dim|add9)?(?:\/([A-G][#b]?))?$/.exec(sym);
    if (!m) throw new Error(`bad chord ${sym}`);
    const root = pitchClass(m[1]);
    chords.push({ t, dur: Number(d), root, bass: m[3] ? pitchClass(m[3]) : root, tones: QUALITY[m[2] ?? ''].map((i) => root + i) });
    t += Number(d);
  }
  return { chords, length: t };
}

// ------------------------------------------------------------------ orchestration

const degree = (c: Chord, d: string) => {
  const third = c.tones[1] - c.tones[0], fifth = c.tones[2] - c.tones[0], seventh = c.tones[3] != null ? c.tones[3] - c.tones[0] : 10;
  const off: Record<string, number> = { R: 0, 3: third, 5: fifth, 7: seventh, 8: 12, 10: third + 12, 12: fifth + 12, 15: 24, '-5': fifth - 12, '-3': third - 12, '-8': -12 };
  if (off[d] == null) throw new Error(`bad degree ${d}`);
  return off[d];
};
const mod12 = (n: number) => ((n % 12) + 12) % 12;
/** The chord's tones in close position around `centre`, like a section holding it. */
const voicing = (c: Chord, centre: number) => c.tones.map((pc) => centre - 6 + mod12(pc - (centre - 6))).sort((a, b) => a - b);
/** The chord's root (or slash bass) at or just below `centre`. */
const rootNear = (c: Chord, centre: number, slash = false) => centre - mod12(centre - (slash ? c.bass : c.root));

/** Turns a score into one loop of notes, sorted by time (beats). */
export function orchestrate(score: Score): { notes: Note[]; length: number } {
  const { chords, length } = parseChords(score.chords);
  const bar = score.beatsPerBar, notes: Note[] = [];
  const chordAt = (t: number) => chords.find((c) => t >= c.t - 1e-6 && t < c.t + c.dur - 1e-6) ?? chords[0];
  for (const p of score.parts) {
    const [from, to] = p.bars ?? [1, Infinity];
    const vel = p.vel ?? 0.8;
    const add = (t: number, dur: number, midi: number | null, v = vel, inst = p.inst) => {
      const b = Math.floor(t / bar + 1e-6) + 1;
      if (b >= from && b <= to) notes.push({ t, dur, inst, midi, vel: v });
    };
    if (p.from) {
      for (const e of parseLine(score.lines[p.from]).events) for (const m of e.midis) {
        add(e.t, e.dur, m + 12 * (p.octave ?? 0), vel, p.short && e.dur <= (p.shortBelow ?? 0.5) ? p.short : p.inst);
      }
    } else if (p.pad != null) {
      for (const c of chords) for (const m of voicing(c, p.pad)) add(c.t, c.dur, m);
    } else if (p.ostinato) {
      const steps = p.ostinato.split(/\s+/), rate = p.rate ?? 1;
      for (const c of chords) {
        const base = rootNear(c, p.centre ?? 48, p.slash);
        for (let t = 0, i = 0; t < c.dur - 1e-6; t += rate, i++) {
          const d = steps[i % steps.length];
          if (d === '-') continue;
          const lean = p.accents ? (p.accents[i % p.accents.length] === '>' ? 1.15 : 0.8) : 1;
          add(c.t + t, rate * (p.hold ?? 1), base + degree(c, d), vel * lean);
        }
      }
    } else if (p.hits) {
      for (let bt = 0, n = 1; bt < length; bt += bar, n++) {
        if (p.onBars && !p.onBars.includes(n)) continue;
        const pat = p.fill && n % (p.every ?? 4) === 0 ? p.fill : p.hits;
        [...pat.replace(/\s/g, '')].forEach((ch, i) => {
          if (ch === '.') return;
          const t = bt + i * 0.25, c = chordAt(t);
          add(t, p.len ?? 0.25, p.degree ? rootNear(c, p.centre ?? 45) + degree(c, p.degree) : null, vel * (ch === 'X' ? 1 : 0.7));
        });
      }
    }
  }
  return { notes: notes.sort((a, b) => a.t - b.t), length };
}

/**
 * The recording a note plays: the nearest recorded pitch in the right dynamic layer (soft under 0.55), or for drums
 * and cymbals, the softer or the harder hit. Deterministic, so the packer ships exactly these.
 */
export function pick(index: SampleIndex, inst: string, midi: number | null, vel: number): Sample | null {
  const all = index[inst];
  if (!all?.length) return null;
  if (midi == null) return all.reduce((a, b) => ((vel > 0.75 ? b.gain > a.gain : b.gain < a.gain) ? b : a));
  const nearest = (pool: Sample[]) => pool.reduce((best, e) => (Math.abs(e.midi! - midi) < Math.abs(best.midi! - midi) ? e : best));
  const layer = all.filter((e) => e.vel === (vel < 0.55 ? 'soft' : 'loud'));
  const best = nearest(layer.length ? layer : all);
  // Past the layer's recorded range (the loud horns stop at middle C), the other layer's note sounds more natural
  // than stretching this one far.
  return Math.abs(best.midi! - midi) > 3 ? nearest(all) : best;
}

/** Every recording a score plays. */
export function samplesFor(index: SampleIndex, score: Score): Set<string> {
  const files = new Set<string>();
  for (const n of orchestrate(score).notes) {
    const s = pick(index, n.inst, n.midi, n.vel);
    if (s) files.add(s.file);
  }
  return files;
}
