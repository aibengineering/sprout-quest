// The drums in the dark (game/stories/drums.ts): Echo Cavern's side tunnels, the Pebblors' funeral procession you tail
// through them, and the chamber at the end. The places, the route, who sees what, and the procession itself, all pure
// (no drawing, no DOM) so the tests can walk it.
//
// The side tunnels open off the middle of the Cavern (a shaft up from the path at column 26, row 7 of its route map):
// a lower run east (rows 5-6), a turn up (row 4), an upper run west (rows 2-3), each with a pillar to duck behind,
// and the chamber at the west end (columns 19-24). Being spotted drops you into a pocket of tunnel below (columns 1-10,
// rows 18-21, a separate bit of the map), whose far end climbs back up to the trail.
import { zoneById } from './data';
import type { SaveState } from './state';
import { T, type TileMap, type WorldObj } from './world';

type P = { x: number; y: number };

const C = zoneById('cave').x0;
const at = (x: number, y: number): P => ({ x: C + x, y });
const inBox = (p: P, x0: number, y0: number, x1: number, y1: number) => p.x >= C + x0 && p.x < C + x1 && p.y >= y0 && p.y < y1;

/** Can the story start: the Cavern's open (the Alpha Woolf beaten) and Poppy's home and braver for it. */
export const drumsOpen = (s: SaveState) => s.bosses.includes('alphawolf') && (s.stories.poppy ?? 0) >= 6;
/** Saved steps: 0 see Poppy enter · 1 catch her · 2 follow and talk at the chamber · 3 home · 4 done. */
export const drumsStep = (s: SaveState) => s.stories.drums ?? 0;
/** From the moment Granny's beside herself until Poppy's run home, she isn't in Sowerby. */
export const poppyAway = (s: SaveState) => drumsOpen(s) && drumsStep(s) < 3;

/** Out on the Cavern's path, at the foot of the shaft up into the tunnels. */
export const MOUTH = at(26.5, 8.9);
export const POPPY_START = at(25.4, 9.6);
export const CATCH_AT = at(26.5, 7.6);
/** Inside the side tunnels (the shaft and both runs), in the chamber, or down in the pocket below. */
export const inTunnels = (p: P) => inBox(p, 25, 2, 32, 7) || inBox(p, 26, 7, 27, 8.3) || inBox(p, 24, 1, 31, 2);
export const inChamber = (p: P) => inBox(p, 19, 2, 25, 7);
export const inPocket = (p: P) => inBox(p, 1, 18, 11, 22);
export const inSideArea = (p: P) => inTunnels(p) || inChamber(p) || inPocket(p);

/** The procession's way, for the lead pair: up the shaft, east along the lower run, up the turn, west along the upper run, into the chamber. */
export const ROUTE: P[] = [at(26.5, 8.9), at(26.5, 6.6), at(30.6, 6.6), at(30.6, 3.6), at(24.8, 3.6), at(22.4, 4.4)];
/** Where they're carrying it: the middle of the ring, before the new totem. */
export const LAY_AT = at(21.6, 3.9);
/** The ring: four spots around the totems, looking in. */
export const RING: P[] = [at(19.9, 5.1), at(21.0, 5.6), at(22.2, 5.6), at(23.3, 5.1)];
/** The totems: three old ones and the spot where the new one goes up (feet of each, in tiles). */
export const TOTEMS: P[] = [at(20.1, 3.6), at(23.1, 3.6), at(21.6, 4.9)];
export const NEW_TOTEM = at(21.6, 2.9);
/** Poppy's separate passage above the chamber. Two lattices keep the player out of the ritual. */
export const POPPY_AT = at(24.5, 1.5);
export const POPPY_PATH = [at(30.6, 3.6), at(30.6, 1.5), POPPY_AT];
export const BARRIERS: WorldObj[] = [
  { kind: 'prop', id: 'prop_echo_gate_side', zone: 'cave', x: C + 25, y: 3, w: 1, h: 1, label: '' },
  { kind: 'prop', id: 'prop_echo_gate', zone: 'cave', x: C + 24, y: 2, w: 1, h: 1, label: '' },
];
/** Where you land in the pocket below when the floor gives, and the rubble slope at its far end that climbs back up. */
export const LANDING = at(1.9, 18.7);
export const CLIMB = at(9.9, 18.6);

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const SEGS = ROUTE.slice(1).map((b, i) => ({ a: ROUTE[i], b, len: dist(ROUTE[i], b) }));
/** How far along the route each waypoint is (arc length, in tiles). */
const MARKS = SEGS.reduce((m, s) => [...m, m[m.length - 1] + s.len], [0]);
export const ROUTE_LEN = MARKS[MARKS.length - 1];

