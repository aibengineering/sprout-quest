// How each monster fights: one entry per kind, so a new monster is one new entry here (plus its data and sprites).
import type { OvalArena } from '../arena';
import type { Sfx } from '../audio';
import type { MonsterKind } from '../data';
import type { Fx } from '../fx';
import { TAU, rand, type EState, type Enemy, type Hazard, type Ring } from './types';

/** What a monster's behaviour can see and do in the fight. The battle provides it. */
export interface FoeWorld {
  /** You. */
  readonly p: { x: number; y: number; vx: number; vy: number };
  /** Seconds since the fight began. */
  readonly t: number;
  readonly arena: OvalArena;
  readonly fx: Fx;
  play(s: Sfx): void;
  shakeAtLeast(n: number): void;
  enemyShoot(e: Enemy, ang: number, speed: number, r: number, color: string, mult?: number): void;
  /** A telegraphed danger zone that goes off after `delay`. */
  hazard(h: Omit<Hazard, 't' | 'done'>): void;
  ring(r: Omit<Ring, 't'>): void;
  /** Calls in helpers near `near` (at most four alive at once). */
  summon(kind: MonsterKind, lv: number, near: Enemy, count: number): void;
}

export interface Behaviour {
  /** The state it starts the fight in. */
  start: EState;
  /** Burst color when it's defeated. */
  color: string;
  /** Sprite size against its hitbox (default 1). */
  scale?: number;
  /** Hops over you: can't bump into you while high in the air, and stretches mid-hop. */
  hops?: boolean;
  /** Hovers: a smaller shadow. */
  flies?: boolean;
  /**
   * One step of its plan. `e.t` has already ticked down by `dt`; `dist` and `toP` are the distance and angle to you;
   * `rage` drops from 1 to 0.72 once a guardian is below half health, speeding up its timings.
   */
  think(e: Enemy, w: FoeWorld, dt: number, dist: number, toP: number, rage: number): void;
}

export function moveToward(e: Enemy, ang: number, speed: number) {
  e.vx = Math.cos(ang) * speed;
  e.vy = Math.sin(ang) * speed;
}

/** Slimes: pause (wobbling just before), hop at you, splat. `land` adds a trick on landing. */
function hopper(color: string, dust: string, leap: number, land?: (e: Enemy, w: FoeWorld, toP: number) => void): Behaviour {
  return {
    start: 'idle', color, hops: true,
    think(e, w, _dt, _dist, toP) {
      if (e.state === 'idle') {
        e.vx = e.vy = 0;
        e.z = 0;
        e.windup = e.t < 0.2 ? 1 - e.t / 0.2 : 0;
        if (e.t <= 0) {
          e.state = 'hop';
          e.t = 0.5;
          e.windup = 0;
          moveToward(e, toP + rand(-0.4, 0.4), e.spd * leap);
        }
      } else {
        e.z = Math.sin((1 - Math.max(0, e.t) / 0.5) * Math.PI) * 20;
        if (e.t <= 0) {
          e.state = 'idle';
          e.t = rand(0.45, 1.0);
          e.z = 0;
          e.vx = e.vy = 0;
          w.fx.burst(e.x, e.y, dust, 4, 60, { size: 3 });
          land?.(e, w, toP);
        }
      }
    },
  };
}

