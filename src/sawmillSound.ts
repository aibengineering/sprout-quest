// Bram's Sawmill at work, heard: a soft, warm loop that plays only while the blade's cutting. The blade's low hum (a G,
// under Sowerby's G major) swelling gently as it turns, its soft whirr, the slow thump and creak of the waterwheel
// driving it, the rasp of each log going through, and a mellow knock as its planks drop onto the stack. A rustic cabin,
// not a factory: rounded and filtered, quiet under the music. Fullest in the room; outside it carries a few steps,
// muffled by the walls. One small graph, built when it's first heard and stopped a few seconds after it falls silent.

/** How far from the Sawmill's walls (tiles) you can still hear it working outside. */
export const MILL_RANGE = 7;
/** Just outside its walls, next to being in the room (1). */
const OUTSIDE = 0.8;
/** Fades in and out over about a second and a half (a time constant, seconds). */
const FADE = 0.45;
/** Its level in the room, into the effects (so it follows their slider), sitting under the music. */
const LOUD = 0.5;
/** Each layer's share. */
const HUM = 0.12, WHIRR = 0.14, DRIVE = 0.18, RASP = 0.04, KNOCK = 0.16;
/** One turn of the waterwheel (seconds); the drive's loop is two, each a little different. */
const TURN = 2.6;
const TAU = Math.PI * 2;

/**
 * How loud the Sawmill is (0 silent … 1 in the room): only while it's cutting, and only where you'd hear it. `at` is
 * 'inside', how many tiles from its walls you are outside, or null: anywhere else, or while the world waits.
 */
export function millLevel(cutting: boolean, at: 'inside' | number | null): number {
  if (!cutting || at == null) return 0;
  if (at === 'inside') return 1;
  const k = 1 - Math.max(0, at) / MILL_RANGE;
  return k > 0 ? OUTSIDE * k * k : 0;
}

/** The rasp as a log goes through (q: 0 as it's fed in … 1 as its planks drop): it bites, saws, and eases off. */
export const raspAt = (q: number) => (q <= 0.08 || q >= 1 ? 0 : Math.sin((Math.PI * (q - 0.08)) / 0.92) ** 0.6);

interface Graph {
  out: GainNode;
  /** Muffles it outside, through the walls. */
  walls: BiquadFilterNode;
  rasp: GainNode;
  knock: GainNode;
  /** What turns with the blade (its hum, its whirr's pulse), at full speed. */
  spin: [AudioParam, number][];
  sources: AudioScheduledSourceNode[];
}

export class MillSound {
  private g: Graph | null = null;
  /** When it was last meant to be heard, and when its settings were last set. */
  private heard = 0;
  private aimed = -Infinity;
  private bufs = new Map<string, AudioBuffer>();

  constructor(private ctx: BaseAudioContext, private dest: AudioNode) {}

  /** Built and running (for the tests). */
  get on() {
    return !!this.g;
  }

  /**
   * Every frame: how loud it is (millLevel), how far through its log the blade is (0–1, or null once it's stopped), and
   * whether you're in the room.
   */
  update(level: number, cut: number | null, inside: boolean) {
    const t = this.ctx.currentTime;
    if (level > 0) {
      this.g ??= this.build();
      this.heard = t;
    } else if (this.g && t - this.heard > FADE * 8) this.stop();
    const g = this.g;
    // A few times a second is plenty: each setting glides there on its own in between.
    if (!g || t - this.aimed < 0.05) return;
    this.aimed = t;
    g.out.gain.setTargetAtTime(level * LOUD, t, FADE);
    g.walls.frequency.setTargetAtTime(inside ? 6000 : 1400, t, FADE);
    const r = cut == null ? 0 : raspAt(cut);
    g.rasp.gain.setTargetAtTime(r, t, 0.08);
    // The blade comes up to speed, sags a touch as it bites, and winds down when it's done.
    const speed = cut == null ? 0.6 : 1 - 0.04 * r;
    for (const [p, f] of g.spin) p.setTargetAtTime(f * speed, t, cut == null ? 1.2 : 0.5);
  }

  /** A log's planks dropping onto the stack: a mellow wooden knock, and a smaller one as they settle. */
  knock() {
    if (!this.g) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buf('knock', 0.7, knockSound);
    src.playbackRate.value = 0.92 + Math.random() * 0.16;
    src.connect(this.g.knock);
    src.start();
  }

