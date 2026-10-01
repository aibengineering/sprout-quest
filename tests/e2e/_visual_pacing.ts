// Real-time start latency and rAF pacing per scene (optionally CPU-throttled via CDP).
// WIDTH=390 THROTTLE=4 ONLY=id,id bun run tests/e2e/_visual_pacing.ts
import { writeFileSync } from 'node:fs';
import { OUT, launch, boot, open, close, sceneInfo, CRAFT_PRESENTATIONS, BUILD_PRESENTATIONS, server } from './_visual_lib';

const W = Number(process.env.WIDTH ?? 390), H = W === 320 ? 640 : 844, TH = Number(process.env.THROTTLE ?? 1);
const ids = process.env.ONLY ? process.env.ONLY.split(',') : [...Object.keys(CRAFT_PRESENTATIONS), ...Object.keys(BUILD_PRESENTATIONS)];
const errors: string[] = [];
const browser = await launch();
const rows: any[] = [];
try {
  const page = await boot(browser, W, H, errors, 2);
  const cdp = await page.context().newCDPSession(page);
  // Idle world pacing first, as a baseline.
  const world = async () => page.evaluate(() => new Promise<number[]>((res) => { const d: number[] = []; let last = 0; const f = (t: number) => { if (last) d.push(t - last); last = t; if (d.length < 120) requestAnimationFrame(f); else res(d); }; requestAnimationFrame(f); }));
  if (TH > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: TH });
  const base = await world();
  for (const id of ids) {
    const info = sceneInfo(id);
    try {
      await page.evaluate(() => {
        const w = window as any;
        const m = w.__mon = { deltas: [] as number[], times: [] as number[], firstModal: null as number | null, firstCanvas: null as number | null, firstPaint: null as number | null, firstLand: null as number | null, ready: null as number | null, initLayers: null as string | null, stop: false };
        const small = document.createElement('canvas'); small.width = small.height = 24;
        const sc = small.getContext('2d', { willReadFrequently: true })!;
        let last = 0;
        const f = (t: number) => {
          if (m.stop) return;
          if (last) { m.deltas.push(t - last); m.times.push(t); }
          last = t;
          const now = performance.now();
          if (m.firstModal === null && document.querySelector('.sheet.crafting')) m.firstModal = now;
          const cv = document.querySelector('.craft-model') as HTMLCanvasElement | null;
          if (cv && m.firstCanvas === null) { m.firstCanvas = now; m.initLayers = cv.dataset.layers ?? ''; }
          if (cv && m.firstPaint === null && cv.width) {
            sc.clearRect(0, 0, 24, 24); sc.drawImage(cv, 0, 0, 24, 24);
            const d = sc.getImageData(0, 0, 24, 24).data; let n = 0;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
            if (n > 2) m.firstPaint = now;
          }
          if (cv && m.firstLand === null && m.initLayers !== null && (cv.dataset.layers ?? '') !== m.initLayers) m.firstLand = now;
          if (m.ready === null && document.querySelector('.craft-ready')) m.ready = now;
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      });
      await open(page, id);
      await page.waitForSelector('.craft-ready', { timeout: 60000 });
      await page.waitForTimeout(800); // a little of the sway
      const m = await page.evaluate(() => { const w = window as any; w.__mon.stop = true; return { ...w.__mon, t0: w.__t0 }; });
      await close(page);
      const during = m.deltas.filter((_: number, i: number) => m.times[i] >= m.t0 && m.times[i] <= (m.ready ?? Infinity));
      const sway = m.deltas.filter((_: number, i: number) => m.times[i] > (m.ready ?? Infinity));
      const stats = (d: number[]) => { const s = [...d].sort((a, b) => a - b); return { n: d.length, p50: +(s[Math.floor(s.length / 2)] ?? 0).toFixed(1), p95: +(s[Math.floor(s.length * 0.95)] ?? 0).toFixed(1), max: +(s[s.length - 1] ?? 0).toFixed(1), over25: d.filter(x => x > 25).length, over50: d.filter(x => x > 50).length, dropped: Math.round(d.reduce((a, x) => a + Math.max(0, Math.round(x / 16.67) - 1), 0)) }; };
      const firstFlight = info.flights[0];
      const r = {
        id, W, TH, dur: info.pres.duration,
        modal: m.firstModal && Math.round(m.firstModal - m.t0),
        canvas: m.firstCanvas && Math.round(m.firstCanvas - m.t0),
        paint: m.firstPaint && Math.round(m.firstPaint - m.t0),
        land: m.firstLand && Math.round(m.firstLand - m.t0), landExpected: firstFlight.at + firstFlight.duration,
        ready: m.ready && Math.round(m.ready - m.t0),
        initLayers: m.initLayers,
        build: stats(during), sway: stats(sway),
      };
      rows.push(r);
      console.log(JSON.stringify(r));
    } catch (e) {
      console.log(`ERR ${id}: ${e}`); rows.push({ id, error: String(e) });
      await page.evaluate(() => (window as any).game.ui.closeMenu(true)).catch(() => {});
    }
  }
  const after = await world();
  const st = (d: number[]) => { const s = [...d].sort((a, b) => a - b); return { p50: s[60].toFixed(1), p95: s[114].toFixed(1), max: s[119].toFixed(1) }; };
  console.log('world before', st(base), 'after', st(after));
  rows.push({ worldBefore: st(base), worldAfter: st(after) });
} finally {
  writeFileSync(`${OUT}pacing-${W}-x${TH}${process.env.ONLY ? '-only' : ''}.json`, JSON.stringify({ rows, errors }, null, 1));
  console.log(`errors: ${errors.length}\n${errors.slice(0, 20).join('\n')}`);
  await browser.close(); server.stop(true);
}
