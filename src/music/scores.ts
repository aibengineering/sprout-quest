// The game's music. Melodies are written out (note:beats, bars split by |); everything else is a section of the
// orchestra doing a job over the chords (see Part in orchestra.ts). Each loops.
import type { Score } from './orchestra';

/** Dawn in the Quiet Glade: a lullaby in 3/4. Flute over harp; violins join the second time round. */
const GLADE: Score = {
  bpm: 76, beatsPerBar: 3,
  chords: 'F:3 Fmaj7:3 Dm:3 Dm7:3 Bb:3 Gm7:3 Csus4:3 C:3 F:3 Am:3 Dm:3 Bb:3 Gm7:3 C7:3 F:3 Csus4:3',
  lines: {
    theme: `A4:1.5 G4:.5 F4:1 | C5:2 A4:1 | D5:1.5 C5:.5 A4:1 | F4:3 | D5:1.5 C5:.5 Bb4:1 | A4:1 G4:1 F4:1 | G4:1.5 F4:.5 G4:1 | E4:1 G4:2 |
            A4:1.5 G4:.5 F4:1 | C5:1 E5:2 | F5:1.5 E5:.5 D5:1 | D5:2 A4:1 | Bb4:1.5 A4:.5 G4:1 | E4:1 G4:1 Bb4:1 | A4:3 | -:1 G4:1 C5:1`,
    counter: `-:3 | -:3 | -:3 | A5:1 C6:1 D6:1 | -:3 | -:3 | -:3 | C6:1 Bb5:1 G5:1 |
              -:3 | -:3 | -:3 | F5:1 A5:1 D6:1 | -:3 | -:3 | C6:2 A5:1 | -:3`,
  },
  parts: [
    { inst: 'flute', from: 'theme', octave: 1, vel: 0.7 },
    { inst: 'violins', from: 'theme', vel: 0.4, bars: [9, 16] },
    { inst: 'harp', ostinato: 'R 5 8 10 12 10', rate: 0.5, centre: 53, vel: 0.6 },
    { inst: 'celli', ostinato: 'R', rate: 3, centre: 45, vel: 0.4 },
    { inst: 'violas', pad: 60, vel: 0.35, bars: [5, 16] },
    { inst: 'violins', pad: 69, vel: 0.3, bars: [9, 16] },
    { inst: 'glock', from: 'counter', vel: 0.5 },
    { inst: 'triangle', hits: 'x...........', onBars: [1, 9], vel: 0.5 },
  ],
};

/** Sowerby, home: clarinet tune, bassoon oom-pah and pizzicato; oboe and horn join halfway. */
const SOWERBY: Score = {
  bpm: 104, beatsPerBar: 4,
  chords: 'G:4 Em:4 C:4 D:4 G:4 Bm:4 C:4 D7:4 Em:4 C:4 G:4 D:4 C:4 D:4 G:4 G:4',
  lines: {
    theme: `B4:1 D5:.5 B4:.5 G4:1 A4:1 | B4:1.5 G4:.5 E4:2 | C5:1 E5:.5 C5:.5 G4:1 C5:1 | B4:1 A4:1 F#4:1 A4:1 |
            B4:1 D5:.5 B4:.5 G4:1 D5:1 | F#5:1.5 E5:.5 D5:2 | E5:1 D5:.5 C5:.5 B4:1 C5:1 | A4:3 -:1 |
            G4:1 B4:1 E5:1 D5:.5 B4:.5 | C5:2 E5:1 C5:1 | D5:1 B4:.5 G4:.5 D5:1 G5:1 | F#5:2 A5:1 F#5:1 |
            E5:1 C5:1 E5:1 G5:1 | F#5:1 E5:1 D5:1 C5:1 | B4:2 D5:1 B4:1 | G4:3 -:1`,
    counter: `-:4 | -:4 | -:4 | -:4 | -:4 | -:4 | -:4 | -:4 |
              E4:2 G4:2 | E4:2 G4:2 | B4:2 D5:2 | A4:2 D5:2 | G4:2 C5:2 | A4:2 F#4:2 | G4:2 B4:2 | D4:3 -:1`,
  },
  parts: [
    { inst: 'clarinet', from: 'theme', short: 'clarinet_stac', vel: 0.75 },
    { inst: 'oboe', from: 'theme', vel: 0.55, bars: [9, 16] },
    { inst: 'horn', from: 'counter', vel: 0.55, bars: [9, 16] },
    { inst: 'bassoon_stac', ostinato: 'R - 5 -', rate: 1, centre: 45, vel: 0.8 },
    { inst: 'basses_pizz', ostinato: 'R - 5 -', rate: 1, centre: 40, vel: 0.8 },
    { inst: 'violins_pizz', ostinato: '- 3 - 3', rate: 1, centre: 67, vel: 0.6 },
    { inst: 'violins_pizz', ostinato: '- 5 - 5', rate: 1, centre: 67, vel: 0.55 },
    { inst: 'violins', pad: 67, vel: 0.3, bars: [9, 16] },
    { inst: 'claves', hits: '....x.......x...', vel: 0.55 },
    { inst: 'triangle', hits: 'x...............', onBars: [1, 5, 9, 13], vel: 0.5 },
  ],
};

