// The page scripts/icons3d.ts drives in headless Chromium: renders an item's icon from its model with the game's own
// renderer, and lays out contact sheets.
import { itemModel } from '../src/itemview';
import { loadItemModel, renderIcon } from '../src/models';

const w = window as unknown as Record<string, unknown>;

/** The item's icon as a WebP data URL, or null if it has no model (or it didn't load). */
w.icon = async (id: string, px: number, quality: number) => {
  const item = itemModel(id);
  if (!item || !(await loadItemModel(item.url))) return null;
  return renderIcon(item, px)?.toDataURL('image/webp', quality) ?? null;
};

const image = (src: string) => new Promise<HTMLImageElement | null>((res) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = src;
});

/** A contact sheet: one row per item, `before` beside `after` (data URLs), on the Bag's tile colour. PNG data URL. */
w.sheet = async (rows: { id: string; before: string | null; after: string }[], cols = 4) => {
  const cell = 128, gap = 8, label = 16, pair = cell * 2 + gap;
  const c = document.createElement('canvas');
  c.width = cols * (pair + gap * 3) + gap;
  c.height = Math.ceil(rows.length / cols) * (cell + label + gap) + gap;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8a5a3a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = '600 12px sans-serif';
  for (const [i, r] of rows.entries()) {
    const x = gap + (i % cols) * (pair + gap * 3), y = gap + Math.floor(i / cols) * (cell + label + gap);
    ctx.fillStyle = '#f2dfba';
    ctx.fillRect(x, y, cell, cell);
    ctx.fillRect(x + cell + gap, y, cell, cell);
    const [a, b] = await Promise.all([r.before ? image(r.before) : null, image(r.after)]);
    if (a) ctx.drawImage(a, x, y, cell, cell);
    if (b) ctx.drawImage(b, x + cell + gap, y, cell, cell);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${r.id}: before · after`, x, y + cell + 13);
  }
  return c.toDataURL('image/png');
};
