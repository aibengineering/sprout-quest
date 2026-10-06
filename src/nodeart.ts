// The close-up tree and rock in the chop and mine minigame (GatherView in gather.ts draws the card, bar and tool
// around them). Both are the pre-rendered models from art/gather.py:
// - A tree takes a notch that deepens with every blow. When it's through, the top topples off the stump about the
//   hinge, lands with a thump and a shower of leaves, and your logs pop out.
// - A rock cracks from wherever the pick lands, as far as the blow was strong (perfect blows fork). When it gives way,
//   the cracks glow, it splits into chunks that tumble and bounce, and your ore pops out.
// Coordinates: the base of the tree or rock at (0, 0), y down, in "illustration" pixels.
import { drawFrame, frame, type Frame } from './assets';
import type { Particles } from './particles';

export type Strike = 'perfect' | 'hit' | 'miss';
/** One blow: where it landed along the bar (0–1), its share of the node's toughness, and a seed for its shape. */
export interface Blow { at: number; share: number; kind: Strike; seed: number }
/** What the minigame needs from a close-up. */
export interface NodeArt {
  /** Where a blow at bar position `at` lands, `progress` (0–1) of the way through. */
  target(at: number, progress: number): { x: number; y: number };
  hit(b: Blow, progress: number, fx: Particles): void;
  /** It's through: the tree starts to fall, or the rock starts to give. */
  giveWay(fx: Particles): void;
  /** Returns true on the frame the materials come free (the tree lands, the rock bursts). */
  update(dt: number, fx: Particles): boolean;
  draw(ctx: CanvasRenderingContext2D, progress: number, wobble: number): void;
  /** Where the materials pop out. */
  readonly lootFrom: { x: number; y: number };
  readonly finished: boolean;
}

/** Numbers shared with art/gather.py: render scale and camera tilt, and for each tree where it's cut. */
const TILT = Math.cos((15 * Math.PI) / 180);
const TREE_UNIT = 80;
const ROCK_UNIT = 100;
const TAU = Math.PI * 2;

