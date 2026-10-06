// Ordinary encounters keep each region's colors, with four self-contained four-bar phrases.
// Space between gestures leaves room for hit/dodge sounds; these are not guardian fanfares.
import type { Score } from './orchestra';

/** A cheerful scrap: the clarinet and flute still trade the tune, over driving spiccato strings and drums. */
export const BATTLE_MEADOW: Score = {
  bpm: 140, beatsPerBar: 4,
  chords: 'D:4 G:4 Em:4 A:4 D:4 Bm:4 G:4 A:4 Bm:4 G:4 D:4 A:4 G:4 Em:4 A7:4 D:4',
  lines: {
    theme: `D5:.5 F#5:.5 A5:.5 -:.5 F#5:.5 E5:.5 D5:1 | B4:.5 D5:.5 G5:1 F#5:.5 E5:.5 D5:1 | E5:.5 G5:.5 G5:.5 -:.5 G5:1 E5:1 | C#5:.5 E5:.5 A5:1 -:2 |
            F#5:.5 A5:.5 G5:.5 A5:.5 F#5:1 D5:1 | F#5:.5 D5:.5 B4:1 -:1 D5:1 | G5:.5 F#5:.5 E5:1 D5:.5 B4:.5 D5:1 | A4:1 C#5:.5 E5:.5 A5:1 -:1 |
            B4:.5 D5:.5 F#5:1 A5:.5 F#5:.5 D5:1 | B4:.5 D5:.5 G5:1 -:1 B5:1 | A5:.5 F#5:.5 E5:.5 D5:.5 F#5:1 A5:1 | G5:.5 E5:.5 C#5:1 A4:1 -:1 |
            G5:.5 G5:.5 A5:1 G5:.5 F#5:.5 E5:1 | G5:.5 E5:.5 B4:1 E5:1 -:1 | E5:.5 G5:.5 A5:1 G5:.5 E5:.5 C#5:1 | D5:1 F#5:.5 E5:.5 D5:1 -:1`,
  },
  parts: [
    { inst: 'clarinet', from: 'theme', short: 'clarinet_stac', vel: .7, bars: [1, 4] },
    { inst: 'flute', from: 'theme', vel: .56, bars: [5, 8] },
    { inst: 'clarinet', from: 'theme', short: 'clarinet_stac', vel: .72, bars: [9, 12] },
    { inst: 'flute', from: 'theme', vel: .58, bars: [13, 16] },
    { inst: 'violins', from: 'theme', vel: .34, bars: [13, 16] },
    // The engine: bouncing strings in eighths that never stop, so it always sounds like a fight, just a cheerful one.
    // (No brass or drums: those belong to the guardians and the later regions.)
    { inst: 'violins_spic', ostinato: 'R 3 5 3 R 3 5 3', accents: '>...>...', rate: .5, centre: 76, vel: .42 },
    { inst: 'violas_spic', ostinato: '- 3 - 5 - 3 5 -', rate: .5, centre: 62, vel: .34, bars: [5, 16] },
    { inst: 'celli_spic', ostinato: 'R R 5 R R R 5 R', accents: '>..>..>.', rate: .5, centre: 48, vel: .56 },
    { inst: 'basses_spic', ostinato: 'R - R - R - 5 -', rate: .5, centre: 36, vel: .5 },
    { inst: 'harp', ostinato: 'R - 8 -', rate: 1, centre: 53, vel: .36, bars: [9, 16] },
    { inst: 'claves', hits: '..x...x...x...x.', vel: .3 },
    { inst: 'triangle', hits: 'x.......x.......', vel: .22, bars: [9, 16] },
  ],
};

