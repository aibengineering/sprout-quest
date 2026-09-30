// Tiny synthesized sound effects via WebAudio — no audio files needed.

export type Sfx =
  | 'swing' | 'hit' | 'crit' | 'hurt' | 'kill' | 'levelup' | 'encounter' | 'victory'
  | 'craft' | 'heal' | 'dodge' | 'shoot' | 'boom' | 'ui' | 'lose' | 'skill' | 'step' | 'heavy'
  // Gathering: an axe biting wood, a pick on stone, a glancing miss, a tree creaking over and landing, a rock
  // crumbling, and what you earned landing in your bag.
  | 'chop' | 'clink' | 'glance' | 'creak' | 'thud' | 'crumble' | 'pickup'
  // A whip's tip snapping over.
  | 'crack'
  // Rewards: a bell as the XP bar tops out (a level), a tick per stat that grows, and a treasure's little fanfare.
  | 'ding' | 'tick' | 'treasure'
  // Weapon handling's bar has its own voice: the same bell, a fourth lower and warmer.
  | 'handlingDing'
  // Something important in the story (the Twig Sword, Granny's boots): a climb that resolves into a held bright
  // chord, the way Zelda marks a key item. And a campfire caught alight: a whoosh, a warm rise, a soft chord.
  | 'keyItem' | 'kindle'
  // A regular win: a quick bright bell, leaving room for the XP fill right after it (guardians keep the full jingle).
  | 'win';

/** How many bubbles an XP fill of `dur` seconds plays, evenly spaced (the HUD pops a notch onto the bar with each). */
export const xpBloops = (dur: number) => Math.max(2, Math.round(dur / 0.075));

