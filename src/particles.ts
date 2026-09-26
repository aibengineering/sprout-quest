// Little physics particles for close-up effects (the chop and mine minigame): chips of wood or stone that tumble and
// bounce, puffs of dust and sawdust, sparks, leaves drifting down, and the materials you earned popping out and
// flying off to your bag. Coordinates are whatever the caller draws in; `ground` is the y where things land.
import { iconUrl } from './assets';

const TAU = Math.PI * 2;
const GRAVITY = 1000;

type Kind = 'chip' | 'dust' | 'spark' | 'leaf' | 'loot' | 'twinkle';

interface Particle {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds left, and the total. */
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  spin: number;
  /** A chip's outline (a small irregular polygon around its center). */
  shape?: [number, number][];
  /** Dust: how fast the puff swells. */
  grow?: number;
  /** Loot: its icon, and how long it hangs in the air before flying to the bag. */
  img?: HTMLImageElement;
  hang?: number;
  from?: { x: number; y: number };
  phase?: number;
}

const images = new Map<string, HTMLImageElement>();
/** An icon as an image (they're preloaded at boot, so this comes straight from the cache). */
function iconImage(id: string) {
  let img = images.get(id);
  if (!img) {
    img = new Image();
    img.src = iconUrl(id);
    images.set(id, img);
  }
  return img;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Spray options: which way (radians, 0 = right, -π/2 = up), how wide, and how fast. */
interface Spray { dir: number; spread: number; speed: [number, number] }

export class Particles {
  private list: Particle[] = [];
  /** Where loot flies to once it has popped out (the bag, in the caller's coordinates). */
  lootTo = { x: 0, y: -200 };

  constructor(public ground = 0) {}

  get busy() {
    return this.list.length > 0;
  }

  /** Chips of wood, bark or stone: little irregular pieces that spin, bounce and settle. */
  chips(x: number, y: number, n: number, colors: readonly string[], s: Spray, size: [number, number] = [2.5, 5]) {
    for (let i = 0; i < n; i++) {
      const a = s.dir + rand(-0.5, 0.5) * s.spread, v = rand(...s.speed), r = rand(...size);
      const k = Math.floor(rand(3, 6));
      const shape: [number, number][] = [];
      for (let j = 0; j < k; j++) {
        const t = (j / k) * TAU, rr = r * rand(0.55, 1.1);
        shape.push([Math.cos(t) * rr * rand(0.8, 1.6), Math.sin(t) * rr * rand(0.5, 0.9)]);
      }
      this.list.push({
        kind: 'chip', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.8, 1.3), max: 1.3, size: r,
        color: pick(colors), rot: rand(0, TAU), spin: rand(-14, 14), shape,
      });
    }
  }

  /** Soft puffs of dust or sawdust that swell, drift and fade. */
  dust(x: number, y: number, n: number, color: string, size = 8, s: Spray = { dir: -Math.PI / 2, spread: 3, speed: [10, 50] }) {
    for (let i = 0; i < n; i++) {
      const a = s.dir + rand(-0.5, 0.5) * s.spread, v = rand(...s.speed);
      this.list.push({
        kind: 'dust', x: x + rand(-4, 4), y: y + rand(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: rand(0.45, 0.8), max: 0.8, size: size * rand(0.6, 1.2), color, rot: 0, spin: 0, grow: rand(14, 30),
      });
    }
  }

  /** Bright streaks from metal on stone. */
  sparks(x: number, y: number, n: number, color: string, s: Spray) {
    for (let i = 0; i < n; i++) {
      const a = s.dir + rand(-0.5, 0.5) * s.spread, v = rand(...s.speed);
      this.list.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.15, 0.35), max: 0.35, size: rand(1.2, 2.2), color, rot: 0, spin: 0 });
    }
  }

  /** Leaves shaken loose somewhere in a canopy (an ellipse), drifting down with a sway. */
  leaves(cx: number, cy: number, rx: number, ry: number, n: number, colors: readonly string[], burst = 0) {
    for (let i = 0; i < n; i++) {
      const t = rand(0, TAU), k = Math.sqrt(Math.random());
      const a = rand(0, TAU);
      this.list.push({
        kind: 'leaf', x: cx + Math.cos(t) * rx * k, y: cy + Math.sin(t) * ry * k, vx: Math.cos(a) * burst, vy: Math.sin(a) * burst - burst * 0.5,
        life: rand(1.2, 2), max: 2, size: rand(3.5, 5.5), color: pick(colors), rot: rand(0, TAU), spin: rand(-3, 3), phase: rand(0, TAU),
      });
    }
  }

  /** Four-pointed sparkles. */
  twinkle(x: number, y: number, n: number, color = '#fff6c8', r = 14) {
    for (let i = 0; i < n; i++) {
      this.list.push({ kind: 'twinkle', x: x + rand(-r, r), y: y + rand(-r, r), vx: 0, vy: -10, life: rand(0.3, 0.55), max: 0.55, size: rand(4, 8), color, rot: rand(0, 1), spin: 0 });
    }
  }

  /** What you earned: each piece pops out, hangs a moment, then flies to your bag. */
  loot(x: number, y: number, id: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-0.8, 0.8), v = rand(260, 380);
      this.list.push({
        kind: 'loot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1, max: 1.1, size: 17, color: '#fff',
        rot: rand(-0.4, 0.4), spin: rand(-4, 4), img: iconImage(id), hang: 0.45 + i * 0.07,
      });
    }
  }

  update(dt: number) {
    for (const p of this.list) {
      p.life -= dt;
      switch (p.kind) {
        case 'chip': {
          p.vy += GRAVITY * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
          if (p.y > this.ground - p.size * 0.4 && p.vy > 0) {
            p.y = this.ground - p.size * 0.4;
            p.vy *= -0.32;
            p.vx *= 0.55;
            p.spin *= 0.4;
            if (Math.abs(p.vy) < 40) p.vy = 0;
          }
          break;
        }
        case 'dust': {
          const drag = Math.exp(-3 * dt);
          p.vx *= drag;
          p.vy = p.vy * drag - 6 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.size += p.grow! * dt;
          break;
        }
        case 'spark':
          p.vy += GRAVITY * 0.5 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case 'leaf': {
          // Flutter down at a gentle terminal speed, swaying side to side.
          p.phase! += dt * 5;
          p.vx *= Math.exp(-2.5 * dt);
          p.vy = Math.min(55, p.vy + 300 * dt) * Math.exp(-1.5 * dt) + 20 * dt;
          p.x += (p.vx + Math.sin(p.phase!) * 28) * dt;
          p.y += p.vy * dt;
          p.rot = Math.sin(p.phase!) * 0.9;
          if (p.y > this.ground - 1) {
            p.y = this.ground - 1;
            p.vx = p.vy = 0;
            p.phase! -= dt * 5;
          }
          break;
        }
        case 'twinkle':
          p.y += p.vy * dt;
          break;
        case 'loot': {
          const age = p.max - p.life;
          if (age < p.hang!) {
            p.vy += GRAVITY * 0.9 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.spin * dt;
            p.spin *= Math.exp(-3 * dt);
            if (p.y > this.ground - p.size && p.vy > 0) {
              p.y = this.ground - p.size;
              p.vy *= -0.4;
              p.vx *= 0.6;
            }
          } else {
            // Then it zips off to the bag, shrinking as it goes.
            p.from ??= { x: p.x, y: p.y };
            const k = Math.min(1, (age - p.hang!) / (p.max - p.hang!));
            const e = k * k * (3 - 2 * k);
            p.x = p.from.x + (this.lootTo.x - p.from.x) * e;
            p.y = p.from.y + (this.lootTo.y - p.from.y) * e - Math.sin(k * Math.PI) * 30;
            p.rot *= 0.9;
          }
          break;
        }
      }
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const fade = Math.min(1, p.life / 0.3);
      ctx.save();
      ctx.translate(p.x, p.y);
      switch (p.kind) {
        case 'chip':
          ctx.globalAlpha *= fade;
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = 'rgba(40,24,40,0.55)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          p.shape!.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'dust': {
          ctx.globalAlpha *= 0.4 * (p.life / p.max);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, TAU);
          ctx.fill();
          break;
        }
        case 'spark':
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha *= p.life / p.max;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-p.vx * 0.025, -p.vy * 0.025);
          ctx.stroke();
          break;
        case 'leaf':
          ctx.globalAlpha *= fade;
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = 'rgba(30,70,35,0.8)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.quadraticCurveTo(0, -p.size * 0.7, p.size, 0);
          ctx.quadraticCurveTo(0, p.size * 0.7, -p.size, 0);
          ctx.fill();
          ctx.stroke();
          break;
        case 'twinkle': {
          const k = p.life / p.max, s = p.size * Math.sin(k * Math.PI);
          ctx.globalAlpha *= Math.min(1, k * 3);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * TAU, r = i % 2 ? s * 0.25 : s;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.fill();
          break;
        }
        case 'loot': {
          const age = p.max - p.life, pop = Math.min(1, age / 0.12);
          const k = age < p.hang! ? 1 : 1 - Math.min(1, (age - p.hang!) / (p.max - p.hang!)) * 0.55;
          ctx.rotate(p.rot);
          ctx.scale(pop * k, pop * k);
          const glow = ctx.createRadialGradient(0, 0, p.size * 0.5, 0, 0, p.size * 1.6);
          glow.addColorStop(0, 'rgba(255,245,200,0.45)');
          glow.addColorStop(1, 'rgba(255,245,200,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.6, 0, TAU);
          ctx.fill();
          if (p.img?.complete && p.img.naturalWidth) ctx.drawImage(p.img, -p.size, -p.size, p.size * 2, p.size * 2);
          else {
            ctx.fillStyle = '#ffd35a';
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.6, 0, TAU);
            ctx.fill();
          }
          break;
        }
      }
      ctx.restore();
    }
  }
}
