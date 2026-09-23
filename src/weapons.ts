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
      { anim: 'thrust', shape: 'line', windup: 0.06, active: 0.1, recover: 0.12, range: 96, size: 22, mult: 0.95, kb: 110, shake: 2, hitstop: 0.03, move: 0.6 },
      { anim: 'thrust', shape: 'line', windup: 0.06, active: 0.1, recover: 0.12, range: 96, size: 22, mult: 0.95, kb: 110, shake: 2, hitstop: 0.03, move: 0.6 },
      { anim: 'thrust', shape: 'line', windup: 0.14, active: 0.14, recover: 0.22, range: 130, size: 30, mult: 1.7, kb: 280, lunge: 40, shake: 6, hitstop: 0.07, move: 0.2 },
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
      { anim: 'spin', shape: 'arc', windup: 0.16, active: 0.3, recover: 0.28, range: 88, size: TAU, mult: 2.1, kb: 340, turns: 1, shake: 8, hitstop: 0.08, move: 0.5 },
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
        anim: 'slam', shape: 'circle', windup: 0.28, active: 0.1, recover: 0.3, range: 0, reach: 42, size: 46, mult: 1.9, kb: 300,
        wave: { range: 170, width: 46, speed: 620, mult: 1.1 }, shake: 9, hitstop: 0.09, move: 0.2, stun: 0.35,
      },
      {
        anim: 'slam', shape: 'circle', windup: 0.3, active: 0.1, recover: 0.36, range: 0, reach: 42, size: 52, mult: 2.2, kb: 340,
        wave: { range: 220, width: 60, speed: 680, mult: 1.3 }, shake: 12, hitstop: 0.11, move: 0.2, stun: 0.5,
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
      { anim: 'cast', shape: 'shot', windup: 0.04, active: 0.05, recover: 0.2, range: 0, size: 7, mult: 0.85, kb: 70, shots: [0], shake: 1, hitstop: 0.02, move: 0.85 },
      { anim: 'cast', shape: 'shot', windup: 0.04, active: 0.05, recover: 0.2, range: 0, size: 7, mult: 0.85, kb: 70, shots: [0], shake: 1, hitstop: 0.02, move: 0.85 },
      { anim: 'cast', shape: 'shot', windup: 0.08, active: 0.06, recover: 0.28, range: 0, size: 8, mult: 0.8, kb: 90, shots: [-0.22, 0, 0.22], shake: 2, hitstop: 0.03, move: 0.7 },
    ],
  },
};

/** Reach/size bonus per tier — tier 5 weapons hit ~35% further than the starter. */
export const tierScale = (tier: number) => 1 + 0.07 * tier;