/** E Dorian: sidestepping clarinet, displaced cello plucks, small harp replies. */
export const BATTLE_WOODS: Score = {
  bpm: 124, beatsPerBar: 4,
  chords: 'Em:4 A:4 Em:4 Bm:4 Em:4 D:4 A:4 Em:4 G:4 A:4 Em:4 Bm:4 Em:4 A:4 D:4 Em:4',
  lines: {
    theme: `E5:.5 -:.5 G5:.5 G5:.5 A5:1 G5:1 | C#5:.5 E5:.5 A5:1 G5:.5 A5:.5 -:1 | B4:.5 E5:.5 G5:1 F#5:.5 E5:.5 D5:1 | F#5:1 D5:.5 B4:.5 -:2 |
            G5:.5 G5:.5 E5:1 -:.5 F#5:.5 G5:1 | F#5:.5 A5:.5 D5:1 E5:.5 F#5:.5 -:1 | E5:.5 C#5:.5 A4:1 B4:.5 C#5:.5 E5:1 | G5:1 F#5:.5 E5:.5 -:2 |
            B4:.5 D5:.5 G5:1 A5:.5 G5:.5 G5:1 | A5:.5 E5:.5 C#5:1 -:1 E5:1 | E5:.5 G5:.5 B5:1 A5:.5 G5:.5 F#5:1 | D5:1 F#5:.5 G5:.5 -:2 |
            E5:.5 B4:.5 G4:1 B4:.5 E5:.5 G5:1 | A5:.5 G5:.5 E5:1 C#5:1 -:1 | D5:.5 F#5:.5 A5:1 F#5:.5 E5:.5 D5:1 | E5:1 B4:.5 G4:.5 E5:1 -:1`,
  },
  parts: [
    { inst: 'clarinet', from: 'theme', short: 'clarinet_stac', vel: .6 },
    { inst: 'celli_pizz', ostinato: 'R - - 5 - R 5 -', rate: .5, centre: 43, vel: .6 },
    { inst: 'harp', ostinato: '- 5 - 8', rate: 1, centre: 52, vel: .4 },
    { inst: 'violas', pad: 60, vel: .24, bars: [9, 12] },
    { inst: 'claves', hits: '......x.......x.', vel: .24 },
  ],
};

/** Clipped horn calls separated by silence; low-string footsteps, rare light in the dark. */
export const BATTLE_CAVE: Score = {
  bpm: 116, beatsPerBar: 4,
  chords: 'Dm:4 Dm:4 Bb:4 A:4 Dm:4 Gm:4 Bb:4 A:4 F:4 C:4 Dm:4 A:4 Gm:4 Bb:4 A7:4 Dm:4',
  lines: {
    theme: `D4:.5 F4:.5 A4:1 -:2 | F4:.5 E4:.5 D4:1 -:2 | F4:1 D4:.5 F4:.5 -:1 Bb4:1 | A4:.5 E4:.5 C#4:1 -:2 |
            D4:.5 E4:.5 F4:1 A4:.5 -:.5 F4:1 | G4:1 Bb4:.5 A4:.5 G4:1 -:1 | F4:.5 D4:.5 Bb3:1 D4:1 -:1 | E4:1 C#4:.5 A3:.5 -:2 |
            A4:.5 C5:.5 A4:1 F4:1 -:1 | G4:.5 E4:.5 C4:1 E4:1 -:1 | F4:.5 A4:.5 D5:1 A4:.5 F4:.5 D4:1 | E4:1 A4:.5 G4:.5 -:2 |
            G4:.5 Bb4:.5 D5:1 Bb4:1 -:1 | Bb4:.5 F4:.5 D4:1 F4:1 -:1 | E4:.5 G4:.5 A4:1 G4:.5 E4:.5 C#4:1 | D4:1 A3:1 -:2`,
    glints: `-:4 | -:3 A6:.5 -:.5 | -:4 | -:4 | -:4 | -:4 | -:2 F6:.5 -:1.5 | -:4 | -:4 | -:4 | -:3 D6:.5 -:.5 | -:4 | -:4 | -:4 | -:4 | -:4`,
  },
  parts: [
    { inst: 'horn', from: 'theme', vel: .56 },
    { inst: 'celli_spic', ostinato: 'R - 5 - R 8 - -', rate: .5, centre: 45, vel: .5, hold: .65 },
    { inst: 'basses_pizz', ostinato: 'R - 5 -', rate: 1, centre: 38, vel: .48 },
    { inst: 'harp', ostinato: '- 5 - 8', rate: 1, centre: 50, vel: .35, bars: [9, 16] },
    { inst: 'glock', from: 'glints', vel: .3 },
    { inst: 'bassdrum', hits: 'x...............', onBars: [1, 5, 9, 13], vel: .32 },
  ],
};