/** Out in the world: violins lead over horns and running strings; trumpets lift the last phrase. */
const MEADOW: Score = {
  bpm: 132, beatsPerBar: 4,
  chords: 'D:4 A:4 Bm:4 G:4 D:4 A:4 G:4 A:4 Bm:4 G:4 D:4 A:4 G:4 A:4 Bm:4 D:4',
  lines: {
    theme: `D5:.5 E5:.5 F#5:1 A5:1 F#5:.5 E5:.5 | E5:2 C#5:1 A4:1 | B4:.5 C#5:.5 D5:1 F#5:1 D5:.5 B4:.5 | D5:2 B4:2 |
            A4:.5 D5:.5 F#5:1 A5:1 B5:.5 A5:.5 | G5:1 F#5:1 E5:2 | D5:.5 E5:.5 D5:.5 B4:.5 G4:1 B4:1 | A4:3 -:1 |
            F#5:1 F#5:.5 E5:.5 D5:1 B4:1 | G5:1.5 F#5:.5 E5:2 | F#5:1 A5:1 D6:1 A5:1 | C#6:1.5 B5:.5 A5:2 |
            B5:1 G5:.5 B5:.5 D6:1 B5:1 | A5:1 G5:1 F#5:1 E5:1 | D5:1 F#5:1 B5:1 A5:1 | D5:2 -:2`,
  },
  parts: [
    { inst: 'violins', from: 'theme', short: 'violins_spic', vel: 0.8 },
    { inst: 'flute', from: 'theme', vel: 0.6, bars: [9, 16] },
    { inst: 'trumpet', from: 'theme', octave: -1, vel: 0.55, bars: [13, 16] },
    { inst: 'horn', pad: 60, vel: 0.6 },
    { inst: 'violas_spic', ostinato: 'R 5 8 5', rate: 0.5, centre: 57, vel: 0.6 },
    { inst: 'celli_spic', ostinato: 'R - R 5 R - R 5', rate: 0.5, centre: 45, vel: 0.7 },
    { inst: 'basses_pizz', ostinato: 'R - - - 5 - - -', rate: 0.5, centre: 38, vel: 0.8 },
    { inst: 'timpani', hits: 'X.......x.......', degree: 'R', centre: 50, vel: 0.7 },
    { inst: 'snare', hits: '....x.......x.x.', vel: 0.4, bars: [9, 16] },
    { inst: 'crash', hits: 'X', onBars: [1, 9], vel: 0.7 },
  ],
};

/** A fight: a rising horn call over a galloping 3+3+2 string ostinato, lifting to D major for the charge. */
const BATTLE: Score = {
  bpm: 168, beatsPerBar: 4,
  chords: 'Dm:4 Bb:4 C:4 Dm:4 Dm:4 Bb:4 C:4 A:4 Bb:4 C:4 D:4 D:4 Gm:4 Bb:4 A:4 A7:4',
  lines: {
    theme: `D5:1.5 E5:.5 F5:1 A5:1 | Bb5:1.5 A5:.5 F5:2 | G5:1.5 A5:.5 C6:1 G5:1 | A5:3 -:1 |
            D6:1.5 C6:.5 A5:1 F5:1 | G5:1 A5:1 Bb5:1 D6:1 | C6:1.5 Bb5:.5 G5:1 E5:1 | A5:2 C#6:2 |
            D6:1.5 C6:.5 Bb5:1 F5:1 | G5:1 A5:1 Bb5:1 C6:1 | D6:2 F#5:1 A5:1 | D6:3 -:1 |
            Bb5:1.5 A5:.5 G5:1 D5:1 | F5:1.5 G5:.5 Bb5:1 D6:1 | C#6:1.5 B5:.5 A5:1 E5:1 | A5:1 G5:1 E5:1 C#5:1`,
  },
  parts: [
    { inst: 'violins', from: 'theme', short: 'violins_spic', vel: 0.85 },
    { inst: 'horn', from: 'theme', octave: -1, vel: 0.9 },
    { inst: 'trumpet', from: 'theme', octave: -1, vel: 0.75, bars: [9, 16] },
    { inst: 'trombone_stac', hits: 'X.....X.....X...', degree: 'R', centre: 50, vel: 0.85 },
    { inst: 'trombone_stac', hits: 'X.....X.....X...', degree: '5', centre: 50, vel: 0.75 },
    { inst: 'tuba', ostinato: 'R', rate: 4, centre: 38, vel: 0.6, bars: [9, 16] },
    { inst: 'violas_spic', ostinato: '5 3 R 3 5 8 5 3', rate: 0.5, centre: 62, vel: 0.7 },
    { inst: 'celli_spic', ostinato: 'R R R R R R R R', accents: '>..>..>.', rate: 0.5, centre: 50, vel: 0.8 },
    { inst: 'basses_spic', ostinato: 'R R R R R R R R', accents: '>..>..>.', rate: 0.5, centre: 38, vel: 0.8 },
    { inst: 'timpani', hits: 'X.....X.....X.x.', degree: 'R', centre: 50, vel: 0.9 },
    { inst: 'bassdrum', hits: 'X.......X.......', vel: 0.8 },
    { inst: 'snare', hits: '....x.......x.xx', fill: 'x.x.x.x.xxxxXXXX', every: 4, vel: 0.6 },
    { inst: 'crash', hits: 'X', onBars: [1, 9], vel: 0.9 },
  ],
};

