// Scoped browser QA for the four charms. Coordinator wiring must be present for assembly mode.
// CHROMIUM_PATH=/usr/bin/chromium bun tests/e2e/charms.ts [--icons-only] [--shots]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { GEAR } from '../../src/data';
import { startServer } from '../../server';

const ids = ['clovercharm', 'toothcharm', 'crystalheart', 'impring'];
const iconsOnly = process.argv.includes('--icons-only');
const shots = process.argv.includes('--shots');
const out = new URL('./out/charms/', import.meta.url).pathname;
if (shots) mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors: string[] = [];
try {
  for (const mode of (iconsOnly ? ['icons'] : ['normal', 'skip', 'reduced'])) {
    const context = await browser.newContext({ viewport: { width: mode === 'reduced' || iconsOnly ? 320 : 390, height: mode === 'reduced' || iconsOnly ? 568 : 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://localhost:${server.port}/?preset=poppy-done`);
    await page.waitForFunction(() => (window as any).game?.mode === 'world', undefined, { timeout: 60_000 });
    await page.evaluate(() => {
      const g = (window as any).game;
      Object.assign(g.save, { lv: 25, quest: g.quests.findIndex((q: any) => q.id === 'cottage'), crafted: 1 });
      g.save.build.forge = 5;
      g.save.equip.charm = null;
      g.save.equip.weapon = 'twig';
    });
    for (const id of ids) {
      const recipe = GEAR[id].recipe!;
      await page.evaluate(({ id, recipe }) => {
        const g = (window as any).game;
        g.save.owned = g.save.owned.filter((owned: string) => owned !== id);
        for (const [mat, cost] of Object.entries(recipe)) g.save.mats[mat] = cost + 7;
        g.ui.closeMenu();
        void g.ui.hooks.craftGear(id);
      }, { id, recipe });
      await page.waitForSelector(iconsOnly ? '[data-dialog="equip"]' : '.sheet.crafting');
      if (iconsOnly) {
        await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('.sheet img')].every(img => img.complete && img.naturalWidth > 0));
        await page.waitForTimeout(900);
      }
      if (!iconsOnly) {
        if (mode === 'normal') {
          await page.waitForSelector('.craft-flight');
          if (shots) await page.screenshot({ path: `${out}${id}-assembly.png` });
        }
        if (mode === 'skip') await page.keyboard.press('Escape');
        await page.waitForSelector('.craft-ready', { timeout: 10_000 });
        if (mode === 'reduced' && await page.locator('.craft-flight').count()) throw new Error(`${id}: reduced-motion flights`);
      }
      for (const [mat, cost] of Object.entries(recipe)) {
        const actual = await page.evaluate(mat => (window as any).game.save.mats[mat], mat);
        if (actual !== 7) throw new Error(`${id}: ${mat} charged incorrectly (${actual}; cost ${cost})`);
        if (!iconsOnly && await page.locator(`[data-count="${mat}"]`).textContent() !== '7') throw new Error(`${id}: displayed bag count differs`);
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${id}: horizontal phone overflow`);
      await page.locator('[data-dialog="equip"]').scrollIntoViewIfNeeded();
      const button = await page.locator('[data-dialog="equip"]').boundingBox();
      if (!button || button.y < 0 || button.y + button.height > page.viewportSize()!.height) throw new Error(`${id}: unreachable equip choice`);
      if (shots) await page.screenshot({ path: `${out}${id}-${mode}-complete.png` });
      await page.click('[data-dialog="equip"]');
      await page.waitForFunction(id => (window as any).game.save.equip.charm === id, id);
      const state = await page.evaluate(({ id, recipe }) => {
        const s = (window as any).game.save;
        return { copies: s.owned.filter((owned: string) => owned === id).length, counts: Object.keys(recipe).map(mat => s.mats[mat]) };
      }, { id, recipe });
      if (state.copies !== 1 || state.counts.some(n => n !== 7)) throw new Error(`${id}: equipping duplicated ownership or cost`);
      await page.evaluate(() => (window as any).game.ui.closeMenu());
      console.log(`PASS ${id}: ${mode}, recipe once, equipped, phone controls reachable`);
    }
    await page.waitForTimeout(500);
    if (!(await page.evaluate(() => (window as any).game.modelStats.renders > 0))) throw new Error('Hero was not rendered in WebGL');
    if (shots) await page.screenshot({ path: `${out}equipped-${mode}-world.png` });
    await context.close();
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
  server.stop(true);
}
