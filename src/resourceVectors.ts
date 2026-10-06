// Resolution-independent resource art: hand-drawn SVGs in public/assets/resources/ (trees, ore rocks, their stumps and
// rubble). Map scenery, gatherable nodes and their close-ups share them: each frame is rasterised once per display
// resolution bucket, then drawn by the normal fast frame renderer. Until the SVGs are in, the atlas frames stand in.
import type { Frame } from './assets';

// The chop animation's numbers: where each tree is cut (its SVG's cut line) and its trunk's radius, in Blender units.
export const TREE_PROFILES = {
  oak: {
    cut: 0.311, r: 0.175, trunkTop: 1.0, canopy: { z: 1.68, rx: 0.8, rz: 0.73 },
    leaves: ['#4fae4f', '#62c060', '#3f9a45', '#6ac666'], heart: '#f3dcaa', heartDark: '#c89a60', bark: '#9a6a44', barkDark: '#4e3024',
  },
  pine: {
    cut: 0.228, r: 0.13, trunkTop: 0.7, canopy: { z: 1.42, rx: 1.0, rz: 0.96 },
    leaves: ['#2f7a45', '#3d8f52', '#4a9a5a'], heart: '#f0dca0', heartDark: '#c8a070', bark: '#7a5238', barkDark: '#3e281c',
  },
  glimwood: {
    cut: 0.248, r: 0.16, trunkTop: 1.0, canopy: { z: 1.68, rx: 0.8, rz: 0.73 },
    leaves: ['#9a82e8', '#b8a0ff', '#9ae6ff', '#d8c8ff'], heart: '#f6f2ff', heartDark: '#c0b0f0', bark: '#e4e0f0', barkDark: '#8a80a8',
  },
  emberwood: {
    cut: 0.248, r: 0.17, trunkTop: 0.95, canopy: { z: 1.57, rx: 0.82, rz: 0.52 },
    leaves: ['#8a2a26', '#c8402a', '#ff7a3a', '#ffb45a'], heart: '#ffb45a', heartDark: '#e0602a', bark: '#3a3238', barkDark: '#1e181c',
  },
} as const;
export const ROCK_PALETTES = {
  rock: { body: '#9a9aa8', dark: '#6a6a78', fleck: '#d8d8e0', light: '#bec3cd' },
  copper: { body: '#8a7a6a', dark: '#5e5048', fleck: '#ff9a4a', light: '#b3a38b' },
  iron: { body: '#5e6272', dark: '#40434f', fleck: '#c8d8f0', light: '#9098ae' },
  crystal: { body: '#7a6a9a', dark: '#4e4468', fleck: '#9af0ff', light: '#bba2ea' },
  obsidian: { body: '#3a3248', dark: '#1c1822', fleck: '#ff8a3a', light: '#675770' },
} as const;

type Tree = keyof typeof TREE_PROFILES;
type Rock = keyof typeof ROCK_PALETTES;
/** Which layer of a tree to show: all of it, the felled top, or the stump with its cut face. */
type Layer = 'whole' | 'top' | 'stump';
/** A frame: the SVG file, which layer, how big it's drawn, and whether it wears the gatherable tree's ribbon. */
interface Art { file: string; layer: Layer; scale: number; ribbon?: Tree }

// The map's nodes and scenery are drawn at the old sprites' size, a little smaller than the chop and mine close-ups.
const MAP: Record<Tree | Rock, number> = { oak: 0.8, pine: 0.77, glimwood: 0.81, emberwood: 0.82, rock: 0.76, copper: 0.76, iron: 0.76, crystal: 0.71, obsidian: 0.73 };
const art = new Map<string, Art>();
for (const kind of Object.keys(TREE_PROFILES) as Tree[]) {
  for (const layer of ['whole', 'top', 'stump'] as const) art.set(`gather/${kind}_${layer}`, { file: kind, layer, scale: 1 });
  art.set(`env/${kind}_node`, { file: kind, layer: 'whole', scale: MAP[kind], ribbon: kind });
  art.set(`env/${kind}_stump`, { file: `${kind}-stump`, layer: 'whole', scale: 0.85 });
}
for (const kind of Object.keys(ROCK_PALETTES) as Rock[]) {
  art.set(`gather/${kind}`, { file: kind, layer: 'whole', scale: 1 });
  art.set(`env/${kind}_node`, { file: kind, layer: 'whole', scale: MAP[kind] });
  art.set(`env/${kind}_rubble`, { file: `${kind}-rubble`, layer: 'whole', scale: 0.9 });
}
// Scenery: the other kinds use the same art, a touch bigger with each variant so a wood doesn't look stamped.
// The woods are mostly oaks, so they come in three shapes and greens of their own.
for (let v = 0; v < 3; v++) art.set(`env/tree${v}`, { file: `oak-v${v}`, layer: 'whole', scale: MAP.oak });
for (const [prefix, kind] of [['pine', 'pine'], ['boulder', 'rock'], ['rock', 'obsidian'], ['crystal', 'crystal']] as const) {
  for (let v = 0; v < 3; v++) art.set(`env/${prefix}${v}`, { file: kind, layer: 'whole', scale: MAP[kind] * (1 + v * 0.03) });
}
export const RESOURCE_FRAMES = [...art.keys()];

