// Where the weapon is at each moment of a swing. Drives both the hitboxes (battle.ts) and the drawing (render.ts),
// so what you see is what you hit.
import type { Strike } from '../weapons';
import { TAU, clamp01, easeIn, easeInOut, easeOut, type Swing } from './types';

/**
 * A whip's handle over its lash, at time `t` into it. Sidearm lashes draw back across the body then whip over to the far
 * side; the overhead crack goes back over the shoulder and comes down along the aim.
 */
function lashHandle(s: Strike, aim: number, t: number): number {
  const qw = clamp01(t / Math.max(0.001, s.windup));
  const qa = clamp01((t - s.windup) / s.active);
  const qr = clamp01((t - s.windup - s.active) / Math.max(0.001, s.recover));
  if (s.anim === 'crack') {
    const back = aim + Math.PI * 0.85 * (Math.cos(aim) >= 0 ? -1 : 1);
    if (t < s.windup) return aim + (back - aim) * easeOut(qw);
    if (t < s.windup + s.active) return back + (aim - back) * easeIn(qa);
    return aim;
  }
  const d = s.anim === 'lashL' ? -1 : 1;
  const from = aim - 1.4 * d, to = aim + 0.4 * d;
  if (t < s.windup) return aim + (from - aim) * easeOut(qw);
  if (t < s.windup + s.active) return from + (to - from) * easeIn(qa);
  return to + (aim - to) * easeOut(qr);
}

/** How long a lash's tip trails its handle: the rope unrolls behind the hand and the tip snaps over last. */
export const lashLag = (s: Strike) => s.active * 0.7;
/** When the tip cracks (fully unrolled, pointing where you aimed), and when the rope stops hitting. */
export const lashCrackAt = (s: Strike) => s.windup + s.active + lashLag(s);
export const lashEnd = (s: Strike) => s.windup + s.active + lashLag(s) * 1.6;

/**
 * A whip's rope at this moment, as points from the hand outwards (arena units, relative to the hand). Each bit of rope
 * points where the handle pointed a moment earlier, the further out the longer ago, so it unrolls, curls and cracks.
 * Shared by the hit test and the drawing.
 */
export function lashRope(sw: Swing, reach: number, n = 12): [number, number][] {
  const s = sw.s, t = sw.t, lag = lashLag(s), full = s.range * reach;
  const qw = clamp01(t / Math.max(0.001, s.windup));
  // It unrolls as the tip comes round toward the target (the tip's own moment, lagging the hand), so it's short while
  // it swings behind you and full length only as it points where you aimed.
  const qa = clamp01((t - s.windup - lag * 0.3) / (s.active + lag * 0.7));
  const qr = clamp01((t - s.windup - s.active - lag) / Math.max(0.001, s.recover - lag));
  // Coiled short while you draw back, unrolling to full length as it cracks, then reeled back in.
  const len = t < s.windup ? 24 + 10 * qw : qr <= 0 ? 34 + (full - 34) * qa ** 1.6 : full - (full - 28) * easeInOut(qr);
  const pts: [number, number][] = [[0, 0]];
  let x = 0, y = 0;
  for (let i = 1; i <= n; i++) {
    const a = lashHandle(s, sw.aim, Math.max(0, t - lag * (i / n)));
    x += (Math.cos(a) * len) / n;
    y += (Math.sin(a) * len) / n;
    pts.push([x, y]);
  }
  return pts;
}

/** The weapon's angle, forward offset and scale at this moment of the swing (`reach` is the weapon tier's scale). */
export function pose(sw: Swing, reach: number): { ang: number; off: number; scale: number } {
  const s = sw.s, aim = sw.aim;
  const qw = clamp01(sw.t / Math.max(0.001, s.windup));
  const qa = clamp01((sw.t - s.windup) / s.active);
  const inActive = sw.t >= s.windup;
  const arc = s.size;
  switch (s.anim) {
    case 'slashR':
    case 'slashL': {
      const d = s.anim === 'slashR' ? 1 : -1;
      const a0 = aim - (arc / 2) * d, a1 = aim + (arc / 2) * d;
      if (!inActive) return { ang: a0 - 0.45 * d * easeOut(qw), off: 0, scale: 1 };
      return { ang: a0 - 0.45 * d + (a1 - a0 + 0.45 * d) * easeOut(qa), off: 0, scale: 1 };
    }
    case 'chop':
    case 'backchop': {
      // Heavy overhead: lift way back (sprite grows to read as "raised"), then accelerate through.
      const d = s.anim === 'chop' ? 1 : -1;
      const a0 = aim - (arc / 2) * d, a1 = aim + (arc / 2) * d;
      if (!inActive) return { ang: a0 - 0.9 * d * easeOut(qw), off: -4 * qw, scale: 1 + 0.25 * easeOut(qw) };
      return { ang: a0 - 0.9 * d + (a1 - a0 + 0.9 * d) * easeIn(qa), off: 6 * qa, scale: 1.25 - 0.25 * qa };
    }
    case 'thrust': {
      if (!inActive) return { ang: aim, off: -12 * easeOut(qw), scale: 1 };
      const rec = clamp01((sw.t - s.windup - s.active) / Math.max(0.001, s.recover));
      return { ang: aim, off: -12 + (s.range * 0.32 * reach + 12) * easeOut(qa) * (1 - rec * 0.7), scale: 1 };
    }
    case 'slam': {
      // Over the top: swing from behind the head down onto the target.
      const side = Math.cos(aim) >= 0 ? -1 : 1;
      const back = aim + Math.PI * side;
      if (!inActive) return { ang: aim + (back - aim) * easeOut(qw) * 0.95, off: 0, scale: 1 + 0.4 * easeOut(qw) };
      return { ang: aim + (back - aim) * 0.95 * (1 - easeIn(qa)), off: 6 * qa, scale: 1.4 - 0.5 * easeIn(qa) };
    }
    case 'spin': {
      const turns = s.turns ?? 1;
      if (!inActive) return { ang: aim - 0.7 * easeOut(qw), off: 0, scale: 1 };
      return { ang: aim - 0.7 + (turns * TAU + 0.7) * easeInOut(qa), off: 0, scale: 1.05 };
    }
    case 'cast':
      return { ang: aim, off: inActive ? 10 * Math.sin(qa * Math.PI) : -4 * qw, scale: 1 };
    case 'lashR':
    case 'lashL':
    case 'crack':
      return { ang: lashHandle(s, aim, sw.t), off: 0, scale: 1 };
  }
}
