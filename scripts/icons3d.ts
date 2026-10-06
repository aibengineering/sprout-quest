// Inventory icons from the items' own 3D models: each item's model (its crafting scene, or the model the hero holds or
// wears; src/itemview.ts itemModel) rendered with the game's toon look in headless Chromium (software WebGL) into
// public/assets/icons/<id>.webp, 128 px square as the rest of the set. Changing a model and re-running this changes its
// icon. Blender isn't needed.
//
//   bun run art icons3d                every model icon (gear, tools, potions, meals)
//   bun run art icons3d stonesword,tea just these
//   … --sheet out.png                  also a before/after contact sheet of what changed
//   … --check                          only report icons that differ from a fresh render (writes nothing)
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODEL_ICONS } from '../src/itemview';

/** The icon set's size and WebP quality (art/pack.py ICON_QUALITY). */
export const ICON_PX = 128;
export const ICON_QUALITY = 0.85;

const ROOT = join(import.meta.dir, '..');
const ICONS = join(ROOT, 'public/assets/icons');

/** Serves public/ and the icon page, for a headless browser to render icons with the game's own code. */
async function serve() {
  const out = await Bun.build({ entrypoints: [join(import.meta.dir, 'icons3d-page.ts')], target: 'browser', define: { __DEV__: 'false' } });
  if (!out.success) throw new Error(out.logs.map(String).join('\n'));
  const js = await out.outputs[0].text();
  return Bun.serve({
    port: 0,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === '/') return new Response('<!doctype html><meta charset="utf-8"><script type="module" src="/page.js"></script>', { headers: { 'content-type': 'text/html' } });
      if (path === '/page.js') return new Response(js, { headers: { 'content-type': 'text/javascript' } });
      const file = Bun.file(join(ROOT, 'public', path));
      return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 });
    },
  });
}

/** Opens the icon page in software WebGL. Close the returned browser and server when done. */
export async function iconPage() {
  const server = await serve();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error(String(e)));
  await page.goto(`http://localhost:${server.port}/`);
  await page.waitForFunction(() => 'icon' in window);
  const render = (id: string) => page.evaluate(([id, px, q]) => (window as any).icon(id, px, q) as Promise<string | null>, [id, ICON_PX, ICON_QUALITY] as const);
  return { page, render, close: async () => { await browser.close(); server.stop(true); } };
}

const bytes = (dataUrl: string) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

if (import.meta.main) {
  const args = process.argv.slice(2);
  const flag = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1] ?? ''; };
  const check = args.includes('--check') && !!args.splice(args.indexOf('--check'), 1);
  const sheet = flag('--sheet');
  const only = args[0] && args[0] !== 'all' ? args[0].split(',') : null;
  const ids = only ? MODEL_ICONS.filter((id) => only.includes(id)) : MODEL_ICONS;
  const unknown = only?.filter((id) => !MODEL_ICONS.includes(id)) ?? [];
  if (unknown.length) console.warn(`No model for: ${unknown.join(', ')}`);
  const { page, render, close } = await iconPage();
  const rows: { id: string; before: string | null; after: string }[] = [];
  let changed = 0, total = 0;
  for (const id of ids) {
    const url = await render(id);
    if (!url) { console.warn(`ICON ${id}: model didn't render`); continue; }
    const path = join(ICONS, `${id}.webp`), next = bytes(url);
    const prev = existsSync(path) ? readFileSync(path) : null;
    total += next.length;
    if (prev?.equals(next)) continue;
    changed++;
    rows.push({ id, before: prev ? `data:image/webp;base64,${prev.toString('base64')}` : null, after: url });
    if (check) console.log(`ICON ${id} differs from its model`);
    else writeFileSync(path, next);
  }
  if (sheet && rows.length) writeFileSync(sheet, bytes(await page.evaluate((r) => (window as any).sheet(r) as Promise<string>, rows)));
  await close();
  console.log(`ICONS3D ${ids.length} icons from models, ${changed} ${check ? 'differ' : 'updated'}, ${(total / 1024).toFixed(0)} KB in all`);
  if (check && changed) process.exit(1);
}
