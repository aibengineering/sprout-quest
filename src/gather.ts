// Gathering minigame: a marker sweeps along a bar; strike while it's inside the sweet spot (the green zone for trees,
// the glowing seam for rocks). Clean hits build a streak that speeds the marker up and hits harder. A miss never fails
// the node; it resets the streak and speed, so sloppy chopping or mining is just slower.
// GatherView draws it: the tree or rock above the bar (nodeart.ts) takes a notch or a crack sized to each strike, the
// axe or pick for your tool's tier swings at it, chips and dust fly, and when it's done the tree topples or the rock
// breaks apart and what you earned pops out.
import { drawFrame, frame } from './assets';
import { RockArt, TreeArt, type Blow, type NodeArt, type RockColors, type RockKind, type Strike, type TreeKind } from './nodeart';
import { Particles } from './particles';
import type { Rng } from './rules';
import { rrect } from './sprites';

export type { Strike };

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
  /** Tallies for the play report. */
  strikes = 0;
  perfects = 0;

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
    this.strikes++;
    if (r === 'perfect') this.perfects++;
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
const easeOutQ = (q: number) => 1 - (1 - q) * (1 - q);
const easeInQ = (q: number) => q * q * q;
const TAU = Math.PI * 2;
/** Seconds for the tool's swing. */
const SWING_T = 0.34;
/** How far through the swing the tool connects: the chips, notch or crack and shake wait for this moment. */
const IMPACT = 0.3;
/** Once the materials come free, how long they take to pop out and fly to your bag before the minigame closes. */
const LOOT_T = 1.05;

/** How a node's minigame looks: which tree or rock, the tool you swing (its tier), and for rocks the bar's colors. */
export type Look = { kind: 'wood'; tree: TreeKind; tool: number } | ({ kind: 'mine'; rock: RockKind; tool: number } & RockColors);

/** Sounds the minigame asks for as things happen (the game plays them). */
export type GatherSound = 'chop' | 'clink' | 'glance' | 'creak' | 'thud' | 'crumble' | 'pickup';

const WORDS: Record<Look['kind'], Record<Strike, string>> = {
  wood: { perfect: 'Perfect!', hit: 'Nice!', miss: 'Miss' },
  mine: { perfect: 'Crack!', hit: 'Chip!', miss: 'Clang!' },
};

/**
 * The tools as swung: their angle at rest and when they connect (radians, 0 = handle straight up, negative leans the
 * head left toward the target), and where the axe's edge or the pick's point is from the grip (handle up). The axe
 * chops down and in at the notch; the pick comes down point-first on the rock.
 */
const SWINGS = {
  wood: { ready: 0.35, strike: -0.75, tip: { x: -29, y: -65 }, sprite: 'axe', tiers: 2 },
  mine: { ready: 0.3, strike: -0.85, tip: { x: -40, y: -57 }, sprite: 'pick', tiers: 4 },
} as const;
/** Illustration pixels per Blender unit for the tool sprites (see art/gather.py), and the illustration's scale. */
const TOOL_UNIT = 100;
const SCALE = 0.82;
/** Card height from its top down to the ground the tree or rock stands on. */
const STAGE = { wood: 204, mine: 160 };

const turn = (p: { x: number; y: number }, a: number) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

export class GatherView {
  private readonly art: NodeArt;
  private readonly fx = new Particles(0);
  /** Blows that have landed. */
  private blows: Blow[] = [];
  /** 0 → 1 over a swing (1 = at rest). */
  private swing = 1;
  /** A strike waiting for the tool to connect before it shows on the tree or rock. */
  private pending: Blow | null = null;
  /** Where the latest blow lands (illustration coordinates), fixed at the strike so the tool swings to it. */
  private target = { x: 0, y: 0 };
  private wobble = 0;
  private shake = 0;
  /** Seconds left on the white impact star where the tool just connected. */
  private flash = 0;
  private prevT = Infinity;
  private gaveWay = false;
  /** What you earned, waiting to pop out; and seconds since it came free (-1: not yet). */
  private drops: [string, number][] = [];
  private freed = -1;
  /** Sounds as things happen: set by the game. */
  onSound: (s: GatherSound) => void = () => {};

  constructor(readonly look: Look) {
    this.art = look.kind === 'wood' ? new TreeArt(look.tree) : new RockArt(look.rock, look);
  }

