// Procedurally drawn chibi sprites. Everything is shapes, so there are no image assets to load.
import type { MonsterKind, Style } from './data';

type Ctx = CanvasRenderingContext2D;

let flashing = false;
let golden = false;
/** Color helper: white while hit-flashing, gold-tinted for golden monsters. */
const c = (col: string, gold = '#ffd84a') => (flashing ? '#ffffff' : golden ? gold : col);

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

export function shadow(ctx: Ctx, x: number, y: number, r: number, alpha = 0.22) {
  ellipse(ctx, x, y, r, r * 0.38, `rgba(30,20,40,${alpha})`);
}

function eyes(ctx: Ctx, x: number, y: number, gap: number, size: number, pupil = '#2a2233', blink = false) {
  for (const s of [-1, 1]) {
    if (blink) {
      ctx.strokeStyle = pupil;
      ctx.lineWidth = size * 0.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + s * gap - size * 0.7, y);
      ctx.lineTo(x + s * gap + size * 0.7, y);
      ctx.stroke();
      continue;
    }
    ellipse(ctx, x + s * gap, y, size * 0.8, size, flashing ? '#fff' : pupil);
    ellipse(ctx, x + s * gap - size * 0.25, y - size * 0.35, size * 0.32, size * 0.32, '#ffffff');
  }
}

function blush(ctx: Ctx, x: number, y: number, gap: number, size: number) {
  if (flashing) return;
  ellipse(ctx, x - gap, y, size, size * 0.6, 'rgba(255,120,140,0.45)');
  ellipse(ctx, x + gap, y, size, size * 0.6, 'rgba(255,120,140,0.45)');
}

