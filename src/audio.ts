// Tiny synthesized sound effects via WebAudio — no audio files needed.

export type Sfx =
  | 'swing' | 'hit' | 'crit' | 'hurt' | 'kill' | 'levelup' | 'encounter' | 'victory'
  | 'craft' | 'heal' | 'dodge' | 'shoot' | 'boom' | 'ui' | 'lose' | 'skill' | 'step';

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
