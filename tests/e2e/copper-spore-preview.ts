// Item-owned visual QA. Uses the real WebGL renderer and attachment/combat code.
// Run: CHROMIUM_PATH=/usr/bin/chromium bun tests/e2e/copper-spore-preview.ts
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';
const ids = ['coppersword', 'copperhammer', 'sporewhip', 'sporewand'];
const out = new URL('./out/copper-spore/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors: string[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const loaded = new Set<string>();
  page.on('response', r => { if (r.status() === 200) { const id = /wpn_([^/]+)\.glb/.exec(r.url())?.[1]; if (id) loaded.add(id); } });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /model/.test(m.text()) && !/Failed to fetch/.test(m.text()))) errors.push(m.text()); });
  await page.goto(`http://localhost:${server.port}/?preset=sandbox`);
  await page.waitForFunction(() => (window as any).game?.mode === 'world', undefined, { timeout: 60000 });
  await page.evaluate(() => {
    const g = (window as any).game;
    g.over.teleport(34.5, 12.5);
    g.save.equip.armor = 'fluffvest';
    g.save.owned.push('coppersword', 'copperhammer', 'sporewhip', 'sporewand');
    for (const m of Object.values(g.save.mastery) as any[]) m.lv = 10;
  });
  await page.waitForTimeout(1500);
  for (const id of ids) {
    await page.evaluate(id => { (window as any).game.save.equip.weapon = id; }, id);
    if (!loaded.has(id)) await page.waitForResponse(r => r.url().endsWith(`/wpn_${id}.glb`) && r.status() === 200);
    await page.evaluate(() => { (window as any).game.over.face = Math.PI; });
    await page.waitForTimeout(2000);
    const renders = await page.evaluate(() => (window as any).game.modelStats.renders);
    if (renders <= 0) throw new Error('WebGL did not render');
    await page.screenshot({ path: `${out}${id}-map.png` });
    await page.evaluate(() => (window as any).game.fight('bunny', 3, 2));
    await page.waitForFunction(() => { const g = (window as any).game; return g.mode === 'battle' && g.battle?.intro <= 0; }, undefined, { timeout: 30000 });
    await page.evaluate(() => { const g = (window as any).game; g.battle.p.face = Math.PI / 4; for (const e of g.battle.enemies) e.stun = 60; });
    await page.screenshot({ path: `${out}${id}-held.png` });
    await page.keyboard.down('KeyJ');
    await page.waitForFunction(() => !!(window as any).game.battle?.p.swing, undefined, { timeout: 10000 });
    // Freeze one meaningful active pose so slow software WebGL can capture it.
    await page.evaluate(() => {
      const b = (window as any).game.battle;
      b.p.swing.t = b.p.swing.s.windup + b.p.swing.s.active * .65;
      b.hitstop = 60;
    });
    await page.screenshot({ path: `${out}${id}-attack.png` });
    await page.keyboard.up('KeyJ');
    await page.evaluate(() => { const b = (window as any).game.battle; b.hitstop = 0; b.p.swing = null; });
    // Run can fail randomly; retry through the real button rather than mutate game mode.
    for (let attempt = 0; attempt < 8 && await page.evaluate(() => (window as any).game.mode === 'battle'); attempt++) {
      await page.keyboard.press('KeyR');
      await page.waitForTimeout(1800);
    }
    await page.waitForFunction(() => (window as any).game.mode === 'world', undefined, { timeout: 20000 });
    await page.waitForTimeout(800);
    console.log(`PASS ${id}: real WebGL map/held/attack previews`);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.screenshot({ path: `${out}mobile-320.png` });
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); server.stop(true); }
