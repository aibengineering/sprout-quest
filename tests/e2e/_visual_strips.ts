// Frame strips for every crafting/building scene on a virtual clock, plus landing-accuracy and framing metrics.
// WIDTH=390|320 ONLY=id,id bun run tests/e2e/_visual_strips.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { OUT, launch, boot, open, close, tile, sceneInfo, CRAFT_PRESENTATIONS, BUILD_PRESENTATIONS, server } from './_visual_lib';

const W = Number(process.env.WIDTH ?? 390), H = W === 320 ? 640 : 844;
const STEP = 1000 / 30;
const ids = process.env.ONLY ? process.env.ONLY.split(',') : [...Object.keys(CRAFT_PRESENTATIONS), ...Object.keys(BUILD_PRESENTATIONS)];
mkdirSync(`${OUT}strips/`, { recursive: true }); mkdirSync(`${OUT}done/`, { recursive: true });
const errors: string[] = [];
const browser = await launch();
const results: any[] = [];
try {
  const page = await boot(browser, W, H, errors);
  for (const id of ids) {
    const info = sceneInfo(id);
    const dur = info.pres.duration;
    try {
      await open(page, id, true);
      await page.evaluate((parts) => {
        const w = window as any;
        const qa = w.__qa = { flights: [] as any[], lands: [] as any[], pending: [] as any[], prevImg: null as ImageData | null, prevLayers: '', firstPaint: null as number | null, t0: w.__vc.t, parts };
        const alphaBox = (img: ImageData, ref?: ImageData) => {
          let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
          const d = img.data, r = ref?.data;
          for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            const on = r ? (Math.abs(d[i] - r[i]) + Math.abs(d[i + 1] - r[i + 1]) + Math.abs(d[i + 2] - r[i + 2]) + Math.abs(d[i + 3] - r[i + 3]) > 60) : d[i + 3] > 8;
            if (on) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          return n ? { x0, y0, x1, y1, n } : null;
        };
        w.__alphaBox = alphaBox;
        qa.tick = () => {
          const cv = document.querySelector('.craft-model') as HTMLCanvasElement | null;
          const scene = document.querySelector('.craft-scene') as HTMLElement | null;
          if (!cv || !scene) return;
          const t = w.__vc.t - qa.t0;
          const dpr = cv.width / cv.clientWidth;
          const sr = scene.getBoundingClientRect(), cr = cv.getBoundingClientRect();
          document.querySelectorAll<HTMLElement>('.craft-flight:not(.trail):not([data-qa])').forEach((el) => {
            el.dataset.qa = '1';
            const a = el.getAnimations()[0];
            const kf = (a.effect as KeyframeEffect).getKeyframes();
            const p = (s: string) => { const m = /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)/.exec(s)!; return { x: +m[1] + 24, y: +m[2] + 24 }; };
            const land = p(String(kf[3].transform)), from = p(String(kf[0].transform));
            qa.flights.push({ material: el.classList[1], part: qa.parts[qa.flights.length], t: Math.round(t), land: { x: land.x + sr.x - cr.x, y: land.y + sr.y - cr.y }, fromPage: { x: from.x + sr.x, y: from.y + sr.y } });
          });
          const ctx = cv.getContext('2d')!;
          const img = ctx.getImageData(0, 0, cv.width, cv.height);
          if (qa.firstPaint === null && alphaBox(img)) qa.firstPaint = Math.round(t);
          const layers = cv.dataset.layers ?? '';
          if (layers !== qa.prevLayers) {
            const added = layers.split(' ').filter((l) => l && !qa.prevLayers.split(' ').includes(l));
            for (const l of added) if (qa.prevImg && !document.querySelector('.craft-ready')) qa.pending.push({ layer: l, t: Math.round(t), due: t + 450, before: qa.prevImg });
            qa.prevLayers = layers;
          }
          for (const p of [...qa.pending]) if (t >= p.due) {
            qa.pending.splice(qa.pending.indexOf(p), 1);
            const box = alphaBox(img, p.before);
            const f = qa.flights.find((f: any) => f.part === p.layer);
            const res: any = { layer: p.layer, t: p.t, box: box && { x0: box.x0 / dpr, y0: box.y0 / dpr, x1: box.x1 / dpr, y1: box.y1 / dpr, n: box.n } };
            if (f && box) {
              const lx = f.land.x * dpr, ly = f.land.y * dpr;
              const dx = Math.max(box.x0 - lx, 0, lx - box.x1), dy = Math.max(box.y0 - ly, 0, ly - box.y1);
              res.miss = Math.round(Math.hypot(dx, dy) / dpr);
              res.land = { x: Math.round(f.land.x), y: Math.round(f.land.y) };
              const i = (Math.round(ly) * img.width + Math.round(lx)) * 4;
              res.onPixel = lx >= 0 && ly >= 0 && lx < img.width && ly < img.height && img.data[i + 3] > 8;
              res.inCanvas = f.land.x >= 0 && f.land.y >= 0 && f.land.x <= cv.clientWidth && f.land.y <= cv.clientHeight;
            }
            qa.lands.push(res);
          }
          qa.prevImg = img;
        };
      }, info.flights.map(f => f.part));
      const frameTimes = Array.from({ length: 10 }, (_, k) => Math.round(k * dur / 9));
      frameTimes.push(dur + 150, dur + 2200);
      const shots: { buf: Buffer; label: string }[] = [];
      let t = 0, readyAt: number | null = null, fi = 0, peakBox: any = null, readyBox: any = null;
      const clip = async () => page.evaluate(() => {
        const s = document.querySelector('.sheet.crafting')!.getBoundingClientRect();
        const h = document.querySelector('.craft-heading')!.getBoundingClientRect(), b = document.querySelector('.craft-bag')!.getBoundingClientRect();
        return { x: Math.max(0, s.x), y: Math.max(0, h.y - 4), width: Math.min(innerWidth, s.width), height: Math.min(innerHeight, b.bottom + 4) - Math.max(0, h.y - 4) };
      });
      while (fi < frameTimes.length) {
        await page.evaluate((s) => { (window as any).__vc.step(s); (window as any).__qa.tick(); }, STEP);
        t += STEP;
        if (readyAt === null && await page.$('.craft-ready')) readyAt = Math.round(t);
        if (t >= frameTimes[fi]) {
          const stage = await page.evaluate(() => document.querySelector('.craft-scene')?.getAttribute('data-stage'));
          const c = await clip();
          shots.push({ buf: await page.screenshot({ clip: c }), label: `${id} ${W} t=${Math.round(t)} ${stage}` });
          if (fi === 10) {
            readyBox = await page.evaluate(() => { const cv = document.querySelector('.craft-model') as HTMLCanvasElement; return { box: (window as any).__alphaBox(cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)), w: cv.width, h: cv.height, rect: cv.getBoundingClientRect().toJSON(), vw: innerWidth }; });
            await page.screenshot({ path: `${OUT}done/${id}-${W}.png` });
          }
          if (fi === 11) peakBox = await page.evaluate(() => { const cv = document.querySelector('.craft-model') as HTMLCanvasElement; return { box: (window as any).__alphaBox(cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)), w: cv.width, h: cv.height }; });
          fi++;
        }
      }
      const qa = await page.evaluate(() => { const q = (window as any).__qa; return { flights: q.flights, lands: q.lands, firstPaint: q.firstPaint, layers: document.querySelector<HTMLCanvasElement>('.craft-model')?.dataset.layers }; });
      await tile(page, shots, 6, 0.5, `${OUT}strips/${id}-${W}.png`);
      await page.evaluate(() => (window as any).__vc.disable());
      await close(page);
      const r = { id, W, dur, readyAt, firstPaintVirtual: qa.firstPaint, flights: qa.flights.length, lands: qa.lands, readyBox, peakBox, finalLayers: qa.layers };
      results.push(r);
      const bad = qa.lands.filter((l: any) => l.miss > 6 || l.inCanvas === false || !l.box);
      console.log(`${id} ${W}: ready=${readyAt} paint=${qa.firstPaint} lands=${qa.lands.length}/${qa.flights.length} misses=${JSON.stringify(bad.map((b: any) => [b.layer, b.miss, b.inCanvas]))}`);
    } catch (e) {
      console.log(`ERR ${id} ${W}: ${e}`);
      results.push({ id, W, error: String(e) });
      await page.evaluate(() => (window as any).__vc?.disable()).catch(() => {});
      await page.evaluate(() => (window as any).game.ui.closeMenu(true)).catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
} finally {
  writeFileSync(`${OUT}strips-${W}${process.env.ONLY ? '-only' : ''}.json`, JSON.stringify({ results, errors }, null, 1));
  console.log(`errors: ${errors.length}\n${errors.slice(0, 20).join('\n')}`);
  await browser.close(); server.stop(true);
}
