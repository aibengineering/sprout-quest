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

export type SkillKind = 'spin' | 'whirl' | 'quake' | 'scatter';
/** The one thing each class does that the others don't. */
export type Trick = 'riposte' | 'sunder' | 'snare' | 'blink';

export interface Moveset {
  /** Blades chain three strikes; every other class strikes once and rests (see `rest`), weaving its skill in between. */
  combo: Strike[];
  /** Seconds after a strike finishes during which the next attack continues the combo. */
  window: number;
  skill: SkillKind;
  skillName: string;
  /** Visual scale for the weapon sprite. */
  size: number;
  /** Rest after the last strike of the combo before you can start swinging again (at Lv 1 handling; see pace()). */
  rest: number;
  trick: Trick;
}

/**
 * Weapon handling sets your pace, and is what stops button-mashing. After each strike there's a moment before the next:
 * at handling Lv 1 you wait out the whole recovery and 60% again; mastered (Lv 10) you can cut in 45% of the way
 * through it. The rest after a full combo (or after each blow, for the one-strike classes) shrinks from 1.9× to 0.6×
 * the weapon's `rest`. So early fights are deliberate, a blow every one to two seconds for the heavy classes, and a
 * mastered weapon strikes about twice as fast.
 */
export function pace(lv: number) {
  const q = SPEED_LEVELS.filter((l) => lv >= l).length / SPEED_LEVELS.length;
  return { chain: 1.6 - 1.15 * q, rest: 1.9 - 1.3 * q };
}

/**
 * The handling path, the same for every class of weapon: its skill unlocks at Lv 2 and grows a rank at 5, 8 and 10
 * (Mastery), the class's own trick (Riposte, Sunder, Snare, Blink) comes at Lv 3, and every other level is a step up
 * in attack speed. So each level gives something you can feel, one thing at a time, and the skill levels are the big
 * ones.
 */
export const SKILL_LEVELS = [2, 5, 8, 10];
export const TRICK_LEVEL = 3;
export const SPEED_LEVELS = [4, 6, 7, 9];
/** Whether your class's trick is unlocked at a handling level. */
export const hasTrick = (lv: number) => lv >= TRICK_LEVEL;
/** Your skill's rank at a handling level: 0 (locked) to 4 (Mastery). */
export const skillRank = (lv: number) => SKILL_LEVELS.filter((l) => lv >= l).length;
export type HandlingStep = 'skill' | 'trick' | 'speed';
/** What a handling level gives: a skill rank, the class's trick, or an attack speed step (nothing at Lv 1). */
export const handlingStep = (lv: number): HandlingStep | null =>
  SKILL_LEVELS.includes(lv) ? 'skill' : lv === TRICK_LEVEL ? 'trick' : SPEED_LEVELS.includes(lv) ? 'speed' : null;

/**
 * Each skill at each rank (I–IV). `mult` is the main hit, `size` scales its reach, `count` is how many waves or bolts,
 * `sub` the damage of each wave, whirl lash or bolt, `stun` how long it stuns, `cd` its recharge, and for the whirl
 * `dur` (how long it spins) and `move` (how much of your walking speed you keep while it does).
 *
 * The curve is steep on purpose: Rank I is a modest taste of the move (about 1.2× on one target), and each rank adds
 * more, up to an over-the-top Mastery finisher (about 3.1×). At every rank, one target in front of you takes about the
 * same from every class (tests/balance.test.ts); each class spends it differently (a stunning cut, shockwaves, a
 * flurry, a blast of bolts).
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
  // A shotgun blast of bolts where you aim; `size` is how wide the fan spreads (radians).
  scatter: [
    rank('Scatter', 'A blast of 5 bolts where you aim', { count: 5, sub: 0.44, size: 0.8 }),
    rank('Scatter II', '7 stronger bolts', { count: 7, sub: 0.5, size: 0.9 }),
    rank('Scatter III', '9 bolts, stronger still, in a wider fan', { count: 9, sub: 0.58, size: 1.0 }),
    rank('Starburst', '12 bolts in a huge fan, and it recharges faster', { count: 12, sub: 0.7, size: 1.2, cd: 3.5 }),
  ],
};
/** The skill as you have it at a handling level (null while it's locked). */
export const skillAt = (kind: SkillKind, lv: number): SkillRank | null => SKILL_RANKS[kind][skillRank(lv) - 1] ?? null;

const TAU = Math.PI * 2;

