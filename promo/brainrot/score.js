// The one timeline both the music and the picture read, so every cut lands on a beat.
// 160 BPM, 16 steps per bar: a bar is 1.5 s, a beat 0.375 s, a step 0.09375 s.

export const BPM = 160;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const STEP = BEAT / 4;
export const END = 33;
export const bar = (b, step = 0) => b * BAR + step * STEP;

// Scenes, in bars: intro 0-1, chop 2-3, mine 4-5, slime fight 6-8, forge 9-10, sawmill 11-12, farm 13-14,
// breakdown 15, dragon 16-17, title 18+.
export const SCENES = {
  intro: [0, bar(2)],
  chop: [bar(2), bar(4)],
  mine: [bar(4), bar(6)],
  fight: [bar(6), bar(9)],
  forge: [bar(9), bar(11)],
  saw: [bar(11), bar(13)],
  farm: [bar(13), bar(15)],
  dark: [bar(15), bar(16)],
  dragon: [bar(16), bar(18)],
  title: [bar(18), END],
};

// The slime combo: eighths, then sixteenths, then the finisher on the bar line.
export const COMBO_HITS = [
  ...[0, 2, 4, 6, 8].map((s) => bar(7, s)),
  ...[10, 11, 12, 13, 14, 15].map((s) => bar(7, s)),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((s) => bar(8, s)),
];
export const KO = bar(8, 8);

/** MIDI note for a name like 'Ab5'. */
export function midi(name) {
  const m = /^([A-G]b?)(-?\d)$/.exec(name);
  const pc = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 }[m[1]];
  return 12 * (+m[2] + 1) + pc;
}

