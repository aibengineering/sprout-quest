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

  // --- Intro: a cosy music box in F major, then a record scratch. ---
  const box = [
    ['C5', 0], ['F5', 2], ['A5', 4], ['C6', 6], ['A5', 8], ['Bb5', 10], ['A5', 12], ['G5', 14],
    ['F5', 16], ['A5', 18], ['G5', 20], ['E5', 22], ['F5', 24], ['C6', 26],
  ];
  for (const [n, s] of box) add(s * STEP, 'musicbox', { n: midi(n) });
  add(0, 'pad', { notes: ['F3', 'A3', 'C4', 'E4'].map(midi), dur: BAR });
  add(BAR, 'pad', { notes: ['Bb2', 'D3', 'F3', 'A3'].map(midi), dur: BAR * 0.7 });
  for (const s of [0, 8, 16, 24]) add(s * STEP, 'softkick');
  add(bar(1, 11), 'scratch');
  add(bar(1, 13), 'whoosh', { dur: STEP * 3 });

  // --- The drop: phonk at 160. ---
  const roots = { F: 'F1', Ab: 'Ab1', Db: 'Db1', Eb: 'Eb1', C: 'C2', Bb: 'Bb1' };
  const bassBars = [
    [[0, 'F'], [6, 'F'], [10, 'Ab']],
    [[0, 'Db'], [6, 'Db'], [10, 'Eb'], [13, 'C', 'slide']],
  ];
  const bell = [
    [[0, 'F5'], [3, 'F5'], [6, 'Ab5'], [8, 'G5'], [10, 'F5'], [11, 'Eb5'], [12, 'F5'], [14, 'C6']],
    [[0, 'Db6'], [3, 'C6'], [6, 'Ab5'], [8, 'Bb5'], [10, 'Ab5'], [12, 'G5'], [13, 'Eb5'], [14, 'F5']],
  ];
  const bellHi = [
    [[0, 'C6'], [2, 'Ab5'], [3, 'C6'], [6, 'Eb6'], [8, 'Db6'], [10, 'C6'], [12, 'Ab5'], [14, 'Bb5'], [15, 'C6']],
    [[0, 'Db6'], [2, 'F6'], [3, 'Eb6'], [6, 'Db6'], [8, 'C6'], [10, 'Bb5'], [12, 'Ab5'], [13, 'G5'], [14, 'F5']],
  ];
  const groove = (b, opts = {}) => {
    const t0 = bar(b);
    const alt = b % 2;
    const kicks = opts.kicks ?? (alt ? [0, 6, 10, 13] : [0, 6, 10]);
    for (const s of kicks) add(t0 + s * STEP, 'kick', { big: s === 0 });
    for (const s of [4, 12]) add(t0 + s * STEP, 'clap');
    const hats = opts.sixteenths ? [...Array(16).keys()] : [0, 2, 4, 6, 8, 10, 12, 14];
    for (const s of hats) add(t0 + s * STEP, 'hat', { v: s % 4 === 2 ? 1 : 0.55 });
    if (b % 4 === 3 && !opts.sixteenths) for (const s of [13, 15]) add(t0 + s * STEP, 'hat', { v: 0.5 });
    if (b % 4 === 3) for (let i = 0; i < 3; i++) add(t0 + 14 * STEP + i * STEP * 2 / 3, 'hat', { v: 0.7 });
    const bars = bassBars[alt];
    bars.forEach(([s, r, slide], i) => {
      const next = bars[i + 1] ? bars[i + 1][0] : 16;
      add(t0 + s * STEP, 'bass', { n: midi(roots[r]), dur: (next - s) * STEP, slide: !!slide, from: slide ? midi(roots[bars[i - 1][1]]) : 0 });
    });
    if (opts.bell !== false) for (const [s, n] of (opts.hi ? bellHi : bell)[alt]) add(t0 + s * STEP, 'cowbell', { n: midi(n) });
  };

  add(bar(2), 'boom', { big: true });
  for (let b = 2; b <= 14; b++) groove(b, { sixteenths: b >= 6 && b <= 8, hi: (b >= 6 && b <= 8) || b === 12 });

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

  // Dragon: a roar and the heaviest groove.
  add(bar(16), 'boom', { big: true });
  add(bar(16), 'roar');
  for (const b of [16, 17]) groove(b, { kicks: [0, 3, 6, 8, 10, 12, 14], sixteenths: true, hi: true });
  add(bar(16, 8), 'horn', { pattern: 'triple' });
  for (const s of [0, 4, 8]) add(bar(17, s), 'boom', { big: s === 0 });
  add(bar(17, 10), 'riser', { dur: STEP * 6 });

  // Title.
  add(bar(18), 'boom', { big: true });
  add(bar(18), 'horn', { pattern: 'triple' });
  for (const b of [18, 19]) groove(b, {});
  for (let i = 0; i < 11; i++) add(bar(18, 4) + i * STEP, 'pop', { p: i % 7 });
  add(bar(19), 'stamp');
  add(bar(19, 8), 'ding', { p: 1 });
  add(bar(20), 'boom', { big: true });
  add(bar(20), 'horn', { pattern: 'long' });
  add(bar(20), 'finale');

  ev.sort((a, b) => a.t - b.t);
  return ev;
}

/** Times the camera punches in: every kick and boom. */
export function punches() {
  return events().filter((e) => e.type === 'kick' || e.type === 'boom' || e.type === 'softkick' || e.type === 'heart')
    .map((e) => ({ t: e.t, amt: e.type === 'boom' ? (e.big ? 0.2 : 0.13) : e.type === 'kick' ? (e.big ? 0.07 : 0.045) : 0.02, shake: e.type === 'boom' ? (e.big ? 34 : 20) : e.type === 'heart' ? 8 : e.big ? 6 : 0 }));
}
