// Real crafting transactions and the shared 3D presentation on both phone layouts, in software WebGL.
// CHROMIUM_PATH=/usr/bin/chromium bun run tests/e2e/crafting.ts
//   CRAFT_ONLY=id,id   just these items
//   CRAFT_SHOTS=1      also save each scene mid-build and finished to tests/e2e/out/combined-crafting/
import { chromium, type Page } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';
import { GEAR, TOOLS, POTION_RECIPES, PROJECTS, type ProjectId, type Recipe } from '../../src/data';
import { MEALS } from '../../src/kitchen';
import { CRAFT_PRESENTATIONS } from '../../src/crafting/catalog';
import { BUILD_PRESENTATIONS } from '../../src/crafting/building-catalog';

const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const SHOTS = !!process.env.CRAFT_SHOTS;
const out = new URL('./out/combined-crafting/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const items = [...Object.values(GEAR).filter(g => g.recipe), ...TOOLS, ...POTION_RECIPES, ...Object.values(MEALS)];
const item = (id: string) => items.find(i => i.id === id)!;
const errors: string[] = [];

async function boot(width: number, b = browser) {
  const page = await b.newPage({ viewport: { width, height: width === 320 ? 568 : 844 }, hasTouch: true, isMobile: true });
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
      void g.over.actors.get('granny:granny').talk();
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

/** The layers showing in the scene now. */
const layers = (page: Page) => page.locator('.craft-model').evaluate((c) => (c as HTMLCanvasElement).dataset.layers?.split(' ') ?? []);
/** Did the scene draw anything? */
const painted = (page: Page) => page.locator('.craft-model').evaluate((c) => {
  const cv = c as HTMLCanvasElement, d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n > d.length / 4 / 50;
});

async function finish(page: Page, id: string, equip = true, fallback = false) {
  await page.waitForSelector('.craft-ready', { timeout: 15000 });
  if (await page.locator('.craft-fallback').isVisible() !== fallback) throw Error(`${id}: unexpected art fallback`);
  for (const [m, n] of Object.entries(item(id).recipe!)) if (await page.locator(`[data-count="${m}"]`).textContent() !== String(100 - n!)) throw Error(`${id}: animated count ${m}`);
  if (!fallback && !await painted(page)) throw Error(`${id}: nothing drawn in the scene`);
  if (id === 'stew' && (await layers(page)).includes('pine-fuel')) throw Error('Fuel remains on finished stew');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`${id}: phone overflow`);
  const choice = GEAR[id] ? (equip ? 'equip' : 'later') : 'ok';
  const button = page.locator(`[data-dialog="${choice}"]`);
  await button.scrollIntoViewIfNeeded();
  const rect = await button.boundingBox();
  if (!rect || rect.y < 0 || rect.y + rect.height > page.viewportSize()!.height + 1) throw Error(`${id}: action unreachable`);
  if (SHOTS) await page.locator('.craft-scene').screenshot({ path: `${out}${id}-done-${page.viewportSize()!.width}.png` });
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
  await Promise.all([320, 390].map(async (width) => {
    const page = await boot(width);
    for (const id of (process.env.CRAFT_ONLY ? process.env.CRAFT_ONLY.split(',') : Object.keys(CRAFT_PRESENTATIONS))) {
      await begin(page, id, true);
      const shown = await layers(page), all = CRAFT_PRESENTATIONS[id].layers.map((l) => l.id);
      if (['tea', 'stew'].includes(id) && shown.includes('steam')) throw Error(`${id}: steam visible before simmer`);
      for (const prop of ['bottle', 'cup', 'pot', 'plate', 'existing-tool']) {
        if (all.includes(prop) && !shown.includes(prop)) throw Error(`${id}: initial ${prop} missing`);
      }
      if (SHOTS) {
        await page.waitForTimeout(CRAFT_PRESENTATIONS[id].duration * 0.45);
        await page.locator('.craft-scene').screenshot({ path: `${out}${id}-mid-${width}.png` });
      }
      await finish(page, id);
      console.log(`PASS ${width}px ${id}: normal timeline, save, single spend, decision`);
    }
    await page.close();
  }));
  // Every village building rising on its plot (presentation only: nothing is spent here).
  if (!process.env.CRAFT_ONLY || process.env.CRAFT_BUILDINGS) {
    const page = await boot(390);
    for (const id of Object.keys(BUILD_PRESENTATIONS)) {
      const [, project, level] = /^([a-z]+)(\d)$/.exec(id)!;
      const cost = PROJECTS[project as ProjectId]?.levels[Number(level) - 1]?.cost;
      if (!cost) { console.log(`SKIP ${id}: no such project level`); continue; }
      await page.evaluate(({ project, level, before }) => {
        void (window as any).game.ui.built(project, level, before, 'Built.');
      }, { project, level: Number(level), before: Object.fromEntries(Object.keys(cost).map((m) => [m, 100])) });
      await page.waitForSelector('.sheet.crafting');
      if (SHOTS) {
        await page.waitForTimeout(BUILD_PRESENTATIONS[id].duration * 0.5);
        await page.locator('.craft-scene').screenshot({ path: `${out}${id}-mid-390.png` });
      }
      await page.waitForSelector('.craft-ready', { timeout: 20000 });
      if (await page.locator('.craft-fallback').isVisible() || !await painted(page)) throw Error(`${id}: building scene not drawn`);
      if (SHOTS) await page.locator('.craft-scene').screenshot({ path: `${out}${id}-done-390.png` });
      await page.locator('[data-dialog="ok"]').click();
      await page.waitForSelector('#modal:not([hidden]) .sheet.crafting', { state: 'detached' });
      console.log(`PASS 390px ${id}: the building rises on its plot`);
    }
    await page.close();
  }
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
  await begin(page, 'emberblade');
  await page.reload();
  await page.waitForFunction(() => !!(window as any).game, undefined, { timeout: 60000 });
  const reloaded = await page.evaluate(() => (window as any).game.save);
  if (reloaded.owned.filter((id: string) => id === 'emberblade').length !== 1) throw Error('Reload lost crafted item');
  for (const [m, n] of Object.entries(GEAR.emberblade.recipe!)) if (reloaded.mats[m] !== 100 - n!) throw Error('Reload changed craft cost');
  await page.close();
  // Without WebGL there's no scene: it finishes at once on the item's icon.
  const flat = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--disable-webgl', '--disable-gpu'] });
  const plain = await boot(320, flat);
  await begin(plain, 'batwand'); await finish(plain, 'batwand', false, true);
  await flat.close();
  if (errors.length) throw Error(errors.join('\n'));
  console.log('PASS lifecycle: double click, Skip, Escape, reduced motion, background, no WebGL, Keep, reload');
  console.log(process.env.CRAFT_ONLY ? `Selected crafting transactions passed: ${process.env.CRAFT_ONLY}` : `All ${items.length} crafting transactions passed at 320px and 390px.`);
} finally {
  await browser.close(); server.stop(true);
}