  /** What you earned (known once the node gives way): it pops out as the tree lands or the rock breaks. */
  reward(drops: Partial<Record<string, number>>) {
    this.drops = Object.entries(drops).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => [id, n!]);
    if (this.freed >= 0) this.popLoot();
  }

  private popLoot() {
    const p = this.art.lootFrom;
    for (const [id, n] of this.drops) this.fx.loot(p.x, p.y, id, Math.min(n, 4));
    this.drops = [];
  }

  /** How far through the node the blows that have landed are, 0–1. */
  private get progress() {
    return Math.min(1, this.blows.reduce((a, b) => a + b.share, 0));
  }

  update(dt: number, c: Chop) {
    if (c.last && c.lastT < this.prevT) this.onStrike(c);
    this.prevT = c.lastT;
    const before = this.swing;
    this.swing = Math.min(1, this.swing + dt / SWING_T);
    if (this.pending && before < IMPACT && this.swing >= IMPACT) this.connect();
    this.wobble *= Math.exp(-9 * dt);
    this.shake = Math.max(0, this.shake - dt * 40);
    this.flash = Math.max(0, this.flash - dt);
    if (c.done && !this.pending && !this.gaveWay) {
      this.gaveWay = true;
      this.art.giveWay(this.fx);
      if (this.look.kind === 'wood') this.onSound('creak');
    }
    if (this.art.update(dt, this.fx)) {
      this.freed = 0;
      this.shake = this.look.kind === 'wood' ? 9 : 7;
      this.onSound(this.look.kind === 'wood' ? 'thud' : 'crumble');
      this.popLoot();
    } else if (this.freed >= 0) {
      const was = this.freed;
      this.freed += dt;
      if (was < 0.7 && this.freed >= 0.7) this.onSound('pickup');
    }
    this.fx.update(dt);
  }

  /** Done once the tree has fallen or the rock has broken, and your materials are on their way to the bag. */
  get finished() {
    return this.art.finished && this.freed >= LOOT_T;
  }

  /** A strike: the tool starts its swing now, and the blow shows when it connects (see connect). */
  private onStrike(c: Chop) {
    if (this.pending) this.connect();
    this.pending = { at: c.hitPos, share: c.lastAmount / c.hp, kind: c.last!, seed: Math.random() * 100 };
    this.target = this.art.target(c.hitPos, this.progress + this.pending.share);
    this.swing = 0;
  }

  /** The tool connects: the notch or crack, chips and dust, the wobble, the shake and the sound. */
  private connect() {
    const b = this.pending!;
    this.pending = null;
    this.blows.push(b);
    this.wobble = b.kind === 'perfect' ? 1 : b.kind === 'hit' ? 0.6 : 0.2;
    this.shake = b.kind === 'perfect' ? 6 : b.kind === 'hit' ? 3 : 1;
    this.flash = b.kind === 'miss' ? 0 : 0.1;
    this.art.hit(b, this.progress, this.fx);
    this.onSound(b.kind === 'miss' ? 'glance' : this.look.kind === 'wood' ? 'chop' : 'clink');
  }

  draw(ctx: CanvasRenderingContext2D, c: Chop, vw: number, vh: number, title: string, hint: string) {
    const kind = this.look.kind, mine = kind === 'mine';
    const w = Math.min(vw - 48, 360), barH = mine ? 40 : 28;
    const top = Math.max(96, vh * 0.12), groundY = top + STAGE[kind];
    const x = (vw - w) / 2, barY = groundY + 18, hintY = barY + barH + 22;
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
    // The stage: a soft light behind, the ground, the tree or rock, the tool, and everything flying about.
    ctx.save();
    ctx.translate(vw / 2, groundY);
    ctx.scale(SCALE, SCALE);
    this.fx.lootTo = { x: (w / 2 - 4) / SCALE, y: (top + 24 - groundY) / SCALE };
    const light = ctx.createRadialGradient(0, -80, 10, 0, -70, 170);
    light.addColorStop(0, 'rgba(255,238,200,0.16)');
    light.addColorStop(1, 'rgba(255,238,200,0)');
    ctx.fillStyle = light;
    ctx.fillRect(-w / SCALE / 2 - 20, (top + 36 - groundY) / SCALE, w / SCALE + 40, (groundY - top - 36) / SCALE + 10);
    ctx.fillStyle = 'rgba(12,6,16,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 118, 12, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(12,6,16,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, mine ? 76 : 42, 8, 0, 0, TAU);
    ctx.fill();
    this.art.draw(ctx, this.progress, this.wobble * Math.sin(performance.now() / 30));
    // The tool swings at the tree or rock itself (it's put away once the node gives way).
    if (!c.done || this.pending || (!this.art.finished && this.freed < 0 && !this.gaveWay)) this.drawTool(ctx, c);
    if (this.flash > 0) this.drawImpactStar(ctx, this.flash / 0.1);
    this.fx.draw(ctx);
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
    // Aim line through the bar, with a marker above it.
    if (!c.done) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx, barY + 2);
      ctx.lineTo(mx, barY + barH - 2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(mx - 7, barY - 11);
      ctx.lineTo(mx + 7, barY - 11);
      ctx.lineTo(mx, barY - 2);
      ctx.closePath();
      ctx.fill();
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
      const tx = vw / 2 + (c.hitPos < 0.5 ? -1 : 1) * Math.min(w / 2 - 44, 110), ty = groundY - (mine ? 84 : 118) - k * 16;
      ctx.strokeText(WORDS[this.look.kind][c.last], tx, ty);
      ctx.fillText(WORDS[this.look.kind][c.last], tx, ty);
    }
    ctx.restore();
  }

  /** A quick white star where the tool connects (`k` fades 1 → 0). */
  private drawImpactStar(ctx: CanvasRenderingContext2D, k: number) {
    const { x, y } = this.target, r = 8 + (1 - k) * 18;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = k;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, rr = i % 2 ? r * 0.3 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.fill();
    ctx.restore();
  }

  /**
   * The tool's angle over a swing: a quick wind-up, a fast accelerating chop that connects at IMPACT, a recoil bounce,
   * then back to ready.
   */
  private toolAngle(ready: number, strike: number): number {
    const q = this.swing;
    if (q >= 1) return ready + Math.sin(performance.now() / 320) * 0.05;
    const wind = ready + 0.35;
    if (q < 0.1) return ready + (wind - ready) * easeOutQ(q / 0.1);
    if (q < IMPACT) return wind + (strike - wind) * easeInQ((q - 0.1) / (IMPACT - 0.1));
    if (q < 0.45) return strike + 0.22 * Math.sin(((q - IMPACT) / 0.15) * Math.PI);
    return strike + (ready - strike) * easeOutQ((q - 0.45) / 0.55);
  }

  /**
   * The axe or pick for your tool's tier, pivoting at the grip, which is placed so the edge or point lands exactly on
   * the target as the swing connects.
   */
  private drawTool(ctx: CanvasRenderingContext2D, c: Chop) {
    const kind = this.look.kind, S = SWINGS[kind];
    // Between strikes the tool follows your aim; during a swing it heads for where you struck.
    const target = this.swing < 1 || this.pending ? this.target : this.art.target(c.pos, this.progress);
    const tip = turn(S.tip, S.strike);
    const ang = this.toolAngle(S.ready, S.strike);
    ctx.save();
    ctx.translate(target.x - tip.x, target.y - tip.y);
    // A motion smear behind the head on the fast part of the swing.
    const q = this.swing;
    if (q > 0.1 && q < IMPACT + 0.05) {
      const at = (a: number) => Math.atan2(turn(S.tip, a).y, turn(S.tip, a).x);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, Math.hypot(S.tip.x, S.tip.y) - 4, at(ang + 0.9), at(ang), true);
      ctx.stroke();
    }
    const f = frame(`gather/${S.sprite}${Math.max(1, Math.min(S.tiers, this.look.tool))}`);
    if (f) drawFrame(ctx, f, 0, 0, TOOL_UNIT, { rot: ang });
    else {
      ctx.rotate(ang);
      drawToolShape(ctx, kind === 'wood');
    }
    ctx.restore();
  }
}

