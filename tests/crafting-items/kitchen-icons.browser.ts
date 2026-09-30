// Local visual/layout evidence for canonical meal icons. Does not provide a private crafting renderer.
// CHROMIUM_PATH=/usr/bin/chromium bun run tests/crafting-items/kitchen-icons.browser.ts
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { startServer } from '../../server';

const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--disable-webgl', '--disable-gpu'] });
const out = new URL('../e2e/out/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
try {
  for (const [width, height, before] of [[320, 568, true], [320, 568, false], [390, 844, false], [900, 700, false]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (before) await page.route('**/assets/icons/meal_*.webp', async (route) => {
      const name = new URL(route.request().url()).pathname.split('/').pop();
      await route.fulfill({ contentType: 'image/webp', body: execFileSync('git', ['show', `f71d591:public/assets/icons/${name}`]) });
    });
    await page.goto(`http://localhost:${server.port}/`);
    await page.waitForSelector('.title-btns:not([hidden])');
    await page.evaluate(() => {
      const g = (window as any).game;
      const s = g.save;
      Object.assign(s, { flags: ['sword', 'glade1', 'glade2', 'village', 'bram:stew'], quest: g.quests.findIndex((q: any) => q.id === 'cottage'), lv: 4, tips: ['moved', 'chopped', 'mined'] });
      s.stories.poppy = 6;
      s.pos = { x: 31.8, y: 11.2 };
      Object.assign(s.mats, { goo: 50, fluff: 50, clover: 50, pine: 50, cap: 50 });
      localStorage.setItem('sprout-quest-save', JSON.stringify(s));
    });
    await page.reload();
    await page.waitForSelector('.title-btns:not([hidden])');
    await page.click('#btn-continue');
    await page.waitForTimeout(2200);
    for (let i = 0; i < 8; i++) {
      const button = page.locator('#modal:not([hidden]) [data-dialog]').last();
      if (!await button.count()) break;
      await button.click();
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => {
      const g = (window as any).game;
      g.mode = 'dialog';
      void g.ui.kitchen(g.save, 'Sit down, sit down! What’ll it be, dear?');
    });
    await page.waitForSelector('.kitchen .mcard');
    await page.waitForTimeout(600);
    const metrics = await page.evaluate(() => {
      const sheet = document.querySelector<HTMLElement>('#modal .sheet')!;
      const cards = [...document.querySelectorAll<HTMLElement>('.kitchen .mcard')];
      const imgs = cards.map((card) => card.querySelector<HTMLImageElement>('.ico img'));
      return { width: sheet.clientWidth, overflow: sheet.scrollWidth > sheet.clientWidth + 1,
        cards: cards.length, loaded: imgs.every((img) => img?.complete && img.naturalWidth === 128),
        mats: { ...(window as any).game.save.mats } };
    });
    if (metrics.cards !== 4 || !metrics.loaded || metrics.overflow || errors.length) throw new Error(JSON.stringify({ metrics, errors }));
    const stem = `consumables-kitchen-${before ? 'before' : 'after'}-${width}x${height}`;
    await page.screenshot({ path: `${out}${stem}.png` });
    await page.locator('[data-dialog="cook:stew"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}${stem}-stew.png` });
    console.log(`PASS ${stem}: four 128px meal icons decoded, no horizontal overflow or page errors`);
    await context.close();
  }
} finally {
  await browser.close();
  server.stop();
}
