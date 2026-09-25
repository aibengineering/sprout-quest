// Weapon movesets: every weapon type has its own combo chain, timing, hitbox shape and animation.
// Tiers (0–5, from data.ts) scale reach, trail size and impact on top of these base numbers.
import type { Style } from './data';

export type Anim = 'slashR' | 'slashL' | 'thrust' | 'chop' | 'backchop' | 'slam' | 'spin' | 'cast';

export interface Wave {
  /** How far the shockwave travels forward. */
  range: number;
  width: number;
  speed: number;
  mult: number;
}

export interface Strike {
  anim: Anim;
  /** arc: a sweeping cone · line: a forward thrust box · circle: a ring around an impact point. */
  shape: 'arc' | 'line' | 'circle' | 'shot';
  windup: number;
  active: number;
  recover: number;
  range: number;
  /** Arc width in radians (arc) or hitbox width (line) or impact radius (circle). */
  size: number;
  mult: number;
  kb: number;
  /** Forward step during the active frames — makes heavy swings feel committed. */
  lunge?: number;
  /** Where the circle hitbox is centered, in front of the hero. */
  reach?: number;
  wave?: Wave;
  /** Angle offsets for projectile weapons. */
  shots?: number[];
  shake: number;
  hitstop: number;
  /** Movement speed multiplier while swinging. */
  move: number;
  stun?: number;
  /** Spin strikes: how many full turns. */
  turns?: number;
}

export type SkillKind = 'spin' | 'lunge' | 'whirl' | 'quake' | 'nova';

export interface Moveset {
  combo: Strike[];
  /** Seconds after a strike finishes during which the next attack continues the combo. */
  window: number;
  skill: SkillKind;
  skillName: string;
  /** Visual scale for the weapon sprite. */
  size: number;
}

const TAU = Math.PI * 2;

export const MOVESETS: Record<Style, Moveset> = {
  // Quick and flowing: slash, backslash, then a lunging stab.
  sword: {
    window: 0.32,
    skill: 'spin',
    skillName: 'Spin',
    size: 1,
    combo: [
      { anim: 'slashR', shape: 'arc', windup: 0.05, active: 0.11, recover: 0.1, range: 60, size: 2.1, mult: 1, kb: 150, shake: 2, hitstop: 0.035, move: 0.65 },
      { anim: 'slashL', shape: 'arc', windup: 0.05, active: 0.11, recover: 0.1, range: 60, size: 2.1, mult: 1, kb: 150, shake: 2, hitstop: 0.035, move: 0.65 },
      { anim: 'thrust', shape: 'line', windup: 0.09, active: 0.12, recover: 0.2, range: 82, size: 30, mult: 1.6, kb: 260, lunge: 34, shake: 5, hitstop: 0.06, move: 0.3 },
    ],
  },
  // Long reach, narrow: two jabs and a far-reaching lunge thrust.
  spear: {
    window: 0.3,
    skill: 'lunge',
    skillName: 'Lunge',
    size: 1,
    combo: [
      { anim: 'thrust', shape: 'line', windup: 0.06, active: 0.1, recover: 0.12, range: 90, size: 22, mult: 1.1, kb: 110, shake: 2, hitstop: 0.03, move: 0.6 },
      { anim: 'thrust', shape: 'line', windup: 0.06, active: 0.1, recover: 0.12, range: 90, size: 22, mult: 1.1, kb: 110, shake: 2, hitstop: 0.03, move: 0.6 },
      { anim: 'thrust', shape: 'line', windup: 0.14, active: 0.14, recover: 0.22, range: 115, size: 30, mult: 1.9, kb: 280, lunge: 40, shake: 6, hitstop: 0.07, move: 0.2 },
    ],
  },
  // Heavy forward cleaves with a spinning finisher.
  axe: {
    window: 0.36,
    skill: 'whirl',
    skillName: 'Whirl',
    size: 1.05,
    combo: [
      { anim: 'chop', shape: 'arc', windup: 0.17, active: 0.13, recover: 0.2, range: 80, size: 2.7, mult: 1.55, kb: 280, lunge: 14, shake: 6, hitstop: 0.07, move: 0.35 },
      { anim: 'backchop', shape: 'arc', windup: 0.15, active: 0.13, recover: 0.2, range: 80, size: 2.7, mult: 1.55, kb: 280, lunge: 14, shake: 6, hitstop: 0.07, move: 0.35 },
      { anim: 'spin', shape: 'arc', windup: 0.16, active: 0.3, recover: 0.28, range: 62, size: TAU, mult: 2.1, kb: 340, turns: 1, shake: 8, hitstop: 0.08, move: 0.5 },
    ],
  },
  // Slow overhead slams whose shockwave travels forward in a line.
  hammer: {
    window: 0.4,
    skill: 'quake',
    skillName: 'Quake',
    size: 1.1,
    combo: [
      {
        anim: 'slam', shape: 'circle', windup: 0.28, active: 0.1, recover: 0.3, range: 0, reach: 42, size: 40, mult: 1.5, kb: 300,
        wave: { range: 60, width: 38, speed: 520, mult: 0.45 }, shake: 9, hitstop: 0.09, move: 0.2, stun: 0.3,
      },
      {
        anim: 'slam', shape: 'circle', windup: 0.3, active: 0.1, recover: 0.36, range: 0, reach: 42, size: 46, mult: 1.8, kb: 340,
        wave: { range: 75, width: 44, speed: 560, mult: 0.55 }, shake: 12, hitstop: 0.11, move: 0.2, stun: 0.4,
      },
    ],
  },
  // Rapid sparkle shots; the third shot is a spread.
  wand: {
    window: 0.3,
    skill: 'nova',
    skillName: 'Nova',
    size: 1,
    combo: [
      { anim: 'cast', shape: 'shot', windup: 0.04, active: 0.05, recover: 0.2, range: 0, size: 7, mult: 1.1, kb: 70, shots: [0], shake: 1, hitstop: 0.02, move: 0.85 },
      { anim: 'cast', shape: 'shot', windup: 0.04, active: 0.05, recover: 0.2, range: 0, size: 7, mult: 1.1, kb: 70, shots: [0], shake: 1, hitstop: 0.02, move: 0.85 },
      { anim: 'cast', shape: 'shot', windup: 0.08, active: 0.06, recover: 0.28, range: 0, size: 8, mult: 1.0, kb: 90, shots: [-0.22, 0, 0.22], shake: 2, hitstop: 0.03, move: 0.7 },
    ],
  },
};

