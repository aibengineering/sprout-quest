// Renders Elder Oswin's broken old axe and pick (axe0.svg, pick0.svg) into the menu icons public/assets/icons/{axe0,pick0}.webp,
// and a compare.png beside the mended ones: bun art/broken-tools/render.ts
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
const R = '/home/ben/me/code/2609_game_test/public/assets/';
const OUT = import.meta.dir + '/';
const svg = (n: string) => 'data:image/svg+xml;base64,' + readFileSync(import.meta.dir + '/' + n + '.svg').toString('base64');
const webp = (n: string) => 'data:image/webp;base64,' + readFileSync(R + 'icons/' + n + '.webp').toString('base64');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 700, height: 300 }, deviceScaleFactor: 2 })).newPage();
const icons: Record<string, string> = await page.evaluate(async ({ a, p }) => {
  const out: Record<string, string> = {};
  for (const [name, src] of Object.entries({ axe0: a, pick0: p })) {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
    const s = Math.min(112 / img.naturalWidth, 112 / img.naturalHeight);
    g.drawImage(img, (128 - img.naturalWidth * s) / 2, (128 - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    out[name] = c.toDataURL('image/webp', 0.9);
  }
  return out;
}, { a: svg('axe0'), p: svg('pick0') });
for (const [n, d] of Object.entries(icons)) writeFileSync(R + 'icons/' + n + '.webp', Buffer.from(d.split(',')[1], 'base64'));
await page.setContent(`<body style="margin:0;background:#f6efe0;display:flex;gap:24px;padding:20px;align-items:center;font:12px sans-serif">
${['axe1', 'axe0', 'pick1', 'pick0'].map((n) => `<div style="text-align:center"><img src="${webp(n)}" width="128"><div>${n}</div></div>`).join('')}
<div style="background:#3a3346;padding:10px"><img src="${svg('axe0')}" height="220"><img src="${svg('pick0')}" height="220"></div></body>`);
await page.waitForTimeout(300);
await page.screenshot({ path: OUT + 'compare.png' });
await browser.close();
