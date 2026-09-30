// The game's music. Melodies are written out (note:beats, bars split by |); everything else is a section of the
// orchestra doing a job over the chords (see Part in orchestra.ts). Each loops.
import type { Score } from './orchestra';
import { BATTLE_MEADOW, BATTLE_WOODS, BATTLE_CAVE, BATTLE_HOLLOW, BATTLE_PEAK } from './battle-scores';

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

/** Whisper Woods: curious and a little mysterious, in E Dorian. Clarinet over pizzicato and harp; a flute answers. */
const WOODS: Score = {
  bpm: 92, beatsPerBar: 4,
  chords: 'Em:4 A:4 Em:4 A:4 C:4 D:4 Em:4 Bm:4 Em:4 A:4 G:4 D:4 C:4 Am:4 B7:4 Em:4',
  lines: {
    theme: `E4:1.5 G4:.5 B4:2 | C#5:1 B4:1 A4:2 | G4:1.5 A4:.5 B4:1 E5:1 | D5:1 C#5:1 A4:2 |
            G4:1 C5:1 E5:1.5 D5:.5 | C5:1 A4:1 F#4:2 | G4:1 B4:1 E5:1 G5:1 | F#5:3 -:1 |
            E5:1.5 D5:.5 B4:1 G4:1 | A4:1.5 B4:.5 C#5:2 | D5:1 B4:1 G4:1 B4:1 | A4:3 -:1 |
            E4:1 G4:1 C5:1 E5:1 | E5:1.5 D5:.5 C5:1 A4:1 | B4:2 D#5:2 | E5:3 -:1`,
    counter: `-:4 | -:4 | -:4 | -:4 | -:4 | -:4 | -:4 | -:4 |
              B5:2 A5:2 | E5:4 | D5:2 B4:2 | F#5:4 | G5:2 E5:2 | A5:2 E5:2 | F#5:2 D#5:2 | E5:4`,
  },
  parts: [
    { inst: 'clarinet', from: 'theme', short: 'clarinet_stac', vel: 0.75 },
    { inst: 'flute', from: 'counter', vel: 0.5, bars: [9, 16] },
    { inst: 'harp', ostinato: 'R 5 8 5', rate: 0.5, centre: 52, vel: 0.5 },
    { inst: 'celli_pizz', ostinato: 'R - 5 -', rate: 1, centre: 43, vel: 0.7 },
    { inst: 'violas', pad: 60, vel: 0.3 },
    { inst: 'violins', pad: 69, vel: 0.25, bars: [9, 16] },
    { inst: 'triangle', hits: 'x...............', onBars: [1, 9], vel: 0.5 },
  ],
};

/** Water dripping somewhere in the dark, and its echo. */
const DRIPS = `-:3 A6:.5 -:.5 | -:4 | -:1 F6:.5 -:2.5 | -:2.5 E6:.5 -:1 | -:3 D6:.5 -:.5 | -:4 | -:1 F6:.5 -:2.5 | -:2 E6:.5 -:1.5 |
               -:3 C7:.5 -:.5 | -:4 | -:1 A6:.5 -:2.5 | -:2.5 D6:.5 -:1 | -:3 Bb6:.5 -:.5 | -:4 | -:1 A6:.5 -:2.5 | -:2 E6:.5 -:1.5`;

/** Echo Cavern: slow and sparse. A distant horn over low strings, drips that echo, a shimmer as it goes deeper. */
const CAVE: Score = {
  bpm: 80, beatsPerBar: 4,
  chords: 'Dm:4 Dm:4 Bb:4 A:4 Dm:4 Gm:4 Bb:4 A:4 F:4 C:4 Dm:4 Bb:4 Gm:4 A:4 Dm:4 A7:4',
  lines: {
    theme: `D4:2 F4:1 A4:1 | G4:3 F4:1 | F4:2 D4:1 F4:1 | E4:4 | D4:1 E4:1 F4:1 A4:1 | Bb4:3 A4:1 | G4:1.5 F4:.5 D4:2 | C#4:4 |
            A4:2 C5:2 | G4:3 E4:1 | F4:1.5 E4:.5 D4:2 | F4:4 | G4:2 Bb4:1 D5:1 | C#5:2 A4:2 | F4:1 E4:1 D4:2 | -:4`,
    drips: DRIPS,
    echo: `-:.75 ${DRIPS}`,
  },
  parts: [
    { inst: 'horn', from: 'theme', vel: 0.65 },
    { inst: 'celli', pad: 50, vel: 0.45 },
    { inst: 'basses', ostinato: 'R', rate: 4, centre: 38, vel: 0.4 },
    { inst: 'harp', ostinato: 'R 5 8 -', rate: 1, centre: 50, vel: 0.45, bars: [5, 16] },
    { inst: 'glock', from: 'drips', vel: 0.6 },
    { inst: 'glock', from: 'echo', vel: 0.35 },
    { inst: 'violins_trem', pad: 74, vel: 0.25, bars: [9, 16] },
    { inst: 'timpani', hits: 'x...............', degree: 'R', centre: 50, onBars: [1, 5, 9, 13], vel: 0.4 },
  ],
};

