// Verify the dev controller against real game frames and inputs, and its absence from a production bundle.
// bun run e2e:playtest [--webgl]   (--webgl also verifies live 3D rendering in software)
import { chromium, type Page } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';
import { browserEnv } from './browser-env';

const env = browserEnv(true);
const out = new URL('./out/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const dev = startServer(0);
const bundle = await Bun.build({ entrypoints: ['./src/main.ts'], target: 'browser', minify: true, define: { __DEV__: 'false' } });
if (!bundle.success) throw new Error(bundle.logs.map(String).join('\n'));
const productionJs = await bundle.outputs[0].text();
if (productionJs.includes('sproutPlaytest')) throw new Error('Playtest API leaked into production JS');
const production = Bun.serve({ port: 0, hostname: '127.0.0.1', async fetch(req) {
  const url = new URL(req.url);
  if (url.pathname === '/main.js') return new Response(productionJs, { headers: { 'content-type': 'text/javascript' } });
  const file = Bun.file(`./public${url.pathname === '/' ? '/index.html' : url.pathname}`);
  return await file.exists() ? new Response(file) : new Response('Not found', { status: 404 });
} });
const webgl = process.argv.includes('--webgl');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, env,
  args: webgl ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-webgl', '--disable-gpu'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
const run = (p: Page, code: string) => p.evaluate(code);
const wait = (code: string) => page.waitForFunction(code, undefined, { timeout: 120000 });
function check(ok: unknown, text: string): asserts ok { if (!ok) throw new Error(text); }

async function settle() {
  for (let i = 0; i < 100; i++) {
    if (await run(page, `window.game.mode === 'world' && !window.game.battle && !window.game.trans && !window.game.ui.isOpen`)) return;
    if (await run(page, `window.game.mode === 'dialog' && window.game.ui.isOpen`)) await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
  throw new Error('Game did not return to the world after its popups');
}

try {
  await page.goto(`http://localhost:${dev.port}/`);
  await page.waitForSelector('.title-btns:not([hidden])', { timeout: 120000 });
  await wait(`!!window.sproutPlaytest`);
  check(await run(page, `!window.sproutPlaytest.status.combat && !window.sproutPlaytest.status.gather`), 'Automation must default to off');
  await page.click('#btn-new');
  await settle();

  // Start an ordinary battle fixture; the bot must earn the win through real inputs.
  await run(page, `window.sproutPlaytest.enable(); window.game.fight('slime', 3)`);
  await wait(`window.game.battle?.log.hits > 0`);
  await page.screenshot({ path: `${out}playtest-combat${webgl ? '-webgl' : ''}.png` });
  await wait(`window.game.save.wins === 1`);
  await settle();
  check(await run(page, `window.game.save.hp > 0 && window.game.save.equip.weapon === 'twig'`), 'Bot must win using the starter weapon');
  console.log('✓ Automatic combat wins a real battle');

  // Only setup is seeded. Interact, marker timing, harvest and reward all follow normal game code.
  await run(page, `window.sproutPlaytest.enable({ combat: false, gather: true });
    const g = window.game, o = g.over.world.objs.find(o => o.kind === 'node' && o.node === 'oak' && !o.grass);
    g.save.tools.wood = 1; g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.5);`);
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE');
  await wait(`!!window.game.chop`);
  await run(page, `window.__testedChop = window.game.chop.game`);
  await page.screenshot({ path: `${out}playtest-gather${webgl ? '-webgl' : ''}.png` });
  await wait(`window.__testedChop.done`);
  await settle();
  check(await run(page, `window.__testedChop.misses === 0 && window.__testedChop.perfects > 0 && window.game.save.mats.bark > 0`), 'Gathering must earn clean hits and real drops');
  console.log('✓ Automatic gathering times clean strikes and earns drops');

  // Disable must release controls and allow manual play again, even during a battle.
  await run(page, `window.sproutPlaytest.enable({ combat: true, gather: false }); window.game.fight('slime', 1)`);
  await wait(`window.game.battle?.log.swings > 0`);
  await run(page, `window.sproutPlaytest.disable(); window.__stoppedSwings = window.game.battle.log.swings`);
  await page.waitForTimeout(500);
  check(await run(page, `window.game.battle.log.swings === window.__stoppedSwings && window.sproutPlaytest.status.active === null`), 'Disabled bot must stop attacking');
  await page.keyboard.down('KeyJ');
  await wait(`window.game.battle.log.swings > window.__stoppedSwings`);
  await page.keyboard.up('KeyJ');
  console.log('✓ Disable stops the bot and manual attack still works');

  // Query activation must survive the slot URL's reload without touching the main save.
  await page.goto(`http://localhost:${dev.port}/?slot=automation-test&autoplay=1`);
  // install() reloads into the slot before boot finishes. Wait for that boot, not the API on the departing page.
  await page.waitForSelector('.title-btns:not([hidden])', { timeout: 120000 });
  await wait(`window.sproutPlaytest?.status.combat && window.sproutPlaytest?.status.gather`);
  check(await run(page, `window.sproutPlaytest.status.active === null`), 'The controller must leave the title/world idle');
  console.log('✓ URL opt-in works with save slots');

  await page.goto(`http://127.0.0.1:${production.port}/?autoplay=1`);
  await page.waitForSelector('.title-btns:not([hidden])', { timeout: 120000 });
  check(await run(page, `typeof window.sproutPlaytest === 'undefined'`), 'Production must have no automation API, even with its URL parameter');
  check(errors.length === 0, errors.join('\n'));
  console.log('✓ Production excludes the automation bundle and API');
} catch (error) {
  await page.screenshot({ path: `${out}playtest-failure${webgl ? '-webgl' : ''}.png` }).catch(() => {});
  if (errors.length) console.error('Page errors:', errors.join('\n'));
  throw error;
} finally {
  await browser.close();
  dev.stop(); production.stop();
}
