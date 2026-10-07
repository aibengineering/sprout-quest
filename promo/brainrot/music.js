// The soundtrack, synthesized from oscillators and noise: no samples. scheduleSong() works the same in a live
// AudioContext and in an OfflineAudioContext (render.ts uses that to write the WAV).
import { events, STEP, BEAT, END } from './score.js';

const mtof = (n) => 440 * 2 ** ((n - 69) / 12);

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Schedules the whole song starting at context time t0 and returns the master gain (already connected). */
export function scheduleSong(ctx, t0 = 0, dest = ctx.destination) {
  const rand = rng(7);
  const sr = ctx.sampleRate;

  // Master: a gentle glue compressor, then a fast limiter, so the meme hits never get ear-splitting.
  const master = ctx.createGain();
  master.gain.value = 0.95;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20; glue.knee.value = 8; glue.ratio.value = 3; glue.attack.value = 0.008; glue.release.value = 0.2;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -5; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.08;
  const out = ctx.createGain();
  out.gain.value = 0.92;
  master.connect(glue).connect(limit).connect(out).connect(dest);

  // A small room for the bells and stabs.
  const verb = ctx.createConvolver();
  {
    const len = Math.floor(sr * 2.2);
    const ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.exp(-i / sr * 3.2);
    }
    verb.buffer = ir;
  }
  const verbIn = ctx.createGain();
  verbIn.gain.value = 0.35;
  verbIn.connect(verb).connect(master);

  const noise = ctx.createBuffer(1, sr * 2, sr);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; }

  const curves = {};
  const curve = (drive) => curves[drive] ??= (() => {
    const c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * drive) / Math.tanh(drive); }
    return c;
  })();
  const shaper = (drive) => { const w = ctx.createWaveShaper(); w.curve = curve(drive); w.oversample = '2x'; return w; };

  // Small helpers -----------------------------------------------------------------------------------------
  const gain = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const osc = (type, f, t, stop) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(stop); return o;
  };
  const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const noiseSrc = (t, dur) => {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    s.start(t, rand() * 1.5); s.stop(t + dur + 0.05); return s;
  };
  /** Percussive envelope: quick attack, exponential decay. */
  const perc = (g, t, peak, decay, attack = 0.002) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  const send = (node, amt) => { const g = gain(amt); node.connect(g).connect(verbIn); };
  const bus = (v) => { const g = gain(v); g.connect(master); return g; };
  const drums = bus(0.9), bass = bus(0.14), melody = bus(1.55), sfx = bus(0.8);

  // Instruments ------------------------------------------------------------------------------------------
  const I = {
    musicbox(t, e) {
      const f = mtof(e.n);
      const g = gain(0); perc(g, t, 0.06, 1.4, 0.003);
      for (const [m, a, type] of [[1, 1, 'sine'], [2.002, 0.25, 'sine'], [4.2, 0.08, 'sine'], [3, 0.06, 'triangle']]) {
        const o = osc(type, f * m, t, t + 1.6); const og = gain(a); o.connect(og).connect(g);
      }
      g.connect(melody); send(g, 0.9);
    },
    pad(t, e) {
      const g = gain(0);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.014, t + 0.35);
      g.gain.setValueAtTime(0.014, t + e.dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + e.dur + 0.2);
      const lp = filt('lowpass', 1100, 0.5);
      for (const n of e.notes) for (const d of [-6, 6]) { const o = osc('sawtooth', mtof(n), t, t + e.dur + 0.3); o.detune.value = d; o.connect(lp); }
      lp.connect(g).connect(melody); send(g, 0.8);
    },
    softkick(t) {
      const o = osc('sine', 110, t, t + 0.3); o.frequency.exponentialRampToValueAtTime(48, t + 0.15);
      const g = gain(0); perc(g, t, 0.15, 0.25); o.connect(g).connect(drums);
    },
    kick(t, e) {
      const o = osc('sine', 165, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
      const g = gain(0); perc(g, t, e.big ? 0.8 : 0.66, 0.3, 0.001);
      o.connect(shaper(2.2)).connect(g).connect(drums);
      const n = noiseSrc(t, 0.02); const hp = filt('highpass', 3000); const ng = gain(0); perc(ng, t, 0.25, 0.012, 0.0005);
      n.connect(hp).connect(ng).connect(drums);
    },
    clap(t) {
      const n = noiseSrc(t, 0.3); const bp = filt('bandpass', 1400, 0.9); const g = gain(0);
      g.gain.setValueAtTime(0.0001, t);
      for (const dt of [0, 0.011, 0.022]) { g.gain.setValueAtTime(0.55, t + dt); g.gain.exponentialRampToValueAtTime(0.08, t + dt + 0.009); }
      g.gain.setValueAtTime(0.5, t + 0.031); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      n.connect(bp).connect(g).connect(drums); send(g, 0.35);
      const o = osc('triangle', 210, t, t + 0.12); o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      const og = gain(0); perc(og, t, 0.3, 0.08); o.connect(og).connect(drums);
    },
    hat(t, e) {
      const n = noiseSrc(t, 0.06); const hp = filt('highpass', 7500, 0.8); const g = gain(0); perc(g, t, 0.26 * e.v, 0.035 + 0.02 * e.v, 0.0008);
      n.connect(hp).connect(g).connect(drums);
    },
    bass(t, e) {
      // A distorted 808 with a glide; a little second harmonic so it reads on phone speakers.
      const f = mtof(e.n), end = t + e.dur;
      const g = gain(0);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.006);
      if (e.fade) g.gain.exponentialRampToValueAtTime(0.0001, end);
      else {
        g.gain.exponentialRampToValueAtTime(0.45, t + Math.min(e.dur, 0.6)); g.gain.setValueAtTime(0.45, end - 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, end + 0.02);
      }
      const mix = gain(1);
      for (const [type, m, a] of [['sine', 1, 1], ['triangle', 2, 0.22]]) {
        const o = osc(type, (e.slide ? mtof(e.from) : f) * m, t, end + 0.05);
        if (e.slide) o.frequency.exponentialRampToValueAtTime(f * m, t + 0.09);
        else { o.frequency.setValueAtTime(f * m * 1.9, t); o.frequency.exponentialRampToValueAtTime(f * m, t + 0.03); }
        const og = gain(a); o.connect(og).connect(mix);
      }
      mix.connect(shaper(3.5)).connect(filt('lowpass', 1600, 0.6)).connect(g).connect(bass);
    },
    cowbell(t, e) {
      // The phonk cowbell: two detuned squares through a band, a fast drop then a short tail.
      const f = mtof(e.n - 12);
      const g = gain(0);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      const bp = filt('bandpass', f * 2.2, 0.9);
      for (const m of [1, 1.4836]) { const o = osc('square', f * m, t, t + 0.42); o.connect(bp); }
      const hp = filt('highpass', 280);
      bp.connect(hp).connect(g).connect(melody); send(g, 0.25);
    },
    boom(t, e) {
      const len = e.big ? 1.5 : 0.9;
      const o = osc('sine', 82, t, t + len); o.frequency.exponentialRampToValueAtTime(30, t + len * 0.8);
      const g = gain(0); perc(g, t, e.big ? 1 : 0.75, len, 0.003);
      o.connect(shaper(4)).connect(g).connect(sfx);
      const n = noiseSrc(t, 0.5); const lp = filt('lowpass', 500); lp.frequency.exponentialRampToValueAtTime(80, t + 0.4);
      const ng = gain(0); perc(ng, t, 0.6, 0.35); n.connect(lp).connect(ng).connect(sfx); send(ng, 0.4);
    },
    scratch(t, e) {
      // A record scratch: a band of noise and a buzzy tone dragged back and forth.
      const d = e.short ? 0.16 : 0.26;
      const n = noiseSrc(t, d); const bp = filt('bandpass', 400, 3);
      const pts = e.short ? [400, 2600, 300] : [300, 2800, 700, 3200, 250];
      pts.forEach((f, i) => bp.frequency.linearRampToValueAtTime(f, t + (i / (pts.length - 1)) * d));
      const s = osc('sawtooth', 160, t, t + d); pts.forEach((f, i) => s.frequency.linearRampToValueAtTime(f / 5, t + (i / (pts.length - 1)) * d));
      const sg = gain(0.18);
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
      g.gain.setValueAtTime(0.9, t + d - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      n.connect(bp).connect(g); s.connect(sg).connect(g); g.connect(sfx);
    },
    whoosh(t, e) {
      const d = e.dur;
      const n = noiseSrc(t, d); const bp = filt('bandpass', e.down ? 5000 : 300, 1.4);
      bp.frequency.exponentialRampToValueAtTime(e.down ? 250 : 7000, t + d);
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + d * 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      n.connect(bp).connect(g).connect(sfx);
      if (!e.down) {
        const o = osc('sine', 220, t, t + d); o.frequency.exponentialRampToValueAtTime(1500, t + d);
        const og = gain(0); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.12, t + d * 0.9); og.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(og).connect(sfx);
      }
    },
    chop(t) {
      const o = osc('sine', 300, t, t + 0.2); o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      const g = gain(0); perc(g, t, 0.7, 0.14); o.connect(g).connect(sfx);
      const n = noiseSrc(t, 0.08); const bp = filt('bandpass', 1800, 1.2); const ng = gain(0); perc(ng, t, 0.55, 0.06);
      n.connect(bp).connect(ng).connect(sfx);
    },
    thud(t) {
      const o = osc('sine', 95, t, t + 0.6); o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
      const g = gain(0); perc(g, t, 0.9, 0.5); o.connect(shaper(3)).connect(g).connect(sfx);
      const n = noiseSrc(t, 0.6); const lp = filt('lowpass', 700); const ng = gain(0); perc(ng, t, 0.5, 0.45);
      n.connect(lp).connect(ng).connect(sfx);
    },
    pop(t, e) {
      const f = 520 * 2 ** ([0, 2, 4, 7, 9, 12, 14, 16][e.p % 8] / 12);
      const o = osc('sine', f, t, t + 0.12); o.frequency.exponentialRampToValueAtTime(f * 2.1, t + 0.05);
      const g = gain(0); perc(g, t, 0.32, 0.08); o.connect(g).connect(sfx);
    },
    ding(t, e) {
      // Ka-ching: a mechanical click, then two bright bells.
      const k = 2 ** (((e.p || 0) * 2) / 12);
      const n = noiseSrc(t, 0.04); const bp = filt('bandpass', 3200, 2); const ng = gain(0); perc(ng, t, 0.35, 0.03);
      n.connect(bp).connect(ng).connect(sfx);
      for (const [dt, f] of [[0.04, 2093], [0.1, 2637]]) {
        const g = gain(0); perc(g, t + dt, 0.13, 0.7);
        for (const [m, a] of [[1, 1], [2.4, 0.3], [3.9, 0.12]]) { const o = osc('sine', f * k * m, t + dt, t + dt + 0.8); const og = gain(a); o.connect(og).connect(g); }
        g.connect(sfx); send(g, 0.5);
      }
    },
    clink(t, e) {
      const g = gain(0); perc(g, t, 0.18, 0.3);
      for (const [f, a] of [[1900, 1], [2950, 0.6], [4400, 0.35]]) { const o = osc('sine', f * (e.hi ? 1.25 : 1), t, t + 0.35); const og = gain(a); o.connect(og).connect(g); }
      g.connect(sfx); send(g, 0.3);
      const n = noiseSrc(t, 0.03); const hp = filt('highpass', 4000); const ng = gain(0); perc(ng, t, 0.4, 0.02); n.connect(hp).connect(ng).connect(sfx);
    },
    shatter(t) {
      const n = noiseSrc(t, 0.6); const hp = filt('highpass', 2500); const ng = gain(0); perc(ng, t, 0.45, 0.45, 0.001);
      n.connect(hp).connect(ng).connect(sfx); send(ng, 0.4);
      for (let i = 0; i < 9; i++) {
        const tt = t + rand() * 0.35, f = 2400 + rand() * 3600;
        const o = osc('sine', f, tt, tt + 0.2); const g = gain(0); perc(g, tt, 0.07, 0.15); o.connect(g).connect(sfx); send(g, 0.4);
      }
    },
    aura(t) {
      // An angelic "aaah": saws through two vowel formants, swelling up.
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.25);
      g.gain.setValueAtTime(0.16, t + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      const f1 = filt('bandpass', 750, 4), f2 = filt('bandpass', 1150, 5);
      const lfo = osc('sine', 5.5, t, t + 1.5); const lg = gain(6); lfo.connect(lg);
      for (const n of [65, 69, 72, 77]) { const o = osc('sawtooth', mtof(n), t, t + 1.5); lg.connect(o.detune); o.connect(f1); o.connect(f2); }
      f1.connect(g); f2.connect(g); g.connect(sfx); send(g, 1);
    },
    horn(t, e) {
      // An airhorn-ish stab: bright detuned saws, slightly flat at the start, through a horn-like band.
      const hits = { stab: [[0, 0.11], [0.15, 0.2]], triple: [[0, 0.1], [0.14, 0.1], [0.28, 0.5]], long: [[0, 0.95]] }[e.pattern];
      for (const [dt, d] of hits) {
        const tt = t + dt;
        const g = gain(0); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.2, tt + 0.012);
        g.gain.setValueAtTime(0.2, tt + d - 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tt + d + 0.04);
        const bp = filt('bandpass', 1400, 0.6);
        for (const [f, det] of [[466, -9], [466, 9], [588, -5], [588, 6], [233, 0]]) {
          const o = osc('sawtooth', f * 0.93, tt, tt + d + 0.06); o.detune.value = det;
          o.frequency.exponentialRampToValueAtTime(f, tt + 0.035); o.connect(bp);
        }
        bp.connect(shaper(2)).connect(g).connect(sfx); send(g, 0.35);
      }
    },
    slash(t) {
      const n = noiseSrc(t, 0.16); const bp = filt('bandpass', 700, 2); bp.frequency.exponentialRampToValueAtTime(6000, t + 0.12);
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.07); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      n.connect(bp).connect(g).connect(sfx);
    },
    squish(t) {
      const o = osc('sine', 340, t, t + 0.2); o.frequency.exponentialRampToValueAtTime(80, t + 0.16);
      const lfo = osc('sine', 38, t, t + 0.2); const lg = gain(60); lfo.connect(lg).connect(o.frequency);
      const g = gain(0); perc(g, t, 0.45, 0.16); o.connect(g).connect(sfx);
    },
    hit(t, e) {
      const n = noiseSrc(t, 0.07); const bp = filt('bandpass', 2200, 1); const ng = gain(0); perc(ng, t, 0.35, 0.05);
      n.connect(bp).connect(ng).connect(sfx);
      const o = osc('sine', 190, t, t + 0.12); o.frequency.exponentialRampToValueAtTime(60, t + 0.09);
      const g = gain(0); perc(g, t, 0.45, 0.09); o.connect(g).connect(sfx);
      const f = 700 * 2 ** (e.i / 14);
      const p = osc('square', f, t, t + 0.08); const pg = gain(0); perc(pg, t, 0.05, 0.06); p.connect(pg).connect(sfx);
    },
    ko(t) {
      const o = osc('sawtooth', 175, t, t + 0.9); o.frequency.exponentialRampToValueAtTime(44, t + 0.8);
      const lp = filt('lowpass', 1800); lp.frequency.exponentialRampToValueAtTime(200, t + 0.8);
      const g = gain(0); perc(g, t, 0.3, 0.85); o.connect(lp).connect(g).connect(sfx);
      I.shatter(t + 0.01);
    },
    levelup(t) {
      [77, 81, 84, 89, 93].forEach((n, i) => {
        const tt = t + i * 0.055; const o = osc('square', mtof(n), tt, tt + (i === 4 ? 0.5 : 0.1));
        const g = gain(0); perc(g, tt, 0.07, i === 4 ? 0.45 : 0.08); o.connect(g).connect(sfx); send(g, 0.5);
      });
    },
    clang(t, e) {
      const k = 2 ** ((e.p || 0) / 12);
      const g = gain(0); perc(g, t, 0.24, 0.6, 0.001);
      for (const [m, a] of [[1, 1], [2.76, 0.5], [5.4, 0.3], [8.93, 0.15]]) { const o = osc('sine', 620 * k * m, t, t + 0.7); const og = gain(a); o.connect(og).connect(g); }
      g.connect(sfx); send(g, 0.4);
      const n = noiseSrc(t, 0.03); const hp = filt('highpass', 2000); const ng = gain(0); perc(ng, t, 0.5, 0.025); n.connect(hp).connect(ng).connect(sfx);
    },
    equip(t) {
      [84, 88, 91, 96, 100].forEach((n, i) => {
        const tt = t + i * 0.035; const o = osc('sine', mtof(n), tt, tt + 0.35);
        const g = gain(0); perc(g, tt, 0.12, 0.3); o.connect(g).connect(sfx); send(g, 0.6);
      });
    },
    saw(t, e) {
      // The Sawmill hum under the beat.
      const o = osc('sawtooth', 110, t, t + e.dur); const lp = filt('lowpass', 500);
      const am = gain(0.6); const lfo = osc('sine', 24, t, t + e.dur); const lg = gain(0.4); lfo.connect(lg).connect(am.gain);
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.1);
      g.gain.setValueAtTime(0.09, t + e.dur - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + e.dur);
      o.connect(lp).connect(am).connect(g).connect(sfx);
    },
    brrr(t, e) {
      // BRRRRR: buzzing saws chopped by a fast square LFO, rising a little.
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.03);
      g.gain.setValueAtTime(0.32, t + e.dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + e.dur);
      const am = gain(0.5); const lfo = osc('square', 30, t, t + e.dur); const lg = gain(0.5); lfo.connect(lg).connect(am.gain);
      const bp = filt('bandpass', 900, 0.8);
      for (const [f, type] of [[98, 'sawtooth'], [98.8, 'sawtooth'], [49, 'square']]) {
        const o = osc(type, f, t, t + e.dur); o.frequency.exponentialRampToValueAtTime(f * 1.25, t + e.dur); o.connect(bp);
      }
      bp.connect(shaper(3)).connect(am).connect(g).connect(sfx);
    },
    boing(t, e) {
      const base = e.p ? 260 : 200;
      const o = osc('sine', base, t, t + 0.4); o.frequency.exponentialRampToValueAtTime(base * 2.4, t + 0.35);
      const lfo = osc('sine', 16, t, t + 0.4); const lg = gain(90); lg.gain.exponentialRampToValueAtTime(5, t + 0.35); lfo.connect(lg).connect(o.frequency);
      const g = gain(0); perc(g, t, 0.28, 0.35); o.connect(g).connect(sfx);
    },
    drone(t, e) {
      const lp = filt('lowpass', 300, 2); lp.frequency.exponentialRampToValueAtTime(1400, t + e.dur);
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.4);
      g.gain.setValueAtTime(0.14, t + e.dur - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + e.dur - 0.12);
      for (const [n, d] of [[29, 0], [41, 7], [41, -7], [48, 4]]) { const o = osc('sawtooth', mtof(n), t, t + e.dur); o.detune.value = d; o.connect(lp); }
      lp.connect(g).connect(bass);
    },
    heart(t, e) {
      const o = osc('sine', 75, t, t + 0.25); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
      const g = gain(0); perc(g, t, 0.9 * e.v, 0.18); o.connect(g).connect(drums);
    },
    riser(t, e) {
      const d = e.dur;
      const n = noiseSrc(t, d); const bp = filt('bandpass', 400, 1.2); bp.frequency.exponentialRampToValueAtTime(9000, t + d);
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + d); g.gain.setValueAtTime(0.0001, t + d + 0.005);
      n.connect(bp).connect(g).connect(sfx);
      const o = osc('sawtooth', 110, t, t + d); o.frequency.exponentialRampToValueAtTime(1760, t + d);
      const og = gain(0); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.06, t + d); og.gain.setValueAtTime(0.0001, t + d + 0.005);
      o.connect(filt('lowpass', 3000)).connect(og).connect(sfx);
    },
    roar(t) {
      // The Emberwyrm: a growling saw with a wobble and a breathy noise roar through two vowel bands.
      const d = 1.25;
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.07);
      g.gain.setValueAtTime(0.5, t + d - 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      const f1 = filt('bandpass', 420, 2), f2 = filt('bandpass', 950, 3);
      f1.frequency.linearRampToValueAtTime(320, t + d); f2.frequency.linearRampToValueAtTime(700, t + d);
      const lfo = osc('sine', 9, t, t + d); const lg = gain(14); lfo.connect(lg);
      for (const [f, det] of [[72, 0], [73, 12], [108, -10]]) {
        const o = osc('sawtooth', f, t, t + d); o.detune.value = det; o.frequency.linearRampToValueAtTime(f * 0.75, t + d);
        lg.connect(o.frequency); o.connect(f1); o.connect(f2);
      }
      const n = noiseSrc(t, d); const nl = filt('lowpass', 1200); const am = gain(0.6); lfo.connect(gain(0.4)).connect(am.gain);
      n.connect(nl).connect(am).connect(f1);
      const mix = gain(1); f1.connect(mix); f2.connect(mix);
      mix.connect(shaper(5)).connect(g).connect(sfx); send(g, 0.4);
    },
    stamp(t) {
      I.thud(t);
      const n = noiseSrc(t, 0.05); const bp = filt('bandpass', 2500, 1); const ng = gain(0); perc(ng, t, 0.5, 0.04);
      n.connect(bp).connect(ng).connect(sfx);
    },
    finale(t) {
      // The last chord rings out over a long 808.
      const g = gain(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      const lp = filt('lowpass', 4000); lp.frequency.exponentialRampToValueAtTime(300, t + 2.4);
      for (const n of [53, 56, 60, 65]) for (const d of [-8, 8]) { const o = osc('sawtooth', mtof(n), t, t + 2.7); o.detune.value = d; o.connect(lp); }
      lp.connect(g).connect(melody); send(g, 0.8);
      I.bass(t, { n: 29, dur: 2.4, fade: true });
      I.cowbell(t, { n: 77 });
      I.cowbell(t + STEP * 3, { n: 84 });
      I.cowbell(t + BEAT * 1.5, { n: 89 });
    },
  };

  for (const e of events()) {
    if (e.t > END) continue;
    I[e.type]?.(t0 + e.t, e);
  }
  return master;
}

/** Renders the whole song offline and returns the AudioBuffer. */
export async function renderSong(sampleRate = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(END * sampleRate), sampleRate);
  scheduleSong(ctx, 0);
  return ctx.startRendering();
}

/** 16-bit PCM WAV bytes for an AudioBuffer. */
export function toWav(buf) {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, sr, true);
  data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); str(36, 'data');
  data.setUint32(40, len * ch * 2, true);
  const chans = [...Array(ch).keys()].map((c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Uint8Array(data.buffer);
}
