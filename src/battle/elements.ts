// What a weapon's element does: its colors and its trick on hit. One entry per element (data.ts `Fx`), so a new
// monster weapon's effect lives here rather than in the battle loop.
import type { Fx as Element } from '../data';
import type { Fx } from '../fx';
import type { Enemy } from './types';

/** What an element's hit effect can reach in the fight. The battle provides it. */
export interface HitWorld {
  readonly fx: Fx;
  readonly p: { x: number; y: number; hp: number };
  readonly stats: { maxHp: number };
  /** True the first time it's asked for `key` this fight (so an effect fires once per strike, not once per foe hit). */
  once(key: number): boolean;
  /** A spark leaps from `from` to the nearest other foe. */
  chain(from: Enemy): void;
  /** Dragonfire erupts around (x, y), scorching every foe but `skip`. */
  dragonBurst(x: number, y: number, skip: Enemy): void;
}

/** One landed hit: its damage, whether it crit, where it struck, and the strike it came from (0 for shots). */
export interface Hit { dmg: number; crit: boolean; x: number; y: number; strikeId: number }

export interface ElementDef {
  /** Hit-spark color, then the secondary burst color. */
  colors: [string, string];
  /** Hammer shockwave spikes (light, dark); plain rock if unset. */
  spike?: [string, string];
  /** Fire weapons: longer slash trails, glowing spikes, flames around the spin. */
  hot?: boolean;
  /** Extra crit chance. */
  crit?: number;
  /** Hammer shockwaves this much wider. */
  waveWidth?: number;
  /** Shots swerve toward foes. */
  homing?: boolean;
  /** What a hit does besides damage. */
  onHit?(w: HitWorld, e: Enemy, h: Hit): void;
}

const FIRE = '#ff7a2a';

/** Sets a foe burning (fire) or poisoned (spores) for `secs`, ticking a share of the hit's damage. */
function dot(e: Enemy, secs: number, dmg: number, share: number, color: string) {
  e.burn = secs;
  e.burnDmg = Math.max(1, Math.round(dmg * share));
  e.dotColor = color;
}

const burn = (w: HitWorld, e: Enemy, h: Hit) => {
  dot(e, 1.6, h.dmg, 0.12, FIRE);
  w.fx.burst(h.x, h.y, '#ff9a3a', 5, 120, { size: 4, grav: -60 });
};

export const ELEMENTS: Record<Element, ElementDef> = {
  none: { colors: ['#ffffff', '#e8eef8'] },
  nature: { colors: ['#8ad85a', '#c8f0a0'] },
  metal: { colors: ['#ffe0b8', '#e8eef8'] },
  stone: { colors: ['#c8b8a0', '#9aa0b0'], spike: ['#c8b8a0', '#8a7a68'], waveWidth: 1.25 },
  crystal: {
    colors: ['#c8b0ff', '#9af0ff'], crit: 0.12,
    onHit(w, _e, h) {
      if (h.crit) w.fx.burst(h.x, h.y, '#c8f0ff', 10, 200, { size: 4, star: true });
    },
  },
  jelly: {
    colors: ['#8af09a', '#ffb4c8'], spike: ['#ff9ab0', '#e8505a'],
    onHit(w, e, h) {
      e.slow = Math.max(e.slow, 1);
      w.fx.burst(h.x, h.y, '#8af09a', 6, 90, { size: 4, life: 0.5 });
    },
  },
  spore: {
    colors: ['#9af06a', '#e8505a'],
    // A puff of poison spores: a longer, gentler damage over time.
    onHit(w, e, h) {
      dot(e, 2.4, h.dmg, 0.1, '#8ad84a');
      w.fx.burst(h.x, h.y, '#9af06a', 8, 60, { size: 5, grav: -20, life: 0.8 });
    },
  },
  bat: {
    colors: ['#c8a8ff', '#ff6a8a'], homing: true,
    // Drain a little life back.
    onHit(w, _e, h) {
      const heal = Math.max(1, Math.round(h.dmg * 0.12));
      w.p.hp = Math.min(w.stats.maxHp, w.p.hp + heal);
      w.fx.text(w.p.x, w.p.y - 44, `+${heal}`, '#ff8ab0', 13);
    },
  },
  glimmer: {
    colors: ['#f0e0ff', '#c8b0ff'],
    onHit(w, e, h) {
      if (h.strikeId && w.once(-h.strikeId)) w.chain(e);
    },
  },
  fire: { colors: ['#ffb03a', '#ff5a2a'], spike: ['#ff9a4a', '#c8402a'], hot: true, onHit: burn },
  dragon: {
    colors: ['#ff5a4a', '#ffd35a'], spike: ['#ff7a3a', '#b8302a'], hot: true,
    // Burns like fire, and once per strike dragonfire erupts at the first foe hit.
    onHit(w, e, h) {
      burn(w, e, h);
      if (h.strikeId && w.once(h.strikeId)) w.dragonBurst(e.x, e.y, e);
    },
  },
};

/** The fire color burning foes are tinted (poisoned ones use their own). */
export const BURN_COLOR = FIRE;