/** The point `s` tiles along the route (clamped to its ends), and the way it's heading there. */
export function along(s: number): P & { dir: number } {
  const k = Math.max(0, Math.min(ROUTE_LEN, s));
  const i = Math.max(0, MARKS.findIndex((m, j) => j > 0 && k <= m) - 1);
  const g = SEGS[Math.min(i, SEGS.length - 1)], f = g.len ? (k - MARKS[i]) / g.len : 0;
  return { x: g.a.x + (g.b.x - g.a.x) * f, y: g.a.y + (g.b.y - g.a.y) * f, dir: Math.atan2(g.b.y - g.a.y, g.b.x - g.a.x) };
}

/** How far along the route the nearest point to `p` is, and how far off it `p` stands. */
export function progress(p: P): { s: number; off: number } {
  let best = { s: 0, off: Infinity };
  SEGS.forEach((g, i) => {
    const dx = g.b.x - g.a.x, dy = g.b.y - g.a.y;
    const f = Math.max(0, Math.min(1, ((p.x - g.a.x) * dx + (p.y - g.a.y) * dy) / (g.len * g.len)));
    const off = Math.hypot(g.a.x + dx * f - p.x, g.a.y + dy * f - p.y);
    if (off < best.off) best = { s: MARKS[i] + f * g.len, off };
  });
  return best;
}

/**
 * The bends (where you climb back up to after a fall): the top of the shaft, the lower run's east end and the top of
 * the turn. You rejoin at the last one behind the procession, and they wait for you there.
 */
export const BENDS = [MARKS[1], MARKS[2], MARKS[3]];
export function rejoinAt(rearS: number): P {
  const b = [...BENDS].reverse().find((m) => m <= rearS - 1.5) ?? BENDS[0];
  return along(b);
}

/**
 * Where the procession stops for its rear Pebblor to look back (the lead pair's distance along the route): halfway up
 * the turn (it looks back down the lower run: duck behind its pillar, or back down the shaft), at the top of the turn
 * (it looks down it: stay round the corner), and at the chamber's door (it looks back along the upper run: tuck in
 * behind that run's pillar, or back down the turn).
 */
export const LOOKS = [MARKS[2] + 1.6, MARKS[3] + 1.8, MARKS[4] + 0.4];

/** Places in the formation: the lead pair side by side with the figure between them, then two more in single file. */
export const FORMATION = [{ back: 0, side: -0.32 }, { back: 0, side: 0.32 }, { back: 1.0, side: 0 }, { back: 1.95, side: 0 }];
export const REAR = FORMATION.length - 1;

/** How the procession walks, waits and looks back (seconds, tiles). */
export const PACE = {
  /** Tiles a second: slow, so tailing them is stop-and-creep (you run at 5). */
  speed: 1.8,
  /** A heavy footfall this often while they walk (the echo you follow), and a single stamp this often while they wait. */
  step: 0.65, waitStep: 1.8,
  /** Fall this far behind them along the way (or wander off it this far) and they stop to wait for you. */
  lag: 6,
  /** The warning (it turns, a "?", its gaze on the floor), then the look itself. */
  warn: 1.0, look: 1.6,
};

/** What the rear Pebblor's eye beam reaches when it looks back. */
export const SIGHT = { half: (40 * Math.PI) / 180, range: 6 };

/** Is there nothing solid between two points (rocks, pillars and tunnel walls block the view)? */
export function clearLine(world: TileMap, a: P, b: P): boolean {
  const objs = sightObjects(world, a, b);
  const n = Math.ceil(dist(a, b) / 0.04);
  for (let i = 1; i < n; i++) {
    const x = a.x + ((b.x - a.x) * i) / n, y = a.y + ((b.y - a.y) * i) / n;
    if (sightBlocked(world, objs, x, y)) return false;
  }
  return true;
}

// Restrict prop checks to the ray's bounds instead of scanning the whole world at every sample.
const sightObjects = (world: TileMap, a: P, b: P) => world.objs.filter((o) => !o.hidden && !o.walkable
  && o.x <= Math.max(a.x, b.x) && o.x + o.w >= Math.min(a.x, b.x)
  && o.y <= Math.max(a.y, b.y) && o.y + o.h >= Math.min(a.y, b.y));
