import { describe, expect, test } from 'bun:test';
import { MILL_RANGE, MillSound, millLevel, raspAt } from '../src/sawmillSound';

/** Just enough of an AudioContext to see what MillSound builds, starts and stops (no audio device needed). */
function fakeContext() {
  const made: string[] = [], started: object[] = [], stopped: object[] = [], buffers: Float32Array[] = [];
  const param = (value = 0) => ({ value, setTargetAtTime(v: number) { this.value = v; } });
  const node = <T extends object>(kind: string, extra: T) => {
    made.push(kind);
    return { connect: <N>(to: N) => to, disconnect() {}, ...extra };
  };
  const source = <T extends object>(kind: string, extra: T) => {
    const n = node(kind, { ...extra, start: () => started.push(n), stop: () => stopped.push(n) });
    return n;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    createGain: () => node('gain', { gain: param(1) }),
    createBiquadFilter: () => node('filter', { type: '', frequency: param(), Q: param() }),
    createOscillator: () => source('osc', { type: '', frequency: param() }),
    createBufferSource: () => source('source', { buffer: null, loop: false, playbackRate: param(1) }),
    createBuffer: (_ch: number, n: number) => {
      const d = new Float32Array(n);
      buffers.push(d);
      return { getChannelData: () => d };
    },
  };
  return { ctx, made, started, stopped, buffers };
}

describe("the Sawmill's sound", () => {
  test('only while it is cutting: fullest in the room, fading with distance outside, silent anywhere else', () => {
    expect(millLevel(false, 'inside')).toBe(0);
    expect(millLevel(false, 0)).toBe(0);
    expect(millLevel(true, 'inside')).toBe(1);
    // Another room, underground, a fight or a menu.
    expect(millLevel(true, null)).toBe(0);
    const door = millLevel(true, 0), near = millLevel(true, 2), far = millLevel(true, 5);
    expect(door).toBeLessThan(1);
    expect(door).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
    expect(MILL_RANGE).toBeGreaterThanOrEqual(6);
    expect(MILL_RANGE).toBeLessThanOrEqual(8);
    expect(millLevel(true, MILL_RANGE)).toBe(0);
    expect(millLevel(true, 30)).toBe(0);
  });

  test('the rasp rises and falls as each log goes through', () => {
    const at = [0, 0.05, 0.2, 0.5, 0.8, 0.97, 1].map(raspAt);
    expect(at[0]).toBe(0);
    expect(at[1]).toBe(0);
    expect(at[2]).toBeLessThan(at[3]);
    expect(at[3]).toBeGreaterThan(0.95);
    expect(at[4]).toBeLessThan(at[3]);
    expect(at[5]).toBeLessThan(at[4]);
    expect(at[6]).toBe(0);
  });

  test('one small graph: built when first heard, reused every frame, stopped a few seconds after it falls silent', () => {
    const f = fakeContext(), out = {} as AudioNode;
    const sound = new MillSound(f.ctx as unknown as BaseAudioContext, out);
    // Not cutting, or too far off to hear: nothing is made.
    sound.update(0, null, false);
    expect(f.made.length).toBe(0);
    sound.update(1, 0.5, true);
    const graph = f.made.length;
    expect(sound.on).toBe(true);
    expect(graph).toBeGreaterThan(0);
    expect(graph).toBeLessThan(30);
    expect(f.started.length).toBe(f.made.filter((k) => k === 'osc' || k === 'source').length);
    for (let i = 0; i < 120; i++) {
      f.ctx.currentTime += 1 / 60;
      sound.update(0.5, (i % 60) / 60, false);
    }
    expect(f.made.length).toBe(graph);
    // A plank dropping is one more short sound, not a new graph.
    sound.knock();
    expect(f.made.length).toBe(graph + 1);
    // It fades out, and lets go of its nodes once it's well and truly silent.
    sound.update(0, null, true);
    f.ctx.currentTime += 1;
    sound.update(0, null, true);
    expect(sound.on).toBe(true);
    f.ctx.currentTime += 4;
    sound.update(0, null, true);
    expect(sound.on).toBe(false);
    expect(f.stopped.length).toBe(f.started.length - 1);
    // Back to work: built afresh, its sounds worked out only once.
    const rendered = f.buffers.length;
    sound.update(1, 0.2, true);
    expect(sound.on).toBe(true);
    expect(f.buffers.length).toBe(rendered);
  });

  test('its loops run on seamlessly, and the knock eases in, so neither clicks', () => {
    const f = fakeContext();
    const sound = new MillSound(f.ctx as unknown as BaseAudioContext, {} as AudioNode);
    sound.update(1, 0.5, true);
    sound.knock();
    const [, drive, knock] = f.buffers;
    let step = 0;
    for (let i = 1; i < drive.length; i++) step = Math.max(step, Math.abs(drive[i] - drive[i - 1]));
    expect(Math.abs(drive[0] - drive[drive.length - 1])).toBeLessThanOrEqual(step);
    expect(Math.abs(knock[0])).toBeLessThan(1e-3);
    expect(Math.abs(knock[knock.length - 1])).toBeLessThan(1e-3);
  });
});