export const MOVESETS: Record<Style, Moveset> = {
  // Blades are the combo class: slash, backslash, then a lunging stab, quick and flowing. Their trick is the Riposte:
  // dodge through an attack and your next strike is a sure critical hit.
  sword: {
    window: 0.32,
    skill: 'spin',
    skillName: 'Spin',
    size: 1,
    rest: 0.34,
    trick: 'riposte',
    combo: [
      { anim: 'slashR', shape: 'arc', windup: 0.05, active: 0.1, recover: 0.08, range: 60, size: 2.1, mult: 1, kb: 150, shake: 2, hitstop: 0.035, move: 0.65 },
      { anim: 'slashL', shape: 'arc', windup: 0.05, active: 0.1, recover: 0.08, range: 60, size: 2.1, mult: 1, kb: 150, shake: 2, hitstop: 0.035, move: 0.65 },
      { anim: 'thrust', shape: 'line', windup: 0.08, active: 0.12, recover: 0.18, range: 82, size: 30, mult: 1.6, kb: 260, lunge: 34, shake: 5, hitstop: 0.06, move: 0.3 },
    ],
  },
  // One slow overhead slam at a time, kicking up a short line of rock spikes. Its trick is Sunder: a slammed foe's
  // armor cracks, and it takes more from everything for a few seconds (so the next slam, or the Quake, lands harder).
  hammer: {
    window: 0.4,
    skill: 'quake',
    skillName: 'Quake',
    size: 1.1,
    rest: 0.5,
    trick: 'sunder',
    combo: [
      {
        anim: 'slam', shape: 'circle', windup: 0.32, active: 0.1, recover: 0.34, range: 0, reach: 42, size: 46, mult: 2.35, kb: 340,
        wave: { range: 75, width: 44, speed: 560, mult: 0.6 }, shake: 12, hitstop: 0.11, move: 0.2, stun: 0.45,
      },
    ],
  },
  // One long lash at a time, reaching further than any blade: the rope trails the handle, unrolls, and cracks at the
  // tip. Only the tip hits properly (a "crack"); the rest of the rope just grazes. Its trick is the Snare: a crack yanks
  // the foe in toward you, off its feet, so nothing keeps its distance from a whip.
  whip: {
    window: 0.34,
    skill: 'whirl',
    skillName: 'Whirl',
    size: 0.9,
    rest: 0.7,
    trick: 'snare',
    combo: [
      { anim: 'crack', shape: 'lash', windup: 0.16, active: 0.08, recover: 0.2, range: 118, size: 18, mult: 2.8, tip: 0.3, graze: 0.5, kb: 200, stun: 0.35, shake: 4, hitstop: 0.07, move: 0.45 },
    ],
  },
  // One bolt at a time, from anywhere in the arena. Its trick is the Blink: your dodge is a short teleport instead of
  // a roll.
  wand: {
    window: 0.3,
    skill: 'scatter',
    skillName: 'Scatter',
    size: 1,
    rest: 0.4,
    trick: 'blink',
    combo: [
      { anim: 'cast', shape: 'shot', windup: 0.07, active: 0.05, recover: 0.18, range: 0, size: 9, mult: 1.8, kb: 90, shots: [0], shake: 2, hitstop: 0.03, move: 0.8 },
    ],
  },
};

/** Each class in a line, for the start of its handling path. */
export const CLASS_NOTES: Record<Style, string> = {
  sword: 'Three quick strikes in a flowing combo',
  hammer: 'One heavy slam at a time, with a shockwave',
  whip: 'One long lash at a time: crack it with the tip',
  wand: 'One bolt at a time, from anywhere in the arena',
};

/** What each class's trick does, for the Skills tab. */
export const TRICKS: Record<Trick, { name: string; note: string }> = {
  riposte: { name: 'Riposte', note: 'Dodge through an attack and your next strike is a sure critical hit' },
  sunder: { name: 'Sunder', note: 'A slammed foe takes 20% more from your hits for 3 seconds' },
  snare: { name: 'Snare', note: 'A crack at the tip yanks the foe in toward you' },
  blink: { name: 'Blink', note: 'Your dodge is a short teleport' },
};
/** Sunder: how much more a slammed foe takes, and for how long. */
export const SUNDER = { mult: 1.2, secs: 3 };
/** Riposte: how long after a dodge through an attack your next strike is a sure crit, and how much harder it hits. */
export const RIPOSTE = { secs: 1.2, mult: 1.5 };
/** Blink: how far the teleport goes. */
export const BLINK = 120;

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

/** A hammer's blows after the first land on a sundered foe (they come well within Sunder's few seconds). */
const sundered = (m: Moveset, t: number, lv: number) => (m.trick === 'sunder' && hasTrick(lv) && t > 0 ? SUNDER.mult : 1);

/** How long a typical fight lasts: weapons are judged over this window, opening burst included. */
export const FIGHT_WINDOW = 5;

/** Damage multiplier per second against one target in front of you, over a typical fight, at a handling level. */
export function comboDps(m: Moveset, lv: number): number {
  let t = 0, dmg = 0, i = 0;
  while (t < FIGHT_WINDOW) {
    dmg += strikeDamage(m.combo[i]) * sundered(m, t, lv);
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
    dmg += strikeDamage(m.combo[i]) * sundered(m, t, lv);
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
  scatter: { size: 8 },
};

/** How wide a typical foe looks from mid-range (radians), for how many of a Scatter's bolts hit it. */
const SCATTER_FOE_ANGLE = 0.44;

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
    case 'scatter': {
      // A foe in the middle of the fan, at a typical range, is hit by the bolts that fly within its width.
      const hits = Math.min(r.count, Math.max(1, (r.count * SCATTER_FOE_ANGLE) / r.size));
      return { reach: 400 * 1.2, area: r.count * Math.PI * d.scatter.size ** 2, mult: r.sub * hits, crowd: r.count * Math.PI * d.scatter.size ** 2 * r.sub };
    }
  }
}