/** Reach/size bonus per tier: tier 5 weapons reach 20% further than the starter (damage grows through attack instead). */
export const tierScale = (tier: number) => 1 + 0.04 * tier;

// ----------------------------------------------------------------------------- balance model

/** How far a strike reaches from you, and how much ground it covers (arena units). */
export function strikeShape(s: Strike, reach: number): { reach: number; area: number } {
  const wave = s.wave ? { reach: (s.reach ?? 0) * reach + s.wave.range * reach, area: s.wave.range * reach * s.wave.width * reach } : null;
  let r: { reach: number; area: number };
  switch (s.shape) {
    case 'arc': r = { reach: s.range * reach, area: (Math.min(s.size, TAU) / 2) * (s.range * reach) ** 2 }; break;
    case 'line': r = { reach: s.range * reach, area: s.range * reach * s.size * reach }; break;
    case 'circle': r = { reach: (s.reach ?? 0) * reach + s.size * reach, area: Math.PI * (s.size * reach) ** 2 }; break;
    case 'shot': r = { reach: 400 * 1.2, area: (s.shots?.length ?? 1) * Math.PI * s.size ** 2 }; break;
  }
  return wave ? { reach: Math.max(r.reach, wave.reach), area: r.area + wave.area } : r;
}

/** Seconds per full combo, chaining each strike as early as the game allows (35% into its recovery). */
export function comboTime(m: Moveset): number {
  return m.combo.reduce((a, s) => a + s.windup + s.active + s.recover * 0.35, 0);
}

/** Damage multiplier per second against one target in front of you (its shockwave hits it too; one shot of a spread). */
export function comboDps(m: Moveset): number {
  return m.combo.reduce((a, s) => a + s.mult + (s.wave?.mult ?? 0), 0) / comboTime(m);
}

/** Every weapon skill's numbers, in one place so the balance model can measure them. */
export const SKILL_DATA = {
  spin: { anim: 'spin', shape: 'arc', windup: 0.06, active: 0.3, recover: 0.16, range: 90, size: TAU, mult: 1.7, kb: 260, turns: 1.5, shake: 7, hitstop: 0.06, move: 0.6, stun: 0.3 } as Strike,
  quake: {
    strike: { anim: 'slam', shape: 'circle', windup: 0.36, active: 0.1, recover: 0.42, range: 0, reach: 0, size: 80, mult: 1.8, kb: 360, shake: 16, hitstop: 0.12, move: 0.1, stun: 0.8 } as Strike,
    /** Shockwaves bursting out in every direction. */
    waves: { count: 6, range: 100, width: 32, speed: 520, mult: 0.5 },
  },
  whirl: { dur: 1.2, tick: 0.16, radius: 80, mult: 0.45 },
  nova: { shots: 14, mult: 1.1, size: 8 },
  lunge: { dur: 0.24, speed: 720, radius: 30, mult: 2.1 },
};

/** A skill's reach, ground covered, and total damage multiplier on one target caught in it. */
export function skillShape(kind: SkillKind, reach: number): { reach: number; area: number; mult: number } {
  const d = SKILL_DATA;
  switch (kind) {
    case 'spin': return { ...strikeShape(d.spin, reach), mult: d.spin.mult };
    case 'quake': {
      const s = strikeShape(d.quake.strike, reach), w = d.quake.waves;
      return { reach: Math.max(s.reach, w.range * reach), area: s.area + w.count * w.range * reach * w.width, mult: d.quake.strike.mult + w.mult };
    }
    case 'whirl': return { reach: d.whirl.radius * reach, area: Math.PI * (d.whirl.radius * reach) ** 2, mult: d.whirl.mult * Math.floor(d.whirl.dur / d.whirl.tick) };
    case 'nova': return { reach: 400 * 1.2, area: d.nova.shots * Math.PI * d.nova.size ** 2, mult: d.nova.mult };
    case 'lunge': {
      const len = d.lunge.dur * d.lunge.speed;
      return { reach: len, area: len * d.lunge.radius * 2 * reach, mult: d.lunge.mult };
    }
  }
}

