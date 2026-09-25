// Gathering minigame: a marker sweeps along a bar; strike while it's inside the sweet spot (the green zone for trees,
// the glowing seam for rocks). Clean hits build a streak that speeds the marker up and hits harder. A miss never fails
// the node; it resets the streak and speed, so sloppy chopping or mining is just slower.
// GatherView draws it: the tree or rock above the bar takes a cut or a crack sized to each strike, the tool swings,
// chips fly, and when it's done the tree topples or the rock splits.
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
  /** Where along the bar (0–1) the last strike landed, and how much it dealt. */
  hitPos = 0;
  lastAmount = 0;

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
    const before = this.dealt;
    this.hitPos = this.pos;
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
    this.lastAmount = this.dealt - before;
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
const TAU = Math.PI * 2;
/** Seconds for the tool's swing, and for the tree to topple or the rock to split once it's done. */
const SWING_T = 0.24;
export const OUTRO_T = 0.9;

/** How a node's minigame looks: a tree over a timing bar, or a rock over a rock face with a seam to line your pick up with. */
export type Look = { kind: 'wood'; pine: boolean } | { kind: 'mine'; rock: string; dark: string; fleck: string };

const WORDS: Record<Look['kind'], Record<Strike, string>> = {
  wood: { perfect: 'Perfect!', hit: 'Nice!', miss: 'Miss' },
  mine: { perfect: 'Crack!', hit: 'Chip!', miss: 'Clang!' },
};

/** One strike's mark on the tree or rock: where it landed along the bar, how much it did, and a seed for its shape. */
interface Mark { at: number; amount: number; kind: Strike; seed: number }
interface Bit { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; star: boolean }

/** Small deterministic noise in [-1, 1] for crack and bark shapes. */
const jit = (seed: number, i: number) => Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453 % 1;

export class GatherView {
  private marks: Mark[] = [];
  private bits: Bit[] = [];
  /** 0 → 1 over a swing (1 = at rest). */
  private swing = 1;
  private wobble = 0;
  private shake = 0;
  private prevT = Infinity;
  /** Seconds since the node gave way. */
  outro = 0;

  constructor(readonly look: Look) {}

