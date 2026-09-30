// Item-scoped equipped-model QA. Run with bun; does not change shared smoke scenarios.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';

const ids = ['stonesword', 'stonehammer', 'jellywhip', 'jellywand'];
const out = 'tests/e2e/out/stone-jelly';
mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const width of [390, 320]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://localhost:${server.port}/?preset=poppy-done`);
    await page.waitForFunction(() => (window as any).game?.mode === 'world', null, { timeout: 60000 });
    await page.evaluate(() => {
      const g = (window as any).game;
      g.save.owned.push('stonesword', 'stonehammer', 'jellywhip', 'jellywand');
      g.save.tips.push('teach:skill:sword', 'teach:skill:hammer', 'teach:skill:whip', 'teach:skill:wand', 'teach:riposte', 'teach:stagger', 'teach:snare', 'teach:blink');
      g.over.roamers.calm = 9999;
    });
    for (const id of ids) {
      await page.evaluate((id) => { (window as any).game.save.equip.weapon = id; }, id);
      await page.waitForTimeout(1600);
      const before = await page.evaluate(() => (window as any).game.modelStats.renders);
      if (before <= 0) throw new Error('No WebGL model renders');
      await page.screenshot({ path: `${out}/${width}-${id}-carried.png` });
      await page.evaluate(() => (window as any).game.fight('bunny', 3, 1));
      await page.waitForFunction(() => (window as any).game.mode === 'battle' && !!(window as any).game.battle, null, { timeout: 20000 });
      await page.evaluate(() => {
        const b = (window as any).game.battle;
        for (const e of b.enemies) { e.hp = e.maxHp = 1e6; e.stun = 999; e.x = b.p.x; e.y = b.p.y - 60; }
        b.p.face = -Math.PI / 2;
      });
      await page.waitForFunction(() => (window as any).game.battle?.intro <= 0, null, { timeout: 30000 });
      const weapon = await page.evaluate(() => (window as any).game.battle.weapon.id);
      if (weapon !== id) throw new Error(`Expected ${id} equipped in battle, got ${weapon}`);
      await page.screenshot({ path: `${out}/${width}-${id}-held.png` });
      await page.keyboard.down('KeyJ');
      await page.waitForFunction(() => (window as any).game.battle.log.swings > 0, null, { timeout: 10000 });
      await page.waitForTimeout(id === 'stonehammer' ? 360 : id === 'jellywhip' ? 170 : 120);
      await page.screenshot({ path: `${out}/${width}-${id}-attack.png` });
      await page.keyboard.up('KeyJ');
      const after = await page.evaluate(() => (window as any).game.modelStats.renders);
      if (after <= before) throw new Error(`${id}: no additional model renders in battle`);
      await page.evaluate(() => {
        const b = (window as any).game.battle;
        for (const e of b.enemies) if (!e.dead) { e.hp = 0; b.kill(e); }
      });
      for (let tries = 0; tries < 60; tries++) {
        for (const button of await page.$$('#modal:not([hidden]) .sheet:not(.menu) [data-dialog]:last-of-type')) await button.click();
        if (await page.evaluate(() => (window as any).game.mode === 'world' && !(window as any).game.battle)) break;
        await page.waitForTimeout(250);
      }
      await page.waitForFunction(() => (window as any).game.mode === 'world' && !(window as any).game.battle);
      console.log(`PASS ${width}px ${id}: carried, held, attack, WebGL renders ${before} → ${after}`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.stop(true);
}
