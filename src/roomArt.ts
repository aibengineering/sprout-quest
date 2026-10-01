// Drawing the rooms you walk into: their floors and walls (painted in code), their stations (Blender props from
// art/rooms.py, in the rooms atlas, with simple drawn stand-ins until it's loaded), and the bits that float over
// them: what you're carrying, and hints for what to do next.
import { drawFrame, frame, iconImage } from './assets';
import { WALL_RISE, type Room } from './room';
import { rrect, shadow } from './sprites';
import type { WorldObj } from './world';

/** Map tiles are 1.6 Blender units wide, like the map's buildings; indoors, props are drawn a bit bigger than that
 * (cosier, and easier to tap). */
const TILE_BU = 1.6;
export const PROP_SCALE = 1.35;
/** Pixels per Blender unit for a room's props at this tile size. */
export const propUnit = (ts: number) => (ts / TILE_BU) * PROP_SCALE;
/** How high a point `z` Blender units up shows, in pixels (seen from 30° up). */
export const propRise = (z: number, ts: number) => z * 0.866 * propUnit(ts);
/** Where the back wall meets the floor (in tiles from the room's top). */
export const WALL_FOOT = 1.95;

const TAU = Math.PI * 2;

/**
 * A station's prop: its sprite (room/<name>) standing on the front of its box, pushed back `back` tiles, or the
 * stand-in drawing if the sprite isn't in. Returns the sprite's top (in pixels), for things drawn over it.
 */
export function drawProp(ctx: CanvasRenderingContext2D, name: string, o: WorldObj, ts: number, back: number, fallback: (x: number, y: number, w: number, h: number) => void, opts: Parameters<typeof drawFrame>[5] = {}): number {
  const f = frame(`room/${name}`);
  const ax = (o.x + o.w / 2) * ts, ay = (o.y + o.h - back * PROP_SCALE) * ts, unit = propUnit(ts);
  if (!f) {
    shadow(ctx, ax, (o.y + o.h) * ts - ts * 0.08, o.w * ts * 0.5, 0.18);
    fallback(o.x * ts, o.y * ts, o.w * ts, o.h * ts);
    return o.y * ts - ts * 0.6;
  }
  shadow(ctx, ax, (o.y + o.h) * ts - ts * 0.1, o.w * ts * 0.52, 0.2);
  drawFrame(ctx, f, ax, ay, unit, opts);
  return ay - f.ay * (unit / f.ppu);
}

/** A plain wooden box with a darker top, for stand-ins. */
export function crate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, body: string, top: string, rise: number) {
  ctx.fillStyle = body;
  rrect(ctx, x, y - rise, w, h + rise, Math.min(w, h) * 0.12);
  ctx.fill();
  ctx.fillStyle = top;
  rrect(ctx, x, y - rise, w, h * 0.55, Math.min(w, h) * 0.12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,30,0.45)';
  ctx.lineWidth = 2;
  rrect(ctx, x, y - rise, w, h + rise, Math.min(w, h) * 0.12);
  ctx.stroke();
}

