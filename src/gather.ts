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

/** How a node's minigame looks: a timing bar for trees, a rock face with a seam to line your pick up with for rocks. */
export type Look = { kind: 'wood' } | { kind: 'mine'; rock: string; dark: string; fleck: string };

const WORDS: Record<Look['kind'], Record<Strike, string>> = {
  wood: { perfect: 'Perfect!', hit: 'Nice!', miss: 'Miss' },
  mine: { perfect: 'Crack!', hit: 'Chip!', miss: 'Clang!' },
};

/** The minigame panel, in screen space near the top of the screen. */
export function drawChop(ctx: CanvasRenderingContext2D, c: Chop, vw: number, vh: number, title: string, hint: string, look: Look = { kind: 'wood' }) {
  const w = Math.min(vw - 48, 380), h = look.kind === 'mine' ? 46 : 30;
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
  const mx = x + c.pos * w;
  if (look.kind === 'mine') drawRockFace(ctx, c, x, y, w, h, look);
  else {
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
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#5a3a6a';
    ctx.lineWidth = 3;
    rrect(ctx, mx - 5, y - 6, 10, h + 12, 5);
    ctx.fill();
    ctx.stroke();
  }
  // Progress
  const py = y + h + 16;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rrect(ctx, x, py, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = look.kind === 'mine' ? look.fleck : '#ffb03a';
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
    ctx.fillText(WORDS[look.kind][c.last], mx, y - 60 - k * 18);
  }
  ctx.restore();
}

/**
 * Mining: a slab of the rock with a glowing seam running through it (the sweet spot, brightest down the middle).
 * A pickaxe slides along the top; strike when it's over the seam. Cracks spread across the face as it breaks.
 */
function drawRockFace(ctx: CanvasRenderingContext2D, c: Chop, x: number, y: number, w: number, h: number, look: Extract<Look, { kind: 'mine' }>) {
  // The slab, with a lighter top edge and a few flecks of ore.
  ctx.fillStyle = look.dark;
  rrect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = look.rock;
  rrect(ctx, x, y, w, h - 5, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rrect(ctx, x + 6, y + 3, w - 12, 6, 3);
  ctx.fill();
  const hash = (i: number) => (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
  ctx.fillStyle = look.fleck;
  for (let i = 0; i < 18; i++) {
    const fx = x + 10 + Math.abs(hash(i)) * (w - 20), fy = y + 10 + Math.abs(hash(i + 50)) * (h - 20);
    ctx.beginPath();
    ctx.arc(fx, fy, 1.6 + Math.abs(hash(i + 90)) * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Damage so far: cracks spreading out from the middle.
  const cracks = Math.floor(Math.min(1, c.dealt / c.hp) * 7);
  ctx.strokeStyle = 'rgba(30,20,30,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < cracks; i++) {
    let cx = x + w * (0.15 + Math.abs(hash(i + 7)) * 0.7), cy = y + h * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 4; k++) {
      cx += (hash(i * 5 + k) * 2 - 1) * 14;
      cy += (hash(i * 7 + k + 3) > 0 ? 1 : -1) * (h * 0.12);
      ctx.lineTo(cx, Math.max(y + 3, Math.min(y + h - 6, cy)));
    }
    ctx.stroke();
  }
  // The seam: a jagged glowing crack top to bottom, as wide as the sweet spot, brightest down its core.
  const sx = x + c.center * w, half = (c.width * w) / 2, dim = c.lock > 0 && c.last === 'miss';
  const seam = (width: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    const steps = 5;
    for (let i = 0; i <= steps; i++) ctx.lineTo(sx - width + (i % 2 ? 3 : -3), y + 2 + (i / steps) * (h - 8));
    for (let i = steps; i >= 0; i--) ctx.lineTo(sx + width + (i % 2 ? 3 : -3), y + 2 + (i / steps) * (h - 8));
    ctx.closePath();
    ctx.fill();
  };
  seam(half, dim ? 'rgba(255,210,120,0.25)' : 'rgba(255,210,120,0.6)');
  seam(half * PERFECT_CORE, dim ? 'rgba(255,245,200,0.4)' : '#fff6c8');
  // The pickaxe riding along the top edge, pointing down at the rock (it dips when you strike).
  const mx = x + c.pos * w;
  const dip = c.last && c.lastT < 0.12 ? (1 - c.lastT / 0.12) * 10 : 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(mx, y - 2);
  ctx.lineTo(mx, y + h - 4);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.translate(mx, y - 8 + dip);
  // Handle
  ctx.strokeStyle = '#8a5a3a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(10, -22);
  ctx.lineTo(0, -2);
  ctx.stroke();
  // Head: a curved bar with a point aimed at the rock.
  ctx.strokeStyle = '#d8dde8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.quadraticCurveTo(0, -1, 12, 6);
  ctx.stroke();
  ctx.fillStyle = '#d8dde8';
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.lineTo(0, 8);
  ctx.lineTo(3, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
