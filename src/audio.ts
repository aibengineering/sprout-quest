// Tiny synthesized sound effects via WebAudio — no audio files needed.

export type Sfx =
  | 'swing' | 'hit' | 'crit' | 'hurt' | 'kill' | 'levelup' | 'encounter' | 'victory'
  | 'craft' | 'heal' | 'dodge' | 'shoot' | 'boom' | 'ui' | 'lose' | 'skill' | 'step' | 'heavy'
  // Gathering: an axe biting wood, a pick on stone, a glancing miss, a tree creaking over and landing, a rock
  // crumbling, and what you earned landing in your bag.
  | 'chop' | 'clink' | 'glance' | 'creak' | 'thud' | 'crumble' | 'pickup'
  // A whip's tip snapping over.
  | 'crack';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

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

  play(s: Sfx) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
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