export const MONSTER_AI: Record<MonsterKind, Behaviour> = {
  slime: hopper('#6fdc7a', '#a8f0a8', 1.9),
  // Magma slimes leap further and sometimes spit four embers as they land.
  magma: hopper('#ff7a3a', '#ffb07a', 2.2, (e, w) => {
    if (Math.random() < 0.5) {
      const off = Math.random() * TAU;
      for (let i = 0; i < 4; i++) w.enemyShoot(e, off + (i / 4) * TAU, 120, 7, '#ff9a3a', 0.7);
    }
  }),
  // Glimmer slimes flick three crystal shards at you as they land.
  glimmer: hopper('#c8b0ff', '#e0d0ff', 1.9, (e, w, toP) => {
    if (Math.random() < 0.6) for (const off of [-0.3, 0, 0.3]) w.enemyShoot(e, toP + off, 150, 6, '#d8c8ff', 0.6);
  }),

  // Hopbuns wander, wiggle, then charge in a straight line.
  bunny: {
    start: 'idle', color: '#ffffff', scale: 1.25,
    think(e, w, _dt, _dist, toP) {
      if (e.state === 'idle') {
        const wa = e.orb + Math.sin(w.t + e.seed) * 1.5;
        moveToward(e, wa, e.spd * 0.45);
        if (e.t <= 0) { e.state = 'windup'; e.t = 0.55; e.dir = toP; }
      } else if (e.state === 'windup') {
        e.vx = e.vy = 0;
        e.windup = 1 - e.t / 0.55;
        if (e.t > 0.15) e.dir = toP;
        if (e.t <= 0) { e.state = 'charge'; e.t = 0.5; e.windup = 0; moveToward(e, e.dir, e.spd * 3.4); }
      } else if (e.state === 'charge') {
        if (e.t <= 0) { e.state = 'idle'; e.t = rand(1.1, 2.0); e.orb = Math.random() * TAU; e.vx = e.vy = 0; }
      }
    },
  },

  // Shrooms keep their distance and puff spreads of spores.
  shroom: {
    start: 'move', color: '#e8505a', scale: 1.1,
    think(e, w, _dt, dist, toP) {
      if (e.state === 'move') {
        const strafe = toP + (Math.sin(e.seed) > 0 ? 1 : -1) * Math.PI / 2;
        if (dist < 130) moveToward(e, toP + Math.PI, e.spd);
        else if (dist > 230) moveToward(e, toP, e.spd);
        else moveToward(e, strafe, e.spd * 0.6);
        if (e.t <= 0) { e.state = 'puff'; e.t = 0.6; }
      } else {
        e.vx = e.vy = 0;
        e.windup = 1 - e.t / 0.6;
        if (e.t <= 0) {
          e.windup = 0;
          for (const s of [-0.3, 0, 0.3]) w.enemyShoot(e, toP + s, 140, 7, '#c08ae0');
          w.play('shoot');
          e.state = 'move';
          e.t = rand(1.4, 2.4);
        }
      }
    },
  },

  // Woolfs circle you, then dash through.
  wolf: {
    start: 'circle', color: '#9aa4c8', scale: 1.4,
    think(e, w, dt, _dist, toP) {
      const p = w.p;
      if (e.state === 'circle') {
        e.orb += dt * 0.9 * (Math.sin(e.seed) > 0 ? 1 : -1);
        const tx = p.x + Math.cos(e.orb) * 130, ty = p.y + Math.sin(e.orb) * 130;
        moveToward(e, Math.atan2(ty - e.y, tx - e.x), e.spd * Math.min(1, Math.hypot(tx - e.x, ty - e.y) / 30));
        if (e.t <= 0) { e.state = 'windup'; e.t = 0.45; }
      } else if (e.state === 'windup') {
        e.vx = e.vy = 0;
        e.windup = 1 - e.t / 0.45;
        if (e.t > 0.12) e.dir = toP;
        if (e.t <= 0) { e.state = 'dash'; e.t = 0.35; e.windup = 0; moveToward(e, e.dir, e.spd * 4.2); }
      } else if (e.state === 'dash') {
        if (e.t <= 0) { e.state = 'recover'; e.t = 0.5; e.vx = e.vy = 0; }
      } else if (e.t <= 0) {
        e.state = 'circle';
        e.t = rand(1.2, 2.2);
        e.orb = Math.atan2(e.y - p.y, e.x - p.x);
      }
    },
  },

  // Bats flutter at a distance, then swoop.
  bat: {
    start: 'flutter', color: '#7a5ab8', scale: 1.2, flies: true,
    think(e, w, _dt, dist, toP) {
      e.z = 12 + Math.sin(w.t * 5 + e.seed) * 4;
      if (e.state === 'flutter') {
        const wob = Math.sin(w.t * 4 + e.seed) * 1.2;
        moveToward(e, dist < 110 ? toP + Math.PI + wob : toP + wob, e.spd * 0.7);
        if (e.t <= 0) { e.state = 'windup'; e.t = 0.35; }
      } else if (e.state === 'windup') {
        e.vx = e.vy = 0;
        e.windup = 1 - e.t / 0.35;
        e.dir = toP;
        if (e.t <= 0) { e.state = 'swoop'; e.t = 0.45; e.windup = 0; moveToward(e, e.dir, e.spd * 2.8); }
      } else if (e.state === 'swoop') {
        if (e.t <= 0) { e.state = 'retreat'; e.t = 0.5; moveToward(e, toP + Math.PI, e.spd); }
      } else if (e.t <= 0) {
        e.state = 'flutter';
        e.t = rand(1, 1.8);
      }
    },
  },

  // Golems plod up and slam the ground around them.
  golem: {
    start: 'walk', color: '#9aa0b0',
    think(e, w, _dt, dist, toP) {
      if (e.state === 'walk') {
        moveToward(e, toP, dist > 40 ? e.spd : 0);
        if (dist < 105 && e.t <= 0) {
          e.state = 'slam';
          e.t = 1.0;
          e.vx = e.vy = 0;
          w.hazard({ x: e.x, y: e.y, r: 95, delay: 0.9, atk: e.atk, from: e.kind, mult: 1.3 });
        }
      } else {
        e.windup = 1 - e.t / 1.0;
        if (e.t <= 0) { e.state = 'walk'; e.t = 1.3; e.windup = 0; }
      }
    },
  },

  // Imps float around you, blink away, and cast fireballs (three at a time when strong).
  imp: {
    start: 'float', color: '#e8505a', scale: 1.2, flies: true,
    think(e, w, dt, _dist, toP) {
      const p = w.p;
      e.z = 10;
      if (e.state === 'float') {
        e.orb += dt * 0.5;
        const tx = p.x + Math.cos(e.orb) * 170, ty = p.y + Math.sin(e.orb) * 170;
        moveToward(e, Math.atan2(ty - e.y, tx - e.x), e.spd * 0.8 * Math.min(1, Math.hypot(tx - e.x, ty - e.y) / 40));
        if (e.t <= 0) {
          if (Math.random() < 0.35) {
            w.fx.burst(e.x, e.y - 20, '#c878ff', 12, 100, { size: 4 });
            const a = Math.random() * TAU, r = rand(150, 190);
            const to = w.arena.nearestFree(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, e.r + 16);
            e.x = to.x; e.y = to.y;
            w.fx.burst(e.x, e.y - 20, '#c878ff', 12, 100, { size: 4 });
            e.t = rand(0.4, 0.7);
          } else {
            e.state = 'cast';
            e.t = 0.55;
          }
        }
      } else {
        e.vx = e.vy = 0;
        e.windup = 1 - e.t / 0.55;
        if (e.t <= 0) {
          e.windup = 0;
          const spread = e.lv >= 15 || e.golden ? [-0.25, 0, 0.25] : [0];
          for (const s of spread) w.enemyShoot(e, toP + s, 190, 8, '#ff9a3a');
          w.play('shoot');
          e.state = 'float';
          e.t = rand(1.2, 2);
        }
      }
    },
  },

  // The Emberwyrm picks a new attack each time: fire rings, triple shots, a charge, or stomps where you're heading.
  dragon: {
    start: 'walk', color: '#e8603c', scale: 1.1,
    think(e, w, _dt, dist, toP, rage) {
      const p = w.p;
      switch (e.state) {
        case 'walk': {
          moveToward(e, toP, dist > 90 ? e.spd * 0.6 : 0);
          if (e.t <= 0) {
            const opts: EState[] = ['ring', 'triple', 'charge', 'stomp'].filter((s) => s !== e.last) as EState[];
            e.state = opts[Math.floor(Math.random() * opts.length)];
            e.last = e.state;
            e.vx = e.vy = 0;
            e.sub = 0;
            e.t = e.state === 'charge' ? 0.7 * rage : e.state === 'ring' ? 0.8 * rage : 0.3;
            if (e.state === 'charge') e.state = 'windup';
          }
          break;
        }
        case 'ring': {
          e.windup = e.sub === 0 ? 1 - e.t / (0.8 * rage) : 0.5;
          if (e.t <= 0) {
            const off = e.sub * (Math.PI / 14);
            for (let i = 0; i < 14; i++) w.enemyShoot(e, off + (i / 14) * TAU, 150, 9, '#ff7a3a');
            w.play('boom');
            e.sub++;
            e.t = 0.35;
            if (e.sub >= (rage < 1 ? 3 : 2)) { e.state = 'walk'; e.t = 1.3 * rage; e.windup = 0; }
          }
          break;
        }
        case 'triple': {
          e.windup = 0.6;
          if (e.t <= 0) {
            for (const s of [-0.22, 0, 0.22]) w.enemyShoot(e, toP + s, 220, 9, '#ffb03a');
            w.play('shoot');
            e.sub++;
            e.t = 0.35 * rage;
            if (e.sub >= 3) { e.state = 'walk'; e.t = 1.2 * rage; e.windup = 0; }
          }
          break;
        }
        case 'windup': {
          e.windup = 1 - e.t / (0.7 * rage);
          if (e.t > 0.15) e.dir = toP;
          if (e.t <= 0) { e.state = 'charge'; e.t = 0.6; e.windup = 0; moveToward(e, e.dir, e.spd * 4.5); }
          break;
        }
        case 'charge': {
          if (Math.random() < 0.5) w.fx.burst(e.x, e.y, '#ffb03a', 1, 40, { size: 5, grav: -20 });
          if (e.t <= 0) { e.state = 'recover'; e.t = 0.6; e.vx = e.vy = 0; }
          break;
        }
        case 'recover': {
          if (e.t <= 0) { e.state = 'walk'; e.t = 1.0 * rage; }
          break;
        }
        case 'stomp': {
          e.windup = 0.4;
          if (e.t <= 0) {
            w.hazard({ x: p.x + p.vx * 0.3, y: p.y + p.vy * 0.3, r: 60, delay: 0.8, atk: e.atk, from: e.kind, mult: 1.1 });
            e.sub++;
            e.t = 0.45 * rage;
            if (e.sub >= (rage < 1 ? 5 : 3)) { e.state = 'walk'; e.t = 1.4 * rage; e.windup = 0; }
          }
          break;
        }
        default:
          e.state = 'walk';
      }
    },
  },

  // Slime King: huge telegraphed belly-flops that splash goo, and he calls little slimes every few landings.
  kingslime: {
    start: 'idle', color: '#8ac8ff', hops: true,
    think(e, w, _dt, _dist, _toP, rage) {
      const p = w.p;
      if (e.state === 'idle') {
        e.vx = e.vy = 0;
        e.z = 0;
        e.windup = e.t < 0.5 ? 1 - e.t / 0.5 : 0;
        if (e.t <= 0) {
          e.state = 'hop';
          const dur = 0.95 * rage;
          e.t = dur;
          e.windup = 0;
          // Aim a little ahead of where you're running.
          const { x: tx, y: ty } = w.arena.nearestFree(p.x + p.vx * 0.35, p.y + p.vy * 0.35, e.r);
          e.tx = tx;
          e.ty = ty;
          e.vx = (tx - e.x) / dur;
          e.vy = (ty - e.y) / dur;
          w.hazard({ x: tx, y: ty, r: 72, delay: dur, atk: e.atk, from: e.kind, mult: 1.4 });
        }
      } else if (e.state === 'hop') {
        const dur = 0.95 * rage;
        e.z = Math.sin((1 - Math.max(0, e.t) / dur) * Math.PI) * 70;
        if (e.t <= 0) {
          e.state = 'idle';
          e.t = rand(0.7, 1.1) * rage;
          e.z = 0;
          e.vx = e.vy = 0;
          e.squash = 0.25;
          w.shakeAtLeast(10);
          const n = rage < 1 ? 10 : 6, off = Math.random() * TAU;
          for (let i = 0; i < n; i++) w.enemyShoot(e, off + (i / n) * TAU, 130, 8, '#8ac8ff', 0.7);
          w.fx.burst(e.x, e.y, '#bfe4ff', 16, 180, { size: 5 });
          e.sub++;
          if (e.sub % 3 === 0) w.summon('slime', Math.max(1, e.lv - 2), e, 2);
        }
      }
    },
  },

  // Alpha Woolf: circles, then chains dashes (three when angry) and howls for its pack once.
  alphawolf: {
    start: 'circle', color: '#5a6488',
    think(e, w, dt, _dist, toP, rage) {
      const p = w.p;
      if (!e.flag && e.hp < e.maxHp * 0.6 && e.state !== 'dash') {
        e.flag = true;
        e.state = 'howl';
        e.t = 1.0;
        e.vx = e.vy = 0;
      }
      switch (e.state) {
        case 'howl':
          e.windup = 1;
          if (Math.random() < 0.3) w.ring({ x: e.x, y: e.y - 20, r0: 10, r1: 90, dur: 0.4, color: '220,230,255' });
          if (e.t <= 0) {
            e.windup = 0;
            w.summon('wolf', Math.max(4, e.lv - 3), e, 2);
            e.state = 'circle';
            e.t = 1;
          }
          break;
        case 'circle': {
          e.orb += dt * 1.3;
          const tx = p.x + Math.cos(e.orb) * 150, ty = p.y + Math.sin(e.orb) * 150;
          moveToward(e, Math.atan2(ty - e.y, tx - e.x), e.spd * 1.2 * Math.min(1, Math.hypot(tx - e.x, ty - e.y) / 30));
          if (e.t <= 0) { e.state = 'windup'; e.t = 0.45 * rage; e.sub = 0; }
          break;
        }
        case 'windup':
          e.vx = e.vy = 0;
          e.windup = 1 - e.t / (0.45 * rage);
          if (e.t > 0.1) e.dir = toP;
          if (e.t <= 0) { e.state = 'dash'; e.t = 0.34; e.windup = 0; moveToward(e, e.dir, e.spd * 4.6); }
          break;
        case 'dash':
          if (Math.random() < 0.5) w.fx.burst(e.x, e.y, '#dfe6f0', 1, 30, { size: 4, grav: 0, life: 0.3 });
          if (e.t <= 0) {
            e.sub++;
            if (e.sub < (rage < 1 ? 3 : 2)) { e.state = 'windup'; e.t = 0.28; e.vx = e.vy = 0; }
            else { e.state = 'recover'; e.t = 0.7; e.vx = e.vy = 0; }
          }
          break;
        default:
          e.vx = e.vy = 0;
          if (e.t <= 0) { e.state = 'circle'; e.t = rand(1.1, 1.8) * rage; e.orb = Math.atan2(e.y - p.y, e.x - p.x); }
      }
    },
  },

  // Crystal King: ground slams, lines of erupting crystal spikes, and crystal shard rings.
  crystalking: {
    start: 'walk', color: '#b8a0ff',
    think(e, w, _dt, dist, toP, rage) {
      switch (e.state) {
        case 'walk': {
          moveToward(e, toP, dist > 70 ? e.spd : 0);
          if (e.t <= 0) {
            const opts = (['slam', 'spikes', 'shards'] as EState[]).filter((s) => s !== e.last || dist < 90);
            e.state = dist < 120 && e.last !== 'slam' ? 'slam' : opts[Math.floor(Math.random() * opts.length)];
            e.last = e.state;
            e.vx = e.vy = 0;
            if (e.state === 'slam') {
              e.t = 1.0 * rage;
              w.hazard({ x: e.x, y: e.y, r: 125, delay: 1.0 * rage, atk: e.atk, from: e.kind, mult: 1.3 });
            } else if (e.state === 'spikes') {
              e.t = 0.9;
              const lines = rage < 1 ? [-0.4, 0, 0.4] : [0];
              for (const off of lines) {
                for (let i = 0; i < 7; i++) {
                  const d = 55 + i * 42, a = toP + off;
                  const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d;
                  if (!w.arena.inside(x, y)) break;
                  w.hazard({ x, y, r: 30, delay: 0.65 + i * 0.07, atk: e.atk, from: e.kind, mult: 1.1 });
                }
              }
            } else {
              e.t = 0.6;
            }
          }
          break;
        }
        case 'slam':
          e.windup = 1 - e.t / (1.0 * rage);
          if (e.t <= 0) { e.state = 'walk'; e.t = 1.1 * rage; e.windup = 0; }
          break;
        case 'spikes':
          e.windup = 0.6;
          if (e.t <= 0) { e.state = 'walk'; e.t = 1.2 * rage; e.windup = 0; }
          break;
        case 'shards':
          e.windup = 1 - e.t / 0.6;
          if (e.t <= 0) {
            const off = Math.random() * TAU;
            for (let ring = 0; ring < (rage < 1 ? 2 : 1); ring++) {
              for (let i = 0; i < 12; i++) w.enemyShoot(e, off + ring * 0.26 + (i / 12) * TAU, 150 - ring * 30, 9, '#d8c0ff');
            }
            w.play('shoot');
            e.state = 'walk';
            e.t = 1.2 * rage;
            e.windup = 0;
          }
          break;
        default:
          e.state = 'walk';
      }
    },
  },
};

/** Sprite size against the hitbox, for the battle and the overworld alike. */
export const spriteScale = (kind: MonsterKind) => MONSTER_AI[kind].scale ?? 1;