const sightBlocked = (world: TileMap, objs: WorldObj[], x: number, y: number) => {
  const tile = world.tile(Math.floor(x), Math.floor(y));
  return tile === T.OBST || tile === T.POOL || objs.some((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
};

/** The same ray stops both the eye beam and sight detection at solid geometry. */
export function beamEnd(world: TileMap, eye: P, facing: number, range = SIGHT.range): P {
  const dx = Math.cos(facing), dy = Math.sin(facing);
  const objs = sightObjects(world, eye, { x: eye.x + dx * range, y: eye.y + dy * range });
  let d = 0;
  for (let next = 0.04; next <= range + 1e-6; next += 0.04) {
    if (sightBlocked(world, objs, eye.x + dx * next, eye.y + dy * next)) break;
    d = next;
  }
  return { x: eye.x + dx * d, y: eye.y + dy * d };
}

/** Would a Pebblor at `eye`, looking toward `facing`, see you at `you`? (Eyes and you both about chest height.) */
export function sees(world: TileMap, eye: P, facing: number, you: P): boolean {
  const d = dist(eye, you);
  if (!clearLine(world, { x: eye.x, y: eye.y - 0.3 }, { x: you.x, y: you.y - 0.3 })) return false;
  if (d > SIGHT.range) return false;
  const off = Math.abs(((Math.atan2(you.y - eye.y, you.x - eye.x) - facing + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  return off <= SIGHT.half;
}

export type Phase = 'walk' | 'wait' | 'warn' | 'look' | 'turn' | 'arrived';
export interface Member { x: number; y: number; face: number }

/** What happened this tick, for the story to show and play. */
export type ProcessionEvent = 'step' | 'warn' | 'look' | 'spotted' | 'arrived';

/** The procession: the lead pair's distance along the route, and what they're doing. */
export class Procession {
  s: number;
  phase: Phase = 'walk';
  /** Seconds into the phase, and until the next footfall. */
  t = 0;
  private stepT = 0;
  /** Look-backs done (each happens once, at its spot). */
  looks = 0;
  /** Where the rear one is looking while it looks back. */
  gaze = 0;

  constructor(s = 0) {
    this.s = s;
    this.looks = LOOKS.filter((l) => l < s).length;
  }

  /** Each Pebblor's place on the way, in formation (the rear one turns round to look back). */
  members(): Member[] {
    return FORMATION.map((f, i) => {
      const p = along(this.s - f.back);
      const face = i === REAR && (this.phase === 'warn' || this.phase === 'look') ? this.gaze : p.dir;
      return { x: p.x - Math.sin(p.dir) * f.side, y: p.y + Math.cos(p.dir) * f.side, face };
    });
  }

  get rear(): Member {
    return this.members()[REAR];
  }

  /** Far behind them (or off the way), so they wait for you. Ahead of them never counts. */
  lagging(you: P): boolean {
    const rearS = this.s - FORMATION[REAR].back, me = progress(you);
    if (inChamber(you)) return false;
    if (me.off > 2.5) return dist(you, this.rear) > PACE.lag;
    return rearS - me.s > PACE.lag;
  }

  /**
   * Moves the procession on by `dt` seconds with you at `you`. `intro` is the opening scene: they just walk, nobody
   * looks back. Returns what happened, for sounds and pictures.
   */
  update(dt: number, you: P, world: TileMap, intro = false): ProcessionEvent[] {
    const ev: ProcessionEvent[] = [];
    this.t += dt;
    this.stepT -= dt;
    if (this.phase === 'arrived') return ev;
    if (this.phase === 'walk' || this.phase === 'wait') {
      const wait = !intro && this.lagging(you);
      if (wait !== (this.phase === 'wait')) {
        this.phase = wait ? 'wait' : 'walk';
        this.t = 0;
      }
      if (this.stepT <= 0) {
        this.stepT = wait ? PACE.waitStep : PACE.step;
        ev.push('step');
      }
      if (wait) return ev;
      const next = LOOKS[this.looks];
      if (!intro && next !== undefined && this.s + PACE.speed * dt >= next) {
        this.s = next;
        this.looks++;
        this.phase = 'warn';
        this.t = 0;
        // It looks back the way they came: toward a point a little behind it on the route.
        const r = this.rear, back = along(this.s - FORMATION[REAR].back - 1.6);
        this.gaze = Math.atan2(back.y - r.y, back.x - r.x);
        ev.push('warn');
        return ev;
      }
      this.s += PACE.speed * dt;
      if (this.s >= ROUTE_LEN) {
        this.s = ROUTE_LEN;
        this.phase = 'arrived';
        ev.push('arrived');
      }
      return ev;
    }
    if (this.phase === 'warn' && this.t >= PACE.warn) {
      this.phase = 'look';
      this.t = 0;
      ev.push('look');
    }
    if (this.phase === 'look') {
      if (sees(world, this.rear, this.gaze, you)) {
        this.phase = 'turn';
        this.t = 0;
        ev.push('spotted');
      } else if (this.t >= PACE.look) {
        this.phase = 'turn';
        this.t = 0;
      }
    }
    // A moment to turn back round before they move on.
    if (this.phase === 'turn' && this.t >= 0.35) {
      this.phase = 'walk';
      this.t = 0;
    }
    return ev;
  }
}
