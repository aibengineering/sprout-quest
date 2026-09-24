// Chopping minigame: a marker sweeps along a bar; strike while it's inside the sweet spot.
// Clean hits build a streak that speeds the marker up and hits harder. A miss never fails the tree; it resets the
// streak and speed, so sloppy chopping is just slower.
import type { Rng } from './rules';
import { rrect } from './sprites';

export type Strike = 'perfect' | 'hit' | 'miss';

/** Bar sweeps per second at the start of a chop (and after every miss). */
export const BASE_SPEED = 0.85;
const SPEED_UP = 1.14;
const MAX_SPEED = 2.2;
/** Share of the sweet spot, around its center, that counts as perfect. */
const PERFECT_CORE = 0.36;
const MISS_DAMAGE = 0.35;
/** Seconds you can't strike after a miss, so mashing is slower than timing. */
const MISS_LOCK = 0.45;
const HIT_LOCK = 0.1;

export class Chop {
  /** Marker position along the bar, 0–1. */
  pos = 0;
  private dir = 1;
  speed = BASE_SPEED;
  streak = 0;
  misses = 0;
  dealt = 0;
  lock = 0;
  /** Sweet spot center, 0–1. */
  center = 0.5;
  /** Last strike, for feedback, and how long ago it happened. */
  last: Strike | null = null;
  lastT = 0;

  constructor(
    readonly hp: number,
    readonly power: number,
    readonly width: number,
    private rng: Rng = Math.random,
  ) {
    this.moveSpot();
  }

  get done() {
    return this.dealt >= this.hp;
  }

  get flawless() {
    return this.misses === 0;
  }

  update(dt: number) {
    this.lastT += dt;
    if (this.done) return;
    this.lock = Math.max(0, this.lock - dt);
    this.pos += this.dir * this.speed * dt;
    if (this.pos >= 1) { this.pos = 2 - this.pos; this.dir = -1; }
    if (this.pos <= 0) { this.pos = -this.pos; this.dir = 1; }
  }

  /** Returns null while locked out (just missed) or once the tree is down. */
  strike(): Strike | null {
    if (this.done || this.lock > 0) return null;
    const off = Math.abs(this.pos - this.center);
    let r: Strike;
    if (off <= this.width / 2) {
      r = off <= (this.width * PERFECT_CORE) / 2 ? 'perfect' : 'hit';
      this.dealt += this.power * (1 + 0.25 * this.streak) * (r === 'perfect' ? 1.5 : 1);
      this.streak++;
      this.speed = Math.min(MAX_SPEED, this.speed * SPEED_UP);
      this.lock = HIT_LOCK;
    } else {
      r = 'miss';
      this.dealt += this.power * MISS_DAMAGE;
      this.misses++;
      this.streak = 0;
      this.speed = BASE_SPEED;
      this.lock = MISS_LOCK;
    }
    this.last = r;
    this.lastT = 0;
    if (!this.done) this.moveSpot();
    return r;
  }

  /** New sweet spot somewhere else on the bar, never right under the marker. */
  private moveSpot() {
    const lo = this.width / 2 + 0.04, hi = 1 - this.width / 2 - 0.04;
    for (let i = 0; i < 8; i++) {
      this.center = lo + this.rng() * (hi - lo);
      if (Math.abs(this.center - this.pos) > 0.25) return;
    }
  }
}

const FONT = 'ui-rounded, "Nunito", system-ui, sans-serif';

/** The minigame panel, in screen space near the top of the screen. */
export function drawChop(ctx: CanvasRenderingContext2D, c: Chop, vw: number, vh: number, title: string, hint: string) {
  const w = Math.min(vw - 48, 380), h = 30;
  const x = (vw - w) / 2, y = Math.max(120, vh * 0.2);
  ctx.save();
  // Card
  ctx.fillStyle = 'rgba(42,26,48,0.82)';
  rrect(ctx, x - 16, y - 46, w + 32, h + 100, 20);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = `900 18px ${FONT}`;
  ctx.fillText(title, vw / 2, y - 24);
  if (c.streak > 1) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd35a';
    ctx.fillText(`🔥 ×${c.streak}`, x + w, y - 24);
    ctx.textAlign = 'center';
  }
  // Track
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rrect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  // Sweet spot and its perfect core
  const sx = x + (c.center - c.width / 2) * w, sw = c.width * w;
  ctx.fillStyle = c.lock > 0 && c.last === 'miss' ? 'rgba(126,224,122,0.35)' : '#7ee07a';
  rrect(ctx, sx, y + 3, sw, h - 6, 8);
  ctx.fill();
  const cw = sw * PERFECT_CORE;
  ctx.fillStyle = '#d8ffc8';
  rrect(ctx, x + c.center * w - cw / 2, y + 3, cw, h - 6, 6);
  ctx.fill();
  // Marker
  const mx = x + c.pos * w;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#5a3a6a';
  ctx.lineWidth = 3;
  rrect(ctx, mx - 5, y - 6, 10, h + 12, 5);
  ctx.fill();
  ctx.stroke();
  // Progress
  const py = y + h + 16;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rrect(ctx, x, py, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#ffb03a';
  rrect(ctx, x, py, Math.max(10, Math.min(1, c.dealt / c.hp) * w), 10, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `800 13px ${FONT}`;
  ctx.fillText(hint, vw / 2, py + 26);
  // Strike feedback pops above the bar.
  if (c.last && c.lastT < 0.6) {
    const k = c.lastT / 0.6;
    ctx.globalAlpha = 1 - k;
    ctx.font = `900 ${22 + (c.last === 'perfect' ? 6 : 0)}px ${FONT}`;
    ctx.fillStyle = c.last === 'perfect' ? '#ffd35a' : c.last === 'hit' ? '#9af0a0' : '#ff8a8a';
    ctx.fillText(c.last === 'perfect' ? 'Perfect!' : c.last === 'hit' ? 'Nice!' : 'Miss', mx, y - 60 - k * 18);
  }
  ctx.restore();
}