/** Glimmer Hollow: a crystalline waltz in A Lydian (the raised fourth makes it glow). Flute over harp and shimmer. */
const HOLLOW: Score = {
  bpm: 108, beatsPerBar: 3,
  chords: 'A:3 B:3 A:3 B:3 F#m:3 D:3 E:3 E:3 A:3 B:3 C#m:3 F#m:3 D:3 B:3 Esus4:3 E:3',
  lines: {
    theme: `E5:1 A5:1 C#6:1 | D#6:2 C#6:1 | B5:1 A5:1 E5:1 | F#5:3 | A5:1 C#6:1 F#6:1 | E6:1.5 D6:.5 A5:1 | B5:1 G#5:1 E5:1 | B5:3 |
            C#6:1 B5:1 A5:1 | D#6:1.5 E6:.5 F#6:1 | E6:1 C#6:1 G#5:1 | A5:3 | F#5:1 A5:1 D6:1 | D#6:1 C#6:1 B5:1 | A5:2 B5:1 | G#5:3`,
  },
  parts: [
    { inst: 'flute', from: 'theme', vel: 0.8 },
    { inst: 'harp', ostinato: 'R 5 8 10 12 10', rate: 0.5, centre: 57, vel: 0.4 },
    { inst: 'glock', ostinato: '8 12 15', rate: 1, centre: 81, vel: 0.4, bars: [9, 16] },
    { inst: 'violins_trem', pad: 76, vel: 0.3 },
    { inst: 'violas', pad: 64, vel: 0.3, bars: [9, 16] },
    { inst: 'celli', ostinato: 'R', rate: 3, centre: 45, vel: 0.4 },
    { inst: 'triangle', hits: 'x...........', onBars: [1, 9], vel: 0.5 },
  ],
};

/** Ember Peak: the climb to the dragon, in G minor. Horns over driving low strings; trombones and trumpets pile in. */
const PEAK: Score = {
  bpm: 120, beatsPerBar: 4,
  chords: 'Gm:4 Eb:4 F:4 Gm:4 Gm:4 Eb:4 Cm:4 D:4 Eb:4 F:4 Gm:4 Eb:4 Cm:4 D:4 Gm:4 D7:4',
  lines: {
    theme: `G4:1.5 A4:.5 Bb4:2 | G4:1 Eb4:1 Bb3:2 | C4:1 F4:1 A4:1 C5:1 | D5:3 Bb4:1 |
            G4:1.5 Bb4:.5 D5:1 G5:1 | F5:1 Eb5:1 Bb4:2 | C5:1.5 D5:.5 Eb5:1 G4:1 | F#4:4 |
            Eb5:1.5 D5:.5 Bb4:2 | C5:1.5 D5:.5 F5:2 | D5:1 Bb4:1 G4:1 D5:1 | Eb5:3 -:1 |
            C5:1 Eb5:1 G5:1 Eb5:1 | F#5:2 D5:2 | G4:1.5 A4:.5 Bb4:1 D5:1 | C5:1 A4:1 F#4:1 D4:1`,
  },
  parts: [
    { inst: 'horn', from: 'theme', vel: 0.8 },
    { inst: 'trombone', from: 'theme', octave: -1, vel: 0.6, bars: [9, 16] },
    { inst: 'trumpet', from: 'theme', vel: 0.6, bars: [13, 16] },
    { inst: 'tuba', ostinato: 'R', rate: 2, centre: 36, vel: 0.6 },
    { inst: 'celli_spic', ostinato: 'R R R R 8 R R R', rate: 0.5, centre: 48, vel: 0.7 },
    { inst: 'basses_spic', ostinato: 'R', rate: 1, centre: 36, vel: 0.7 },
    { inst: 'violins_trem', pad: 72, vel: 0.4 },
    { inst: 'timpani', hits: 'X.......x...x...', degree: 'R', centre: 50, vel: 0.7 },
    { inst: 'bassdrum', hits: 'X...............', vel: 0.6, bars: [9, 16] },
    { inst: 'snare_roll', hits: '........X.......', onBars: [8, 16], len: 2, vel: 0.5 },
    { inst: 'crash', hits: 'X', onBars: [1, 9], vel: 0.7 },
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

export const THEMES = { glade: GLADE, sowerby: SOWERBY, meadow: MEADOW, woods: WOODS, cave: CAVE, hollow: HOLLOW, peak: PEAK, battleMeadow: BATTLE_MEADOW, battleWoods: BATTLE_WOODS, battleCave: BATTLE_CAVE, battleHollow: BATTLE_HOLLOW, battlePeak: BATTLE_PEAK, guardian: GUARDIAN } satisfies Record<string, Score>;
export type ThemeId = keyof typeof THEMES;

/** Loaded first, so the opening (the glade, and its first fight) has music as soon as possible. */
export const FIRST_THEMES: ThemeId[] = ['glade', 'battleMeadow'];

/** Each area's theme (anywhere else, the tower's camp say, borrows the meadow's). */
export const ZONE_THEMES: Record<string, ThemeId> = { glade: 'glade', village: 'sowerby', meadow: 'meadow', woods: 'woods', cave: 'cave', hollow: 'hollow', peak: 'peak' };
export const zoneTheme = (zone: string): ThemeId => ZONE_THEMES[zone] ?? 'meadow';

/** Ordinary fights inherit their arena's region, including tower floors and the meadow's Secret Grove. */
export const BATTLE_THEMES = { glade: 'battleMeadow', meadow: 'battleMeadow', woods: 'battleWoods', cave: 'battleCave', hollow: 'battleHollow', peak: 'battlePeak' } as const;
export type BattleThemeId = typeof BATTLE_THEMES[keyof typeof BATTLE_THEMES];
export const isBattleTheme = (id: ThemeId): id is BattleThemeId => Object.values(BATTLE_THEMES).some((theme) => theme === id);
export const battleTheme = (zone: string, boss = false): ThemeId => boss ? 'guardian' : Object.hasOwn(BATTLE_THEMES, zone) ? BATTLE_THEMES[zone as keyof typeof BATTLE_THEMES] : 'battleMeadow';
