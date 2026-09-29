// Weapon movesets: every weapon type has its own combo chain, timing, hitbox shape and animation.
// Tiers (0–5, from data.ts) scale reach, trail size and impact on top of these base numbers.
import type { Style } from './data';
import { MASTERY_MAX } from './rules';

export type Anim = 'slashR' | 'slashL' | 'thrust' | 'chop' | 'backchop' | 'slam' | 'spin' | 'cast' | 'lashR' | 'lashL' | 'crack';

export interface Wave {
  /** How far the shockwave travels forward. */
  range: number;
  width: number;
  speed: number;
  mult: number;
}

export interface Strike {
  anim: Anim;
  /**
   * arc: a sweeping cone · line: a forward thrust box · circle: a ring around an impact point · lash: a whip's rope,
   * which hits hardest at its tip.
   */
  shape: 'arc' | 'line' | 'circle' | 'shot' | 'lash';
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
  /** Lashes: how much of the rope, from the tip, is the sweet spot (full damage, a "crack"), and what the rest does. */
  tip?: number;
  graze?: number;
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
  /** Rest after the last strike of the combo before you can start swinging again (at Lv 1 handling; see pace()). */
  rest: number;
}

/**
 * Weapon handling sets your pace, and is what stops button-mashing. After each strike there's a moment before the next:
 * at handling Lv 1 you wait out the whole recovery and 60% again; mastered (Lv 10) you can cut in 45% of the way
 * through it. The rest after a full combo shrinks the same way, from 1.7× to 0.8× the weapon's `rest`. A sword
 * attacks about 10% slower at Lv 1 than it did on the old stamina meter, and about 1.8× faster mastered than at Lv 1.
 */
export function pace(lv: number) {
  const q = SPEED_LEVELS.filter((l) => lv >= l).length / SPEED_LEVELS.length;
  return { chain: 1.6 - 1.15 * q, rest: 1.7 - 0.9 * q };
}

/**
 * The handling path, the same for every class of weapon: its skill unlocks at Lv 2 and grows a rank at 5, 8 and 10
 * (Mastery); every level in between is a step up in attack speed. So each level gives something you can feel, and the
 * skill levels are the big ones.
 */
export const SKILL_LEVELS = [2, 5, 8, 10];
export const SPEED_LEVELS = [3, 4, 6, 7, 9];
/** Your skill's rank at a handling level: 0 (locked) to 4 (Mastery). */
export const skillRank = (lv: number) => SKILL_LEVELS.filter((l) => lv >= l).length;
/** What a handling level gives: its skill rank if it's a skill level, else an attack speed step (none at Lv 1). */
export const handlingStep = (lv: number): 'skill' | 'speed' | null => (SKILL_LEVELS.includes(lv) ? 'skill' : SPEED_LEVELS.includes(lv) ? 'speed' : null);

/**
 * Each skill at each rank (I–IV). `mult` is the main hit, `size` scales its reach, `count` is how many waves or bolts,
 * `sub` the damage of each wave, whirl lash or bolt, `stun` how long it stuns, `cd` its recharge, and for the whirl
 * `dur` (how long it spins) and `move` (how much of your walking speed you keep while it does).
 *
 * The curve is steep on purpose: Rank I is a modest taste of the move (about 1.2× on one target), and each rank adds
 * more, up to an over-the-top Mastery finisher (about 3.1×). At every rank, one target in front of you takes about the
 * same from every class (tests/balance.test.ts); each class spends it differently (a stunning cut, shockwaves, a
 * flurry, a ring of bolts).
 */