  update(dt: number, c: Chop) {
    if (c.last && c.lastT < this.prevT) this.onStrike(c);
    this.prevT = c.lastT;
    this.swing = Math.min(1, this.swing + dt / SWING_T);
    this.wobble *= Math.exp(-9 * dt);
    this.shake = Math.max(0, this.shake - dt * 40);
    for (const b of this.bits) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 420 * dt;
    }
    this.bits = this.bits.filter((b) => b.life > 0);
    if (c.done) {
      if (this.outro === 0) this.burst(this.look.kind === 'wood' ? 26 : 30, true);
      this.outro += dt;
    }
  }

  get finished() {
    return this.outro >= OUTRO_T;
  }

  private onStrike(c: Chop) {
    const kind = c.last!;
    this.marks.push({ at: c.hitPos, amount: c.lastAmount, kind, seed: Math.random() * 100 });
    this.swing = 0;
    this.wobble = kind === 'perfect' ? 1 : kind === 'hit' ? 0.6 : 0.2;
    if (kind === 'perfect') this.shake = 6;
    this.burst(kind === 'perfect' ? 14 : kind === 'hit' ? 9 : 4, false, c);
  }

  /** Where the latest blow landed on the illustration (local coordinates, base of the tree/rock at 0,0). */
  private impact(c?: Chop): { x: number; y: number } {
    if (this.look.kind === 'wood') return { x: 15 - this.cut(c) * 28, y: -22 };
    const m = this.marks[this.marks.length - 1];
    return { x: -52 + (m?.at ?? 0.5) * 104, y: -70 };
  }

  private burst(n: number, big: boolean, c?: Chop) {
    const at = this.impact(c), wood = this.look.kind === 'wood';
    const miss = !big && this.marks[this.marks.length - 1]?.kind === 'miss';
    for (let i = 0; i < n; i++) {
      const a = wood ? -0.3 + (Math.random() - 0.5) * 1.8 : -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const sp = (big ? 90 : 60) + Math.random() * (big ? 160 : 120);
      const spark = !wood && !miss && Math.random() < 0.35;
      const color = miss ? 'rgba(220,220,220,0.8)' : wood ? (Math.random() < 0.5 ? '#f3dcaa' : '#9a6a44') : spark ? '#fff2a8' : Math.random() < 0.5 ? (this.look as { rock: string }).rock : (this.look as { dark: string }).dark;
      this.bits.push({ x: at.x, y: at.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (big ? 60 : 30), life: 0.35 + Math.random() * 0.35, max: 0.7, size: spark ? 2 : 2.5 + Math.random() * (big ? 4 : 2.5), color, star: spark });
    }
  }

  /** How deep the cut is, 0–1 of the trunk (wood). */
  private cut(c?: Chop) {
    const done = this.marks.reduce((a, m) => a + m.amount, 0);
    return Math.min(1, done / Math.max(0.001, c?.hp ?? done));
  }

  draw(ctx: CanvasRenderingContext2D, c: Chop, vw: number, vh: number, title: string, hint: string) {
    const mine = this.look.kind === 'mine';
    const w = Math.min(vw - 48, 360), barH = mine ? 40 : 28;
    const top = Math.max(96, vh * 0.12);
    const x = (vw - w) / 2, barY = top + 172, hintY = barY + barH + 22;
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(sx, sy);
    // Card
    ctx.fillStyle = 'rgba(42,26,48,0.84)';
    rrect(ctx, x - 16, top, w + 32, hintY + 16 - top, 22);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = `900 18px ${FONT}`;
    ctx.fillText(title, vw / 2, top + 22);
    if (c.streak > 1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd35a';
      ctx.fillText(`🔥 ×${c.streak}`, x + w, top + 22);
      ctx.textAlign = 'center';
    }
    // The tree or rock, with every strike showing on it.
    ctx.save();
    ctx.translate(vw / 2, top + 156);
    ctx.scale(0.82, 0.82);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, mine ? 70 : 44, 9, 0, 0, TAU);
    ctx.fill();
    if (this.look.kind === 'wood') this.drawTree(ctx, c, this.look.pine);
    else this.drawRock(ctx, c, this.look);
    for (const b of this.bits) {
      ctx.globalAlpha = Math.min(1, b.life / 0.25);
      ctx.fillStyle = b.color;
      if (b.star) {
        ctx.fillRect(b.x - b.size * 1.5, b.y - 0.5, b.size * 3, 1);
        ctx.fillRect(b.x - 0.5, b.y - b.size * 1.5, 1, b.size * 3);
      } else {
        ctx.beginPath();
        ctx.rect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size * 0.7);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // The bar
    const mx = x + c.pos * w;
    if (this.look.kind === 'mine') drawRockFace(ctx, c, x, barY, w, barH, this.look);
    else {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      rrect(ctx, x, barY, w, barH, barH / 2);
      ctx.fill();
      const zx = x + (c.center - c.width / 2) * w, zw = c.width * w;
      const dim = c.lock > 0 && c.last === 'miss';
      ctx.fillStyle = dim ? 'rgba(126,224,122,0.35)' : '#7ee07a';
      rrect(ctx, zx, barY + 3, zw, barH - 6, 8);
      ctx.fill();
      const cw = zw * PERFECT_CORE;
      ctx.fillStyle = dim ? 'rgba(216,255,200,0.4)' : '#d8ffc8';
      rrect(ctx, x + c.center * w - cw / 2, barY + 3, cw, barH - 6, 6);
      ctx.fill();
    }
    // Aim line through the bar, and the tool riding above it that swings down when you strike.
    if (!c.done) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx, barY + 2);
      ctx.lineTo(mx, barY + barH - 2);
      ctx.stroke();
      this.drawTool(ctx, mx, barY);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText(hint, vw / 2, hintY);
    if (c.last && c.lastT < 0.6) {
      const k = c.lastT / 0.6;
      ctx.globalAlpha = 1 - k;
      ctx.font = `900 ${20 + (c.last === 'perfect' ? 6 : 0)}px ${FONT}`;
      ctx.fillStyle = c.last === 'perfect' ? '#ffd35a' : c.last === 'hit' ? '#9af0a0' : '#ff8a8a';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(42,26,48,0.9)';
      // Beside the tree or rock (on the side you struck), so it never hides the cut you just made.
      const tx = vw / 2 + (c.hitPos < 0.5 ? -1 : 1) * Math.min(w / 2 - 44, 110), ty = top + 104 - k * 16;
      ctx.strokeText(WORDS[this.look.kind][c.last], tx, ty);
      ctx.fillText(WORDS[this.look.kind][c.last], tx, ty);
    }
    ctx.restore();
  }

  /** An axe or pickaxe hanging over the aim line: winds up and chops down on each strike. */
  private drawTool(ctx: CanvasRenderingContext2D, mx: number, barY: number) {
    const q = this.swing;
    // Raised back, then a fast chop past the bar, then settle.
    const ang = q < 1 ? (q < 0.35 ? -0.9 + (q / 0.35) * 1.25 : 0.35 - ((q - 0.35) / 0.65) * 0.35) : Math.sin(performance.now() / 300) * 0.06;
    ctx.save();
    ctx.translate(mx + 16, barY - 30);
    ctx.rotate(ang);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, 24);
    ctx.stroke();
    if (this.look.kind === 'mine') {
      ctx.strokeStyle = '#d8dde8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-26, 20);
      ctx.quadraticCurveTo(-14, 22, -2, 34);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#c8ccd8';
      ctx.strokeStyle = '#5a3a6a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 18);
      ctx.lineTo(-26, 16);
      ctx.quadraticCurveTo(-30, 26, -22, 36);
      ctx.lineTo(-12, 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** A little tree with a notch cut into its trunk; the notch deepens with every strike, misses just nick the bark. */
  private drawTree(ctx: CanvasRenderingContext2D, c: Chop, pine: boolean) {
    const d = this.cut(c) * 28, cutY = -22, hh = 3 + d * 0.3;
    const fall = c.done ? Math.min(1, this.outro / (OUTRO_T * 0.7)) : 0;
    const bark = '#9a6a44', inner = '#f3dcaa', line = '#5a3a2a';
    const wob = this.wobble * Math.sin(performance.now() / 30) * 0.05;
    ctx.save();
    ctx.rotate(wob);
    // Stump (below the cut) stays put.
    ctx.fillStyle = bark;
    ctx.strokeStyle = line;
    ctx.lineWidth = 2;
    rrect(ctx, -16, cutY, 32, -cutY, 4);
    ctx.fill();
    ctx.stroke();
    // Everything above the cut: topples to the right about the hinge once it's through.
    ctx.save();
    ctx.globalAlpha = 1 - Math.max(0, this.outro / OUTRO_T - 0.75) / 0.25;
    ctx.translate(-16, cutY);
    ctx.rotate(fall * fall * 1.5);
    ctx.translate(16, -cutY);
    ctx.fillStyle = bark;
    rrect(ctx, -16, -70, 32, 70 + cutY, 4);
    ctx.fill();
    ctx.stroke();
    // Bark texture
    ctx.strokeStyle = 'rgba(60,35,25,0.35)';
    ctx.lineWidth = 1.5;
    for (const bx of [-9, -2, 6]) {
      ctx.beginPath();
      ctx.moveTo(bx, -66);
      ctx.quadraticCurveTo(bx + 3, -45, bx - 1, cutY - 6);
      ctx.stroke();
    }
    // Canopy
    if (pine) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#347f4a' : '#2a7040';
        ctx.strokeStyle = '#1e4a30';
        ctx.lineWidth = 2;
        const by = -62 - i * 20, bw = 40 - i * 9;
        ctx.beginPath();
        ctx.moveTo(-bw, by);
        ctx.lineTo(0, by - 34);
        ctx.lineTo(bw, by);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#2e6a34';
      ctx.lineWidth = 2;
      for (const [cx, cy, r, col] of [[-20, -84, 24, '#4fae4f'], [20, -84, 24, '#4fae4f'], [0, -104, 28, '#62c060']] as const) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
    // The notch: a wedge biting in from the right, pale wood inside.
    if (d > 0.5 && fall < 1) {
      ctx.fillStyle = inner;
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16.5, cutY - hh);
      ctx.lineTo(16 - d, cutY);
      ctx.lineTo(16.5, cutY + hh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Growth rings showing in the cut.
      ctx.strokeStyle = 'rgba(160,110,60,0.5)';
      ctx.lineWidth = 1;
      for (let r = 6; r < d; r += 6) {
        ctx.beginPath();
        ctx.moveTo(16 - r, cutY - hh * (1 - r / d) * 0.9);
        ctx.lineTo(16 - r, cutY + hh * (1 - r / d) * 0.9);
        ctx.stroke();
      }
    }
    // Misses glance off: small scuffs on the bark.
    ctx.strokeStyle = 'rgba(255,240,220,0.8)';
    ctx.lineWidth = 1.5;
    for (const m of this.marks) {
      if (m.kind !== 'miss' || fall > 0) continue;
      const y = cutY - 8 - Math.abs(jit(m.seed, 1)) * 30, xx = 4 + jit(m.seed, 2) * 8;
      ctx.beginPath();
      ctx.moveTo(xx - 4, y - 2);
      ctx.lineTo(xx + 4, y + 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * A boulder that cracks where you strike (the crack starts above the spot you hit on the bar) and as far as the
   * blow was strong; perfect blows fork. Misses only scuff it. Once it gives way it splits into chunks.
   */
  private drawRock(ctx: CanvasRenderingContext2D, c: Chop, look: Extract<Look, { kind: 'mine' }>) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, k = 1 + jit(3.1, i) * 0.12;
      pts.push([Math.cos(a) * 60 * k, -38 + Math.sin(a) * 36 * k]);
    }
    const shape = () => {
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
    };
    const split = c.done ? Math.min(1, this.outro / (OUTRO_T * 0.7)) : 0;
    const wob = this.wobble * Math.sin(performance.now() / 25) * 2;
    // Split into three chunks that tumble apart, or draw it whole.
    const pieces = split > 0 ? [[-1, -0.6], [1, -0.4], [0, 1]] : [[0, 0]];
    for (const [dx, dy] of pieces) {
      ctx.save();
      if (split > 0) {
        ctx.globalAlpha = 1 - Math.max(0, this.outro / OUTRO_T - 0.7) / 0.3;
        ctx.translate(dx * split * 40, dy * split * 18 + split * split * 30);
        ctx.rotate(dx * split * 0.5);
        ctx.beginPath();
        const a0 = dx < 0 ? Math.PI * 0.5 : dx > 0 ? -Math.PI * 0.5 : Math.PI * 0.1, span = Math.PI * 1.05;
        ctx.moveTo(0, -38);
        ctx.arc(0, -38, 90, dy > 0 ? Math.PI * 0.2 : a0, dy > 0 ? Math.PI * 0.8 : a0 + span);
        ctx.closePath();
        ctx.clip();
      }
      ctx.translate(wob, 0);
      shape();
      ctx.fillStyle = look.rock;
      ctx.fill();
      ctx.save();
      shape();
      ctx.clip();
      ctx.fillStyle = look.dark;
      ctx.beginPath();
      ctx.ellipse(8, 0, 70, 22, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(-18, -60, 30, 10, -0.2, 0, TAU);
      ctx.fill();
      // Ore glints
      ctx.fillStyle = look.fleck;
      for (let i = 0; i < 9; i++) {
        const fx = jit(7.7, i) * 44, fy = -38 + jit(9.1, i) * 22, s = 2.5 + Math.abs(jit(5.3, i)) * 2.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy - s);
        ctx.lineTo(fx + s * 0.7, fy);
        ctx.lineTo(fx, fy + s);
        ctx.lineTo(fx - s * 0.7, fy);
        ctx.closePath();
        ctx.fill();
      }
      // Cracks: each strong blow opens one from the top edge down; perfect blows fork.
      for (const m of this.marks) {
        if (m.kind === 'miss') {
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 1.5;
          const sx = -52 + m.at * 104;
          ctx.beginPath();
          ctx.moveTo(sx - 4, -66);
          ctx.lineTo(sx + 3, -62);
          ctx.stroke();
          continue;
        }
        const len = 26 + (m.amount / c.hp) * 150;
        const path: [number, number][] = [[-52 + m.at * 104, -76]];
        for (let i = 1, y = -76; y < -76 + len && i < 40; i++) {
          y += 7;
          const [px] = path[path.length - 1];
          path.push([px + jit(m.seed, i) * 7, y]);
        }
        const stroke = (p: [number, number][]) => {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(30,20,30,0.75)';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          p.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          p.forEach(([px, py], i) => (i ? ctx.lineTo(px + 1.5, py + 1) : ctx.moveTo(px + 1.5, py + 1)));
          ctx.stroke();
        };
        stroke(path);
        if (m.kind === 'perfect' && path.length > 3) {
          const from = path[Math.floor(path.length / 2)], dir = jit(m.seed, 99) > 0 ? 1 : -1;
          const branch: [number, number][] = [from];
          for (let i = 1; i < path.length / 2; i++) branch.push([from[0] + dir * i * 6 + jit(m.seed, i + 50) * 3, from[1] + i * 4]);
          stroke(branch);
        }
      }
      ctx.restore();
      shape();
      ctx.strokeStyle = 'rgba(30,20,30,0.8)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Mining's bar: a slab of the rock with a glowing seam running through it (the sweet spot, brightest down its core). */
function drawRockFace(ctx: CanvasRenderingContext2D, c: Chop, x: number, y: number, w: number, h: number, look: Extract<Look, { kind: 'mine' }>) {
  ctx.fillStyle = look.dark;
  rrect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = look.rock;
  rrect(ctx, x, y, w, h - 5, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rrect(ctx, x + 6, y + 3, w - 12, 6, 3);
  ctx.fill();
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
}
