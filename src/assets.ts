// Loads the Blender-rendered sprite atlas and draws frames. If loading fails the game falls back to the
// procedural canvas drawings in sprites.ts, so it always stays playable. Characters are drawn in 3D (models.ts) once
// their models are in, with their sprites as the fallback.
import { drawModel, hasModel, loadModel, type Held } from './models';

export interface Frame {
  img: HTMLImageElement | HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Anchor (the model's origin / feet) in pixels from the frame's top-left. */
  ax: number;
  ay: number;
  /** Pixels per Blender unit the frame was rendered at. */
  ppu: number;
}

const frames = new Map<string, Frame>();
let ready = false;

export function assetsReady() {
  return ready;
}

export interface LoadProgress { stage: 'sprites' | 'icons'; done: number; total: number }

/** Downloads a file, reporting bytes as they arrive (total is 0 until the server says how big it is). */
async function fetchWithProgress(url: string, onBytes: (got: number, total: number) => void): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url}: ${res.status}`);
  // Bytes arrive uncompressed, so a gzipped download's length doesn't count them: use the size the dev server gives.
  const total = Number(res.headers.get('x-size') ?? (res.headers.get('content-encoding') ? 0 : res.headers.get('content-length')) ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onBytes(got, total);
  }
  return new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') ?? 'image/webp' });
}

/**
 * Loads the sprite atlas with byte-level progress. Images are fully decoded before this resolves, so the first frame
 * that draws a monster or a gathering node already has it (a loaded-but-undecoded image can draw nothing on phones).
 */
export async function loadAssets(onProgress?: (p: LoadProgress) => void, base = 'assets/'): Promise<boolean> {
  try {
    const res = await fetch(`${base}atlas.json`);
    if (!res.ok) return false;
    const data = (await res.json()) as { pages: string[]; frames: Record<string, number[]> };
    const got = data.pages.map(() => 0), size = data.pages.map(() => 0);
    const report = () => onProgress?.({ stage: 'sprites', done: got.reduce((a, b) => a + b, 0), total: size.reduce((a, b) => a + b, 0) });
    const imgs = await Promise.all(
      data.pages.map(async (p, i) => {
        const blob = await fetchWithProgress(base + p, (n, t) => {
          got[i] = n;
          size[i] = t || n;
          report();
        });
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        await img.decode();
        return img;
      }),
    );
    for (const [name, [page, x, y, w, h, ax, ay, ppu]] of Object.entries(data.frames)) {
      frames.set(name, { img: imgs[page], x, y, w, h, ax, ay, ppu });
    }
    ready = true;
    return true;
  } catch {
    return false;
  }
}

/** Warms the browser cache with the menu icons so bags and forges open with every picture already there. */
/**
 * Icons downloaded once and kept in memory, as blob URLs to their bytes (with the decoded image held, so the browser
 * keeps it decoded). Menus rebuild their HTML every time they open; pointing at these means the icons paint in the
 * first frame instead of each one being fetched (or re-fetched, on a server that says not to cache) and popping in.
 */
const iconBlobs = new Map<string, string>();
const decodedIcons = new Map<string, HTMLImageElement>();

export async function preloadIcons(ids: string[], onProgress?: (p: LoadProgress) => void): Promise<void> {
  let done = 0;
  await Promise.all(ids.map(async (id) => {
    try {
      const res = await fetch(`assets/icons/${id}.webp`);
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        const img = new Image();
        img.src = url;
        await img.decode();
        iconBlobs.set(id, url);
        decodedIcons.set(id, img);
      }
    } catch {
      // Missing or broken: that icon falls back to its emoji.
    }
    done++;
    onProgress?.({ stage: 'icons', done, total: ids.length });
  }));
}

export function frame(name: string): Frame | undefined {
  return ready ? frames.get(name) : undefined;
}

export interface DrawOpts {
  flip?: boolean;
  alpha?: number;
  /** Rotation around the anchor, radians. */
  rot?: number;
  sx?: number;
  sy?: number;
  /** 0..1 white hit-flash amount. */
  flash?: number;
  /** Tint the whole sprite toward a color (e.g. burning orange). */
  tint?: string;
  tintAmount?: number;
  /** A solid outline around the whole sprite, `width` in Blender units, so it stands out from any ground. */
  outline?: { color: string; width: number };
}

let scratch: HTMLCanvasElement | null = null;

function flashed(f: Frame, color: string, amount: number): HTMLCanvasElement {
  scratch ??= document.createElement('canvas');
  if (scratch.width < f.w || scratch.height < f.h) {
    scratch.width = Math.max(scratch.width, f.w);
    scratch.height = Math.max(scratch.height, f.h);
  }
  const c = scratch.getContext('2d')!;
  c.clearRect(0, 0, f.w, f.h);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.drawImage(f.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = amount;
  c.fillStyle = color;
  c.fillRect(0, 0, f.w, f.h);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  return scratch;
}

/** Each frame's thickened silhouette in one color, built once: the sprite stamped in a ring of offsets, then filled. */
const outlines = new WeakMap<Frame, Map<string, { c: HTMLCanvasElement; r: number }>>();

function outlineOf(f: Frame, color: string, width: number) {
  const r = Math.max(1, Math.round(width * f.ppu)), key = `${color}/${r}`;
  let byKey = outlines.get(f);
  if (!byKey) outlines.set(f, (byKey = new Map()));
  let o = byKey.get(key);
  if (!o) {
    const c = document.createElement('canvas');
    c.width = f.w + r * 2;
    c.height = f.h + r * 2;
    const x = c.getContext('2d')!;
    // Two rings (full and half width) so thin parts like leaves and horns don't leave gaps.
    for (const k of [1, 0.5]) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        x.drawImage(f.img, f.x, f.y, f.w, f.h, r + Math.cos(a) * r * k, r + Math.sin(a) * r * k, f.w, f.h);
      }
    }
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    byKey.set(key, (o = { c, r }));
  }
  return o;
}

/** Draws a frame with its anchor at (x, y). `unit` is how many canvas units one Blender unit spans. */
export function drawFrame(ctx: CanvasRenderingContext2D, f: Frame, x: number, y: number, unit: number, o: DrawOpts = {}) {
  const k = unit / f.ppu;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flip ? -k : k) * (o.sx ?? 1), k * (o.sy ?? 1));
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.outline) {
    const { c, r } = outlineOf(f, o.outline.color, o.outline.width);
    ctx.drawImage(c, -f.ax - r, -f.ay - r);
  }
  if (o.flash && o.flash > 0) {
    ctx.drawImage(flashed(f, '#ffffff', Math.min(1, o.flash)), 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
  } else if (o.tint && o.tintAmount) {
    ctx.drawImage(flashed(f, o.tint, o.tintAmount), 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
  } else {
    ctx.drawImage(f.img, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
  }
  ctx.restore();
}

/** Picks one of the 5 rendered hero directions (S, SE, E, NE, N) for a screen-space angle, plus mirroring. */
export function heroDir(face: number): { dir: number; flip: boolean } {
  const sector = ((Math.round(face / (Math.PI / 4)) % 8) + 8) % 8; // 0=E 1=SE 2=S 3=SW 4=W 5=NW 6=N 7=NE
  return [
    { dir: 2, flip: false },
    { dir: 1, flip: false },
    { dir: 0, flip: false },
    { dir: 1, flip: true },
    { dir: 2, flip: true },
    { dir: 3, flip: true },
    { dir: 4, flip: false },
    { dir: 3, flip: false },
  ][sector];
}

/** The hero's outline: dark and a little heavier than the sprites' own, so you can always spot yourself. */
export const HERO_OUTLINE = { color: '#2a1a36', width: 0.035 };

/** How long the walkers' loops take: a step cycle, and a slow breath standing still. */
const WALK_T = 4 / 9, IDLE_T = 50 / 24;
/** Monsters are turned a little toward the camera, like their sprites were rendered. */
const MONSTER_YAW = (25 * Math.PI) / 180;

let slotCount = 0;
const slotIds = new WeakMap<object, string>();
/** A stable name for an on-screen thing (a roamer, an enemy), so its 3D image is reused frame to frame. */
export function slotOf(thing: object, kind: string): string {
  let id = slotIds.get(thing);
  if (!id) slotIds.set(thing, (id = `${kind}${++slotCount}`));
  return id;
}

/**
 * Draws a character that walks like the hero (the hero, Poppy): a 3D model once it's loaded, else its sprite
 * (`<prefix>/<dir>/<frame>`: 5 directions, standing + 4 steps), facing `face` and walking if `moving`. `slot` names this
 * on-screen character. `held`: a weapon in hand or carried (3D only; with sprites the caller draws it). Returns
 * 'model' or 'sprite' for what drew it, or false if neither is available so callers can fall back.
 */
export function drawWalker(ctx: CanvasRenderingContext2D, prefix: string, x: number, y: number, unit: number, face: number, moving: boolean, t: number, o: DrawOpts = {}, slot = prefix, held?: Held): 'model' | 'sprite' | false {
  const pose = { anim: moving ? 'walk' : 'idle', phase: t / (moving ? WALK_T : IDLE_T), yaw: Math.PI / 2 - face, bold: !!o.outline, held };
  // The 3D hero gets its heavier outline from the shader instead of a 2D one.
  if (drawModel(ctx, slot, prefix.replace('/', '_'), pose, x, y, unit, o, (f) => drawFrame(ctx, f, x, y, unit, { ...o, outline: undefined }))) return 'model';
  const { dir, flip } = heroDir(face);
  const n = moving ? 1 + (Math.floor(t * 9) % 4) : 0;
  const f = frame(`${prefix}/${dir}/${n}`) ?? frame(`${prefix}/${dir}/0`) ?? frame(`${prefix}/0/0`);
  if (!f) return false;
  const breathe = moving ? 1 : 1 + Math.sin(t * 3) * 0.015;
  drawFrame(ctx, f, x, y, unit, { ...o, flip, sy: (o.sy ?? 1) * breathe, sx: (o.sx ?? 1) / breathe });
  return 'sprite';
}

let shownArmor = 'tunic';

/**
 * Draws the hero, with `held` in hand or carried if drawn in 3D. Returns what drew it ('model' or 'sprite'), or false
 * if neither is available so callers can fall back.
 */
export function drawHero(ctx: CanvasRenderingContext2D, armor: string, x: number, y: number, unit: number, face: number, moving: boolean, t: number, o: DrawOpts = {}, slot = 'hero', held?: Held): 'model' | 'sprite' | false {
  // Armour loads when first worn: until it's in, the hero keeps the last armour drawn.
  if (hasModel(`hero_${armor}`)) shownArmor = armor;
  else void loadModel(`hero_${armor}`);
  const prefix = frame(`hero/${armor}/0/0`) ? `hero/${armor}` : `hero/${shownArmor}`;
  return drawWalker(ctx, prefix, x, y, unit, face, moving, t, { outline: HERO_OUTLINE, ...o }, slot, held);
}

/**
 * Draws a monster with its feet at (x, y): a 3D model once it's loaded, else its sprite. `phase` runs through its idle
 * loop (1 = once round), `left` turns it to face left. Returns false if neither is available.
 */
export function drawMonsterAt(ctx: CanvasRenderingContext2D, slot: string, kind: string, golden: boolean, phase: number, left: boolean, x: number, y: number, unit: number, o: DrawOpts = {}): boolean {
  const pose = { anim: 'idle', phase, yaw: left ? -MONSTER_YAW : MONSTER_YAW, gold: golden };
  if (drawModel(ctx, slot, `mon_${kind}`, pose, x, y, unit, o, (f) => drawFrame(ctx, f, x, y, unit, o))) return true;
  const f = frame(`mon/${kind}${golden ? '_gold' : ''}/${Math.floor((((phase % 1) + 1) % 1) * 6)}`) ?? frame(`mon/${kind}/0`);
  if (!f) return false;
  drawFrame(ctx, f, x, y, unit, { ...o, flip: left !== !!o.flip });
  return true;
}

/** Can this monster be drawn yet (its model or its sprite is in)? */
export const monsterReady = (kind: string) => hasModel(`mon_${kind}`) || !!frame(`mon/${kind}/0`);

/**
 * Draws a villager standing in place and breathing (Elder Oswin, Granny, Poppy hugging her bunny): a 3D model once it's
 * loaded, else its 4-frame sprite loop. `phase`: 1 = one breath. Returns false if neither is available.
 */
export function drawIdler(ctx: CanvasRenderingContext2D, slot: string, name: string, phase: number, x: number, y: number, unit: number, o: DrawOpts = {}): boolean {
  if (drawModel(ctx, slot, `npc_${name}`, { anim: 'idle', phase, yaw: 0 }, x, y, unit, o, (f) => drawFrame(ctx, f, x, y, unit, o))) return true;
  const i = Math.floor((((phase % 1) + 1) % 1) * 4);
  const f = frame(`npc/${name}/${i}`) ?? frame(`npc/${name}/0/${i}`);
  if (!f) return false;
  drawFrame(ctx, f, x, y, unit, o);
  return true;
}

/** A menu icon, decoded and ready to draw on the canvas (undefined if it never loaded: draw its emoji instead). */
export function iconImage(id: string): HTMLImageElement | undefined {
  return decodedIcons.get(id);
}

export function iconUrl(id: string) {
  return iconBlobs.get(id) ?? `assets/icons/${id}.webp`;
}