export interface SkillRank { name: string; note: string; mult: number; size: number; count: number; sub: number; stun: number; cd: number; dur: number; move: number }
const rank = (name: string, note: string, r: Partial<SkillRank>): SkillRank => ({ name, note, mult: 1, size: 1, count: 0, sub: 0, stun: 0, cd: 4.5, dur: 0, move: 0, ...r });
export const SKILL_RANKS: Record<SkillKind, SkillRank[]> = {
  spin: [
    rank('Spin', 'A quick cut all the way round you', { mult: 1.2, size: 0.85, stun: 0.2 }),
    rank('Spin II', 'Wider, harder, and it stuns', { mult: 1.7, size: 1, stun: 0.35 }),
    rank('Spin III', 'Harder still, and stuns longer', { mult: 2.3, size: 1.15, stun: 0.5 }),
    rank('Cyclone', 'A huge, stunning spin that recharges faster', { mult: 3.1, size: 1.35, stun: 0.8, cd: 3.5 }),
  ],
  quake: [
    rank('Quake', 'Slam the ground: 3 shockwaves', { mult: 0.95, count: 3, sub: 0.25, stun: 0.5 }),
    rank('Quake II', '5 stronger shockwaves', { mult: 1.1, count: 5, sub: 0.6, stun: 0.7 }),
    rank('Quake III', '6 heavy shockwaves, and a harder slam', { mult: 1.3, count: 6, sub: 1.0, stun: 0.9 }),
    rank('Earthshaker', '9 shockwaves, and it recharges faster', { mult: 1.6, count: 9, sub: 1.5, stun: 1.0, cd: 3.5 }),
  ],
  whirl: [
    rank('Whirl', 'A short spin: three lashes around you', { sub: 0.4, size: 0.85, dur: 0.5, move: 0.4 }),
    rank('Whirl II', 'Spins longer: five lashes', { sub: 0.34, size: 1, dur: 0.8, move: 0.5 }),
    rank('Whirl III', 'Harder lashes, further out', { sub: 0.38, size: 1.1, dur: 1.0, move: 0.55 }),
    rank('Tempest', 'A long, wide, roaming whirl that recharges faster', { sub: 0.39, size: 1.25, dur: 1.4, move: 0.6, cd: 3.5 }),
  ],
  nova: [
    rank('Nova', 'A ring of 6 bolts', { count: 6, sub: 1.2 }),
    rank('Nova II', '8 stronger bolts', { count: 8, sub: 1.7 }),
    rank('Nova III', '12 bolts, stronger still', { count: 12, sub: 2.3 }),
    rank('Starburst', '16 bolts, and it recharges faster', { count: 16, sub: 3.1, cd: 3.5 }),
  ],
};
/** The skill as you have it at a handling level (null while it's locked). */
export const skillAt = (kind: SkillKind, lv: number): SkillRank | null => SKILL_RANKS[kind][skillRank(lv) - 1] ?? null;

const TAU = Math.PI * 2;

