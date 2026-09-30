// Item-local equipped-art check. CRYSTAL_QA_OUT may point outside the repository.
// CHROMIUM_PATH=/usr/bin/chromium bun run tests/e2e/crystalGlimmer.ts
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';
const ids = ['crystalsword', 'crystalhammer', 'glimmerwhip', 'glimmerwand'];
const out = process.env.CRYSTAL_QA_OUT ?? 'tests/e2e/out/crystal-glimmer';
mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors: string[] = [];
try {
  for (const width of [390, 320]) {
    for (const id of ids) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
      const loaded = new Set<string>();
      page.on('response', r => { if (r.status() === 200) loaded.add(r.url()); });
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' && /model/.test(m.text()) && !/Failed to fetch/.test(m.text())) errors.push(m.text()); });
      await page.goto(`http://localhost:${server.port}/?preset=poppy-done`);
      await page.waitForFunction('window.game?.mode === "world"', undefined, { timeout: 60000 });
      const response = [...loaded].some(url => url.endsWith(`/models/wpn_${id}.glb`)) ? Promise.resolve() : page.waitForResponse(r => r.url().endsWith(`/models/wpn_${id}.glb`) && r.status() === 200, { timeout: 30000 });
      await page.evaluate(id => {
        const g = (window as any).game;
        if (!g.save.owned.includes(id)) g.save.owned.push(id);
        g.save.equip.weapon = id;
      }, id);
      // Models may have been prewarmed by this preset; loading either way is checked below.
      await response;
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${out}/${width}-${id}-carried.png` });
      await page.evaluate(() => (window as any).game.fight('bunny', 3, 2));
      await page.waitForFunction('window.game?.mode === "battle" && !!window.game.battle', undefined, { timeout: 20000 });
      await page.evaluate(() => {
        const b = (window as any).game.battle;
        for (const e of b.enemies) { e.hp = e.maxHp = 1e6; e.stun = 99; e.x = b.p.x + 80; e.y = b.p.y; }
        b.p.face = 0;
      });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${out}/${width}-${id}-held.png` });
      // Freeze the real attack pose at contact so a screenshot cannot miss its short active window.
      await page.evaluate(() => {
        const b = (window as any).game.battle;
        b.startSwing(b.moves.combo[0], false, false);
        b.p.swing.t = b.p.swing.s.windup + b.p.swing.s.active * .5;
        b.hitstop = 1;
      });
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${out}/${width}-${id}-attack.png` });
      const stats = await page.evaluate(() => (window as any).game.modelStats);
      if (!(stats.renders > 0)) throw new Error(`No WebGL model renders: ${id}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`Page overflows at ${width}px: ${id}`);
      console.log(`PASS ${width}px ${id}: carried, held, attack, no page overflow, ${stats.renders} model renders`);
      await page.close();
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); server.stop(true); }
