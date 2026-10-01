// Real crafting transactions and the shared presentation on both phone layouts.
// CHROMIUM_PATH=/usr/bin/chromium bun run tests/e2e/crafting.ts
import { chromium, type Page } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';
import { GEAR, TOOLS, POTION_RECIPES, type Recipe } from '../../src/data';
import { MEALS } from '../../src/kitchen';
import { CRAFT_PRESENTATIONS } from '../../src/crafting/catalog';

const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--disable-webgl', '--disable-gpu'] });
const out = new URL('./out/combined-crafting/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const items = [...Object.values(GEAR).filter(g => g.recipe), ...TOOLS, ...POTION_RECIPES, ...Object.values(MEALS)];
const item = (id: string) => items.find(i => i.id === id)!;
const errors: string[] = [];

async function boot(width: number) {
  const page = await browser.newPage({ viewport: { width, height: width === 320 ? 568 : 844 }, hasTouch: true, isMobile: true });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${server.port}/?preset=sandbox`);
  await page.waitForFunction(() => (window as any).game?.mode === 'world', undefined, { timeout: 60000 });
  return page;
}

async function begin(page: Page, id: string, twice = false) {
  await page.evaluate(({ id, twice }) => {
    const g = (window as any).game, s = g.save;
    g.ui.closeMenu(true);
    s.owned = s.owned.filter((x: string) => x !== id);
    s.equip.weapon = 'twig'; s.equip.armor = 'tunic'; s.equip.charm = null;
    s.tools.wood = s.tools.mine = 0; s.potions = 0;
    for (const k in s.mats) s.mats[k] = 100;
    for (const k in s.mastery) s.mastery[k].lv = 10;
    for (const k in s.skills) s.skills[k].lv = 10;
    s.lv = 20; s.build.forge = 5; s.stories.poppy = 6; s.stories.drums = 4;
    for (const flag of ['oldtools', 'bram:pie', 'bram:stew', 'pip:candy', 'garden:berries']) if (!s.flags.includes(flag)) s.flags.push(flag);
    if (['pancakes', 'tea', 'goojelly', 'stew', 'rockcandy', 'tart'].includes(id)) {
      void g.grannyCooks(); // Granny's menu (in her Kitchen, asking her)
    } else {
      g.ui.openMenu({ atForge: true, inVillage: true }, 'forge');
      const method = /^(axe|pick)\d$/.test(id) ? 'craftTool' : ['jellypot', 'shroombrew', 'embertonic', 'herbtonic'].includes(id) ? 'craftPotion' : 'craftGear';
      void g.ui.hooks[method](id);
      if (twice) void g.ui.hooks[method](id);
    }
  }, { id, twice });
  if (id in MEALS) {
    await page.screenshot({ path: `${out}kitchen-${id}-${page.viewportSize()!.width}.png` });
    await page.locator(`[data-dialog="cook:${id}"]`).click();
  }
  await page.waitForSelector('.sheet.crafting');
  // The real spend and grant must already be durable while bundles are still flying.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sprout-quest-save' + (localStorage.getItem('sprout-quest-slot') ? ':' + localStorage.getItem('sprout-quest-slot') : ''))!));
  for (const [m, n] of Object.entries(item(id).recipe!)) if (saved.mats[m] !== 100 - n!) throw Error(`${id}: save-before-animation ${m}`);
  if (GEAR[id] && saved.owned.filter((x: string) => x === id).length !== 1) throw Error(`${id}: ownership not durable`);
  if (TOOLS.some(t => t.id === id)) { const t = TOOLS.find(t => t.id === id)!; if (saved.tools[t.skill] !== t.tier) throw Error(`${id}: tool not durable`); }
  if (POTION_RECIPES.some(p => p.id === id) && saved.potions !== 1) throw Error(`${id}: potion not durable`);
  if (id in MEALS && (saved.meal.id !== id || saved.meal.left !== MEALS[id as keyof typeof MEALS].seconds)) throw Error(`${id}: meal not durable`);
}

async function finish(page: Page, id: string, equip = true, fallback = false) {
  await page.waitForSelector('.craft-ready', { timeout: 15000 });
  if (await page.locator('.craft-fallback').isVisible() !== fallback) throw Error(`${id}: unexpected art fallback`);
  for (const [m, n] of Object.entries(item(id).recipe!)) if (await page.locator(`[data-count="${m}"]`).textContent() !== String(100 - n!)) throw Error(`${id}: animated count ${m}`);
  if (id === 'stew' && await page.locator('[data-part="pine-fuel"]').isVisible()) throw Error('Fuel remains on finished stew');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`${id}: phone overflow`);
  const choice = GEAR[id] ? (equip ? 'equip' : 'later') : 'ok';
  const button = page.locator(`[data-dialog="${choice}"]`);
  await button.scrollIntoViewIfNeeded();
  const rect = await button.boundingBox();
  if (!rect || rect.y < 0 || rect.y + rect.height > page.viewportSize()!.height + 1) throw Error(`${id}: action unreachable`);
  if (['fluffvest', 'ironsword', 'crystalmail', 'stew', 'tea', 'axe1', 'jellypot'].includes(id)) await page.screenshot({ path: `${out}${id}-${page.viewportSize()!.width}.png` });
  await button.click();
  await page.waitForSelector('#modal:not([hidden]) .sheet.crafting', { state: 'detached' });
  if (id in MEALS) {
    await page.waitForSelector('.sheet:not(.menu) [data-dialog]');
    await page.locator('.sheet:not(.menu) [data-dialog]').last().click();
  }
  await page.waitForTimeout(50);
  const saved = await page.evaluate(() => (window as any).game.save);
  if (GEAR[id] && saved.equip[GEAR[id].slot] !== (equip ? id : GEAR[id].slot === 'charm' ? null : GEAR[id].slot === 'armor' ? 'tunic' : 'twig')) throw Error(`${id}: keep/equip decision`);
  for (const [m, n] of Object.entries(item(id).recipe!)) if (saved.mats[m] !== 100 - n!) throw Error(`${id}: duplicate spend`);
  await page.evaluate(() => (window as any).game.ui.closeMenu(true));
}

try {
  if (Object.keys(CRAFT_PRESENTATIONS).length !== items.length) throw Error(`Expected a presentation for each of the ${items.length} craftable items`);
  // Parallel pages are independent saves, and each runs the actual normal timeline.
  await Promise.all([320, 390].map(async width => {
    const page = await boot(width);
    for (const id of (process.env.CRAFT_ONLY ? process.env.CRAFT_ONLY.split(',') : Object.keys(CRAFT_PRESENTATIONS))) {
      await begin(page, id, true);
      if (['tea', 'stew'].includes(id)) {
        const opacity = await page.locator('[data-part="steam"]').evaluate(e => getComputedStyle(e).opacity);
        if (opacity !== '0') throw Error(`${id}: steam visible before simmer`);
      }
      for (const prop of ['bottle', 'cup', 'pot', 'plate', 'existing-tool']) {
        const layer = page.locator(`[data-part="${prop}"]`);
        if (await layer.count() && await layer.evaluate(e => getComputedStyle(e).opacity) !== '1') throw Error(`${id}: initial ${prop} missing`);
      }
      await finish(page, id);
      console.log(`PASS ${width}px ${id}: normal timeline, save, single spend, decision`);
    }
    await page.close();
  }));
  const page = await boot(320);
  await begin(page, 'ironsword', true);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.craft-ready');
  if (await page.evaluate(() => (window as any).game.save.equip.weapon) !== 'twig') throw Error('Escape equipped gear');
  await finish(page, 'ironsword', false);
  await begin(page, 'axe1', true); await page.locator('[data-craft-skip]').click(); await finish(page, 'axe1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await begin(page, 'jellypot', true); await finish(page, 'jellypot');
  await begin(page, 'stew'); await finish(page, 'stew');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await begin(page, 'crystalmail');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await finish(page, 'crystalmail', false);
  await page.evaluate(() => { delete (document as any).hidden; });
  await page.route('**/crafting/batwand-*.webp', route => route.abort());
  await begin(page, 'batwand'); await finish(page, 'batwand', false, true);
  await page.unroute('**/crafting/batwand-*.webp');
  await begin(page, 'emberblade');
  await page.reload();
  await page.waitForFunction(() => !!(window as any).game, undefined, { timeout: 60000 });
  const reloaded = await page.evaluate(() => (window as any).game.save);
  if (reloaded.owned.filter((id: string) => id === 'emberblade').length !== 1) throw Error('Reload lost crafted item');
  for (const [m, n] of Object.entries(GEAR.emberblade.recipe!)) if (reloaded.mats[m] !== 100 - n!) throw Error('Reload changed craft cost');
  await page.close();
  if (errors.length) throw Error(errors.join('\n'));
  console.log('PASS lifecycle: double click, Skip, Escape, reduced motion, background, missing art, Keep, reload');
  console.log(process.env.CRAFT_ONLY ? `Selected crafting transactions passed: ${process.env.CRAFT_ONLY}` : `All ${items.length} crafting transactions passed at 320px and 390px.`);
} finally {
  await browser.close(); server.stop(true);
}
