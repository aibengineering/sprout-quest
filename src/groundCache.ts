// The map's ground, painted once into square chunks of tiles and copied to the screen each frame, instead of every
// tile's grass, paths, shading and rock walls being drawn again 60 times a second. A chunk is painted at the tile
// size and pixel density it's shown at, when it first comes into view; they're all repainted when what they depend
// on changes (the map, its tiles, the zoom). What moves on the ground (swaying grass, glinting water) is drawn over
// them live.

/** Tiles along a chunk's side. */
const SIZE = 6;
/** Chunks kept beyond those on screen, so walking back and forth doesn't repaint them. */
const SPARE = 8;

interface Chunk { canvas: HTMLCanvasElement; painted: boolean; used: number }

export class GroundCache {
  private chunks = new Map<string, Chunk>();
  private owner: object | null = null;
  private key = '';
  private frame = 0;

  /**
   * Draws the chunks covering tiles x0..x1, y0..y1 onto `ctx` (in map pixels, `scale` device pixels each). `owner`
   * and `key` stand for everything the painting depends on: when either changes, every chunk is repainted. `paint`
   * draws tiles tx0..tx1, ty0..ty1 in map pixels: a chunk and a tile round it, so what spills over its edge is there.
   */
  draw(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, ts: number, scale: number, owner: object, key: string,
    paint: (c: CanvasRenderingContext2D, tx0: number, ty0: number, tx1: number, ty1: number) => void) {
    if (owner !== this.owner || key !== this.key) {
      this.owner = owner;
      this.key = key;
      for (const ch of this.chunks.values()) ch.painted = false;
    }
    const frame = ++this.frame, px = SIZE * ts;
    // Each chunk reaches a pixel into the next (as each tile does), so no seam shows between them.
    const w = Math.ceil((px + 1) * scale);
    const i0 = Math.floor(x0 / SIZE), i1 = Math.floor(x1 / SIZE), j0 = Math.floor(y0 / SIZE), j1 = Math.floor(y1 / SIZE);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const ch = this.take(`${i},${j}`, (i1 - i0 + 1) * (j1 - j0 + 1));
        if (!ch.painted) {
          ch.painted = true;
          const c = ch.canvas.getContext('2d')!;
          if (ch.canvas.width !== w || ch.canvas.height !== w) ch.canvas.width = ch.canvas.height = w;
          else c.clearRect(0, 0, w, w);
          c.setTransform(scale, 0, 0, scale, -i * px * scale, -j * px * scale);
          paint(c, i * SIZE - 1, j * SIZE - 1, i * SIZE + SIZE, j * SIZE + SIZE);
        }
        ch.used = frame;
        ctx.drawImage(ch.canvas, i * px, j * px, w / scale, w / scale);
      }
    }
  }

  /** The chunk `id`: the one already painted, or else a canvas to paint it on (reusing the one longest off screen). */
  private take(id: string, onScreen: number): Chunk {
    let ch = this.chunks.get(id);
    if (ch) return ch;
    if (this.chunks.size >= onScreen + SPARE) {
      let oldest: [string, Chunk] | null = null;
      for (const e of this.chunks) if (e[1].used < this.frame && (!oldest || e[1].used < oldest[1].used)) oldest = e;
      if (oldest) {
        this.chunks.delete(oldest[0]);
        ch = oldest[1];
        ch.painted = false;
      }
    }
    ch ??= { canvas: document.createElement('canvas'), painted: false, used: 0 };
    this.chunks.set(id, ch);
    return ch;
  }
}