/** The jingles the music makes room for, and for how long (seconds). */
const FANFARES: Partial<Record<Sfx, number>> = { victory: 1.4, lose: 1.2, levelup: 0.8, treasure: 1.1, keyItem: 2.2, kindle: 2.2 };

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  /** Called when a fanfare plays, with how long it rings (the music ducks under it). */
  onFanfare: ((secs: number) => void) | null = null;

  /** The shared AudioContext, once a user gesture has unlocked sound (the music plays through it too). */
  get context() {
    return this.ctx;
  }

  /** Must be called from a user gesture on iOS before any sound can play. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master!);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq = 1200, delay = 0) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master!);
    src.start(t0);
  }

  /**
   * The XP bar filling: a stream of bubbles. Built the way Pokémon's is (Gold/Silver's EXP sound, read from the
   * disassembly), as re-struck notes rather than one long slide, but each one a soft sine "bloop" that leaps up in
   * pitch, with no buzzy square tone under it. The pitch follows the bar (slow at the bottom, racing near the top,
   * which builds anticipation), and it gets louder as the bar fills.
   */
  sweep(dur: number, from: number, to: number, voice: 'xp' | 'handling' = 'xp') {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const t0 = this.ctx.currentTime + 0.01;
    const n = xpBloops(dur), step = dur / n;
    // Weapon handling's fill: a fourth lower, with a warmer, woodier triangle tone, so the two bars sound apart.
    const [k, wave] = voice === 'handling' ? [0.75, 'triangle' as const] : [1, 'sine' as const];
    for (let i = 0; i < n; i++) {
      const a = from + ((to - from) * i) / n, b = from + ((to - from) * (i + 1)) / n;
      this.chirp(xpPitch(a) * 1.5 * k, xpPitch(b) * 2 * k, 0.05, wave, (0.07 + 0.07 * b) * (voice === 'handling' ? 1.2 : 1), t0 + i * step);
    }
  }

  /** One short note whose pitch climbs from `f0` to `f1`; it falls to `tail` of its volume by the end. */
  private chirp(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, t0: number, tail = 0.01) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * tail), t0 + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.012);
    o.connect(g).connect(this.master!);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  /**
   * The bar topping out: Pokémon's bell is two voices a fourth apart, each flicking up through two grace notes
   * (a frame each) before it rings. Here in C: C-E-G under E-G-C, ringing on G and C, with a shimmer on top.
   */
  private bell(pitch = 1) {
    const t0 = this.ctx!.currentTime + 0.005, f = 1 / 60;
    [[1047, 1319, 1568], [1319, 1568, 2093]].forEach((voice, v) =>
      voice.forEach((hz, k) => {
        const last = k === voice.length - 1;
        this.chirp(hz * pitch, hz * pitch, last ? 0.34 : f, 'square', v ? 0.07 : 0.09, t0 + k * f, last ? 0.02 : 1);
        if (last) this.chirp(hz * pitch, hz * pitch, 0.6, 'triangle', 0.12, t0 + k * f);
      }));
    this.chirp(4186 * pitch, 4186 * pitch, 0.25, 'sine', 0.025, t0 + 0.06);
  }

  play(s: Sfx) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    if (FANFARES[s]) this.onFanfare?.(FANFARES[s]);
    const notes = (fs: number[], step: number, type: OscillatorType = 'square', vol = 0.12) =>
      fs.forEach((f, i) => this.tone(f, step * 1.6, type, vol, undefined, i * step));
    switch (s) {
      case 'swing': this.noise(0.08, 0.25, 2500); break;
      case 'heavy': this.noise(0.16, 0.4, 900); this.tone(180, 0.15, 'triangle', 0.15, 90); break;
      case 'hit': this.tone(320, 0.08, 'square', 0.15, 140); this.noise(0.05, 0.2, 900); break;
      case 'crit': this.tone(520, 0.12, 'square', 0.18, 180); this.noise(0.08, 0.3, 1400); break;
      case 'hurt': this.tone(220, 0.18, 'sawtooth', 0.15, 90); break;
      case 'kill': this.tone(600, 0.15, 'triangle', 0.2, 1200); this.noise(0.12, 0.15, 3000, 0.02); break;
      case 'levelup': notes([523, 659, 784, 1047], 0.08, 'square', 0.1); break;
      case 'encounter': notes([880, 660, 880], 0.06, 'square', 0.1); break;
      case 'victory': notes([523, 523, 659, 784, 659, 784, 1047], 0.09, 'triangle', 0.18); break;
      case 'lose': notes([392, 330, 262, 196], 0.14, 'triangle', 0.18); break;
      case 'craft': this.tone(880, 0.06, 'square', 0.1); this.tone(1320, 0.2, 'triangle', 0.15, undefined, 0.07); break;
      case 'heal': notes([660, 880, 1100], 0.06, 'sine', 0.2); break;
      case 'dodge': this.noise(0.12, 0.15, 1800); break;
      case 'shoot': this.tone(900, 0.1, 'triangle', 0.12, 1500); break;
      case 'boom': this.noise(0.35, 0.45, 500); this.tone(120, 0.3, 'sine', 0.3, 40); break;
      case 'skill': this.tone(400, 0.25, 'sawtooth', 0.1, 1200); this.noise(0.2, 0.2, 2000); break;
      case 'ui': this.tone(740, 0.05, 'square', 0.07); break;
      case 'step': this.noise(0.03, 0.05, 700); break;
      case 'chop': this.tone(170, 0.1, 'triangle', 0.3, 85); this.noise(0.07, 0.3, 1100); break;
      case 'clink': this.tone(1500, 0.07, 'square', 0.06, 1000); this.tone(720, 0.1, 'triangle', 0.14, 520); this.noise(0.05, 0.22, 3200); break;
      case 'glance': this.noise(0.08, 0.12, 2600); this.tone(950, 0.06, 'sine', 0.05, 620); break;
      case 'creak': this.tone(150, 0.55, 'sawtooth', 0.045, 95); this.tone(230, 0.45, 'sawtooth', 0.03, 130, 0.08); break;
      case 'thud': this.noise(0.32, 0.45, 380); this.tone(95, 0.32, 'sine', 0.38, 42); break;
      case 'crumble': this.noise(0.5, 0.38, 850); this.noise(0.3, 0.2, 2400, 0.06); this.tone(115, 0.26, 'sine', 0.28, 48); break;
      case 'pickup': notes([988, 1319], 0.05, 'square', 0.07); break;
      case 'crack': this.noise(0.035, 0.55, 7000); this.tone(2400, 0.025, 'square', 0.08, 1200); break;
      case 'ding': this.bell(); break;
      case 'handlingDing': this.bell(0.75); break;
      case 'tick': this.tone(1320, 0.05, 'square', 0.06); break;
      case 'win': this.tone(1319, 0.14, 'triangle', 0.2); this.tone(1976, 0.3, 'triangle', 0.18, undefined, 0.08); this.tone(3951, 0.2, 'sine', 0.03, undefined, 0.1); break;
      case 'treasure': notes([659, 784, 1047, 1319], 0.07, 'triangle', 0.16); this.tone(1568, 0.5, 'sine', 0.1, undefined, 0.3); break;
      case 'keyItem': {
        // Four rising semitones, each a little longer, straining upward…
        [784, 831, 880, 932].forEach((f, i) => this.tone(f, 0.13 + i * 0.02, 'square', 0.08, undefined, i * 0.13));
        // …then a bright B major chord that rings out, with a sparkle over the top.
        for (const f of [988, 1245, 1480, 1976]) this.tone(f, 1.1, 'triangle', 0.1, undefined, 0.56);
        this.tone(494, 1.1, 'square', 0.05, undefined, 0.56);
        [2960, 3951].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.035, undefined, 0.62 + i * 0.12));
        break;
      }
      case 'kindle':
        // The flame catching: a soft rushing whoosh…
        this.noise(0.35, 0.18, 900);
        // …a warm rise…
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.13, undefined, 0.18 + i * 0.12));
        // …and a gentle chord that settles, like sitting down by the fire.
        for (const f of [523, 659, 784, 1047]) this.tone(f, 1.3, 'sine', 0.08, undefined, 0.72);
        this.tone(2093, 0.4, 'sine', 0.025, undefined, 0.8);
        break;
    }
  }
}

export function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported (iOS) — fine.
  }
}

/** Where a point on the XP bar sits in pitch: even steps in period, as on the Game Boy, so it rises faster near the top. */
const xpPitch = (p: number) => 440 / (1 - 0.55 * p);
