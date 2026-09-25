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

export type SkillKind = 'spin' | 'whirl' | 'quake' | 'nova';

export interface Moveset {
  combo: Strike[];
  /** Seconds after a strike finishes during which the next attack continues the combo. */
  window: number;
  skill: SkillKind;
  skillName: string;
  /** Visual scale for the weapon sprite. */
  size: number;
  /** Cooldown after the last strike of the combo before you can start swinging again. */
  rest: number;
  /**
   * Stamina (a clip, for ranged weapons): every swing or shot spends one of `max` pips, and one comes back every
   * `regen` seconds once you've held off for `delay` seconds. Mashing gets you a combo, then a real pause.
   */
  ammo: { max: number; regen: number; delay: number };
}

const TAU = Math.PI * 2;

export const MOVESETS: Record<Style, Moveset> = {
  // Quick and flowing: slash, backslash, then a lunging stab.
  sword: {
    window: 0.32,
    skill: 'spin',
    skillName: 'Spin',
    size: 1,
    rest: 0.4,
    ammo: { max: 3, regen: 0.35, delay: 0.3 },
    combo: [
      { anim: 'slashR', shape: 'arc', windup: 0.05, active: 0.11, recover: 0.1, range: 60, size: 2.1, mult: 1, kb: 150, shake: 2, hitstop: 0.035, move: 0.65 },
      { anim: 'slashL', shape: 'arc', windup: 0.05, active: 0.11, recover: 0.1, range: 60, size: 2.1, mult: 1, kb: 150, shake: 2, hitstop: 0.035, move: 0.65 },
      { anim: 'thrust', shape: 'line', windup: 0.09, active: 0.12, recover: 0.2, range: 82, size: 30, mult: 1.6, kb: 260, lunge: 34, shake: 5, hitstop: 0.06, move: 0.3 },
    ],
  },
  // Slow overhead slams that kick up a short line of rock spikes.
  hammer: {
    window: 0.4,
    skill: 'quake',
    skillName: 'Quake',
    size: 1.1,
    rest: 0.6,
    ammo: { max: 2, regen: 0.6, delay: 0.35 },
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
  // Long, narrow lashes that reach further than any blade, finished by a crack at the very tip.
  whip: {
    window: 0.34,
    skill: 'whirl',
    skillName: 'Twirl',
    size: 0.9,
    rest: 0.45,
    ammo: { max: 3, regen: 0.4, delay: 0.3 },
    combo: [
      { anim: 'slashR', shape: 'arc', windup: 0.07, active: 0.1, recover: 0.13, range: 104, size: 0.9, mult: 0.95, kb: 90, shake: 2, hitstop: 0.03, move: 0.7 },
      { anim: 'slashL', shape: 'arc', windup: 0.07, active: 0.1, recover: 0.13, range: 104, size: 0.9, mult: 0.95, kb: 90, shake: 2, hitstop: 0.03, move: 0.7 },
      { anim: 'thrust', shape: 'line', windup: 0.14, active: 0.1, recover: 0.2, range: 118, size: 16, mult: 1.6, kb: 200, shake: 4, hitstop: 0.06, move: 0.4 },
    ],
  },
  // Rapid shots from a small clip that reloads once you stop firing; the third shot is a weaker spread.
  wand: {
    window: 0.3,
    skill: 'nova',
    skillName: 'Nova',
    size: 1,
    rest: 0.5,
    ammo: { max: 3, regen: 0.4, delay: 0.2 },
    combo: [
      { anim: 'cast', shape: 'shot', windup: 0.04, active: 0.05, recover: 0.2, range: 0, size: 7, mult: 0.8, kb: 70, shots: [0], shake: 1, hitstop: 0.02, move: 0.85 },
      { anim: 'cast', shape: 'shot', windup: 0.04, active: 0.05, recover: 0.2, range: 0, size: 7, mult: 0.8, kb: 70, shots: [0], shake: 1, hitstop: 0.02, move: 0.85 },
      { anim: 'cast', shape: 'shot', windup: 0.08, active: 0.06, recover: 0.28, range: 0, size: 8, mult: 0.45, kb: 90, shots: [-0.22, 0, 0.22], shake: 2, hitstop: 0.03, move: 0.7 },
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

/** One strike's damage multiplier on a target in front of you: its shockwave hits it too, and every pellet of a spread lands (as it does point-blank). */
const strikeDamage = (s: Strike) => (s.shape === 'shot' ? s.mult * (s.shots?.length ?? 1) : s.mult) + (s.wave?.mult ?? 0);
/** Seconds a strike takes when you chain into the next as early as the game allows (35% into its recovery). */
const strikeTime = (s: Strike) => s.windup + s.active + s.recover * 0.35;
/** A strike's time, plus the rest after it if it ends the combo. */
const stepTime = (m: Moveset, i: number) => strikeTime(m.combo[i]) + (i === m.combo.length - 1 ? m.rest : 0);

/** Seconds per full combo, chaining each strike as early as possible, plus the rest after it. */
export function comboTime(m: Moveset): number {
  return m.combo.reduce((a, s) => a + strikeTime(s), 0) + m.rest;
}

/** How long a typical fight lasts: weapons are judged over this window, opening burst included. */
export const FIGHT_WINDOW = 5;

/**
 * Damage multiplier per second against one target in front of you, simulated over a typical fight from full stamina,
 * so a big opening burst counts as much as the pause that follows it.
 */
export function comboDps(m: Moveset): number {
  const { max, regen, delay } = m.ammo;
  let t = 0, ammo = max, refill = 0, dmg = 0, i = 0;
  while (t < FIGHT_WINDOW) {
    if (ammo < 1) {
      // Out of stamina: wait for one pip to come back.
      t += regen - refill;
      refill = 0;
      ammo = 1;
      continue;
    }
    dmg += strikeDamage(m.combo[i]);
    ammo--;
    // Stamina starts refilling once `delay` has passed since this strike.
    const dt = stepTime(m, i);
    t += dt;
    refill = dt - delay;
    while (refill >= regen && ammo < max) { refill -= regen; ammo++; }
    i = (i + 1) % m.combo.length;
  }
  return dmg / t;
}

/** Damage multiplier landed in the first second of a fight: how hard a weapon opens before stamina runs out. */
export function openingBurst(m: Moveset): number {
  let t = 0, dmg = 0, i = 0, ammo = m.ammo.max;
  while (ammo >= 1 && t + m.combo[i].windup <= 1) {
    dmg += strikeDamage(m.combo[i]);
    ammo--;
    t += stepTime(m, i);
    i = (i + 1) % m.combo.length;
  }
  return dmg;
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
  nova: { shots: 12, mult: 1.0, size: 8 },
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
  }
}

