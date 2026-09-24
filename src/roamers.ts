// Monsters you can see: they wander the tall grass, notice you when you get close, and chase you a little.
// Bumping into one starts a fight on the spot; hitting one before it notices you is a surprise attack.
import { ZONES, type MonsterKind, type Zone, type ZoneId } from './data';
import { weightedPick, type Rng } from './rules';
import { T, type World } from './world';

/** How many monsters roam each zone's grass at once. */
export const ROAMERS_PER_ZONE = 6;
/** Tiles per second. You walk at 5, so you can always outrun them. */
const WANDER_SPEED = 1.1;
const CHASE_SPEED = 3.3;
/** How close you get before one notices you, and how far it follows before giving up. */
export const NOTICE_DIST = 2.6;
const GIVE_UP_DIST = 6;
const LEASH = 5;
/** Touching distance (tiles) that starts a fight. */
export const CATCH_DIST = 0.6;
/** New monsters only appear this far from you, so nothing pops in on screen. */
const SPAWN_MIN_DIST = 8;

export interface Roamer {
  id: number;
  zone: ZoneId;
  kind: MonsterKind;
  lv: number;
  golden: boolean;
  /** Friends hiding nearby who join the fight. */
  extra: number;
  x: number;
  y: number;
  hx: number;
  hy: number;
  tx: number;
  ty: number;
  state: 'idle' | 'wander' | 'notice' | 'chase' | 'return';
  t: number;
  face: number;
  moving: boolean;
  seed: number;
}

export class Roamers {
  list: Roamer[] = [];
  /** Seconds during which nothing notices you (after a fight, a warp…). */
  calm = 3;
  private nextId = 1;
  private grass = new Map<ZoneId, { x: number; y: number }[]>();
  private respawn = 0;

  constructor(private world: World, private rng: Rng = Math.random) {
    for (const z of ZONES) {
      if (!z.monsters.length) continue;
      const tiles: { x: number; y: number }[] = [];
      for (let y = 0; y < world.h; y++)
        for (let x = z.x0; x < z.x0 + z.w; x++) if (world.tile(x, y) === T.GRASS) tiles.push({ x, y });
      this.grass.set(z.id, tiles);
    }
  }

  /** Fills every zone up to its count (at the start, or after loading). */
  populate(px: number, py: number, firstFight: boolean) {
    for (const z of ZONES) while (z.monsters.length && this.inZone(z.id) < ROAMERS_PER_ZONE && this.spawn(z, px, py, firstFight, 5));
  }

  private inZone(id: ZoneId) {
    return this.list.filter((r) => r.zone === id).length;
  }

  private spawn(z: Zone, px: number, py: number, firstFight: boolean, minDist = SPAWN_MIN_DIST): boolean {
    const tiles = this.grass.get(z.id);
    if (!tiles?.length) return false;
    for (let i = 0; i < 20; i++) {
      const g = tiles[Math.floor(this.rng() * tiles.length)];
      const x = g.x + 0.5, y = g.y + 0.8;
      if (Math.hypot(x - px, y - py) < minDist || this.list.some((r) => Math.hypot(r.x - x, r.y - y) < 3)) continue;
      const r = this.rng();
      const size = firstFight ? 1 : Math.min(z.maxEnemies, r < 0.5 ? 1 : r < 0.85 ? 2 : 3);
      this.list.push({
        id: this.nextId++, zone: z.id, kind: weightedPick(z.monsters, this.rng).kind,
        lv: z.lv[0] + Math.floor(this.rng() * (z.lv[1] - z.lv[0] + 1)), golden: this.rng() < 0.04, extra: size - 1,
        x, y, hx: x, hy: y, tx: x, ty: y, state: 'idle', t: this.rng() * 2, face: 1, moving: false, seed: this.rng() * 10,
      });
      return true;
    }
    return false;
  }

  remove(r: Roamer) {
    this.list = this.list.filter((o) => o !== r);
  }

