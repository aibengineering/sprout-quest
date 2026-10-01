// Title screen: time to buttons and the loading messages (incl. "Laying out the workbench…") under a few conditions.
import { writeFileSync } from 'node:fs';
import { OUT, launch, server } from './_visual_lib';

const browser = await launch();
const runs: any[] = [];
const conds = [
  { name: 'desktop', cpu: 1 },
  { name: 'cpu4x', cpu: 4 },
  { name: 'cpu4x+4G(9Mbps,60ms)', cpu: 4, net: { latency: 60, downloadThroughput: 9e6 / 8, uploadThroughput: 3e6 / 8 } },
  { name: 'cpu4x+slow(1.6Mbps,150ms)', cpu: 4, net: { latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 } },
];
try {
  for (const c of conds) {
    for (const width of c.name === 'desktop' ? [390, 320] : [390]) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 320 ? 640 : 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(String(e)));
      await ctx.addInitScript(() => {
        const w = window as any; w.__log = [] as [number, string, string][];
        const watch = () => {
          const el = document.getElementById('load-text'), fill = document.getElementById('load-fill');
          if (!el) { requestAnimationFrame(watch); return; }
          const rec = () => w.__log.push([Math.round(performance.now()), el.textContent ?? '', fill?.style.width ?? '']);
          rec();
          new MutationObserver(rec).observe(el, { childList: true, characterData: true, subtree: true });
        };
        document.addEventListener('DOMContentLoaded', watch);
      });
      const cdp = await ctx.newCDPSession(page);
      if (c.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: c.cpu });
      if (c.net) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, ...c.net }); }
      const t0 = Date.now();
      await page.goto(`http://localhost:${server.port}/`, { waitUntil: 'commit' });
      let midShot = false;
      const deadline = Date.now() + 240000;
      while (Date.now() < deadline) {
        const txt = await page.textContent('#load-text').catch(() => '');
        if (!midShot && /workbench/.test(txt ?? '')) { midShot = true; await page.screenshot({ path: `${OUT}title-workbench-${c.name.replace(/[^a-z0-9]+/gi, '_')}-${width}.png` }); }
        if (await page.$('.title-btns:not([hidden])')) break;
        await page.waitForTimeout(50);
      }
      const wall = Date.now() - t0;
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}title-ready-${c.name.replace(/[^a-z0-9]+/gi, '_')}-${width}.png` });
      const log = await page.evaluate(() => (window as any).__log);
      const nav = await page.evaluate(() => (performance.getEntriesByType('navigation')[0] as any)?.responseStart);
      const bench = log.filter((l: any) => /workbench/.test(l[1]));
      const r = { cond: c.name, width, wallToButtons: wall, navResponseStart: Math.round(nav), benchFirst: bench[0], benchLast: bench[bench.length - 1], benchSteps: bench.length, benchMs: bench.length ? bench[bench.length - 1][0] - bench[0][0] : null, last: log[log.length - 1], phases: log.filter((l: any, i: number) => i === 0 || l[1].replace(/[\d.\s/]+(MB)?/g, '') !== log[i - 1][1].replace(/[\d.\s/]+(MB)?/g, '')), errors };
      runs.push(r);
      console.log(JSON.stringify(r));
      await ctx.close();
    }
  }
} finally {
  writeFileSync(`${OUT}title.json`, JSON.stringify(runs, null, 1));
  await browser.close(); server.stop(true);
}