/** Something you're carrying, held up over your head: its icon in a white disc (its emoji until icons load), and how many. */
export function drawCarried(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, icon: string, emoji: string, count?: number, t = 0) {
  const r = ts * 0.34, cy = y - ts * 1.75 + Math.sin(t * 5) * ts * 0.03;
  ctx.save();
  ctx.fillStyle = 'rgba(255,253,246,0.96)';
  ctx.strokeStyle = '#4a2a5a';
  ctx.lineWidth = Math.max(2, ts * 0.05);
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // A menu icon, or one of the rooms' props (the watering can), or its emoji.
  const img = iconImage(icon), prop = !img && frame(`room/${icon}`);
  if (img) ctx.drawImage(img, x - r * 0.78, cy - r * 0.78, r * 1.56, r * 1.56);
  else if (prop) ctx.drawImage(prop.img, prop.x, prop.y, prop.w, prop.h, x - r * 0.75, cy - r * 0.75 * (prop.h / prop.w), r * 1.5, r * 1.5 * (prop.h / prop.w));
  else {
    ctx.font = `${Math.round(r * 1.1)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, cy + r * 0.05);
  }
  if (count !== undefined) {
    const label = `×${count}`;
    ctx.font = `900 ${Math.round(ts * 0.3)}px ui-rounded, "Nunito", system-ui, sans-serif`;
    const w = ctx.measureText(label).width + ts * 0.18;
    ctx.fillStyle = '#ff8a5a';
    rrect(ctx, x + r * 0.35, cy + r * 0.25, w, ts * 0.34, ts * 0.16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + r * 0.35 + w / 2, cy + r * 0.25 + ts * 0.18);
  }
  ctx.restore();
}

/** A hint pill near the top of the screen, under the HUD: what to do next. */
export function hintPill(ctx: CanvasRenderingContext2D, vw: number, text: string, y = 84) {
  ctx.save();
  ctx.font = '800 15px ui-rounded, "Nunito", system-ui, sans-serif';
  const w = Math.min(vw - 24, ctx.measureText(text).width + 28), h = 30;
  ctx.fillStyle = 'rgba(42, 26, 48, 0.74)';
  ctx.beginPath();
  ctx.roundRect((vw - w) / 2, y, w, h, 15);
  ctx.fill();
  ctx.fillStyle = '#fff8e8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, vw / 2, y + h / 2 + 1, vw - 44);
  ctx.restore();
}

interface Walls {
  /** Floorboards: two tones and the seams between them, and how tall each board is (tiles). */
  boards: [string, string, string];
  board: number;
  /** The back wall's face, its stripes, and the wainscot along its foot. */
  wall: string;
  stripe: string | null;
  wainscot: string;
  /** Posts, beams and the front wall's top. */
  wood: string;
  /** Horizontal logs instead of wallpaper (a cabin). */
  logs?: boolean;
}

/** A room's floor, back wall, side posts and the low front wall with its doorway and mat. */
export function paintShell(ctx: CanvasRenderingContext2D, room: Room, ts: number, look: Walls) {
  const { w, h, door } = room.spec;
  const L = 0.62, R = w - 0.62, top = -WALL_RISE, foot = WALL_FOOT, front = h - 0.8;
  // Floor.
  for (let i = 0, y = foot; y < front; i++, y += look.board) {
    const bh = Math.min(look.board, front - y);
    ctx.fillStyle = look.boards[i % 2];
    ctx.fillRect(L * ts, y * ts, (R - L) * ts, bh * ts + 1);
    ctx.fillStyle = look.boards[2];
    ctx.fillRect(L * ts, y * ts, (R - L) * ts, Math.max(1, ts * 0.03));
    // Board ends, staggered.
    for (let x = L + ((i * 1.37) % 2.2) + 0.4; x < R - 0.2; x += 2.2) ctx.fillRect(x * ts, y * ts, Math.max(1, ts * 0.03), bh * ts);
  }
  // Back wall.
  ctx.fillStyle = look.wall;
  ctx.fillRect(L * ts, top * ts, (R - L) * ts, (foot - top) * ts);
  if (look.logs) {
    for (let y = top; y < foot - 0.1; y += 0.42) {
      ctx.fillStyle = 'rgba(255,230,190,0.18)';
      ctx.fillRect(L * ts, y * ts, (R - L) * ts, ts * 0.1);
      ctx.fillStyle = 'rgba(40,20,10,0.35)';
      ctx.fillRect(L * ts, (y + 0.36) * ts, (R - L) * ts, ts * 0.06);
    }
  } else if (look.stripe) {
    ctx.fillStyle = look.stripe;
    for (let x = L + 0.15; x < R; x += 0.5) ctx.fillRect(x * ts, top * ts, ts * 0.16, (foot - top) * ts);
  }
  // Wainscot along the foot of the wall, with a rail on top.
  ctx.fillStyle = look.wainscot;
  ctx.fillRect(L * ts, (foot - 0.7) * ts, (R - L) * ts, 0.7 * ts);
  ctx.fillStyle = look.wood;
  ctx.fillRect(L * ts, (foot - 0.76) * ts, (R - L) * ts, ts * 0.1);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(L * ts, (foot - 0.05) * ts, (R - L) * ts, ts * 0.12);
  // Beam across the top, posts down the sides.
  ctx.fillStyle = look.wood;
  ctx.fillRect((L - 0.25) * ts, (top - 0.25) * ts, (R - L + 0.5) * ts, ts * 0.34);
  for (const x of [L - 0.25, R - 0.05]) {
    ctx.fillRect(x * ts, top * ts, 0.3 * ts, (h - 0.55 - top) * ts);
    ctx.fillStyle = 'rgba(255,240,210,0.15)';
    ctx.fillRect(x * ts, top * ts, 0.08 * ts, (h - 0.55 - top) * ts);
    ctx.fillStyle = look.wood;
  }
  // The low front wall (cut away so you can see in), with the doorway in it.
  for (const [x0, x1] of [[L - 0.25, door], [door + 1, R + 0.25]]) {
    ctx.fillStyle = look.wood;
    ctx.fillRect(x0 * ts, front * ts, (x1 - x0) * ts, 0.42 * ts);
    ctx.fillStyle = 'rgba(255,240,210,0.2)';
    ctx.fillRect(x0 * ts, front * ts, (x1 - x0) * ts, 0.08 * ts);
  }
  // The doormat, and light spilling in from outside.
  ctx.fillStyle = '#c86a4a';
  rrect(ctx, (door + 0.08) * ts, (front - 0.35) * ts, 0.84 * ts, 0.55 * ts, ts * 0.12);
  ctx.fill();
  ctx.strokeStyle = '#f0c080';
  ctx.lineWidth = Math.max(1.5, ts * 0.04);
  rrect(ctx, (door + 0.16) * ts, (front - 0.29) * ts, 0.68 * ts, 0.43 * ts, ts * 0.08);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,250,220,0.5)';
  ctx.fillRect(door * ts, front * ts, ts, 0.8 * ts);
}

/** A window on the back wall: frame, sky, a cross-bar, and curtains if `curtain`. */
export function paintWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ts: number, frameColor: string, curtain?: string) {
  ctx.fillStyle = frameColor;
  rrect(ctx, (x - 0.1) * ts, (y - 0.1) * ts, (w + 0.2) * ts, (h + 0.2) * ts, ts * 0.08);
  ctx.fill();
  const sky = ctx.createLinearGradient(0, y * ts, 0, (y + h) * ts);
  sky.addColorStop(0, '#9ad8ff');
  sky.addColorStop(1, '#d8f4ff');
  ctx.fillStyle = sky;
  ctx.fillRect(x * ts, y * ts, w * ts, h * ts);
  ctx.fillStyle = '#7cc86a';
  ctx.beginPath();
  ctx.ellipse((x + w * 0.3) * ts, (y + h) * ts, w * 0.45 * ts, h * 0.35 * ts, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = frameColor;
  ctx.fillRect((x + w / 2 - 0.04) * ts, y * ts, 0.08 * ts, h * ts);
  ctx.fillRect(x * ts, (y + h / 2 - 0.04) * ts, w * ts, 0.08 * ts);
  if (curtain) {
    ctx.fillStyle = curtain;
    for (const side of [0, 1]) {
      const cx = side ? x + w - 0.05 : x - 0.2;
      ctx.beginPath();
      ctx.moveTo(cx * ts, (y - 0.15) * ts);
      ctx.lineTo((cx + 0.25) * ts, (y - 0.15) * ts);
      ctx.quadraticCurveTo((cx + (side ? 0.05 : 0.3)) * ts, (y + h * 0.6) * ts, (cx + 0.25) * ts, (y + h + 0.1) * ts);
      ctx.lineTo(cx * ts, (y + h + 0.1) * ts);
      ctx.fill();
    }
  }
}

/** Steam curling up from (x, y) in pixels. */
export function steam(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, t: number, strength = 1) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.6 + i / 3) % 1;
    ctx.globalAlpha = (1 - q) * 0.5 * strength;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + Math.sin(q * 6 + i * 2) * ts * 0.12, y - q * ts * 0.9, ts * (0.08 + q * 0.12), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