  private build(): Graph {
    const ctx = this.ctx;
    const sources: AudioScheduledSourceNode[] = [], spin: [AudioParam, number][] = [];
    const gain = (v: number) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    const filter = (type: BiquadFilterType, f: number, q = 0.7) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    /** Something that turns with the blade, starting slow (it spins up). */
    const turning = (type: OscillatorType, f: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * 0.6;
      spin.push([o.frequency, f]);
      sources.push(o);
      return o;
    };
    const loop = (buffer: AudioBuffer) => {
      const s = ctx.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      sources.push(s);
      return s;
    };
    const walls = filter('lowpass', 6000), out = gain(0);
    out.connect(walls).connect(this.dest);

    // The blade's hum: a low G, rounded off, and a twin a breath off it, so it swells and eases as it turns; the G
    // below for warmth where there's a speaker to carry it.
    const hum = filter('lowpass', 420, 0.5);
    hum.connect(out);
    for (const [type, f, v] of [['sine', 49, 0.3], ['sawtooth', 98, 0.4], ['sawtooth', 98.5, 0.3]] as const) turning(type, f).connect(gain(HUM * v)).connect(hum);

    // Its whirr: a soft, low rush of air, pulsing as the blade goes round.
    const noise = loop(this.buf('noise', 2, (d) => d.forEach((_, i) => (d[i] = Math.random() * 2 - 1))));
    const whirr = gain(WHIRR);
    noise.connect(filter('bandpass', 250, 1.2)).connect(filter('lowpass', 800)).connect(whirr).connect(out);
    turning('sine', 4.5).connect(gain(WHIRR * 0.35)).connect(whirr.gain);

    // The waterwheel driving it: a slow thump and creak, round and round.
    loop(this.buf('drive', TURN * 2, driveSound)).connect(gain(DRIVE)).connect(out);

    // The rasp of the log going through: a band of noise in the wood's middle, its grain chattering softly.
    const grain = gain(RASP), rasp = gain(0);
    noise.connect(filter('bandpass', 750, 0.8)).connect(filter('lowpass', 1600)).connect(grain).connect(rasp).connect(out);
    turning('sine', 11).connect(gain(RASP * 0.3)).connect(grain.gain);

    const knock = gain(KNOCK);
    knock.connect(out);
    for (const s of sources) s.start();
    return { out, walls, rasp, knock, spin, sources };
  }

  private stop() {
    for (const s of this.g!.sources) s.stop();
    this.g!.walls.disconnect();
    this.g = null;
  }

  /** A sound worked out once, sample by sample (`fill` adds into it). */
  private buf(name: string, secs: number, fill: (d: Float32Array, sr: number) => void) {
    let b = this.bufs.get(name);
    if (!b) {
      const sr = this.ctx.sampleRate;
      b = this.ctx.createBuffer(1, Math.round(secs * sr), sr);
      fill(b.getChannelData(0), sr);
      this.bufs.set(name, b);
    }
    return b;
  }
}

/**
 * A soft wooden strike at `at` seconds: a few damped tones of the wood (Hz, level, how long it rings), eased in so it
 * never clicks. It wraps round the end, so a loop carries on seamlessly.
 */
function strike(d: Float32Array, sr: number, at: number, vol: number, modes: [number, number, number][]) {
  const start = Math.round(at * sr), len = Math.round(sr * 6 * Math.max(...modes.map((m) => m[2])));
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let v = 0;
    for (const [f, a, ring] of modes) v += a * Math.sin(TAU * f * t) * Math.exp(-t / ring);
    d[(start + i) % d.length] += vol * (1 - Math.exp(-t / 0.004)) * v;
  }
}

/**
 * A slow creak of wood on wood, like an axle turning in its bearing or an old rocking chair: a run of tiny slips at a
 * sliding rate (`from` to `to` a second), rung through two of the beam's tones, swelling in and easing out.
 */
function creak(d: Float32Array, sr: number, at: number, dur: number, from: number, to: number, vol: number) {
  const len = Math.round(dur * sr), y = new Float32Array(len);
  const rings = [[420, 70, 1], [880, 140, 0.5]].map(([f, bw, a]) => {
    const r = Math.exp((-Math.PI * bw) / sr);
    return { c: 2 * r * Math.cos((TAU * f) / sr), r2: r * r, a: a * (1 - r), y1: 0, y2: 0 };
  });
  let next = 0;
  for (let i = 0; i < len; i++) {
    const slip = i >= next ? 1 : 0;
    if (slip) next = i + (sr / (from + ((to - from) * i) / len)) * (0.85 + Math.random() * 0.3);
    for (const k of rings) {
      const v = k.a * slip + k.c * k.y1 - k.r2 * k.y2;
      k.y2 = k.y1;
      k.y1 = v;
      y[i] += v;
    }
  }
  const peak = y.reduce((m, v) => Math.max(m, Math.abs(v)), 1e-9);
  for (let i = 0; i < len; i++) d[(Math.round(at * sr) + i) % d.length] += (vol / peak) * Math.sin((Math.PI * i) / len) ** 1.5 * y[i];
}

/** Two turns of the waterwheel: a heavy paddle thump and a lighter one each turn, and the axle creaking between. */
function driveSound(d: Float32Array, sr: number) {
  const thump: [number, number, number][] = [[70, 1, 0.14], [140, 0.8, 0.09], [300, 0.45, 0.05]];
  for (const [at, vol] of [[0, 1], [TURN / 2, 0.65], [TURN, 0.9], [TURN * 1.5, 0.6]]) strike(d, sr, at, vol, thump);
  creak(d, sr, 0.5, 0.6, 34, 44, 0.5);
  creak(d, sr, TURN + 0.6, 0.75, 30, 38, 0.4);
}

/** Planks dropping onto the stack: a mellow knock, a smaller bounce, and a last tap as they settle. */
function knockSound(d: Float32Array, sr: number) {
  const wood: [number, number, number][] = [[190, 1, 0.07], [430, 0.55, 0.04], [960, 0.12, 0.02]];
  strike(d, sr, 0, 1, wood);
  strike(d, sr, 0.11, 0.45, wood.map(([f, a, r]) => [f * 1.06, a, r]));
  strike(d, sr, 0.19, 0.18, wood.map(([f, a, r]) => [f * 1.1, a, r * 0.8]));
}