/** Each SVG layer, decoded and ready to rasterise: its image and viewBox (100 units = 1 Blender unit, base at y=0). */
const layers = new Map<string, { img: HTMLImageElement; x: number; y: number; w: number; h: number }>();

/** One SVG's text with only `layer` showing: the top hides the stump, the stump hides the top and shows its cut face. */
function only(svg: string, layer: Layer) {
  if (layer === 'whole') return svg;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const hide = (id: string) => doc.getElementById(id)?.setAttribute('display', 'none');
  if (layer === 'top') {
    hide('stump');
    hide('cut');
  } else {
    hide('top');
    doc.getElementById('cut')?.removeAttribute('display');
  }
  return new XMLSerializer().serializeToString(doc);
}

/** Fetches and decodes every resource SVG (about 20 KB). Frames fall back to the atlas for any that fail. */
export async function loadResourceArt() {
  if (typeof document === 'undefined') return;
  const wanted = new Set([...art.values()].map((a) => `${a.file}:${a.layer}`));
  const files = [...new Set([...art.values()].map((a) => a.file))];
  await Promise.all(files.map(async (file) => {
    try {
      const res = await fetch(`assets/resources/${file}.svg`);
      if (!res.ok) throw new Error(`${res.status}`);
      const svg = await res.text();
      const [x, y, w, h] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '').trim().split(/\s+/).map(Number);
      await Promise.all((['whole', 'top', 'stump'] as const).filter((l) => wanted.has(`${file}:${l}`)).map(async (layer) => {
        const img = new Image();
        img.src = URL.createObjectURL(new Blob([only(svg, layer)], { type: 'image/svg+xml' }));
        await img.decode();
        layers.set(`${file}:${layer}`, { img, x, y, w, h });
      }));
    } catch (e) {
      console.warn(`resource art ${file}:`, e);
    }
  }));
}

/** The gatherable tree's ribbon round its trunk on the map, so it stands out from the scenery trees. */
function ribbon(ctx: CanvasRenderingContext2D, kind: Tree) {
  const r = TREE_PROFILES[kind].r * 100 + 2, y = -44;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3a2448';
  ctx.lineWidth = 2.6;
  ctx.fillStyle = '#f3ce79';
  ctx.beginPath();
  ctx.rect(-r, y, r * 2, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe6a5';
  ctx.beginPath();
  ctx.moveTo(r - 1, y + 2);
  ctx.lineTo(r + 12, y - 5);
  ctx.lineTo(r + 10, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

const cached = new Map<string, Frame>();
/** Same frame contract as the atlas (anchor at the base, pixels per Blender unit). No network or WebGL needed once loaded. */
export function resourceFrame(name: string, pixelsPerUnit = 128): Frame | undefined {
  const a = art.get(name), l = a && layers.get(`${a.file}:${a.layer}`);
  if (!a || !l) return undefined;
  const key = `${name}:${pixelsPerUnit}`, previous = cached.get(key);
  if (previous) return previous;
  // Canvas pixels per SVG unit: the SVG's 100 units are one Blender unit, drawn at this frame's size.
  const k = (pixelsPerUnit / 100) * a.scale;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(l.w * k);
  canvas.height = Math.ceil(l.h * k);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(l.img, 0, 0, l.w * k, l.h * k);
  if (a.ribbon) {
    ctx.setTransform(k, 0, 0, k, -l.x * k, -l.y * k);
    ribbon(ctx, a.ribbon);
  }
  const f: Frame = { img: canvas, x: 0, y: 0, w: canvas.width, h: canvas.height, ax: -l.x * k, ay: -l.y * k, ppu: pixelsPerUnit, rasterize: (p) => resourceFrame(name, p)! };
  cached.set(key, f);
  return f;
}
