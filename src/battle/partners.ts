// How sparring partners fight (src/spar.ts): each has one readable pattern built from the monsters' attack shapes.
// Only their attacks hurt (bumping into them doesn't), and each leaves an opening after its big move.
import type { PartnerId } from '../spar';
import { MONSTER_AI, moveToward, type Behaviour, type FoeWorld } from './monsters';
import { rand, type Enemy, type FoeKind } from './types';

/** A telegraphed strike `reach` ahead of them, toward `ang`. */
const strikeAhead = (e: Enemy, w: FoeWorld, ang: number, reach: number, r: number, delay: number, mult = 1) =>
  w.hazard({ x: e.x + Math.cos(ang) * reach, y: e.y + Math.sin(ang) * reach, r, delay, atk: e.atk, mult, from: e.kind });

export const PARTNER_AI: Record<PartnerId, Behaviour> = {
  // Elder Oswin shuffles up and raises his staff, slowly, for a bonk where it's marked. Every third go he surprises you:
  // a spry little hop at you and a poke, after which he needs a moment to get his breath back (wide open).
  oswin: {
    start: 'walk', color: '#8fd07a', armsOnly: true,
    takes: (e) => (e.state === 'exposed' ? 1.5 : 1),
    think(e, w, _dt, dist, toP) {
      switch (e.state) {
        case 'walk':
          moveToward(e, toP, dist > 70 ? e.spd : 0);
          if (e.t <= 0 && dist < 140) {
            e.vx = e.vy = 0;
            e.dir = toP;
            if (++e.sub % 3 === 0) {
              e.state = 'windup';
              e.t = 0.55;
              w.fx.text(e.x, e.y - e.r * 3, 'Hup!', '#ffe07a', 16);
            } else {
              e.state = 'slam';
              e.t = 1.15;
              strikeAhead(e, w, toP, 42, 46, 1.15);
            }
          }
          break;
        case 'slam':
          e.windup = 1 - e.t / 1.15;
          if (e.t <= 0) { e.state = 'recover'; e.t = 0.9; e.windup = 0; e.squash = 0.2; }
          break;
        case 'windup':
          e.windup = 1 - e.t / 0.55;
          if (e.t > 0.15) e.dir = toP;
          if (e.t <= 0) { e.state = 'hop'; e.t = 0.45; e.windup = 0; moveToward(e, e.dir, Math.max(0, Math.min(dist - 34, 160)) / 0.45); }
          break;
        case 'hop':
          e.z = Math.sin((1 - Math.max(0, e.t) / 0.45) * Math.PI) * 26;
          if (e.t <= 0) {
            e.z = 0;
            e.vx = e.vy = 0;
            e.squash = 0.25;
            strikeAhead(e, w, e.dir, 34, 34, 0.35);
            e.state = 'exposed';
            e.t = 1.6;
          }
          break;
        default:
          e.windup = 0;
          if (e.t <= 0) { e.state = 'walk'; e.t = rand(0.8, 1.4); }
      }
    },
  },

  // Bram plods in and swings an axe handle overhead, twice, with a long wind-up; then a big sweep all round him, after
  // which he leans on it for a breather.
  bram: {
    start: 'walk', color: '#c08a5a', armsOnly: true,
    takes: (e) => (e.state === 'exposed' ? 1.4 : 1),
    think(e, w, _dt, dist, toP) {
      switch (e.state) {
        case 'walk':
          moveToward(e, toP, dist > 60 ? e.spd : 0);
          if (e.t <= 0 && dist < 120) {
            e.vx = e.vy = 0;
            e.dir = toP;
            if (++e.sub % 3 === 0) {
              e.state = 'stomp';
              e.t = 1.3;
              w.hazard({ x: e.x, y: e.y, r: 100, delay: 1.3, atk: e.atk, mult: 1.1, from: e.kind });
              w.fx.text(e.x, e.y - e.r * 3, 'Hrrmph…', '#ffd8a8', 15);
            } else {
              e.state = 'slam';
              e.t = 1.0;
              strikeAhead(e, w, toP, 48, 52, 1.0, 1.2);
            }
          }
          break;
        case 'slam':
          e.windup = 1 - e.t / 1.0;
          if (e.t <= 0) { e.state = 'recover'; e.t = 0.8; e.windup = 0; e.squash = 0.2; w.shakeAtLeast(4); }
          break;
        case 'stomp':
          e.windup = 1 - e.t / 1.3;
          if (e.t <= 0) { e.state = 'exposed'; e.t = 1.4; e.windup = 0; e.squash = 0.25; }
          break;
        default:
          e.windup = 0;
          if (e.t <= 0) { e.state = 'walk'; e.t = rand(0.6, 1.1); }
      }
    },
  },

  // The masked fox circles you, then darts through (a dodge-through, like a Woolf's dash, but quicker). Sometimes the
  // first wind-up is a feint and the real one follows straight after. Start a swing near her and she may slip away.
  fox: {
    start: 'circle', color: '#e8905a', armsOnly: true, evades: true,
    think(e, w, dt, _dist, toP) {
      const p = w.p;
      switch (e.state) {
        case 'circle': {
          e.orb += dt * 1.4;
          const tx = p.x + Math.cos(e.orb) * 125, ty = p.y + Math.sin(e.orb) * 125;
          moveToward(e, Math.atan2(ty - e.y, tx - e.x), e.spd * Math.min(1, Math.hypot(tx - e.x, ty - e.y) / 30));
          if (e.t <= 0) { e.state = 'windup'; e.t = 0.42; e.flag = Math.random() < 0.4; }
          break;
        }
        case 'windup':
          e.vx = e.vy = 0;
          e.windup = 1 - e.t / 0.42;
          if (e.t > 0.1) e.dir = toP;
          if (e.t <= 0 && e.flag) {
            e.flag = false;
            e.t = 0.3;
            w.fx.text(e.x, e.y - e.r * 3, 'Feint!', '#ffd0a0', 14);
          } else if (e.t <= 0) { e.state = 'dash'; e.t = 0.3; e.windup = 0; moveToward(e, e.dir, e.spd * 4); }
          break;
        case 'dash':
          if (e.t <= 0) { e.state = 'recover'; e.t = 0.6; e.vx = e.vy = 0; }
          break;
        default:
          if (e.t <= 0) { e.state = 'circle'; e.t = rand(0.9, 1.6); e.orb = Math.atan2(e.y - p.y, e.x - p.x); }
      }
    },
  },
};

/** Every fighter's behaviour: the monsters' and the sparring partners'. */
export const FOE_AI: Record<FoeKind, Behaviour> = { ...MONSTER_AI, ...PARTNER_AI };