/** Every musical and sound-effect event, in seconds. The music schedules all of them; the picture reacts to some. */
export function events() {
  const ev = [];
  const add = (t, type, o = {}) => ev.push({ t, type, ...o });

  // --- Intro: Grieg's "Morning Mood" (public domain), the flute's sunrise phrase in F major, twice. ---
  // mi-do-ti-la-ti-do, then the record scratch cuts the second one short.
  const morning = [[0, 'A5', 2], [2, 'F5', 2], [4, 'E5', 2], [6, 'D5', 2], [8, 'E5', 2], [10, 'F5', 4],
    [14, 'A5', 2], [16, 'F5', 2], [18, 'E5', 2], [20, 'D5', 2], [22, 'E5', 2], [24, 'F5', 3]];
  for (const [s, n, d] of morning) {
    add(s * STEP, 'flute', { n: midi(n), dur: d * STEP });
    add(s * STEP, 'musicbox', { n: midi(n) + 12 });
  }
  add(0, 'pad', { notes: ['F2', 'C3', 'F3', 'A3', 'C4'].map(midi), dur: bar(1, 11) });
  for (const s of [0, 8, 16, 24]) add(s * STEP, 'softkick');
  add(bar(1, 11), 'scratch');
  add(bar(1, 13), 'whoosh', { dur: STEP * 3 });

  // --- From the drop: Grieg's "In the Hall of the Mountain King" (public domain) as phonk, in F minor. ---
  // Each bar is one bar of the tune: [step, semitones above F, length in steps].
  const KING = [
    [[0, 0, 2], [2, 2, 2], [4, 3, 2], [6, 5, 2], [8, 7, 2], [10, 3, 2], [12, 7, 4]], // F G Ab Bb C Ab C
    [[0, 6, 2], [2, 2, 2], [4, 6, 4], [8, 5, 2], [10, 1, 2], [12, 5, 4]], //             B G B  Bb Gb Bb
    [[0, 0, 2], [2, 2, 2], [4, 3, 2], [6, 5, 2], [8, 7, 2], [10, 3, 2], [12, 7, 2], [14, 12, 2]], // ...up to F
    [[0, 10, 2], [2, 7, 2], [4, 3, 2], [6, 7, 2], [8, 10, 8]], //                         Eb C Ab C Eb
  ];
  const KING_BASS = [
    [[0, 'F1'], [6, 'F1'], [10, 'Ab1']],
    [[0, 'C2'], [6, 'C2'], [10, 'Bb1'], [13, 'G1', 'slide']],
    [[0, 'F1'], [6, 'F1'], [10, 'C2']],
    [[0, 'Db1'], [6, 'Db1'], [10, 'C2', 'slide']],
  ];
  const TOP = midi('F5');
  const MAJOR = { 0: 0, 2: 2, 3: 4, 5: 5, 7: 7, 12: 12 };
  const THIRD_BELOW = { 0: -3, 2: -1, 4: 0, 5: 2, 7: 4, 12: 9 };
  /** The tune on the cowbell and a supersaw lead, with optional octaves, a harmony, major mode and double time. */
  const tune = (b, notes, { oct = 0, low = 0, harm = false, major = false, speed = 1, at = 0 } = {}) => {
    for (const [s, i0, d] of notes) {
      const i = major ? MAJOR[i0] : i0, t = bar(b, at + s / speed), dur = (d / speed) * STEP * (d > 2 ? 0.95 : 0.8);
      add(t, 'cowbell', { n: TOP + i });
      add(t, 'lead', { n: TOP + i, dur });
      if (oct) add(t, 'lead', { n: TOP + 12 + i, dur, v: oct });
      if (low) add(t, 'lead', { n: TOP - 12 + i, dur, v: low });
      if (harm) add(t, 'lead', { n: TOP + THIRD_BELOW[i], dur, v: 0.6 });
    }
  };
  const bassLine = (b, line) => line.forEach(([s, r, slide], i) => {
    const next = line[i + 1] ? line[i + 1][0] : 16;
    add(bar(b, s), 'bass', { n: midi(r), dur: (next - s) * STEP, slide: !!slide, from: slide ? midi(line[i - 1][1]) : 0 });
  });
  const drums = (b, opts = {}) => {
    const t0 = bar(b);
    const kicks = opts.kicks ?? (b % 2 ? [0, 6, 10, 13] : [0, 6, 10]);
    for (const s of kicks) add(t0 + s * STEP, 'kick', { big: s === 0 });
    for (const s of [4, 12]) add(t0 + s * STEP, 'clap');
    const hats = opts.sixteenths ? [...Array(16).keys()] : [0, 2, 4, 6, 8, 10, 12, 14];
    for (const s of hats) add(t0 + s * STEP, 'hat', { v: s % 4 === 2 ? 1 : 0.55 });
    if (b % 4 === 3 && !opts.sixteenths) for (const s of [13, 15]) add(t0 + s * STEP, 'hat', { v: 0.5 });
    if (b % 4 === 3) for (let i = 0; i < 3; i++) add(t0 + 14 * STEP + i * STEP * 2 / 3, 'hat', { v: 0.7 });
  };

  add(bar(2), 'boom', { big: true });
  // Three and a bit statements, building: the lead gains an octave above from the slime fight on.
  for (let b = 2; b <= 14; b++) {
    const m = (b - 2) % 4;
    drums(b, { sixteenths: b >= 6 && b <= 8 });
    bassLine(b, KING_BASS[m]);
    tune(b, KING[m], { oct: b < 6 ? 0 : b < 10 ? 0.45 : 0.35 });
  }

  // Chop: four axe hits, the tree falls on beat 2 of bar 3, logs pop, coins.
  for (const s of [0, 4, 8, 12]) add(bar(2, s), 'chop');
  add(bar(3, 0), 'chop');
  add(bar(3, 0), 'whoosh', { dur: BEAT * 1.2, down: true });
  add(bar(3, 6), 'thud');
  for (const s of [9, 10, 11]) add(bar(3, s), 'pop', { p: s - 9 });
  add(bar(3, 13), 'ding');

  // Mine: clinks, a crystal shatter, an aura riser, rapid clinks.
  add(bar(4), 'boom');
  for (const s of [0, 4]) add(bar(4, s), 'clink');
  add(bar(4, 8), 'shatter');
  for (const s of [9, 10, 11, 12]) add(bar(4, s), 'pop', { p: s - 7 });
  add(bar(5), 'boom', { big: true });
  add(bar(5), 'aura');
  for (const s of [12, 14]) add(bar(5, s), 'clink', { hi: true });
  add(bar(5, 12), 'whoosh', { dur: BEAT });

  // Slime fight.
  add(bar(6), 'boom', { big: true });
  add(bar(6), 'horn', { pattern: 'stab' });
  add(bar(6, 8), 'slash');
  add(bar(6, 9), 'squish');
  add(bar(6, 12), 'slash');
  add(bar(6, 13), 'squish');
  COMBO_HITS.forEach((t, i) => add(t, 'hit', { i }));
  add(KO, 'boom', { big: true });
  add(KO, 'ko');
  for (const s of [12, 13, 14]) add(bar(8, s), 'ding', { p: s - 12 });
  add(bar(9) - STEP * 2, 'levelup');

  // Forge.
  add(bar(9), 'boom');
  for (const s of [0, 4, 8, 12]) add(bar(9, s), 'clang', { p: s / 4 });
  add(bar(10), 'whoosh', { dur: BEAT * 1.6 });
  add(bar(10, 6), 'equip');
  add(bar(10, 8), 'horn', { pattern: 'stab' });

  // Sawmill: a buzzing blade in time, planks pop out.
  add(bar(11), 'boom');
  add(bar(11), 'saw', { dur: BAR * 2 });
  add(bar(11, 8), 'brrr', { dur: BEAT * 2 });
  for (const s of [0, 3, 6]) add(bar(12, s), 'pop', { p: s / 3 + 1 });
  add(bar(12, 8), 'ding');

  // Farm: sprouts pop in a rising scale, Poppy bounces, Granny's cookies.
  add(bar(13), 'boom');
  for (const [s, p] of [[6, 0], [8, 1], [10, 2], [12, 3], [13, 4], [14, 5], [15, 6]]) add(bar(13, s), 'pop', { p });
  add(bar(14), 'boing');
  add(bar(14, 4), 'boing', { p: 1 });
  add(bar(14, 12), 'ding', { p: 2 });

  // Breakdown: the beat drops out, a heartbeat, a riser, then silence.
  add(bar(15), 'scratch', { short: true });
  add(bar(15), 'drone', { dur: BAR });
  for (const s of [0, 2, 8, 10]) add(bar(15, s), 'heart', { v: s < 8 ? 0.8 : 1 });
  add(bar(15), 'riser', { dur: BAR - STEP * 2 });
  // The tune's first bar, low and sneaky, the way the piece itself begins.
  for (const [s, i, d] of KING[0]) add(bar(15, s), 'creep', { n: midi('F3') + i, dur: d * STEP });

  // Dragon: a roar and the heaviest groove.
  add(bar(16), 'boom', { big: true });
  add(bar(16), 'roar');
  // The whole tune in double time, the piece's frantic climax without changing tempo.
  for (const b of [16, 17]) drums(b, { kicks: [0, 3, 6, 8, 10, 12, 14], sixteenths: true });
  bassLine(16, [[0, 'F1'], [3, 'F1'], [6, 'F1'], [8, 'C2'], [10, 'C2'], [12, 'Bb1'], [14, 'G1', 'slide']]);
  bassLine(17, [[0, 'F1'], [3, 'F1'], [6, 'F1'], [8, 'Db1'], [10, 'Db1'], [12, 'C2', 'slide'], [14, 'C2']]);
  KING.forEach((notes, m) => tune(16 + (m >> 1), notes, { speed: 2, at: (m % 2) * 8, oct: 0.45, low: 0.5 }));
  add(bar(16, 8), 'horn', { pattern: 'triple' });
  for (const s of [0, 4, 8]) add(bar(17, s), 'boom', { big: s === 0 });
  add(bar(17, 10), 'riser', { dur: STEP * 6 });

  // Title.
  add(bar(18), 'boom', { big: true });
  add(bar(18), 'horn', { pattern: 'triple' });
  // Triumphant: the tune in F major, harmonised in thirds, cadencing onto the final chord.
  for (const b of [18, 19]) drums(b);
  bassLine(18, [[0, 'F1'], [6, 'F1'], [10, 'C2']]);
  bassLine(19, [[0, 'Bb1'], [6, 'Bb1'], [10, 'C2'], [13, 'C2']]);
  tune(18, KING[0], { major: true, harm: true, oct: 0.35 });
  tune(19, KING[2], { major: true, harm: true, oct: 0.35 });
  for (let i = 0; i < 11; i++) add(bar(18, 4) + i * STEP, 'pop', { p: i % 7 });
  add(bar(19), 'stamp');
  add(bar(19, 8), 'ding', { p: 1 });
  add(bar(20), 'boom', { big: true });
  add(bar(20), 'horn', { pattern: 'long' });
  add(bar(20), 'finale');
  for (const n of ['F5', 'A5', 'C6', 'F6']) add(bar(20), 'lead', { n: midi(n), dur: 1.2, v: n === 'F6' ? 0.4 : 0.7 });

  ev.sort((a, b) => a.t - b.t);
  return ev;
}

/** Times the camera punches in: every kick and boom. */
export function punches() {
  return events().filter((e) => e.type === 'kick' || e.type === 'boom' || e.type === 'softkick' || e.type === 'heart')
    .map((e) => ({ t: e.t, amt: e.type === 'boom' ? (e.big ? 0.2 : 0.13) : e.type === 'kick' ? (e.big ? 0.07 : 0.045) : 0.02, shake: e.type === 'boom' ? (e.big ? 34 : 20) : e.type === 'heart' ? 8 : e.big ? 6 : 0 }));
}