function smile(ctx: Ctx, x: number, y: number, w: number, col = '#2a2233') {
  ctx.strokeStyle = flashing ? '#fff' : col;
  ctx.lineWidth = Math.max(1, w * 0.35);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y - w * 0.4, w, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

const blinkAt = (t: number, seed: number) => (t * 0.7 + seed) % 3.2 < 0.12;

export interface PlayerLook {
  t: number;
  moving: boolean;
  /** Facing angle in radians. */
  face: number;
  armor: string;
  hurt?: boolean;
  alpha?: number;
  squash?: number;
}

/** Draws the hero with feet at (x, y). `s` is roughly the body radius. */
export function drawPlayer(ctx: Ctx, x: number, y: number, s: number, o: PlayerLook) {
  flashing = !!o.hurt;
  golden = false;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  shadow(ctx, x, y, s * 0.9);
  const bob = o.moving ? Math.abs(Math.sin(o.t * 12)) * s * 0.18 : Math.sin(o.t * 3) * s * 0.04;
  const fx = Math.cos(o.face);
  const fy = Math.sin(o.face);
  const back = fy < -0.55;
  ctx.translate(x, y - bob);
  const sq = o.squash ?? 1;
  ctx.scale(1 / sq, sq);
  // Feet
  const step = o.moving ? Math.sin(o.t * 12) * s * 0.25 : 0;
  ellipse(ctx, -s * 0.35 + step * 0.3, -s * 0.12 + Math.max(0, step) * -0.4, s * 0.28, s * 0.2, c('#6b4a3a'));
  ellipse(ctx, s * 0.35 - step * 0.3, -s * 0.12 + Math.max(0, -step) * -0.4, s * 0.28, s * 0.2, c('#6b4a3a'));
  // Body / armor
  rrect(ctx, -s * 0.6, -s * 1.05, s * 1.2, s * 0.95, s * 0.4);
  ctx.fillStyle = c(o.armor);
  ctx.fill();
  ctx.fillStyle = flashing ? '#fff' : 'rgba(255,255,255,0.25)';
  rrect(ctx, -s * 0.45, -s * 0.95, s * 0.35, s * 0.4, s * 0.15);
  ctx.fill();
  // Head
  const hy = -s * 1.7;
  ellipse(ctx, 0, hy, s * 0.85, s * 0.78, c('#ffe2c8'));
  // Hair
  ctx.fillStyle = c('#8a5a3a');
  ctx.beginPath();
  if (back) {
    ctx.ellipse(0, hy, s * 0.87, s * 0.8, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(0, hy - s * 0.12, s * 0.88, s * 0.68, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.ellipse(fx * s * 0.2, hy - s * 0.38, s * 0.5, s * 0.25, 0, 0, Math.PI);
  }
  ctx.fill();
  // Leaf sprout
  const sway = Math.sin(o.t * 4) * 0.25;
  ctx.save();
  ctx.translate(0, hy - s * 0.75);
  ctx.rotate(sway);
  ctx.strokeStyle = c('#4a9a3a');
  ctx.lineWidth = s * 0.1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -s * 0.35);
  ctx.stroke();
  ctx.fillStyle = c('#7ad85a');
  ctx.beginPath();
  ctx.ellipse(-s * 0.2, -s * 0.4, s * 0.24, s * 0.12, -0.5, 0, Math.PI * 2);
  ctx.ellipse(s * 0.2, -s * 0.45, s * 0.24, s * 0.12, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (!back) {
    const ex = fx * s * 0.22;
    const ey = hy + s * 0.1 + fy * s * 0.08;
    eyes(ctx, ex, ey, s * 0.3, s * 0.14, '#2a2233', blinkAt(o.t, 0.3));
    blush(ctx, ex, ey + s * 0.22, s * 0.48, s * 0.14);
    if (o.hurt) {
      ellipse(ctx, ex, ey + s * 0.35, s * 0.1, s * 0.12, '#fff');
    } else smile(ctx, ex, ey + s * 0.3, s * 0.1);
  }
  ctx.restore();
  flashing = false;
}

/** Draws a weapon pointing along `angle` from the hand at (x, y). */
export function drawWeapon(ctx: Ctx, style: Style, x: number, y: number, angle: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';
  if (style === 'sword') {
    ctx.fillStyle = '#6b4a3a';
    rrect(ctx, 0, -s * 0.12, s * 0.5, s * 0.24, s * 0.1);
    ctx.fill();
    ctx.fillStyle = '#ffd35a';
    rrect(ctx, s * 0.45, -s * 0.35, s * 0.16, s * 0.7, s * 0.08);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s * 0.6, -s * 0.18);
    ctx.lineTo(s * 1.8, -s * 0.12);
    ctx.lineTo(s * 2.1, 0);
    ctx.lineTo(s * 1.8, s * 0.12);
    ctx.lineTo(s * 0.6, s * 0.18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(s * 0.7, -s * 0.1, s * 1.1, s * 0.06);
  } else if (style === 'wand') {
    ctx.strokeStyle = '#6b4a8a';
    ctx.lineWidth = s * 0.16;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 1.3, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    const r = s * 0.35;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.lineTo(s * 1.55 + Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(s * 1.55 + Math.cos(a + Math.PI / 4) * r * 0.45, Math.sin(a + Math.PI / 4) * r * 0.45);
    }
    ctx.fill();
  } else {
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = s * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 1.6, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    rrect(ctx, s * 1.35, -s * 0.55, s * 0.7, s * 1.1, s * 0.2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    rrect(ctx, s * 1.45, -s * 0.45, s * 0.2, s * 0.9, s * 0.1);
    ctx.fill();
  }
  ctx.restore();
}

export interface MonsterLook {
  t: number;
  flash?: boolean;
  golden?: boolean;
  /** 1 = facing right, -1 = facing left. */
  dir?: number;
  /** Vertical hop offset. */
  z?: number;
  /** 0..1 attack wind-up amount, used for shakes and glows. */
  windup?: number;
  seed?: number;
  alpha?: number;
}

/** Draws a monster with feet at (x, y). `r` is its collision radius. */
export function drawMonster(ctx: Ctx, kind: MonsterKind, x: number, y: number, r: number, o: MonsterLook) {
  const t = o.t;
  const seed = o.seed ?? 0;
  const z = o.z ?? 0;
  const w = o.windup ?? 0;
  flashing = !!o.flash;
  golden = !!o.golden;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  const flying = kind === 'bat' || kind === 'imp';
  shadow(ctx, x, y, r * (flying ? 0.7 : 1) * (1 - Math.min(0.4, z / 60)));
  const shake = w > 0 ? Math.sin(t * 60) * r * 0.08 * w : 0;
  ctx.translate(x + shake, y - z);
  if ((o.dir ?? 1) < 0) ctx.scale(-1, 1);
  const blink = blinkAt(t, seed);
  switch (kind) {
    case 'slime':
    case 'magma': {
      const body = kind === 'slime' ? '#6fdc7a' : '#ff7a3a';
      const dark = kind === 'slime' ? '#3faa55' : '#c8402a';
      const sq = 1 + Math.sin(t * 6 + seed) * 0.07 + (z > 0 ? -0.15 : 0) + w * 0.15;
      const sx = r * 1.15 * sq, sy = r * 0.95 / sq;
      ctx.fillStyle = c(body);
      ctx.beginPath();
      ctx.moveTo(-sx, 0);
      ctx.bezierCurveTo(-sx, -sy * 1.5, sx, -sy * 1.5, sx, 0);
      ctx.quadraticCurveTo(0, sy * 0.25, -sx, 0);
      ctx.fill();
      ctx.fillStyle = c(dark, '#e0a820');
      ctx.beginPath();
      ctx.moveTo(-sx, 0);
      ctx.quadraticCurveTo(0, sy * 0.25, sx, 0);
      ctx.quadraticCurveTo(0, -sy * 0.2, -sx, 0);
      ctx.fill();
      ellipse(ctx, -sx * 0.45, -sy * 0.8, sx * 0.2, sy * 0.14, 'rgba(255,255,255,0.6)');
      if (kind === 'magma' && !flashing) {
        ellipse(ctx, sx * 0.4, -sy * 0.5, sx * 0.12, sy * 0.1, '#ffd35a');
        ellipse(ctx, -sx * 0.1, -sy * 0.25, sx * 0.08, sy * 0.07, '#ffd35a');
      }
      eyes(ctx, sx * 0.1, -sy * 0.55, r * 0.32, r * 0.13, '#2a2233', blink);
      blush(ctx, sx * 0.1, -sy * 0.3, r * 0.58, r * 0.13);
      smile(ctx, sx * 0.1, -sy * 0.3, r * 0.12);
      break;
    }
    case 'bunny': {
      const hop = Math.abs(Math.sin(t * 5 + seed));
      const earA = Math.sin(t * 3 + seed) * 0.15 - w * 0.4;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * r * 0.35, -r * 1.35);
        ctx.rotate(s * 0.2 + earA * s);
        ellipse(ctx, 0, -r * 0.55, r * 0.25, r * 0.65, c('#fff6f0'));
        ellipse(ctx, 0, -r * 0.5, r * 0.12, r * 0.45, c('#ffb4c8'));
        ctx.restore();
      }
      ellipse(ctx, -r * 0.9, -r * 0.5, r * 0.3, r * 0.3, c('#ffffff'));
      ellipse(ctx, 0, -r * 0.75 - hop * r * 0.05, r * 1.0, r * 0.85, c('#fff6f0'));
      ellipse(ctx, r * 0.1, -r * 0.45, r * 0.55, r * 0.35, c('#ffffff'));
      eyes(ctx, r * 0.2, -r * 0.95, r * 0.35, r * 0.13, '#2a2233', blink);
      blush(ctx, r * 0.2, -r * 0.7, r * 0.6, r * 0.13);
      ellipse(ctx, r * 0.2, -r * 0.78, r * 0.08, r * 0.06, c('#ff8aa8'));
      break;
    }
    case 'shroom': {
      const puff = w;
      rrect(ctx, -r * 0.55, -r * 1.05, r * 1.1, r * 1.05, r * 0.35);
      ctx.fillStyle = c('#fff0d8');
      ctx.fill();
      eyes(ctx, r * 0.08, -r * 0.6, r * 0.25, r * 0.11, '#2a2233', blink);
      blush(ctx, r * 0.08, -r * 0.4, r * 0.42, r * 0.11);
      smile(ctx, r * 0.08, -r * 0.38, r * 0.1);
      const capW = r * (1.3 + puff * 0.2), capH = r * (0.95 + puff * 0.15);
      ctx.fillStyle = c('#e8505a');
      ctx.beginPath();
      ctx.moveTo(-capW, -r * 1.0);
      ctx.bezierCurveTo(-capW, -r * 1.0 - capH * 1.4, capW, -r * 1.0 - capH * 1.4, capW, -r * 1.0);
      ctx.quadraticCurveTo(0, -r * 0.8, -capW, -r * 1.0);
      ctx.fill();
      ellipse(ctx, -capW * 0.45, -r * 1.45, r * 0.2, r * 0.16, c('#fff'));
      ellipse(ctx, capW * 0.35, -r * 1.65, r * 0.26, r * 0.2, c('#fff'));
      ellipse(ctx, capW * 0.05, -r * 1.25, r * 0.14, r * 0.1, c('#fff'));
      break;
    }
    case 'wolf': {
      const tail = Math.sin(t * 8 + seed) * 0.4;
      ctx.save();
      ctx.translate(-r * 0.9, -r * 0.8);
      ctx.rotate(-0.8 + tail);
      ellipse(ctx, 0, -r * 0.35, r * 0.22, r * 0.45, c('#8a94b8'));
      ctx.restore();
      ellipse(ctx, -r * 0.1, -r * 0.6, r * 1.0, r * 0.62, c('#9aa4c8'));
      ellipse(ctx, -r * 0.1, -r * 0.45, r * 0.7, r * 0.35, c('#e8ecf8'));
      for (const lx of [-0.6, -0.2, 0.25, 0.6]) ellipse(ctx, lx * r, -r * 0.08, r * 0.16, r * 0.14, c('#7a84a8'));
      const hx = r * 0.55, hy = -r * 1.15;
      for (const s of [-1, 1]) {
        ctx.fillStyle = c('#8a94b8');
        ctx.beginPath();
        ctx.moveTo(hx + s * r * 0.45, hy - r * 0.3);
        ctx.lineTo(hx + s * r * 0.3, hy - r * 0.95);
        ctx.lineTo(hx + s * r * 0.05, hy - r * 0.45);
        ctx.fill();
      }
      ellipse(ctx, hx, hy, r * 0.62, r * 0.55, c('#9aa4c8'));
      ellipse(ctx, hx + r * 0.3, hy + r * 0.2, r * 0.32, r * 0.22, c('#e8ecf8'));
      ellipse(ctx, hx + r * 0.52, hy + r * 0.12, r * 0.1, r * 0.08, c('#2a2233'));
      eyes(ctx, hx + r * 0.08, hy - r * 0.08, r * 0.24, r * 0.1, w > 0 ? '#d82a3a' : '#2a2233', blink && !w);
      break;
    }
    case 'bat': {
      const flap = Math.sin(t * 18 + seed);
      for (const s of [-1, 1]) {
        ctx.fillStyle = c('#5a3a8a', '#d8a820');
        ctx.beginPath();
        ctx.moveTo(s * r * 0.4, -r * 0.9);
        ctx.quadraticCurveTo(s * r * 1.6, -r * (1.7 + flap * 0.6), s * r * 2.0, -r * (0.9 + flap * 0.5));
        ctx.quadraticCurveTo(s * r * 1.5, -r * 0.6, s * r * 1.2, -r * 0.8);
        ctx.quadraticCurveTo(s * r * 0.9, -r * 0.4, s * r * 0.4, -r * 0.6);
        ctx.fill();
      }
      for (const s of [-1, 1]) {
        ctx.fillStyle = c('#7a5ab8');
        ctx.beginPath();
        ctx.moveTo(s * r * 0.25, -r * 1.5);
        ctx.lineTo(s * r * 0.6, -r * 2.05);
        ctx.lineTo(s * r * 0.7, -r * 1.35);
        ctx.fill();
      }
      ellipse(ctx, 0, -r * 1.0, r * 0.8, r * 0.72, c('#7a5ab8'));
      ellipse(ctx, 0, -r * 0.8, r * 0.45, r * 0.35, c('#a08ad8'));
      eyes(ctx, r * 0.05, -r * 1.12, r * 0.28, r * 0.12, '#2a2233', blink);
      ctx.fillStyle = c('#ffffff');
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r * 0.05 + s * r * 0.12, -r * 0.85);
        ctx.lineTo(r * 0.05 + s * r * 0.08, -r * 0.7);
        ctx.lineTo(r * 0.05 + s * r * 0.02, -r * 0.85);
        ctx.fill();
      }
      break;
    }
    case 'golem': {
      const arm = Math.sin(t * 2 + seed) * r * 0.05 - w * r * 0.4;
      ellipse(ctx, -r * 0.45, -r * 0.1, r * 0.3, r * 0.2, c('#7a8090'));
      ellipse(ctx, r * 0.45, -r * 0.1, r * 0.3, r * 0.2, c('#7a8090'));
      rrect(ctx, -r * 0.9, -r * 1.35, r * 1.8, r * 1.25, r * 0.35);
      ctx.fillStyle = c('#9aa0b0');
      ctx.fill();
      ellipse(ctx, -r * 1.05, -r * 0.7 + arm, r * 0.32, r * 0.42, c('#8a90a0'));
      ellipse(ctx, r * 1.05, -r * 0.7 + arm, r * 0.32, r * 0.42, c('#8a90a0'));
      ctx.fillStyle = c('#7ab86a');
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 1.33, r * 0.45, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c('#7ae0ff');
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 1.3);
      ctx.lineTo(r * 0.35, -r * 1.85);
      ctx.lineTo(r * 0.5, -r * 1.3);
      ctx.fill();
      const glow = w > 0 ? '#ff5a5a' : '#6af0ff';
      ellipse(ctx, -r * 0.3, -r * 0.85, r * 0.14, r * 0.1, flashing ? '#fff' : glow);
      ellipse(ctx, r * 0.3, -r * 0.85, r * 0.14, r * 0.1, flashing ? '#fff' : glow);
      break;
    }
    case 'imp': {
      const bob = Math.sin(t * 4 + seed) * r * 0.1;
      ctx.translate(0, bob);
      const flap = Math.sin(t * 14 + seed);
      for (const s of [-1, 1]) {
        ctx.fillStyle = c('#8a2a3a', '#c89020');
        ctx.beginPath();
        ctx.moveTo(s * r * 0.5, -r * 1.2);
        ctx.lineTo(s * r * 1.5, -r * (1.7 + flap * 0.3));
        ctx.lineTo(s * r * 1.2, -r * 1.0);
        ctx.lineTo(s * r * 1.4, -r * (0.8 + flap * 0.2));
        ctx.lineTo(s * r * 0.5, -r * 0.8);
        ctx.fill();
      }
      ctx.strokeStyle = c('#c83a4a');
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.6);
      ctx.quadraticCurveTo(-r * 1.3, -r * 0.2, -r * 1.1, -r * 0.9);
      ctx.stroke();
      ellipse(ctx, 0, -r * 1.0, r * 0.85, r * 0.8, c('#e8505a'));
      for (const s of [-1, 1]) {
        ctx.fillStyle = c('#fff0d0');
        ctx.beginPath();
        ctx.moveTo(s * r * 0.3, -r * 1.65);
        ctx.quadraticCurveTo(s * r * 0.6, -r * 2.3, s * r * 0.75, -r * 2.1);
        ctx.lineTo(s * r * 0.6, -r * 1.5);
        ctx.fill();
      }
      eyes(ctx, r * 0.1, -r * 1.1, r * 0.3, r * 0.13, '#2a2233', blink);
      ctx.strokeStyle = c('#2a2233');
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.arc(r * 0.1, -r * 0.95, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      if (w > 0 && !flashing) ellipse(ctx, r * 0.9, -r * 1.2, r * 0.3 * w, r * 0.3 * w, '#ffb03a');
      break;
    }
    case 'dragon': {
      const flap = Math.sin(t * 3);
      const tail = Math.sin(t * 2) * 0.2;
      // Wings
      for (const s of [-1, 1]) {
        ctx.fillStyle = c('#a8303a');
        ctx.beginPath();
        ctx.moveTo(s * r * 0.3, -r * 1.3);
        ctx.lineTo(s * r * 1.7, -r * (2.3 + flap * 0.25));
        ctx.lineTo(s * r * 1.5, -r * 1.5);
        ctx.lineTo(s * r * 1.9, -r * (1.4 + flap * 0.2));
        ctx.lineTo(s * r * 1.3, -r * 1.05);
        ctx.lineTo(s * r * 1.5, -r * 0.8);
        ctx.lineTo(s * r * 0.5, -r * 0.8);
        ctx.fill();
      }
      // Tail
      ctx.strokeStyle = c('#e8603c');
      ctx.lineWidth = r * 0.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.3);
      ctx.quadraticCurveTo(-r * 1.4, -r * (0.1 + tail), -r * 1.6, -r * (0.6 + tail));
      ctx.stroke();
      ctx.fillStyle = c('#ffd35a');
      ctx.beginPath();
      ctx.moveTo(-r * 1.6, -r * (0.95 + tail));
      ctx.lineTo(-r * 1.85, -r * (0.55 + tail));
      ctx.lineTo(-r * 1.4, -r * (0.5 + tail));
      ctx.fill();
      // Body
      ellipse(ctx, 0, -r * 0.8, r * 0.95, r * 0.85, c('#e8603c'));
      ellipse(ctx, r * 0.1, -r * 0.65, r * 0.55, r * 0.62, c('#ffd28a'));
      for (const s of [-1, 1]) ellipse(ctx, s * r * 0.55, -r * 0.08, r * 0.28, r * 0.16, c('#c84a2a'));
      // Head
      const hy = -r * 1.75;
      for (const s of [-1, 1]) {
        ctx.fillStyle = c('#fff0d0');
        ctx.beginPath();
        ctx.moveTo(s * r * 0.3, hy - r * 0.4);
        ctx.quadraticCurveTo(s * r * 0.55, hy - r * 1.0, s * r * 0.8, hy - r * 0.9);
        ctx.lineTo(s * r * 0.5, hy - r * 0.3);
        ctx.fill();
      }
      ellipse(ctx, 0, hy, r * 0.7, r * 0.6, c('#e8603c'));
      ellipse(ctx, r * 0.25, hy + r * 0.25, r * 0.45, r * 0.3, c('#f08050'));
      ellipse(ctx, r * 0.2, hy + r * 0.2, r * 0.05, r * 0.04, c('#2a2233'));
      ellipse(ctx, r * 0.4, hy + r * 0.2, r * 0.05, r * 0.04, c('#2a2233'));
      eyes(ctx, r * 0.05, hy - r * 0.12, r * 0.28, r * 0.12, w > 0 ? '#d8202a' : '#2a2233', blink && !w);
      if (w > 0 && !flashing) ellipse(ctx, r * 0.3, hy + r * 0.35, r * 0.25 * w, r * 0.18 * w, '#ffb03a');
      break;
    }
  }
  ctx.restore();
  flashing = false;
  golden = false;
}
