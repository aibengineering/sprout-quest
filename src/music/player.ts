// Plays the game's music: loads the recordings in the background (the opening's themes first), and plays whichever
// theme the game wants, crossfading between them. A theme that hasn't loaded yet is silence until it has; nothing
// ever waits for music.
import type { Audio } from '../audio';
import { orchestrate, pick, samplesFor, type Note, type SampleIndex, type Score } from './orchestra';
import { FIRST_THEMES, THEMES, type ThemeId } from './scores';

/** The music's overall level: background, well under the sound effects. */
const VOLUME = 0.3;
/** Fights are the busiest for sound effects (hits, dodges, spells), so their themes sit lower still. */
const THEME_LEVEL: Partial<Record<ThemeId, number>> = { battle: 0.65, guardian: 0.75 };
const FADE = 1.2;
/** How far ahead notes are scheduled (seconds), and how often the scheduler looks. */
const AHEAD = 0.35;
const TICK_MS = 80;
/** How many recordings download at once (the rest of the game's loading comes first). */
const PARALLEL = 4;

/** Where each section sits (pan), its level, and how it lets go of a note (seconds; 0 lets the recording ring). */
const DESK: Record<string, { pan: number; level: number; release: number }> = {
  violins: { pan: -0.45, level: 1, release: 0.35 }, violins_spic: { pan: -0.45, level: 0.9, release: 0.08 },
  violins_pizz: { pan: -0.4, level: 0.8, release: 0 }, violins_trem: { pan: -0.4, level: 1.3, release: 0.3 },
  violas: { pan: -0.05, level: 1.4, release: 0.35 }, violas_spic: { pan: 0.05, level: 0.75, release: 0.08 },
  celli: { pan: 0.3, level: 1.3, release: 0.35 }, celli_spic: { pan: 0.3, level: 0.85, release: 0.08 },
  basses: { pan: 0.5, level: 0.8, release: 0.3 }, basses_spic: { pan: 0.5, level: 0.85, release: 0.08 }, basses_pizz: { pan: 0.45, level: 0.65, release: 0 },
  harp: { pan: -0.6, level: 0.8, release: 0 },
  horn: { pan: -0.2, level: 0.42, release: 0.25 },
  trumpet: { pan: 0.15, level: 0.6, release: 0.2 },
  trombone: { pan: 0.3, level: 0.65, release: 0.25 }, trombone_stac: { pan: 0.3, level: 1.1, release: 0.06 },
  tuba: { pan: 0.4, level: 1, release: 0.25 },
  flute: { pan: -0.1, level: 0.8, release: 0.2 },
  oboe: { pan: 0.05, level: 0.7, release: 0.2 },
  clarinet: { pan: 0.15, level: 0.8, release: 0.2 }, clarinet_stac: { pan: 0.15, level: 0.8, release: 0 },
  bassoon_stac: { pan: 0.25, level: 0.9, release: 0 },
  glock: { pan: 0.35, level: 0.9, release: 0 },
  timpani: { pan: 0, level: 0.9, release: 0 },
  bassdrum: { pan: 0, level: 0.9, release: 0 }, snare: { pan: 0.1, level: 2.5, release: 0 }, snare_roll: { pan: 0.1, level: 1.2, release: 0.3 },
  crash: { pan: 0.2, level: 1.3, release: 0 }, gong: { pan: 0, level: 0.9, release: 0 },
  triangle: { pan: 0.4, level: 1, release: 0 }, claves: { pan: -0.3, level: 1.6, release: 0 },
};

interface Playing {
  id: ThemeId;
  notes: Note[];
  length: number;
  beat: number;
  start: number;
  next: number;
  loop: number;
  /** The theme's own dry and reverb levels, faded together. */
  dry: GainNode;
  wet: GainNode;
  desks: Map<string, { dry: GainNode; wet: GainNode }>;
  timer: number;
}

export class Music {
  private ctx: AudioContext | null = null;
  private bus!: GainNode;
  private reverb!: ConvolverNode;
  private index: SampleIndex | null = null;
  private buffers = new Map<string, { buf: AudioBuffer; start: number }>();
  private ready = new Set<ThemeId>();
  private playing: Playing | null = null;
  private wanted: ThemeId | null = null;
  /** The level the music's heading for (0 when muted or turned down to off). */
  private level = -1;
  /** The music's volume, 0 (off) to 1 (the sound settings). */
  volume = 1;
  /** Off in automated browsers (the tests), unless a page asks for it with `?music`. */
  private enabled = typeof navigator === 'undefined' || !navigator.webdriver || new URLSearchParams(location.search).has('music');

  constructor(private audio: Audio) {
    audio.onFanfare = (secs) => this.duck(secs);
  }

  /** Called every frame with the theme that fits what's happening (null for none). */
  want(id: ThemeId | null) {
    if (!this.enabled) return;
    const target = this.audio.muted ? 0 : VOLUME * this.volume;
    if (!this.ctx) {
      // Sound unlocks on the first tap; the music starts loading then (unless it's turned off: then it never downloads).
      const ctx = this.audio.context;
      if (!ctx || !target) return;
      this.setup(ctx);
    }
    this.setLevel(target);
    if (id === this.wanted) return;
    this.wanted = id;
    if (this.playing?.id === id) return;
    this.fadeOut();
    if (id && this.ready.has(id)) this.start(id);
  }

  /** Which themes are loaded (for the tests). */
  get loaded(): ThemeId[] {
    return [...this.ready];
  }

  get current(): ThemeId | null {
    return this.playing?.id ?? null;
  }

  private setup(ctx: AudioContext) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 2.5;
    this.bus.connect(comp).connect(ctx.destination);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = hall(ctx, 3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.reverb.connect(wet).connect(this.bus);
    void this.loadAll();
  }