/** A guardian: a low brass theme in C minor over string tremolo, timpani and gong, with a dark D-flat near the end. */
const GUARDIAN: Score = {
  bpm: 132, beatsPerBar: 4,
  chords: 'Cm:4 Ab:4 Fm:4 G:4 Cm:4 Ab:4 Bb:4 G:4 Ab:4 Bb:4 Cm:4 Cm:4 Fm:4 Db:4 G:4 G7:4',
  lines: {
    theme: `C4:1.5 D4:.5 Eb4:2 | C4:1.5 Bb3:.5 Ab3:2 | F3:1 Ab3:1 C4:1 F4:1 | D4:3 G3:1 |
            C4:1.5 D4:.5 Eb4:1 G4:1 | Ab4:2 G4:1 Eb4:1 | F4:1.5 Eb4:.5 D4:1 Bb3:1 | B3:2 D4:2 |
            Eb4:1 F4:1 Ab4:1 C5:1 | D5:2 Bb4:2 | C5:1.5 Bb4:.5 G4:1 Eb4:1 | C4:3 -:1 |
            F4:1.5 G4:.5 Ab4:1 C5:1 | Db5:2 Ab4:2 | B4:2 D5:2 | F4:1 D4:1 B3:1 G3:1`,
  },
  parts: [
    { inst: 'horn', from: 'theme', vel: 0.9 },
    { inst: 'trombone', from: 'theme', octave: -1, vel: 0.8 },
    { inst: 'trumpet', from: 'theme', vel: 0.7, bars: [9, 14] },
    { inst: 'tuba', ostinato: 'R', rate: 4, centre: 36, vel: 0.7 },
    { inst: 'violins_trem', pad: 76, vel: 0.6 },
    { inst: 'violas', pad: 64, vel: 0.5, bars: [9, 16] },
    { inst: 'celli_spic', ostinato: 'R R 8 R R R 5 R', rate: 0.5, centre: 48, vel: 0.8 },
    { inst: 'basses_spic', ostinato: 'R', rate: 0.5, centre: 36, vel: 0.8 },
    { inst: 'timpani', hits: 'X...X...X..xX...', degree: 'R', centre: 50, vel: 0.9 },
    { inst: 'bassdrum', hits: 'X.......X..x....', vel: 0.8 },
    { inst: 'gong', hits: 'X', onBars: [1], vel: 0.8 },
    { inst: 'crash', hits: 'X', onBars: [9], vel: 0.8 },
    { inst: 'snare_roll', hits: '........X.......', onBars: [16], len: 2, vel: 0.7 },
  ],
};

export const THEMES = { glade: GLADE, sowerby: SOWERBY, meadow: MEADOW, battle: BATTLE, guardian: GUARDIAN } satisfies Record<string, Score>;
export type ThemeId = keyof typeof THEMES;

/** Loaded first, so the opening (the glade, and its first fight) has music as soon as possible. */
export const FIRST_THEMES: ThemeId[] = ['glade', 'battle'];

/** Each area's theme. Areas without their own yet borrow the meadow's. */
export const ZONE_THEMES: Record<string, ThemeId> = { glade: 'glade', village: 'sowerby', meadow: 'meadow' };
export const zoneTheme = (zone: string): ThemeId => ZONE_THEMES[zone] ?? 'meadow';