export const MOVESETS: Record<Style, Moveset> = {
  // Quick and flowing: slash, backslash, then a lunging stab.
  sword: {
    window: 0.32,
    skill: 'spin',
    skillName: 'Spin',
    size: 1,
    rest: 0.4,
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
    rest: 0.16,
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
  // Long lashes that reach further than any blade: the rope trails the handle, unrolls, and cracks at the tip. Only the
  // tip hits properly (a "crack"); the rest of the rope just grazes, so the whip rewards keeping at its range.
  whip: {
    window: 0.34,
    skill: 'whirl',
    skillName: 'Twirl',
    size: 0.9,
    rest: 0.42,
    combo: [
      { anim: 'lashR', shape: 'lash', windup: 0.09, active: 0.08, recover: 0.13, range: 108, size: 16, mult: 0.95, tip: 0.35, graze: 0.5, kb: 90, shake: 2, hitstop: 0.03, move: 0.7 },
      { anim: 'lashL', shape: 'lash', windup: 0.09, active: 0.08, recover: 0.13, range: 108, size: 16, mult: 0.95, tip: 0.35, graze: 0.5, kb: 90, shake: 2, hitstop: 0.03, move: 0.7 },
      { anim: 'crack', shape: 'lash', windup: 0.16, active: 0.08, recover: 0.2, range: 118, size: 18, mult: 1.6, tip: 0.3, graze: 0.5, kb: 200, stun: 0.35, shake: 4, hitstop: 0.07, move: 0.4 },
    ],
  },
  // Rapid shots from a small clip that reloads once you stop firing; the third shot is a weaker spread.
  wand: {
    window: 0.3,
    skill: 'nova',
    skillName: 'Nova',
    size: 1,
    rest: 0.41,
    combo: [
      { anim: 'cast', shape: 'shot', windup: 0.04, active: 0.05, recover: 0.14, range: 0, size: 7, mult: 0.8, kb: 70, shots: [0], shake: 1, hitstop: 0.02, move: 0.85 },
      { anim: 'cast', shape: 'shot', windup: 0.04, active: 0.05, recover: 0.14, range: 0, size: 7, mult: 0.8, kb: 70, shots: [0], shake: 1, hitstop: 0.02, move: 0.85 },
      { anim: 'cast', shape: 'shot', windup: 0.08, active: 0.06, recover: 0.2, range: 0, size: 8, mult: 0.45, kb: 90, shots: [-0.22, 0, 0.22], shake: 2, hitstop: 0.03, move: 0.7 },
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
    // The rope's length, and the band its tip sweeps through.
    case 'lash': r = { reach: s.range * reach, area: s.range * reach * s.size * reach * 1.6 }; break;
    case 'circle': r = { reach: (s.reach ?? 0) * reach + s.size * reach, area: Math.PI * (s.size * reach) ** 2 }; break;
    case 'shot': r = { reach: 400 * 1.2, area: (s.shots?.length ?? 1) * Math.PI * s.size ** 2 }; break;
  }
  return wave ? { reach: Math.max(r.reach, wave.reach), area: r.area + wave.area } : r;
}

/** One strike's damage multiplier on a target in front of you: its shockwave hits it too, and every pellet of a spread lands (as it does point-blank). */
const strikeDamage = (s: Strike) => (s.shape === 'shot' ? s.mult * (s.shots?.length ?? 1) : s.mult) + (s.wave?.mult ?? 0);
/** Seconds from starting a strike until the next can start, at a handling level. */
export const strikeTime = (s: Strike, lv: number) => s.windup + s.active + s.recover * pace(lv).chain;
/** A strike's time, plus the rest after it if it ends the combo. */
const stepTime = (m: Moveset, i: number, lv: number) => strikeTime(m.combo[i], lv) + (i === m.combo.length - 1 ? m.rest * pace(lv).rest : 0);

/** Seconds per full combo, chaining each strike as early as handling allows, plus the rest after it. */
export function comboTime(m: Moveset, lv: number): number {
  return m.combo.reduce((a, _, i) => a + stepTime(m, i, lv), 0);
}

/** How long a typical fight lasts: weapons are judged over this window, opening burst included. */
export const FIGHT_WINDOW = 5;

/** Damage multiplier per second against one target in front of you, over a typical fight, at a handling level. */
export function comboDps(m: Moveset, lv: number): number {
  let t = 0, dmg = 0, i = 0;
  while (t < FIGHT_WINDOW) {
    dmg += strikeDamage(m.combo[i]);
    t += stepTime(m, i, lv);
    i = (i + 1) % m.combo.length;
  }
  return dmg / t;
}

/** How long the opening burst is measured over: long enough for a heavy weapon's second blow at low handling. */
export const BURST_WINDOW = 1.5;

/** Damage multiplier landed in the opening moments of a fight: how hard a weapon opens. */
export function openingBurst(m: Moveset, lv: number): number {
  let t = 0, dmg = 0, i = 0;
  while (t + m.combo[i].windup <= BURST_WINDOW) {
    dmg += strikeDamage(m.combo[i]);
    t += stepTime(m, i, lv);
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
  /** The whip's whirl: a lash every `tick` seconds while it spins (how long is its rank's `dur`), out to `radius`. */
  whirl: { tick: 0.16, radius: 80 },
  nova: { size: 8 },
};

/** How many times a whirl's lashes land over its spin. */
export const whirlTicks = (r: SkillRank) => Math.max(1, Math.floor(r.dur / SKILL_DATA.whirl.tick + 1e-6));
/** Your walking speed in a fight, for the ground a whirl sweeps as you move with it. */
export const WALK_SPEED = 150;

/**
 * A skill's reach, ground covered, and total damage multiplier on one target caught in it, at a rank (1–4; Mastery by
 * default, its biggest).
 */
export function skillShape(kind: SkillKind, reach: number, rk = SKILL_LEVELS.length): { reach: number; area: number; mult: number; crowd: number } {
  const d = SKILL_DATA, r = SKILL_RANKS[kind][rk - 1];
  switch (kind) {
    case 'spin': {
      const s = strikeShape({ ...d.spin, range: d.spin.range * r.size }, reach);
      return { ...s, mult: r.mult, crowd: s.area * r.mult };
    }
    case 'quake': {
      const s = strikeShape(d.quake.strike, reach), w = d.quake.waves, waves = r.count * w.range * reach * w.width;
      return { reach: Math.max(s.reach, w.range * reach), area: s.area + waves, mult: r.mult + r.sub, crowd: s.area * r.mult + waves * r.sub };
    }
    case 'whirl': {
      // The ground it covers includes the strip swept as you walk with it; what you pass is lashed for about half the spin.
      const R = d.whirl.radius * r.size * reach, circle = Math.PI * R ** 2, strip = 2 * R * WALK_SPEED * r.move * r.dur, n = whirlTicks(r);
      return { reach: R, area: circle + strip, mult: r.sub * n, crowd: (circle * n + strip * n / 2) * r.sub };
    }
    case 'nova': return { reach: 400 * 1.2, area: r.count * Math.PI * d.nova.size ** 2, mult: r.sub, crowd: r.count * Math.PI * d.nova.size ** 2 * r.sub };
  }
}

