// The battle arena: an oval clearing centered at (0, 0), in arena units. Taller than it is wide so it fills a phone
// held upright.
export const ARENA_RX = 205;
export const ARENA_RY = 280;

export interface Move { x: number; y: number; hitX: boolean; hitY: boolean }

export class OvalArena {
  constructor(readonly rx: number, readonly ry: number) {}

  /** How far out a point is: 1 on the edge (of an oval shrunk by `pad`). */
  private k(x: number, y: number, pad = 0) {
    return Math.hypot(x / (this.rx - pad), y / (this.ry - pad));
  }

  /** Whether a point is inside, allowing `margin` beyond the edge. */
  inside(x: number, y: number, margin = 0) {
    return this.k(x, y, -margin) <= 1;
  }

  /** Moves a body of radius r, stopping it at the edge. */
  move(x: number, y: number, dx: number, dy: number, r: number): Move {
    const nx = x + dx, ny = y + dy, k = this.k(nx, ny, r);
    if (k <= 1) return { x: nx, y: ny, hitX: false, hitY: false };
    return { x: nx / k, y: ny / k, hitX: true, hitY: true };
  }

  /** The closest spot inside (for teleports, hops and summons). */
  nearestFree(x: number, y: number, r: number) {
    const k = this.k(x, y, r + 10);
    return k <= 1 ? { x, y } : { x: x / k, y: y / k };
  }

  /** Outward normal of the edge nearest a point (for bouncing charges). */
  normal(x: number, y: number) {
    const gx = x / (this.rx * this.rx), gy = y / (this.ry * this.ry), d = Math.hypot(gx, gy) || 1;
    return { x: gx / d, y: gy / d };
  }
}
