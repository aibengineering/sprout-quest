// Where the weapon is at each moment of a swing. Drives both the hitboxes (battle.ts) and the drawing (render.ts),
// so what you see is what you hit.
import { TAU, clamp01, easeIn, easeInOut, easeOut, type Swing } from './types';

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
  }
}