/** A quick crystalline waltz. The raised fourth (D-sharp) glints against A major. */
export const BATTLE_HOLLOW: Score = {
  bpm: 120, beatsPerBar: 3,
  chords: 'A:3 B:3 A:3 E:3 F#m:3 B:3 E:3 A:3 A:3 B:3 C#m:3 E:3 F#m:3 B:3 E:3 A:3',
  lines: {
    theme: `A5:.5 B5:.5 C#6:1 E6:.5 C#6:.5 | D#6:.5 B5:.5 F#5:1 -:1 | E5:.5 A5:.5 C#6:1 B5:.5 A5:.5 | G#5:1 B5:.5 E6:.5 -:1 |
            F#5:.5 A5:.5 C#6:1 A5:.5 F#5:.5 | B5:.5 D#6:.5 F#6:1 D#6:.5 B5:.5 | E6:.5 B5:.5 G#5:1 F#5:.5 E5:.5 | A5:1 E5:.5 C#5:.5 -:1 |
            C#6:.5 E6:.5 F#6:1 E6:.5 C#6:.5 | D#6:.5 F#6:.5 B5:1 -:1 | C#6:.5 B5:.5 G#5:1 E5:.5 G#5:.5 | B5:1 G#5:.5 E5:.5 -:1 |
            A5:.5 C#6:.5 F#6:1 E6:.5 C#6:.5 | B5:.5 D#6:.5 F#6:1 D#6:.5 B5:.5 | G#5:.5 B5:.5 E6:1 B5:.5 G#5:.5 | A5:1 E5:.5 C#5:.5 -:1`,
  },
  parts: [
    { inst: 'flute', from: 'theme', vel: .52 },
    { inst: 'harp', ostinato: 'R - 5 8 - 5', rate: .5, centre: 57, vel: .46 },
    { inst: 'celli_pizz', ostinato: 'R - -', rate: 1, centre: 45, vel: .5 },
    { inst: 'violins_pizz', ostinato: '- 3 5', rate: 1, centre: 69, vel: .35, bars: [9, 16] },
    { inst: 'triangle', hits: 'x...........', onBars: [1, 9], vel: .28 },
  ],
};

/** Grit without a boss fanfare: the old rising four-note idea, now low and broken into breaths. */
export const BATTLE_PEAK: Score = {
  bpm: 144, beatsPerBar: 4,
  chords: 'Gm:4 Eb:4 F:4 D:4 Gm:4 Cm:4 Eb:4 D:4 Bb:4 F:4 Gm:4 D:4 Cm:4 Eb:4 D7:4 Gm:4',
  lines: {
    theme: `G3:.5 A3:.5 Bb3:1 D4:1 -:1 | Eb4:1 D4:.5 Bb3:.5 G3:1 -:1 | A3:.5 C4:.5 F4:1 C4:1 -:1 | F#3:1 A3:.5 D4:.5 -:2 |
            G3:.5 A3:.5 Bb3:1 D4:.5 G4:.5 F4:1 | Eb4:.5 D4:.5 C4:1 G3:1 -:1 | G3:.5 Bb3:.5 Eb4:1 D4:.5 Bb3:.5 G3:1 | A3:1 F#3:.5 D3:.5 -:2 |
            Bb3:.5 D4:.5 F4:1 Bb4:1 F4:1 | A4:.5 G4:.5 F4:1 C4:1 -:1 | G4:.5 F4:.5 D4:1 Bb3:.5 A3:.5 G3:1 | F#3:1 A3:.5 D4:.5 -:2 |
            C4:.5 Eb4:.5 G4:1 Eb4:.5 D4:.5 C4:1 | Bb3:.5 G3:.5 Eb3:1 G3:1 -:1 | F#3:.5 A3:.5 D4:1 C4:.5 A3:.5 F#3:1 | G3:1 D4:1 -:2`,
  },
  parts: [
    { inst: 'horn', from: 'theme', vel: .7 },
    { inst: 'trombone', from: 'theme', octave: -1, vel: .46, bars: [9, 12] },
    { inst: 'celli_spic', ostinato: 'R R - 5 R - 8 -', accents: '>..>..>.', rate: .5, centre: 48, vel: .58, hold: .75 },
    { inst: 'basses_spic', ostinato: 'R - - R - - 5 -', accents: '>..>..>.', rate: .5, centre: 35, vel: .52 },
    { inst: 'violas_spic', ostinato: '- 5 3 - 5 8 - 3', rate: .5, centre: 60, vel: .38, bars: [5, 12] },
    { inst: 'timpani', hits: 'X...........x...', degree: 'R', centre: 50, vel: .48 },
    { inst: 'bassdrum', hits: 'x...............', vel: .36 },
    { inst: 'snare', hits: '....x.......x...', vel: .26, bars: [9, 12] },
  ],
};