  /** The closest monster that hasn't noticed you yet, within reach for a surprise attack. */
  unaware(px: number, py: number, reach = 1.5): Roamer | null {
    let best: Roamer | null = null, bd = reach;
    for (const r of this.list) {
      if (r.state === 'notice' || r.state === 'chase') continue;
      const d = Math.hypot(r.x - px, r.y - py);
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }

  nearestIn(zone: ZoneId, px: number, py: number): Roamer | null {
    let best: Roamer | null = null, bd = Infinity;
    for (const r of this.list) {
      if (r.zone !== zone) continue;
      const d = Math.hypot(r.x - px, r.y - py);
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }

  /** Moves everyone; returns the monster that caught you, if any. */
  update(dt: number, px: number, py: number, firstFight: boolean): Roamer | null {
    this.calm = Math.max(0, this.calm - dt);
    this.respawn -= dt;
    if (this.respawn <= 0) {
      this.respawn = 4;
      for (const z of ZONES) if (z.monsters.length && this.inZone(z.id) < ROAMERS_PER_ZONE) this.spawn(z, px, py, firstFight);
    }
    let caught: Roamer | null = null;
    for (const r of this.list) {
      // Only monsters near you are worth simulating.
      if (Math.abs(r.x - px) > 16) continue;
      r.t -= dt;
      const d = Math.hypot(px - r.x, py - r.y);
      const home = Math.hypot(r.x - r.hx, r.y - r.hy);
      if (this.calm <= 0 && d < NOTICE_DIST && (r.state === 'idle' || r.state === 'wander')) {
        r.state = 'notice';
        r.t = 0.45;
      }
      r.moving = false;
      switch (r.state) {
        case 'idle':
          if (r.t <= 0) {
            // Wander to another grass tile near home.
            const tx = r.hx + (this.rng() - 0.5) * 6, ty = r.hy + (this.rng() - 0.5) * 6;
            if (this.world.tile(Math.floor(tx), Math.floor(ty - 0.3)) === T.GRASS) {
              r.tx = tx;
              r.ty = ty;
              r.state = 'wander';
              r.t = 4;
            } else r.t = 0.3;
          }
          break;
        case 'wander':
          if (!this.step(r, r.tx, r.ty, WANDER_SPEED * dt, true) || r.t <= 0 || Math.hypot(r.tx - r.x, r.ty - r.y) < 0.1) {
            r.state = 'idle';
            r.t = 0.8 + this.rng() * 2;
          }
          break;
        case 'notice':
          r.face = Math.sign(px - r.x) || r.face;
          if (r.t <= 0) r.state = 'chase';
          break;
        case 'chase':
          if (d > GIVE_UP_DIST || home > LEASH || this.calm > 0) r.state = 'return';
          else this.step(r, px, py, CHASE_SPEED * dt, false);
          break;
        case 'return':
          if (!this.step(r, r.hx, r.hy, WANDER_SPEED * 1.5 * dt, false) || home < 0.2) {
            r.state = 'idle';
            r.t = 1;
          }
          break;
      }
      if (!caught && this.calm <= 0 && d < CATCH_DIST) caught = r;
    }
    return caught;
  }

  /** Walks toward a point; wandering stays in the grass. Returns false when blocked. */
  private step(r: Roamer, tx: number, ty: number, dist: number, grassOnly: boolean): boolean {
    const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
    if (d < 1e-3) return true;
    const s = Math.min(d, dist);
    const nx = r.x + (dx / d) * s, ny = r.y + (dy / d) * s;
    const ok = (x: number, y: number) => !this.world.blocked(x, y, 0.25) && (!grassOnly || this.world.tile(Math.floor(x), Math.floor(y - 0.1)) === T.GRASS);
    let moved = false;
    if (ok(nx, r.y)) { r.x = nx; moved = true; }
    if (ok(r.x, ny)) { r.y = ny; moved = true; }
    if (Math.abs(dx) > 0.05) r.face = Math.sign(dx);
    r.moving = moved;
    return moved;
  }
}