  /** The opening's themes first, then the rest, one theme at a time. Each one plays from the moment it's in. */
  private async loadAll() {
    try {
      this.index = (await (await fetch('music/index.json')).json()) as SampleIndex;
      const order = [...FIRST_THEMES, ...(Object.keys(THEMES) as ThemeId[]).filter((id) => !FIRST_THEMES.includes(id))];
      for (const id of order) {
        await this.load(THEMES[id]);
        this.ready.add(id);
        // Still waiting for it? It comes in now.
        if (this.wanted === id && !this.playing) this.start(id);
      }
    } catch (e) {
      // No music (offline, or a browser that can't decode the recordings): the game plays on in silence.
      console.warn('music unavailable', e);
    }
  }

  private async load(score: Score) {
    const files = [...samplesFor(this.index!, score)].filter((f) => !this.buffers.has(f));
    const ctx = this.ctx!;
    const one = async (f: string) => {
      const buf = await ctx.decodeAudioData(await (await fetch(`music/${f}`)).arrayBuffer());
      this.buffers.set(f, { buf, start: onset(buf) });
    };
    for (let i = 0; i < files.length; i += PARALLEL) await Promise.all(files.slice(i, i + PARALLEL).map(one));
  }

  private start(id: ThemeId) {
    const ctx = this.ctx!, score = THEMES[id];
    const { notes, length } = orchestrate(score);
    const dry = ctx.createGain(), wet = ctx.createGain();
    for (const g of [dry, wet]) {
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(THEME_LEVEL[id] ?? 1, ctx.currentTime + FADE);
    }
    dry.connect(this.bus);
    wet.connect(this.reverb);
    const p: Playing = { id, notes, length, beat: 60 / score.bpm, start: ctx.currentTime + 0.1, next: 0, loop: 0, dry, wet, desks: new Map(), timer: 0 };
    const tick = () => {
      const horizon = ctx.currentTime + AHEAD;
      for (;;) {
        const n = p.notes[p.next];
        const at = p.start + (p.loop * p.length + n.t) * p.beat;
        if (at > horizon) break;
        if (at > ctx.currentTime - 0.05) this.note(p, n, at);
        if (++p.next === p.notes.length) {
          p.next = 0;
          p.loop++;
        }
      }
    };
    tick();
    p.timer = window.setInterval(tick, TICK_MS);
    this.playing = p;
  }

  private fadeOut() {
    const p = this.playing;
    if (!p) return;
    this.playing = null;
    clearInterval(p.timer);
    const t = this.ctx!.currentTime;
    for (const g of [p.dry, p.wet]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + FADE);
    }
    setTimeout(() => {
      p.dry.disconnect();
      p.wet.disconnect();
    }, (FADE + 4) * 1000);
  }

  /** One note: the recording, re-pitched, a touch loose in time and weight, let go at the note's end. */
  private note(p: Playing, n: Note, at: number) {
    const s = pick(this.index!, n.inst, n.midi, n.vel);
    const b = s && this.buffers.get(s.file);
    if (!b) return;
    const ctx = this.ctx!;
    const t = Math.max(ctx.currentTime, at + (Math.random() - 0.5) * 0.02);
    const vel = n.vel * (0.92 + Math.random() * 0.16);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b.buf;
    if (n.midi != null && s.midi != null) src.playbackRate.value = 2 ** ((n.midi - s.midi) / 12);
    const release = DESK[n.inst]?.release ?? 0.2, end = t + n.dur * p.beat;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.006);
    if (release > 0) {
      g.gain.setValueAtTime(vel, end);
      g.gain.setTargetAtTime(0, end, release / 3);
    }
    src.connect(g).connect(this.desk(p, n.inst));
    src.start(t, b.start);
    src.stop(release > 0 ? Math.min(end + release * 2, t + b.buf.duration) : t + b.buf.duration);
  }

  /** A section's seat: its level and pan, into the theme's dry and reverb paths. Made on first use. */
  private desk(p: Playing, inst: string) {
    let d = p.desks.get(inst);
    if (!d) {
      const ctx = this.ctx!, seat = DESK[inst] ?? { pan: 0, level: 0.7 };
      const level = ctx.createGain(), pan = ctx.createStereoPanner(), send = ctx.createGain();
      level.gain.value = seat.level;
      pan.pan.value = seat.pan;
      send.gain.value = inst.includes('pizz') || inst === 'harp' ? 0.9 : 0.7;
      level.connect(pan);
      pan.connect(p.dry);
      pan.connect(send).connect(p.wet);
      d = { dry: level, wet: send };
      p.desks.set(inst, d);
    }
    return d.dry;
  }

  private setLevel(v: number) {
    if (v === this.level || !this.ctx) return;
    this.level = v;
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setTargetAtTime(v, t, 0.1);
  }

  /** Makes room for a jingle: the music dips, then comes back. */
  duck(secs: number) {
    if (!this.ctx || !this.level) return;
    const g = this.bus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this.level * 0.25, t, 0.05);
    g.setTargetAtTime(this.level, t + secs, 0.4);
  }
}

/** Where the note really starts in a decoded recording (codecs pad the front with a little silence). */
function onset(buf: AudioBuffer) {
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > peak * 0.01) return Math.max(0, i / buf.sampleRate - 0.003);
  return 0;
}

/** A concert hall's tail, generated: decaying noise that darkens as it fades, after a short pre-delay. */
function hall(ctx: AudioContext, secs: number) {
  const len = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate, k = 0.5 - 0.42 * (t / secs);
      lp += k * (Math.random() * 2 - 1 - lp);
      d[i] = t < 0.022 ? 0 : lp * Math.exp(-t * 2.1);
    }
  }
  return buf;
}
