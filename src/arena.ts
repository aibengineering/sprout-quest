// Where a battle happens. Units are "arena units" centered on the battle's origin.
// Regular fights happen on the map itself (TileArena: the walkable ground around you, bounded by real trees, water and
// the edge of the clearing); bosses and scripted fights use the classic stone ring (RingArena).
import { T, type World } from './world';

/** Arena units per map tile (keeps the hero the same size relative to the scenery as on the overworld). */
export const TILE_UNITS = 46;

export interface Move { x: number; y: number; hitX: boolean; hitY: boolean }

export interface Arena {
  readonly kind: 'ring' | 'tiles';
  /** Whether a point is open ground inside the arena. */
  inside(x: number, y: number): boolean;
  /** Moves a body of feet-radius `r`, sliding along walls. */
  move(x: number, y: number, dx: number, dy: number, r: number): Move;
  /** The closest open spot to (x, y), for teleports, hops and summons. */
  nearestFree(x: number, y: number, r: number): { x: number; y: number };
  /** Camera limits (arena units). */
  readonly bounds: { x0: number; y0: number; x1: number; y1: number };
}

export class RingArena implements Arena {
  readonly kind = 'ring';
  readonly bounds;
  constructor(readonly R: number) {
    this.bounds = { x0: -R, y0: -R, x1: R, y1: R };
  }

  inside(x: number, y: number) {
    return Math.hypot(x, y) <= this.R;
  }

  move(x: number, y: number, dx: number, dy: number, r: number): Move {
    let nx = x + dx, ny = y + dy;
    const d = Math.hypot(nx, ny), max = this.R - r;
    if (d <= max) return { x: nx, y: ny, hitX: false, hitY: false };
    nx *= max / d;
    ny *= max / d;
    // Report which way the wall pushed back, so charges can bounce.
    return { x: nx, y: ny, hitX: Math.abs(nx) > Math.abs(ny), hitY: Math.abs(ny) >= Math.abs(nx) };
  }

  nearestFree(x: number, y: number, r: number) {
    const d = Math.hypot(x, y), max = this.R - r - 10;
    return d <= max ? { x, y } : { x: (x * max) / d, y: (y * max) / d };
  }
}

export class TileArena implements Arena {
  readonly kind = 'tiles';
  readonly bounds;
  /** Walkable tiles, indexed [(ty - ty0) * w + (tx - tx0)]. */
  private open: Uint8Array;
  private tx0: number;
  private ty0: number;
  private w: number;
  private h: number;
  /** Number of open tiles (too few and the fight falls back to the ring). */
  readonly size: number;

  /**
   * Flood-fills the open ground reachable from (cx, cy) (map tiles) within `radius` tiles. Tall grass, path and
   * ground are open; obstacles, water and solid objects are walls.
   */
  constructor(private world: World, readonly cx: number, readonly cy: number, radius: number) {
    this.tx0 = Math.floor(cx - radius) - 1;
    this.ty0 = Math.floor(cy - radius) - 1;
    this.w = Math.ceil(radius * 2) + 3;
    this.h = this.w;
    this.open = new Uint8Array(this.w * this.h);
    const solid = (tx: number, ty: number) => {
      const t = world.tile(tx, ty);
      if (t === T.OBST || t === T.POOL) return true;
      return world.objs.some((o) => !o.hidden && o.kind !== 'foe' && tx + 0.5 >= o.x && tx + 0.5 < o.x + o.w && ty + 0.5 >= o.y && ty + 0.5 < o.y + o.h);
    };
    const start = [Math.floor(cx), Math.floor(cy)];
    const q = [start];
    let size = 0;
    const mark = (tx: number, ty: number) => {
      const i = (ty - this.ty0) * this.w + (tx - this.tx0);
      if (tx < this.tx0 || ty < this.ty0 || tx >= this.tx0 + this.w || ty >= this.ty0 + this.h || this.open[i]) return false;
      if (Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) > radius || solid(tx, ty)) return false;
      this.open[i] = 1;
      size++;
      return true;
    };
    if (mark(start[0], start[1])) {
      while (q.length) {
        const [x, y] = q.pop()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (mark(x + dx, y + dy)) q.push([x + dx, y + dy]);
      }
    }
    this.size = size;
    const U = TILE_UNITS;
    this.bounds = { x0: (this.tx0 - cx) * U, y0: (this.ty0 - cy) * U, x1: (this.tx0 + this.w - cx) * U, y1: (this.ty0 + this.h - cy) * U };
  }

  /** Arena units → map tiles. */
  toTile(x: number, y: number) {
    return { x: this.cx + x / TILE_UNITS, y: this.cy + y / TILE_UNITS };
  }

  /** Map tiles → arena units. */
  fromTile(tx: number, ty: number) {
    return { x: (tx - this.cx) * TILE_UNITS, y: (ty - this.cy) * TILE_UNITS };
  }

  openTile(tx: number, ty: number): boolean {
    if (tx < this.tx0 || ty < this.ty0 || tx >= this.tx0 + this.w || ty >= this.ty0 + this.h) return false;
    return this.open[(ty - this.ty0) * this.w + (tx - this.tx0)] === 1;
  }

  inside(x: number, y: number) {
    const t = this.toTile(x, y);
    return this.openTile(Math.floor(t.x), Math.floor(t.y));
  }

  /** A feet box of half-width r is clear. */
  private clear(x: number, y: number, r: number) {
    return this.inside(x - r, y - r) && this.inside(x + r, y - r) && this.inside(x - r, y + r) && this.inside(x + r, y + r);
  }

  move(x: number, y: number, dx: number, dy: number, r: number): Move {
    // Big steps (charges, knockback) are split so nothing tunnels through a one-tile tree.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (TILE_UNITS * 0.4)));
    let hitX = false, hitY = false;
    for (let i = 0; i < steps; i++) {
      const sx = dx / steps, sy = dy / steps;
      if (this.clear(x + sx, y, r)) x += sx;
      else hitX = true;
      if (this.clear(x, y + sy, r)) y += sy;
      else hitY = true;
    }
    return { x, y, hitX, hitY };
  }

  nearestFree(x: number, y: number, r: number) {
    if (this.clear(x, y, r)) return { x, y };
    let best = { x: 0, y: 0 }, bd = Infinity;
    for (let ty = this.ty0; ty < this.ty0 + this.h; ty++)
      for (let tx = this.tx0; tx < this.tx0 + this.w; tx++) {
        if (!this.openTile(tx, ty)) continue;
        const p = this.fromTile(tx + 0.5, ty + 0.5);
        if (!this.clear(p.x, p.y, r)) continue;
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
    return best;
  }

  /** Open tiles, for spawning. */
  openTiles(): { tx: number; ty: number }[] {
    const out: { tx: number; ty: number }[] = [];
    for (let ty = this.ty0; ty < this.ty0 + this.h; ty++)
      for (let tx = this.tx0; tx < this.tx0 + this.w; tx++) if (this.openTile(tx, ty)) out.push({ tx, ty });
    return out;
  }

  /** Tiles just outside the open ground (for drawing the edge of the fight). */
  forEachTile(fn: (tx: number, ty: number, open: boolean) => void) {
    for (let ty = this.ty0 - 3; ty < this.ty0 + this.h + 3; ty++)
      for (let tx = this.tx0 - 3; tx < this.tx0 + this.w + 3; tx++) fn(tx, ty, this.openTile(tx, ty));
  }

  isGrass(x: number, y: number) {
    const t = this.toTile(x, y);
    return this.world.tile(Math.floor(t.x), Math.floor(t.y)) === T.GRASS;
  }
}
