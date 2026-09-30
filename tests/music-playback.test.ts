import { describe, expect, test } from 'bun:test';
import { Audio } from '../src/audio';
import { Music } from '../src/music/player';
import type { Note } from '../src/music/orchestra';

/** Observe the real player's scheduling without requiring a browser or an audio device. */
function play(inst: string, midi: number | null = 48, recordedMidi: number | null = 60, dur = 1) {
  const param = () => ({
    value: 1,
    sets: [] as number[][],
    targets: [] as number[][],
    setValueAtTime(...args: number[]) { this.sets.push(args); },
    linearRampToValueAtTime(..._args: number[]) {},
    setTargetAtTime(...args: number[]) { this.targets.push(args); },
  });
  const node = () => ({ connect<T>(to: T): T { return to; } });
  const gains: ReturnType<typeof param>[] = [];
  const pans: ReturnType<typeof param>[] = [];
  const source = {
    ...node(), buffer: null, playbackRate: param(),
    starts: [] as number[][], stops: [] as number[],
    start(...args: number[]) { this.starts.push(args); },
    stop(at: number) { this.stops.push(at); },
  };
  const ctx = {
    currentTime: 9,
    createBufferSource: () => source,
    createGain: () => { const gain = param(); gains.push(gain); return { ...node(), gain }; },
    createStereoPanner: () => { const pan = param(); pans.push(pan); return { ...node(), pan }; },
  };
  const music = new Music(new Audio());
  // White-box regression test: the scheduling path is private, but exercising it avoids maintaining a second
  // implementation of sample expiry or envelope timing just for the tests.
  const player = music as unknown as {
    ctx: typeof ctx;
    index: Record<string, { file: string; midi: number | null; vel: string; gain: number }[]>;
    buffers: Map<string, unknown>;
    note(p: unknown, n: Note, at: number): void;
  };
  player.ctx = ctx;
  player.index = { [inst]: [{ file: 'test', midi: recordedMidi, vel: 'loud', gain: 1 }] };
  player.buffers.set('test', { buf: { duration: 3 }, start: 0.02 });
  player.note({ beat: 0.75, dry: node(), wet: node(), desks: new Map() }, { t: 0, dur, inst, midi, vel: 0.7 }, 10);
  return { source, gains, pans };
}

describe('music note playback', () => {
  test('a lower-pitched harp can ring beyond its original recording duration', () => {
    const { source, gains } = play('harp');
    expect(source.playbackRate.value).toBe(0.5);
    expect(source.starts[0][1]).toBe(0.02);
    // A three-second buffer played an octave down lasts nearly six seconds. Let Web Audio finish it naturally.
    expect(source.stops).toEqual([]);
    expect(gains[0].targets).toEqual([]);
  });

  test('one-shots finish naturally at every pitch, including unpitched percussion', () => {
    for (const inst of ['harp', 'glock', 'timpani', 'violins_pizz', 'basses_pizz']) {
      for (const midi of [48, 60, 72]) expect(play(inst, midi).source.stops).toEqual([]);
    }
    expect(play('crash', null, null).source.stops).toEqual([]);
  });

  test('the woods’ pizzicato cellos ring out and sit with the cellos, at their existing level', () => {
    const { source, gains, pans } = play('celli_pizz');
    expect(source.stops).toEqual([]);
    expect(gains[0].targets).toEqual([]);
    expect(gains[1].value).toBe(0.7);
    expect(pans[0].value).toBe(0.3);
    expect(gains[2].value).toBe(0.9); // The same reverb send as the other plucked strings.
  });

  test('held voices still release at the written note end, even with a stretched recording', () => {
    const { source, gains } = play('horn', 48, 60, 5);
    const at = source.starts[0][0], end = at + 5 * 0.75;
    expect(gains[0].targets[0][0]).toBe(0);
    expect(gains[0].targets[0][1]).toBeCloseTo(end);
    expect(gains[0].targets[0][2]).toBeCloseTo(0.25 / 3);
    expect(source.stops[0]).toBeCloseTo(end + 0.5);
    expect(source.stops[0]).toBeGreaterThan(at + 3);
  });

  test('short bowed notes keep their short release', () => {
    const { source, gains } = play('celli_spic', 60, 60, 0.5);
    const end = source.starts[0][0] + 0.5 * 0.75;
    expect(gains[0].targets[0][1]).toBeCloseTo(end);
    expect(source.stops[0]).toBeCloseTo(end + 0.16);
  });
});

test('repeat encounters enter the next phrase, keep regional memory separate, and bosses restart their own opening', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousTimeout = globalThis.setTimeout;
  const scheduled: { note: Note; at: number }[] = [];
  const ramps: number[] = [];
  const node = () => ({ connect() {}, disconnect() {}, gain: {
    value: 0, setValueAtTime() {}, cancelScheduledValues() {},
    linearRampToValueAtTime(v: number) { ramps.push(v); },
  } });
  const ctx = { currentTime: 10, createGain: node };
  const music = new Music(new Audio()) as any;
  music.ctx = ctx;
  music.bus = node();
  music.reverb = node();
  music.note = (_p: unknown, n: Note, at: number) => scheduled.push({ note: n, at });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setInterval: () => 0 } });
  globalThis.setTimeout = (() => 0) as unknown as typeof setTimeout;
  const start = (id: string) => {
    scheduled.length = 0;
    ramps.length = 0;
    music.start(id);
    expect(scheduled.length).toBeGreaterThan(0);
    expect(scheduled.every((n) => n.at >= ctx.currentTime)).toBe(true);
    expect(ramps).toEqual(id === 'guardian' ? [.75, .75] : [.65, .65]);
    return scheduled[0].note.t;
  };
  const leave = (seconds = 2) => { ctx.currentTime += seconds; music.fadeOut(); ctx.currentTime += 3; };
  try {
    expect(start('battleMeadow')).toBe(0);
    leave();
    expect(start('battleMeadow')).toBe(16);
    leave();
    expect(start('battleWoods')).toBe(0);
    leave();
    expect(start('battleMeadow')).toBe(32);
    leave();
    expect(start('battleMeadow')).toBe(48);
    leave();
    expect(start('battleMeadow')).toBe(0);
    leave();
    expect(start('battleHollow')).toBe(0);
    leave();
    expect(start('battleHollow')).toBe(12); // Four 3/4 bars, not sixteen beats.
    leave();
    expect(start('battleCave')).toBe(0);
    leave(90); // A long encounter can pass more than one complete loop.
    const caveEntry = start('battleCave');
    expect(caveEntry % 16).toBe(0);
    expect(caveEntry).toBeLessThan(64);
    leave();
    expect(start('battlePeak')).toBe(0);
    leave();
    expect(start('guardian')).toBe(0);
    leave();
    expect(start('guardian')).toBe(0);
  } finally {
    globalThis.setTimeout = previousTimeout;
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete (globalThis as any).window;
  }
});
