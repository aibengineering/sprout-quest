// Real Canvas regression for faint rectangular edges around tinted/flashed sprites at fractional scales.
// Run with: bun run tests/e2e/sprite-effects.ts
import { chromium } from 'playwright-core';

const bundle = await Bun.build({ entrypoints: ['src/assets.ts'], target: 'browser' });
if (!bundle.success) throw new Error(bundle.logs.join('\n'));
const js = await bundle.outputs[0].text();
const server = Bun.serve({
  port: 0,
  hostname: '127.0.0.1',
  fetch(req) {
    if (new URL(req.url).pathname === '/assets.js') return new Response(js, { headers: { 'content-type': 'text/javascript' } });
    return new Response('<script type="module">import { drawFrame } from "/assets.js"; window.drawFrame = drawFrame;</script>', { headers: { 'content-type': 'text/html' } });
  },
});

let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--disable-webgl', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => !!(window as any).drawFrame);
  const results = await page.evaluate(() => {
    const drawFrame = (window as any).drawFrame;
    const canvas = (w: number, h: number) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    };
    const frame = (w: number, h: number, solid = false) => {
      const img = canvas(w, h), ctx = img.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      if (solid) ctx.fillRect(0, 0, w, h);
      else ctx.fillRect(8, 8, w - 16, h - 16);
      return { img, x: 0, y: 0, w, h, ax: 0, ay: 0, ppu: 1 };
    };
    const target = canvas(220, 220), ctx = target.getContext('2d')!;
    const reference = canvas(220, 220), ref = reference.getContext('2d')!;
    const large = frame(160, 160, true);
    const results: { effect: string; scale: number; w: number; h: number; strayPixels: number; alphaChanges: number }[] = [];
    for (const effect of ['tint', 'flash']) for (const scale of [0.73, 1.31]) for (const [w, h] of [[32, 32], [48, 28], [28, 48]]) {
      // A larger character's hit flash leaves opaque white pixels beyond the next monster's image.
      drawFrame(ctx, large, 0, 0, 1, { flash: 1 });
      ctx.clearRect(0, 0, target.width, target.height);
      ref.clearRect(0, 0, reference.width, reference.height);
      const small = frame(w, h);
      drawFrame(ref, small, 10.3, 10.3, scale);
      drawFrame(ctx, small, 10.3, 10.3, scale, effect === 'tint' ? { tint: '#ff4a4a', tintAmount: 0.2 } : { flash: 0.7 });
      const got = ctx.getImageData(0, 0, target.width, target.height).data;
      const expected = ref.getImageData(0, 0, reference.width, reference.height).data;
      let strayPixels = 0, alphaChanges = 0;
      for (let i = 3; i < got.length; i += 4) {
        if (got[i] && !expected[i]) strayPixels++;
        if (got[i] !== expected[i]) alphaChanges++;
      }
      results.push({ effect, scale, w, h, strayPixels, alphaChanges });
    }
    return results;
  });
  for (const result of results) {
    if (result.strayPixels || result.alphaChanges) throw new Error(`Sprite effect changed its silhouette: ${JSON.stringify(result)}`);
  }
  console.log(`PASS: ${results.length} tinted/flashed sprites preserve transparency after a larger hit flash at fractional scales`);
} finally {
  await browser?.close();
  server.stop(true);
}
