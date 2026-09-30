// Item-local visual QA. Run: CHROMIUM_PATH=/usr/bin/chromium bun run tests/e2e/metal-armors.ts
// Screenshots stay local in the ignored e2e output folder.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';

const ids = ['coppermail', 'ironplate', 'crystalmail'];
const weapons = ['ironsword', 'ironhammer', 'batwhip', 'batwand'];
const out = new URL('./out/metal-armors/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const failures: string[] = [];
try {
  for (const width of [390, 320]) for (const id of ids) for (const weapon of width === 320 ? weapons.slice(0, 1) : weapons) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    const label = `${id}-${weapon}-${width}`;
    try {
      await page.goto(`http://localhost:${server.port}/?preset=sandbox`);
      await page.waitForFunction(() => (window as any).game?.mode === 'world', {}, { timeout: 60000 });
      await page.evaluate(([armor, weapon]) => {
        const g = (window as any).game;
        g.save.equip.armor = armor;
        g.save.equip.weapon = weapon;
        g.over.face = Math.PI / 2;
        g.zoom = 2.8;
      }, [id, weapon]);
      await page.waitForTimeout(1600);
      const before = await page.evaluate(() => (window as any).game.modelStats.renders);
      if (!before) throw new Error('No WebGL renders on the map');
      await page.screenshot({ path: `${out}${label}-equipped.png` });
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(300);
      await page.keyboard.up('KeyD');
      await page.screenshot({ path: `${out}${label}-walk.png` });
      await page.evaluate(() => (window as any).game.fight('golem', 8, 1));
      await page.waitForFunction(() => (window as any).game.mode === 'battle' && !!(window as any).game.battle, {}, { timeout: 20000 });
      await page.waitForTimeout(1800);
      const battleWeapon = await page.evaluate(() => (window as any).game.battle.weapon.id);
      if (battleWeapon !== weapon) throw new Error(`Battle froze wrong weapon: ${battleWeapon}`);
      await page.screenshot({ path: `${out}${label}-battle.png` });
      await page.keyboard.press('KeyJ');
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${out}${label}-attack.png` });
      const after = await page.evaluate(() => (window as any).game.modelStats.renders);
      if (after <= before) throw new Error('No further WebGL renders in battle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error('Horizontal page overflow');
      if (errors.length) throw new Error(errors.join(' | '));
      console.log(`PASS ${label}, ${after - before} subsequent model renders`);
    } catch (error) {
      failures.push(`${label}: ${error}`);
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  server.stop(true);
}
if (failures.length) throw new Error(failures.join('\n'));
console.log('All 15 equipped armor / weapon / phone checks passed.');