/** A drawn axe or pick (handle up, grip at the origin), for when the tool sprites aren't loaded. */
function drawToolShape(ctx: CanvasRenderingContext2D, axe: boolean) {
  const ink = '#3a2448', L = 70;
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -L);
  ctx.stroke();
  ctx.strokeStyle = '#b07a4a';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = ink;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#d8dde8';
  ctx.beginPath();
  if (axe) {
    ctx.moveTo(3, -L + 2);
    ctx.lineTo(3, -L + 16);
    ctx.lineTo(-12, -L + 22);
    ctx.quadraticCurveTo(-30, -L + 9, -26, -L - 14);
    ctx.lineTo(-10, -L - 4);
    ctx.lineTo(3, -L - 4);
  } else {
    ctx.moveTo(-40, -L + 12);
    ctx.quadraticCurveTo(-18, -L - 10, 0, -L - 10);
    ctx.quadraticCurveTo(18, -L - 10, 32, -L + 8);
    ctx.quadraticCurveTo(14, -L - 1, 0, -L + 1);
    ctx.quadraticCurveTo(-18, -L + 1, -40, -L + 12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Mining's bar: a slab of the rock with a glowing seam running through it (the sweet spot, brightest down its core). */
function drawRockFace(ctx: CanvasRenderingContext2D, c: Chop, x: number, y: number, w: number, h: number, look: RockColors) {
  ctx.fillStyle = look.dark;
  rrect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = look.body;
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
