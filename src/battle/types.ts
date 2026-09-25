// Shapes shared by the battle simulation, monster behaviours and the renderer, plus small math helpers.
import type { MatId, MonsterDef, MonsterKind, Zone } from '../data';
import type { Strike } from '../weapons';

export const TAU = Math.PI * 2;
/** Seconds between weapon skills. */
export const SKILL_CD = 4.5;
/**
 * Attacks go the way you last moved. An enemy within this angle (radians) of that direction gets lined up
 * with, so thumbsticks don't whiff on something just off-line; anything wider you have to turn to face.
 */
export const AIM_ASSIST = 0.3;
/** Arena units per Blender unit for sprites (drawn a little larger than their hitboxes so they read on phones). */
export const UNIT = 34;
/** The camera swoops in from this close as a fight starts, and back in as it ends. */
export const ZOOM = 1.8;
/** Seconds for the swoop at each end of a fight. */
export const ZOOM_T = 0.35;

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const easeOut = (q: number) => 1 - (1 - q) ** 3;
export const easeIn = (q: number) => q * q * q;
export const easeInOut = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - (-2 * q + 2) ** 3 / 2);
export const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
export const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Every state a monster's behaviour can be in (each monster uses a few). */
export type EState =
  | 'idle' | 'hop' | 'windup' | 'charge' | 'move' | 'puff' | 'circle' | 'dash' | 'recover' | 'flutter' | 'swoop' | 'retreat'
  | 'walk' | 'slam' | 'float' | 'cast' | 'ring' | 'triple' | 'stomp' | 'howl' | 'spikes' | 'shards';

export interface Enemy {
  kind: MonsterKind;
  def: MonsterDef;
  lv: number;
  golden: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  dfn: number;
  xp: number;
  spd: number;
  x: number; y: number; vx: number; vy: number; kx: number; ky: number;
  r: number;
  z: number;
  state: EState;
  t: number;
  dir: number;
  face: number;
  orb: number;
  sub: number;
  last: EState | null;
  windup: number;
  flash: number;
  stun: number;
  dead: boolean;
  deathT: number;
  seed: number;
  hitId: number;
  /** Damage over time: dragonfire burns, spores poison. */
  burn: number;
  burnDmg: number;
  burnTick: number;
  dotColor: string;
  /** Seconds left slowed by jelly. */
  slow: number;
  squash: number;
  /** Where a leaping boss is heading. */
  tx: number;
  ty: number;
  /** One-off behaviour flag (the Alpha Woolf's howl). */
  flag: boolean;
  minion: boolean;
}

export interface Proj {
  x: number; y: number; vx: number; vy: number; r: number;
  atk: number; mult: number; owner: 'p' | 'e'; life: number; color: string;
  /** Bat bolts swerve toward foes. */
  homing?: boolean;
}

/** Dragonfire left on the ground by the Wyrmbreaker's breath: burns foes that stand in it. */
export interface Flame { x: number; y: number; r: number; t: number; life: number; tick: number }
/** A chain spark jumping between two foes (glimmer weapons). */
export interface Zap { x1: number; y1: number; x2: number; y2: number; t: number }

/** What happened in a fight, for the play report. */
export interface BattleLog { time: number; swings: number; hits: number; crits: number; skills: number; dodges: number; potions: number; dealt: number; taken: number }

/** A telegraphed danger zone that goes off after `delay`. */
export interface Hazard { x: number; y: number; r: number; t: number; delay: number; atk: number; mult: number; done: boolean }
export interface Ring { x: number; y: number; r0: number; r1: number; t: number; dur: number; color: string; width?: number }

/** A strike in progress. */
export interface Swing {
  s: Strike;
  t: number;
  aim: number;
  id: number;
  prevAng: number | null;
  impacted: boolean;
  skill: boolean;
  /** Recent weapon angles for the slash trail. */
  trail: { ang: number; t: number }[];
  /** The last strike of the combo: earns the rest afterwards. */
  finisher: boolean;
}

/** A hammer's traveling shockwave (or the Wyrmbreaker's dragonfire). */
export interface Wave { x: number; y: number; dir: number; dist: number; range: number; width: number; speed: number; mult: number; id: number; spikeAt: number; fire?: boolean }
export interface Spike { x: number; y: number; t: number; life: number; size: number; tilt: number }
export interface Crack { pts: [number, number][]; t: number }
export interface Spark { x: number; y: number; t: number; size: number; color: string; rot: number }

export interface Foe { kind: MonsterKind; lv: number; golden: boolean; /** Prologue foe: hits softer (GENTLE_ATK). */ gentle?: boolean }

export interface BattleSetup {
  zone: Zone;
  foes: Foe[];
  boss: boolean;
  /** You got the jump on them: they start stunned. */
  ambush?: boolean;
}

export interface BattleOutcome {
  result: 'win' | 'lose' | 'run';
  hp: number;
  xp: number;
  drops: Partial<Record<MatId, number>>;
  defeated: string[];
  log: BattleLog;
}