/** Small deterministic noise in [-1, 1]. */
const jit = (seed: number, i: number) => (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// ----------------------------------------------------------------------------------------------------------- trees

const TREES = {
  oak: {
    cut: 0.3, r: 0.2, trunkTop: 1.0, canopy: { z: 1.36, rx: 0.66, rz: 0.46 },
    leaves: ['#4fae4f', '#62c060', '#3f9a45', '#6ac666'], heart: '#f3dcaa', heartDark: '#c89a60', bark: '#9a6a44', barkDark: '#4e3024',
  },
  pine: {
    cut: 0.22, r: 0.15, trunkTop: 0.7, canopy: { z: 1.2, rx: 0.5, rz: 0.7 },
    leaves: ['#2f7a45', '#3d8f52', '#4a9a5a'], heart: '#f0dca0', heartDark: '#c8a070', bark: '#7a5238', barkDark: '#3e281c',
  },
  glimwood: {
    cut: 0.28, r: 0.16, trunkTop: 1.0, canopy: { z: 1.4, rx: 0.66, rz: 0.46 },
    leaves: ['#9a82e8', '#b8a0ff', '#9ae6ff', '#d8c8ff'], heart: '#f6f2ff', heartDark: '#c0b0f0', bark: '#e4e0f0', barkDark: '#8a80a8',
  },
  emberwood: {
    cut: 0.26, r: 0.19, trunkTop: 0.95, canopy: { z: 1.32, rx: 0.7, rz: 0.3 },
    leaves: ['#8a2a26', '#c8402a', '#ff7a3a', '#ffb45a'], heart: '#ffb45a', heartDark: '#e0602a', bark: '#3a3238', barkDark: '#1e181c',
  },
} as const;
export type TreeKind = keyof typeof TREES;
/** Whether a gathering node is one of the trees (chopped) rather than a rock (mined). */
export const isTreeKind = (kind: string): kind is TreeKind => kind in TREES;

/** After it lands, how long it lies there before fading, and the fade. */
const LIE_T = 0.45, FADE_T = 0.3;

export class TreeArt implements NodeArt {
  private readonly t;
  private readonly sprites: { whole?: Frame; stump?: Frame; top?: Frame };
  private fall: { angle: number; spin: number; bounced: boolean; landed: number } | null = null;
  /** How far over the top tips before its canopy meets the ground. */
  private readonly landAngle: number;
  lootFrom = { x: 30, y: -10 };

  constructor(readonly kind: TreeKind) {
    this.t = TREES[kind];
    this.sprites = { whole: frame(`gather/${kind}_whole`), stump: frame(`gather/${kind}_stump`), top: frame(`gather/${kind}_top`) };
    let a = 0.3;
    while (a < 1.5 && this.canopyBottom(a) < -4) a += 0.01;
    this.landAngle = a;
  }

  /** The lowest point of the canopy with the top tipped over by `angle` (an ellipse turning about the hinge). */
  private canopyBottom(angle: number) {
    const c = this.canopy, h = this.pivot, dx = c.x - h.x, dy = c.y - h.y;
    const cy = h.y + dx * Math.sin(angle) + dy * Math.cos(angle);
    return cy + Math.hypot(c.rx * Math.sin(angle), c.ry * Math.cos(angle));
  }

  private get R() { return this.t.r * TREE_UNIT; }
  private get cutY() { return -this.t.cut * TILT * TREE_UNIT; }
  /** How deep the notch is: all the way to the hinge, just short of the far side, once it's through. */
  private depth(progress: number) { return Math.min(1, progress) * 1.65 * this.R; }
  /** The hinge the top falls about: the notch's deepest point once it's through. */
  private get pivot() { return { x: this.R - this.depth(1), y: this.cutY }; }
  private get canopy() {
    const c = this.t.canopy;
    return { x: 0, y: -c.z * TILT * TREE_UNIT, rx: c.rx * TREE_UNIT, ry: c.rz * TILT * TREE_UNIT };
  }

  target(_at: number, progress: number) {
    return { x: this.R + 1 - Math.min(this.depth(progress), this.R) * 0.35, y: this.cutY - 2 };
  }

  hit(b: Blow, progress: number, fx: Particles) {
    const p = this.target(b.at, progress), t = this.t;
    if (b.kind === 'miss') {
      // A glancing blow: a flake of bark and a scuff of dust.
      fx.chips(p.x, p.y - 6, 2, [t.bark, t.barkDark], { dir: -0.6, spread: 1.2, speed: [80, 160] }, [2, 3.5]);
      fx.dust(p.x + 3, p.y - 4, 2, 'rgba(230,210,180,1)', 6);
      return;
    }
    const big = b.kind === 'perfect';
    fx.chips(p.x, p.y, big ? 12 : 7, [t.heart, t.heart, t.heartDark, t.bark], { dir: -0.5, spread: 1.6, speed: [120, big ? 300 : 230] }, big ? [2.5, 6] : [2, 4.5]);
    fx.dust(p.x + 4, p.y, big ? 4 : 2, 'rgba(250,225,180,1)', 9, { dir: -0.3, spread: 1.4, speed: [20, 70] });
    const c = this.canopy;
    fx.leaves(c.x, c.y, c.rx * 0.9, c.ry * 0.9, big ? 4 : Math.random() < 0.6 ? 2 : 1, t.leaves);
    if (big) fx.twinkle(p.x + 6, p.y - 4, 3);
  }

  giveWay(fx: Particles) {
    this.fall = { angle: 0.02, spin: 0.35, bounced: false, landed: 0 };
    const h = this.pivot;
    fx.chips(h.x + 6, h.y, 8, [this.t.heart, this.t.heartDark], { dir: -0.9, spread: 2.2, speed: [60, 180] }, [2, 4]);
  }

  update(dt: number, fx: Particles): boolean {
    const f = this.fall;
    if (!f) return false;
    if (f.bounced && Math.abs(f.spin) < 0.01) {
      f.landed += dt;
      return false;
    }
    // Gravity about the hinge: slow to start, fast by the end.
    f.spin += 11 * Math.sin(f.angle + 0.15) * dt;
    f.angle += f.spin * dt;
    if (f.angle < this.landAngle) return false;
    f.angle = this.landAngle;
    if (f.bounced) {
      f.spin = 0;
      return false;
    }
    // It lands: one small bounce, a cloud of dust along the ground, and the canopy sheds a shower of leaves.
    f.bounced = true;
    f.spin = -f.spin * 0.18;
    const c = this.fallen(this.canopy);
    fx.dust(c.x, -4, 10, 'rgba(210,190,160,1)', 16, { dir: -Math.PI / 2, spread: 3, speed: [30, 110] });
    fx.leaves(c.x, c.y, this.canopy.rx * 0.8, this.canopy.ry * 0.6, 14, this.t.leaves, 140);
    const trunk = this.fallen({ x: 0, y: (this.cutY - this.t.trunkTop * TILT * TREE_UNIT) / 2 });
    this.lootFrom = { x: trunk.x, y: Math.min(-12, trunk.y) };
    return true;
  }

  get finished() {
    return !!this.fall && this.fall.landed >= LIE_T + FADE_T;
  }

  /** Where a point on the top ends up as it falls. */
  private fallen(p: { x: number; y: number }) {
    const h = this.pivot, a = this.fall?.angle ?? 0;
    const dx = p.x - h.x, dy = p.y - h.y;
    return { x: h.x + dx * Math.cos(a) - dy * Math.sin(a), y: h.y + dx * Math.sin(a) + dy * Math.cos(a) };
  }

  draw(ctx: CanvasRenderingContext2D, progress: number, wobble: number) {
    const f = this.fall, s = this.sprites;
    if (!f) {
      // Standing: the whole tree, rocking a little from each blow, with its notch.
      ctx.save();
      ctx.rotate(wobble * 0.035);
      this.paint(ctx, s.whole, 'whole');
      this.drawNotch(ctx, this.depth(progress));
      ctx.restore();
      return;
    }
    this.paint(ctx, s.stump, 'stump');
    // The top, falling about the hinge, with the notch's wedge taken out of it.
    const h = this.pivot, d = this.depth(1);
    ctx.save();
    ctx.globalAlpha *= 1 - Math.max(0, f.landed - LIE_T) / FADE_T;
    ctx.translate(h.x, h.y);
    ctx.rotate(f.angle);
    ctx.translate(-h.x, -h.y);
    ctx.beginPath();
    ctx.rect(-400, -600, 800, 600 + this.cutY);
    const [u, a] = this.notchPoints(d);
    ctx.moveTo(u[0] + 2, u[1]);
    ctx.lineTo(a[0], a[1]);
    ctx.lineTo(u[0] + 2, this.cutY);
    ctx.closePath();
    ctx.clip('evenodd');
    this.paint(ctx, s.top, 'top');
    ctx.restore();
  }

  /** The notch's upper lip (on the bark) and its deepest point, for a depth. */
  private notchPoints(d: number): [[number, number], [number, number]] {
    return [[this.R + 0.5, this.cutY - Math.max(3, d * 0.62)], [this.R - d, this.cutY]];
  }

  /** A wedge cut from the right: pale wood inside, the upper face in shadow and the lower lit, torn bark at the lips. */
  private drawNotch(ctx: CanvasRenderingContext2D, d: number) {
    if (d < 0.5) return;
    const t = this.t, R = this.R, cy = this.cutY;
    const [[ux, uy], [ax, ay]] = this.notchPoints(d);
    const lx = R + 0.5, ly = cy + Math.max(1.5, d * 0.14);
    const wedge = () => {
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.lineTo(ax, ay);
      ctx.lineTo(lx, ly);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(R, cy, ax, cy);
    g.addColorStop(0, t.heart);
    g.addColorStop(1, t.heartDark);
    ctx.fillStyle = g;
    wedge();
    ctx.fill();
    // The sloping upper face looks down, into shadow; the flat lower face catches the light.
    ctx.fillStyle = 'rgba(90,50,30,0.3)';
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(ax, ay);
    ctx.lineTo(lx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,240,0.35)';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(lx, ly);
    ctx.lineTo(lx, cy);
    ctx.closePath();
    ctx.fill();
    // Grain along the upper face.
    ctx.strokeStyle = 'rgba(130,80,40,0.35)';
    ctx.lineWidth = 0.8;
    for (const k of [0.35, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(lx, uy + (cy - uy) * k);
      ctx.lineTo(ax + (lx - ax) * k * 0.3, ay - 0.5);
      ctx.stroke();
    }
    // Torn bark around the lips.
    ctx.strokeStyle = t.barkDark;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ux + 1, uy - 1);
    ctx.lineTo(ux - 1.5, uy + 1.5);
    ctx.lineTo(ax, ay);
    ctx.lineTo(lx - 1.5, ly - 0.5);
    ctx.lineTo(lx + 1, ly + 1);
    ctx.stroke();
    // Splinters sticking out of a deep cut.
    if (d > this.R * 0.6) {
      ctx.strokeStyle = t.heart;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (const [sx, sy, ex, ey] of [[lx - 2, ly, lx + 5, ly + 3], [ux - 1, uy + 2, ux + 5, uy - 1]]) {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }
  }

  /** The sprite for a part, or a simple drawn tree if the art isn't loaded. */
  private paint(ctx: CanvasRenderingContext2D, f: Frame | undefined, part: 'whole' | 'stump' | 'top') {
    if (f) return drawFrame(ctx, f, 0, 0, TREE_UNIT);
    const R = this.R, cy = this.cutY, top = -this.t.trunkTop * TILT * TREE_UNIT, c = this.canopy;
    ctx.save();
    if (part !== 'whole') {
      ctx.beginPath();
      if (part === 'stump') ctx.rect(-200, cy, 400, 200);
      else ctx.rect(-400, -600, 800, 600 + cy);
      ctx.clip();
    }
    ctx.fillStyle = this.t.bark;
    ctx.strokeStyle = '#3a2448';
    ctx.lineWidth = 2;
    ctx.fillRect(-R, top, R * 2, -top);
    ctx.strokeRect(-R, top, R * 2, -top);
    ctx.fillStyle = this.t.leaves[0];
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.rx, c.ry * 1.3, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (part === 'stump') {
      ctx.fillStyle = this.t.heart;
      ctx.beginPath();
      ctx.ellipse(0, cy, R, R * 0.28, 0, 0, TAU);
      ctx.fill();
    }
  }
}

// ----------------------------------------------------------------------------------------------------------- rocks

export type RockKind = 'rock' | 'copper' | 'iron' | 'crystal' | 'obsidian';
export interface RockColors { body: string; dark: string; fleck: string }

interface Crack { pts: [number, number][]; width: number; branch: boolean }
interface Chunk { canvas: HTMLCanvasElement; cx: number; cy: number; r: number; x: number; y: number; vx: number; vy: number; rot: number; spin: number }

/** Offscreen resolution: canvas pixels per illustration pixel (sharp on 3x phone screens at the card's scale). */
const RES = 2.5;
/** How long the rock strains (cracks glowing) before it bursts, and how long the pieces take to settle and fade. */
const STRAIN_T = 0.14, SCATTER_T = 0.95;

export class RockArt implements NodeArt {
  /** The rock with its cracks, redrawn when a blow lands. */
  private canvas = document.createElement('canvas');
  /** The rock alone, and its pixels (to keep cracks on it and find its top edge). */
  private base = document.createElement('canvas');
  private alpha: Uint8ClampedArray = new Uint8ClampedArray(0);
  /** The canvases' area in illustration coordinates. */
  private box = { x: -90, y: -120, w: 180, h: 130 };
  private cracks: Crack[] = [];
  private scuffs: [number, number, number][] = [];
  private dirty = true;
  private progress = 0;
  /** Seconds since it gave way (-1 while it's still whole). */
  private since = -1;
  private chunks: Chunk[] = [];
  lootFrom = { x: 0, y: -40 };
  private readonly crackColor: string;
  private readonly glow: string;

  constructor(readonly kind: RockKind, readonly colors: RockColors) {
    const crystal = kind === 'crystal';
    // Obsidian is black glass: its cracks show as hot ember light rather than shadow.
    this.crackColor = crystal ? 'rgba(255,255,255,0.9)' : kind === 'obsidian' ? 'rgba(255,138,58,0.9)' : 'rgba(46,32,56,0.82)';
    this.glow = kind === 'rock' ? '#fff6c8' : colors.fleck;
    this.prepare(frame(`gather/${kind}`));
  }

  /** Draws the rock once into its own canvas and reads back its pixels. */
  private prepare(f: Frame | undefined) {
    const k = ROCK_UNIT / (f?.ppu ?? ROCK_UNIT), pad = 6;
    if (f) this.box = { x: -f.ax * k - pad, y: -f.ay * k - pad, w: f.w * k + pad * 2, h: f.h * k + pad * 2 };
    for (const c of [this.base, this.canvas]) {
      c.width = Math.ceil(this.box.w * RES);
      c.height = Math.ceil(this.box.h * RES);
    }
    const g = this.base.getContext('2d')!;
    g.setTransform(RES, 0, 0, RES, -this.box.x * RES, -this.box.y * RES);
    if (f) drawFrame(g, f, 0, 0, ROCK_UNIT);
    else {
      // No art loaded: a plain boulder shape.
      g.fillStyle = this.colors.body;
      g.strokeStyle = '#3a2448';
      g.lineWidth = 2.5;
      g.beginPath();
      g.ellipse(0, -42, 68, 42, 0, 0, TAU);
      g.fill();
      g.stroke();
    }
    this.alpha = g.getImageData(0, 0, this.base.width, this.base.height).data;
  }

  /** Is this illustration point on the rock? */
  private solid(x: number, y: number) {
    const px = Math.floor((x - this.box.x) * RES), py = Math.floor((y - this.box.y) * RES);
    if (px < 0 || py < 0 || px >= this.base.width || py >= this.base.height) return false;
    return this.alpha[(py * this.base.width + px) * 4 + 3] > 140;
  }

  /** The top edge of the rock above x (where a pick lands). */
  private surface(x: number) {
    for (let y = this.box.y; y < 0; y += 0.5) if (this.solid(x, y)) return y + 3;
    return -40;
  }

  target(at: number) {
    const x = (-0.55 + at * 1.1) * ROCK_UNIT;
    return { x, y: this.surface(x) };
  }

  hit(b: Blow, progress: number, fx: Particles) {
    this.progress = progress;
    const p = this.target(b.at), c = this.colors, ore = this.kind !== 'rock';
    if (b.kind === 'miss') {
      // The pick skids off: sparks, a pale scratch and a puff of grit.
      fx.sparks(p.x, p.y, 5, '#fff2a8', { dir: -Math.PI / 2, spread: 2.4, speed: [140, 260] });
      fx.dust(p.x, p.y - 2, 2, 'rgba(200,200,210,1)', 6);
      this.scuffs.push([p.x, p.y + 2, b.seed]);
      this.dirty = true;
      return;
    }
    const big = b.kind === 'perfect';
    this.cracks.push(...this.crack(p.x, p.y + 1, b));
    this.dirty = true;
    fx.chips(p.x, p.y, big ? 11 : 6, [c.body, c.body, c.dark], { dir: -Math.PI / 2, spread: 2.4, speed: [110, big ? 280 : 210] }, big ? [2.5, 5.5] : [2, 4]);
    if (ore) fx.chips(p.x, p.y, big ? 4 : 2, [c.fleck], { dir: -Math.PI / 2, spread: 1.8, speed: [120, 240] }, [1.8, 3]);
    fx.sparks(p.x, p.y, big ? 7 : 3, ore ? c.fleck : '#fff2a8', { dir: -Math.PI / 2, spread: 2.6, speed: [160, 320] });
    fx.dust(p.x, p.y, big ? 4 : 2, 'rgba(210,210,220,1)', 9, { dir: -Math.PI / 2, spread: 2.5, speed: [15, 60] });
    if (big) fx.twinkle(p.x, p.y - 8, 3, ore ? c.fleck : '#fff6c8');
  }

  /**
   * A crack from where the pick landed: a zigzag fracture running down into the rock, as long as the blow was strong.
   * Perfect blows fork.
   */
  private crack(x: number, y: number, b: Blow): Crack[] {
    const len = Math.min(80, 16 + b.share * 95), width = 1.4 + b.share * 2.6 + (b.kind === 'perfect' ? 0.6 : 0);
    const zigzag = (x0: number, y0: number, dir: number, length: number, salt: number) => {
      const pts: [number, number][] = [[x0, y0]];
      let px = x0, py = y0, went = 0;
      for (let i = 1; went < length && i < 16; i++) {
        // Straight runs that kink one way then the other, leaning back toward straight down.
        const kink = (i % 2 ? 1 : -1) * (0.35 + Math.abs(jit(b.seed + salt, i)) * 0.45);
        const a = dir + kink + (Math.PI / 2 - dir) * 0.15 * i;
        const step = 6 + Math.abs(jit(b.seed + salt, i + 20)) * 6;
        const nx = px + Math.cos(a) * step, ny = py + Math.sin(a) * step;
        if (!this.solid(nx, ny)) break;
        pts.push([(px = nx), (py = ny)]);
        went += step;
      }
      return pts;
    };
    const main = zigzag(x, y, Math.PI / 2 + jit(b.seed, 0) * 0.45, len, 0);
    const out: Crack[] = [{ pts: main, width, branch: false }];
    const forks = b.kind === 'perfect' ? 2 : jit(b.seed, 7) > 0.3 ? 1 : 0;
    for (let i = 0; i < forks && main.length > 2; i++) {
      const from = main[Math.min(main.length - 1, 1 + i)];
      const side = i % 2 ? -1 : 1;
      out.push({ pts: zigzag(from[0], from[1], Math.PI / 2 + side * (0.8 + Math.abs(jit(b.seed, 11 + i)) * 0.4), len * 0.45, 30 + i * 10), width: width * 0.65, branch: true });
    }
    return out;
  }

  giveWay() {
    this.since = 0;
  }

  update(dt: number, fx: Particles): boolean {
    if (this.since < 0) return false;
    const before = this.since;
    this.since += dt;
    if (before < STRAIN_T && this.since >= STRAIN_T) {
      this.burst(fx);
      return true;
    }
    for (const c of this.chunks) {
      c.vy += 1100 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.spin * dt;
      // Bounce and skid along the ground.
      if (c.cy + c.y + c.r * 0.5 > 0 && c.vy > 0) {
        c.y = -c.cy - c.r * 0.5;
        c.vy *= -0.3;
        c.vx *= 0.55;
        c.spin *= 0.5;
        if (Math.abs(c.vy) < 50) c.vy = 0;
      }
    }
    return false;
  }

  get finished() {
    return this.since >= STRAIN_T + SCATTER_T;
  }

  /** Breaks the rock into chunks (cells around points on its cracks and across it) that fly apart. */
  private burst(fx: Particles) {
    this.render();
    const { x, y, w, h } = this.box;
    const seeds: [number, number][] = [];
    for (const c of this.cracks.filter((c) => !c.branch).slice(-3)) seeds.push(c.pts[Math.floor(c.pts.length / 2)]);
    for (let tries = 0; seeds.length < 6 && tries < 200; tries++) {
      const p: [number, number] = [x + rand(0.15, 0.85) * w, y + rand(0.2, 0.95) * h];
      if (this.solid(p[0], p[1]) && seeds.every(([sx, sy]) => Math.hypot(sx - p[0], sy - p[1]) > 22)) seeds.push(p);
    }
    const mid = { x: x + w / 2, y: y + h * 0.6 };
    this.chunks = [];
    seeds.forEach((s, i) => {
      let poly: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      seeds.forEach((o, j) => {
        if (i !== j) poly = clipHalf(poly, o[0] - s[0], o[1] - s[1], ((o[0] - s[0]) * (o[0] + s[0]) + (o[1] - s[1]) * (o[1] + s[1])) / 2);
      });
      if (poly.length < 3) return;
      poly = roughen(poly);
      const canvas = document.createElement('canvas');
      canvas.width = this.canvas.width;
      canvas.height = this.canvas.height;
      const g = canvas.getContext('2d')!;
      g.setTransform(RES, 0, 0, RES, -x * RES, -y * RES);
      const path = () => {
        g.beginPath();
        poly.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
        g.closePath();
      };
      g.save();
      path();
      g.clip();
      g.drawImage(this.canvas, x, y, w, h);
      g.restore();
      // A broken edge all round, only where there's rock.
      g.globalCompositeOperation = 'source-atop';
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(46,32,56,0.85)';
      g.lineWidth = 1.8;
      path();
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.lineWidth = 1;
      g.translate(0.6, 0.9);
      path();
      g.stroke();
      const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
      const r = Math.max(...poly.map(([px, py]) => Math.hypot(px - cx, py - cy))) * 0.6;
      const dx = cx - mid.x, dy = cy - mid.y, n = Math.hypot(dx, dy) || 1;
      this.chunks.push({
        canvas, cx, cy, r, x: 0, y: 0, vx: (dx / n) * rand(70, 150), vy: -rand(40, 150) + (dy / n) * 30, rot: 0, spin: (dx / n) * rand(2, 5),
      });
    });
    this.lootFrom = { x: mid.x, y: mid.y - 10 };
    const c = this.colors;
    fx.dust(mid.x, -8, 12, 'rgba(205,205,215,1)', 18, { dir: -Math.PI / 2, spread: 3.2, speed: [40, 140] });
    fx.chips(mid.x, mid.y, 14, [c.body, c.dark, c.dark], { dir: -Math.PI / 2, spread: 3, speed: [120, 320] }, [2, 5]);
    fx.sparks(mid.x, mid.y, 8, this.glow, { dir: -Math.PI / 2, spread: 3, speed: [150, 330] });
  }

  /** Redraws the rock with its cracks, scuffs and chips taken out around the impacts. */
  private render() {
    if (!this.dirty) return;
    this.dirty = false;
    const g = this.canvas.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.drawImage(this.base, 0, 0);
    g.setTransform(RES, 0, 0, RES, -this.box.x * RES, -this.box.y * RES);
    // Everything from here on only marks the rock itself.
    g.globalCompositeOperation = 'source-atop';
    const grow = 1 + this.progress * 0.45;
    for (const [x, y, seed] of this.scuffs) {
      g.strokeStyle = 'rgba(255,255,255,0.45)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x - 5, y - 1 + jit(seed, 1));
      g.lineTo(x + 5, y + 1);
      g.stroke();
    }
    for (const c of this.cracks) {
      // A lit lower lip, then the dark crack over it: it reads as a groove, not a line.
      taper(g, c.pts, c.width * grow, 'rgba(255,255,255,0.22)', 0.6, 0.9);
      taper(g, c.pts, c.width * grow, this.crackColor, 0, 0);
      if (!c.branch) {
        // A chipped divot where the pick went in.
        const [x, y] = c.pts[0], r = 1.8 + c.width * 0.6;
        g.fillStyle = 'rgba(34,22,40,0.6)';
        g.beginPath();
        g.ellipse(x, y, r * 1.3, r * 0.8, 0, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(x, y + 0.8, r * 1.3, r * 0.8, 0, 0.1, Math.PI - 0.1);
        g.stroke();
      }
    }
    // Late in, the stone around the cracks starts to crumble away.
    if (this.progress > 0.55) {
      g.fillStyle = 'rgba(34,22,40,0.55)';
      for (const c of this.cracks) {
        for (let i = 2; i < c.pts.length; i += 3) {
          const [x, y] = c.pts[i], s = 1.2 + (this.progress - 0.55) * 4;
          g.beginPath();
          g.moveTo(x - s, y);
          g.lineTo(x + s * 0.4, y - s);
          g.lineTo(x + s, y + s * 0.6);
          g.closePath();
          g.fill();
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, _progress: number, wobble: number) {
    const { x, y, w, h } = this.box;
    if (this.chunks.length) {
      const fade = 1 - Math.max(0, this.since - STRAIN_T - SCATTER_T * 0.6) / (SCATTER_T * 0.4);
      ctx.save();
      ctx.globalAlpha *= Math.max(0, fade);
      for (const c of this.chunks) {
        ctx.save();
        ctx.translate(c.cx + c.x, c.cy + c.y);
        ctx.rotate(c.rot);
        ctx.translate(-c.cx, -c.cy);
        ctx.drawImage(c.canvas, x, y, w, h);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    this.render();
    ctx.save();
    ctx.translate(wobble * 2.2, 0);
    // Straining to break: it swells a touch and the cracks glow from inside.
    const strain = this.since >= 0 ? Math.min(1, this.since / STRAIN_T) : 0;
    if (strain) {
      ctx.translate(0, -h * 0.02 * strain);
      ctx.scale(1 + strain * 0.05, 1 + strain * 0.05);
    }
    ctx.drawImage(this.canvas, x, y, w, h);
    if (strain) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= strain;
      ctx.shadowColor = this.glow;
      ctx.shadowBlur = 10;
      for (const c of this.cracks) taper(ctx, c.pts, c.width * 1.3, this.glow, 0, 0);
    }
    ctx.restore();
  }
}

/** A crack as a filled shape that's widest where it starts and tapers to a point. */
function taper(g: CanvasRenderingContext2D, pts: [number, number][], width: number, color: string, ox: number, oy: number) {
  if (pts.length < 2) return;
  const left: [number, number][] = [], right: [number, number][] = [];
  pts.forEach(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1;
    const half = (width / 2) * (1 - i / pts.length) ** 0.7 + 0.2;
    left.push([x - (dy / n) * half + ox, y + (dx / n) * half + oy]);
    right.push([x + (dy / n) * half + ox, y - (dx / n) * half + oy]);
  });
  g.fillStyle = color;
  g.beginPath();
  left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  g.fill();
}

/** Breaks up a polygon's straight edges into rocky, jagged ones (the same jag on both sides of a shared edge). */
function roughen(poly: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  poly.forEach(([x0, y0], i) => {
    const [x1, y1] = poly[(i + 1) % poly.length];
    out.push([x0, y0]);
    const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.floor(len / 9);
    for (let k = 1; k < steps; k++) {
      const t = k / steps, mx = x0 + (x1 - x0) * t, my = y0 + (y1 - y0) * t;
      // Offset by a hash of the point itself, so the neighbouring piece's edge jags to match.
      const j = jit(Math.round(mx * 7) + Math.round(my * 13) * 131, 3) * 3.2;
      out.push([mx - ((y1 - y0) / len) * j, my + ((x1 - x0) / len) * j]);
    }
  });
  return out;
}

/** Keeps the part of a polygon where a·x + b·y ≤ c (one Voronoi cell edge). */
function clipHalf(poly: [number, number][], a: number, b: number, c: number): [number, number][] {
  const out: [number, number][] = [];
  const inside = ([x, y]: [number, number]) => a * x + b * y <= c;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const pin = inside(p), qin = inside(q);
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = (c - a * p[0] - b * p[1]) / (a * (q[0] - p[0]) + b * (q[1] - p[1]));
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
