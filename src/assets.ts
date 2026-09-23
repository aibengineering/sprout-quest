// Loads the Blender-rendered sprite atlas and draws frames. If loading fails the game falls back to the
// procedural canvas drawings in sprites.ts, so it always stays playable.

export interface Frame {
  img: HTMLImageElement;
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

export async function loadAssets(base = 'assets/'): Promise<boolean> {
  try {
    const res = await fetch(`${base}atlas.json`);
    if (!res.ok) return false;
    const data = (await res.json()) as { pages: string[]; frames: Record<string, number[]> };
    const imgs = await Promise.all(
      data.pages.map(
        (p) =>
          new Promise<HTMLImageElement>((ok, fail) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.onerror = fail;
            img.src = base + p;
          }),
      ),
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

/** Draws a frame with its anchor at (x, y). `unit` is how many canvas units one Blender unit spans. */
export function drawFrame(ctx: CanvasRenderingContext2D, f: Frame, x: number, y: number, unit: number, o: DrawOpts = {}) {
  const k = unit / f.ppu;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flip ? -k : k) * (o.sx ?? 1), k * (o.sy ?? 1));
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
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

/** Draws the hero sprite; returns false if sprites aren't available so callers can fall back. */
export function drawHero(ctx: CanvasRenderingContext2D, armor: string, x: number, y: number, unit: number, face: number, moving: boolean, t: number, o: DrawOpts = {}): boolean {
  const { dir, flip } = heroDir(face);
  const n = moving ? 1 + (Math.floor(t * 9) % 4) : 0;
  const f = frame(`hero/${armor}/${dir}/${n}`) ?? frame(`hero/tunic/${dir}/${n}`);
  if (!f) return false;
  const breathe = moving ? 1 : 1 + Math.sin(t * 3) * 0.015;
  drawFrame(ctx, f, x, y, unit, { ...o, flip, sy: (o.sy ?? 1) * breathe, sx: (o.sx ?? 1) / breathe });
  return true;
}

export function iconUrl(id: string) {
  return `assets/icons/${id}.webp`;
}
