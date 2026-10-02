// End-to-end smoke test: plays the real game in headless Chromium, at phone size, through the flows the unit tests
// can't reach (fights, level-up screens, attack pacing, dragon breath, mining, the Forge, the play report).
//
//   bun run e2e            run every scenario
//   bun run e2e --shots    also save a screenshot per scenario to tests/e2e/out/
//   bun run e2e --only X   just the scenarios whose name contains X
//   bun run e2e -j N       N scenarios at a time (default: cores − 2; -j 1 runs them one by one)
//
// Needs Playwright's Chromium once: `bunx playwright-core install chromium-headless-shell`.
import { chromium, type Browser, type Page } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { startServer } from '../../server';
import { GEAR, MONSTERS, NODES } from '../../src/data';
import { MEALS, type MealId } from '../../src/kitchen';
import { MOVESETS, comboTime } from '../../src/weapons';
import { masteryXpToNext } from '../../src/rules';
import { browserEnv } from './browser-env';

const SHOTS = process.argv.includes('--shots');
const env = browserEnv(SHOTS);
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].toLowerCase() : null;
// Two cores left for the server and the timing-sensitive checks: 4 at a time on this 6-core box, 2 on CI's 4 cores.
const JOBS = process.argv.includes('-j') ? Math.max(1, Number(process.argv[process.argv.indexOf('-j') + 1]) || 1) : Math.max(1, Math.min(6, availableParallelism() - 2));
const START = Date.now();
const OUT = new URL('./out/', import.meta.url).pathname;
if (SHOTS) mkdirSync(OUT, { recursive: true });

const server = startServer(0);
const URL_ = `http://localhost:${server.port}/`;
// Most scenarios run without WebGL (characters fall back to sprites): software 3D is far too slow for the timing they
// rely on. One scenario at the end checks the 3D characters with WebGL on (see src/models.ts).
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath, env, args: ['--disable-webgl', '--disable-gpu'] });
const failures: string[] = [];

/** Changes a scenario makes to the save, on top of `base`. Sent to the page as source, so it can't use closures. */
type Seed = (game: any) => void;

/** A fresh page on a seeded save, past the title screen and any story popups. */
/** Software WebGL, for the scenarios that need the 3D crafting scenes (started when the first one does). */
let glBrowser = null as Promise<Browser> | null;

async function boot(seed: Seed, webgl = false) {
  const b = webgl ? await (glBrowser ??= chromium.launch({ executablePath, env, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })) : browser;
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL_);
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.evaluate(`(${base.toString()})(window.game); (${seed.toString()})(window.game); localStorage.setItem('sprout-quest-save', JSON.stringify(window.game.save));`);
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.click('#btn-continue');
  await page.waitForTimeout(2200);
  await closeDialogs(page);
  return { page, errors, close: () => ctx.close() };
}

/** A save past the prologue, standing in the meadow, with the Forge built. */
const base = (g: any) => {
  const s = g.save;
  Object.assign(s, { flags: ['sword', 'glade1', 'glade2', 'village'], quest: g.quests.findIndex((q: any) => q.id === 'cottage'), lv: 4, tips: ['moved', 'chopped', 'mined'] });
  s.build.forge = 1;
  s.pos = { x: 59.5, y: 18 };
  s.unlocked.push('forge', 'bag', 'journal');
};

const game = <T>(page: Page, f: string): Promise<T> => page.evaluate(`(() => { const g = window.game; return ${f}; })()`) as Promise<T>;
const run = (page: Page, f: string) => page.evaluate(`(() => { const g = window.game; ${f}; })()`);

/** A real finger drag on the screen (the joystick): down at (x, y), slid by (dx, dy) over a few frames, held, let go. */
async function touchDrag(page: Page, x: number, y: number, dx: number, dy: number, holdMs = 250) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', px: number, py: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: py }] });
  await touch('touchStart', x, y);
  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(16);
    await touch('touchMove', x + (dx * i) / 5, y + (dy * i) / 5);
  }
  await page.waitForTimeout(holdMs);
  await touch('touchEnd', x + dx, y + dy);
  await cdp.detach();
}

/** In a room (or back out), with the iris finished opening. */
const settledIn = (page: Page, room: string | null) => game<boolean>(page, `g.room === ${JSON.stringify(room)} && g.mode === 'world' && !g.trans`);

/** In a room: stands you in front of one of its stations, looking at it, and presses the action key. */
async function useStation(page: Page, id: string) {
  await run(page, `const o = g.over.room.station('${id}'); g.over.x = o.x + o.w / 2; g.over.y = o.y + o.h + 0.45; g.over.face = -Math.PI / 2`);
  await page.waitForTimeout(120);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(250);
}

/** A whole ingredient plate, carried once to the pot, followed by the shared creation animation. */
async function cookByHand(page: Page, id: MealId) {
  await run(page, `g.enterRoom('kitchen')`);
  await waitFor(page, 'the Kitchen', () => settledIn(page, 'kitchen'));
  await useStation(page, 'book');
  await waitFor(page, `${id} in the recipe book`, async () => !!(await page.$(`#modal:not([hidden]) [data-dialog="dish:${id}"]:not([disabled])`)));
  await page.click(`[data-dialog="dish:${id}"]`);
  await waitFor(page, 'the ingredient plate', async () => game<boolean>(page, `g.kitchen.held?.dish === '${id}'`));
  await useStation(page, 'stove');
  await waitFor(page, 'the creation animation', async () => !!(await page.$('#modal:not([hidden]) .sheet.crafting')));
  await page.keyboard.press('Escape');
  await page.locator('.craft-ready').waitFor();
  await page.click('#modal [data-dialog="ok"]');
  await waitFor(page, 'back in the Kitchen', () => settledIn(page, 'kitchen'));
}

/** Clicks through popups (not the menu) until none are left; returns the text of each one. */
async function closeDialogs(page: Page, max = 8, sheet = '.sheet:not(.menu):not(.house-plans)') {
  const seen: string[] = [];
  for (let i = 0, t0 = Date.now(); i < max; i++) {
    const btn = await page.$(`#modal:not([hidden]) ${sheet} [data-dialog]:last-of-type`);
    if (!btn) {
      // The XP bar fills between the fight's result and a level-up screen: wait for it to settle.
      if (!(await page.$('#hud .stat.gain')) || Date.now() - t0 > 15000) break;
      await page.waitForTimeout(150);
      i--;
      continue;
    }
    seen.push((await page.textContent('#modal .sheet')) ?? '');
    await btn.click();
    await page.waitForTimeout(400);
  }
  return seen;
}

async function waitFor(page: Page, what: string, cond: () => Promise<boolean>, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    // Not there yet (the game object is created once its code has downloaded and started) counts as not yet.
    if (await cond().catch(() => false)) return true;
    await page.waitForTimeout(100);
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** Opens the menu's More tab (retrying while a screen transition finishes). */
async function openMore(page: Page) {
  await waitFor(page, 'the menu', async () => {
    const open = () => page.$('#modal:not([hidden]) [data-tab="settings"]');
    if (!(await open())) await page.keyboard.press('KeyM');
    await page.waitForTimeout(300);
    return !!(await open());
  });
  await page.click('#modal:not([hidden]) [data-tab="settings"]');
  await page.waitForTimeout(300);
}

/** Enemies that stand still in front of you and can't die (or die in one hit, with `hp: 1`). */
const pinFoes = (page: Page, hp = 1e6) => run(page, `const b = g.battle; for (const e of b.enemies) { e.hp = e.maxHp = ${hp}; e.stun = 99; e.x = b.p.x; e.y = b.p.y - 60; } b.p.face = -Math.PI / 2`);
const endFight = (page: Page) => run(page, `const b = g.battle; for (const e of b.enemies) if (!e.dead) { e.hp = 0; b.kill(e); }`);

/**
 * Wins the fight and waits it out: the result screen (guardians, story fights) or the swoop back to the map, the XP
 * bar filling, and any level-up screens, until you're walking again.
 */
async function winFight(page: Page) {
  await endFight(page);
  await waitFor(page, 'the fight to end', async () => !!(await page.$('#modal:not([hidden]) [data-dialog]')) || (await game<boolean>(page, `g.mode === 'world' && !g.battle`)), 8000);
  await closeDialogs(page);
  await waitFor(page, 'back on the map', async () => {
    await closeDialogs(page);
    return game<boolean>(page, `g.mode === 'world' && !g.battle`);
  }, 10000);
}

/** Scenarios run from a queue, a few at a time (each has its own browser context, so their saves don't mix). */
const queue: { name: string; run: () => Promise<void> }[] = [];
/** The long ones start first, so none is left running alone at the end. */
const SLOW = ['Poppy', "Bram's story", 'drums in the dark', 'every monster', 'characters are drawn in 3D', 'prologue', 'waits between strikes', 'play report'];
const weight = (name: string) => { const i = SLOW.findIndex((s) => name.includes(s)); return i < 0 ? SLOW.length : i; };

function scenario(name: string, seed: Seed | null, body: (page: Page) => Promise<void>, opts: { webgl?: boolean } = {}) {
  if (ONLY && !name.toLowerCase().includes(ONLY)) return;
  queue.push({ name, run: () => runScenario(name, seed, body, opts.webgl) });
}

async function runScenario(name: string, seed: Seed | null, body: (page: Page) => Promise<void>, webgl = false) {
  const b0 = Date.now();
  const { page, errors, close } = await boot(seed ?? (() => {}), webgl);
  const t0 = Date.now(), setup = ((t0 - b0) / 1000).toFixed(1);
  try {
    await body(page);
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    console.log(`  ✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s + ${setup}s setup)`);
  } catch (e) {
    failures.push(`${name}: ${(e as Error).message}`);
    if (errors.length) console.log(`    page errors: ${errors.join(' | ')}`);
    console.log(`  ✗ ${name}: ${(e as Error).message}`);
  } finally {
    if (SHOTS) await page.screenshot({ path: `${OUT}${name.replace(/\W+/g, '-')}.png` }).catch(() => {});
    await close();
  }
}

function check(ok: unknown, msg: string) {
  if (!ok) throw new Error(msg);
}

console.log('Sprout Quest smoke test');

scenario('a new game plays through the prologue to Elder Oswin', null, async (page) => {
  // Start over from the title (base's save is replaced by New Game).
  await run(page, `localStorage.clear()`);
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.click('#btn-new');
  await page.waitForTimeout(800);
  await closeDialogs(page); // the waking-up caption
  check(await game(page, 'g.save.quest') === 0, 'a new game should start on the first quest');
  /** Stands you just in front of an object and presses the action key. */
  const use = async (find: string) => {
    await run(page, `const o = ${find}; g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.5)`);
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(500);
  };
  await use(`g.over.world.objs.find((o) => o.kind === 'pickup')`);
  await closeDialogs(page);
  check(await game(page, `g.save.flags.includes('sword')`), 'picking up the Twig Sword did not give it to you');
  // The two monsters blocking the path: each is a scripted fight that sets its flag when won.
  for (const flag of ['glade1', 'glade2']) {
    await closeDialogs(page);
    await use(`g.over.world.objs.find((o) => o.kind === 'foe' && o.flag === '${flag}')`);
    await waitFor(page, `the ${flag} fight`, async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle`), 4000);
    await page.waitForTimeout(1300);
    await endFight(page);
    // Story fights end like any other: the XP fills in as the last foe falls, with no result screen to tap through.
    await waitFor(page, `the ${flag} XP`, async () => !!(await page.$('#hud .stat.gain')), 5000);
    check(!(await page.$('#modal:not([hidden]) .result .big')), `the ${flag} fight stopped on a result screen`);
    await closeDialogs(page);
    // Back on the map, the next step's caption may already be up: read it.
    await waitFor(page, 'back on the map', async () => game<boolean>(page, `!g.battle`), 5000);
    await page.waitForTimeout(800);
    await closeDialogs(page);
    await waitFor(page, 'free to walk', async () => game<boolean>(page, `g.mode === 'world'`), 5000);
    check(await game(page, `g.save.flags.includes('${flag}')`), `winning the ${flag} fight did not clear the path`);
    if (flag === 'glade1') {
      // The first win unlocks the Bag: its card waits for the map, then takes you there when tapped.
      await waitFor(page, "the Bag's unlock card", async () => !!(await page.$('#unlock-card.show.tappable')), 4000);
      check(/Bag/.test((await page.textContent('#unlock-card')) ?? ''), 'the unlock card is not about the Bag');
      await page.click('#unlock-card');
      await waitFor(page, 'the Bag to open', async () => !!(await page.$('#modal:not([hidden]) .sheet.theme-items')), 3000);
      await page.keyboard.press('Escape');
      await waitFor(page, 'the Bag to close', async () => game<boolean>(page, `g.mode === 'world'`), 3000);
    }
  }
  // The prologue's two fights don't unlock the weapon's special: the first fight in the meadow does.
  check(await game<number>(page, 'g.save.mastery.sword.lv') === 1, 'handling went up in the prologue');
  // Walking into the village plays Elder Oswin's welcome tour.
  await closeDialogs(page);
  // Stand just outside and walk in (teleporting straight in wouldn't count as arriving).
  await run(page, `const w = g.over.world, p = w.entryPoint('village'); let x = p.x; while (w.zoneAt(x).id === 'village') x -= 0.5; g.over.teleport(x - 0.5, p.y)`);
  await page.waitForTimeout(300);
  await page.keyboard.down('KeyD');
  await waitFor(page, 'arriving in the village', async () => game<boolean>(page, `g.over.currentZone.id === 'village' && g.mode === 'dialog'`), 4000);
  await page.keyboard.up('KeyD');
  for (let i = 0; i < 12 && !(await game<boolean>(page, `g.save.flags.includes('village')`)); i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(900);
  }
  check(await game(page, `g.save.flags.includes('village')`), 'arriving in the village did not finish the welcome');
  check(await game(page, `g.save.flags.includes('oldtools')`), 'Elder Oswin did not hand over his old tools');
  await closeDialogs(page);
  await page.waitForTimeout(500);
  check(await game(page, `g.mode`) === 'world', 'not back in control after the welcome');
  // Granny Clover is home in Sowerby from the moment you arrive.
  await waitFor(page, 'Granny Clover at her cottage', async () => game<boolean>(page, `!!g.over.actors.get('granny:granny')`), 3000);
  // Talking to Elder Oswin tells you what to do next, then hands you back the controls.
  await use(`g.over.world.obj('elder')`);
  const said = await closeDialogs(page);
  check(said.some((t) => t.includes('Elder Oswin')), 'Elder Oswin did not speak');
  await page.waitForTimeout(400);
  check(await game(page, `g.mode`) === 'world', 'not back in control after talking to Elder Oswin');
});

scenario('patch notes: a dot until you read them, from the menu or the title', (g) => {
  // A save from 0.1.0 has the newest notes to read.
  g.save.seenVersion = '0.1.0';
}, async (page) => {
  check(await page.$('#btn-bag.has-dot'), 'no dot on the Bag button for unread patch notes');
  await openMore(page);
  check(await page.$('#modal:not([hidden]) [data-tab="settings"] .dot.on'), 'no dot on the More tab');
  await page.click('[data-do="notes"]');
  await waitFor(page, 'the patch notes', async () => !!(await page.$('#modal:not([hidden]) .patches')));
  const text = (await page.textContent('#modal .patches')) ?? '';
  check(text.includes('v0.2.0') && text.includes('v0.1.0') && text.includes('New!'), 'patch notes missing a version or the New! badge');
  await closeDialogs(page);
  await waitFor(page, 'back to the menu', async () => !!(await page.$('#modal:not([hidden]) [data-tab="settings"]')));
  check(!(await page.$('#modal:not([hidden]) [data-tab="settings"] .dot.on')), 'the More tab dot stayed after reading');
  check(await game(page, 'g.save.seenVersion') !== '0.1.0', 'reading did not mark the notes seen');
  // The title shows the version, without a dot now it's been read, and opens the notes too.
  await page.reload();
  await page.waitForSelector('#btn-notes:not([hidden])');
  check(/v\d+\.\d+\.\d+/.test((await page.textContent('#btn-notes')) ?? ''), 'no version on the title');
  check(!(await page.$('#btn-notes .dot.on')), 'the title still shows a dot after reading');
  await page.click('#btn-notes');
  await waitFor(page, 'the patch notes from the title', async () => !!(await page.$('#modal:not([hidden]) .patches')));
  await closeDialogs(page);
});

scenario("story dialogue moves on with a tap anywhere, even with the talk box at the top", null, async (page) => {
  await run(page, `window.__said = g.ui.talk('Granny Clover', 'npc_granny', '👵', 'Hello, dear!', true).then(() => (window.__said = 'done'))`);
  await waitFor(page, 'the talk box at the top', async () => !!(await page.$('#modal.cine.top:not([hidden]) .tap-next')), 3000);
  if (SHOTS) {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}talk-top.png` });
  }
  // A tap down by the thumbs, nowhere near the box or its button.
  await page.mouse.click(195, 760);
  await waitFor(page, 'the line to move on', async () => (await game<string>(page, 'window.__said')) === 'done', 3000);
  check(!(await page.$('#modal .tap-next')), 'the tap hint stayed behind');
});

scenario('an unlock card gets out of the way of a fight, and comes back after it', null, async (page) => {
  await run(page, `g.ui.unlockCard({ id: 'bag', icon: '🎒', title: 'Your Bag', text: 'Test', when: () => true })`);
  await waitFor(page, 'the card', async () => !!(await page.$('#unlock-card.show')), 3000);
  await run(page, 'g.encounter()');
  await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle'`), 8000);
  await waitFor(page, 'the card to go', async () => game<boolean>(page, `document.getElementById('unlock-card').hidden`), 3000);
  await winFight(page);
  await waitFor(page, 'the card again', async () => !!(await page.$('#unlock-card.show')), 5000);
  // Opening a menu (or chopping, or a scene: anything that isn't walking about) puts it away too.
  await page.keyboard.press('KeyB');
  await waitFor(page, 'the Bag', async () => !!(await page.$('#modal:not([hidden]) .sheet.menu')), 3000);
  await waitFor(page, 'the card to go for the menu', async () => game<boolean>(page, `document.getElementById('unlock-card').hidden`), 3000);
  await run(page, `g.ui.closeMenu()`);
  // …and having opened the Bag, its card has done its job: it doesn't come back.
  await page.waitForTimeout(1500);
  check(await game<boolean>(page, `document.getElementById('unlock-card').hidden`), 'the Bag card came back after opening the Bag');
  // A card still waiting doesn't come out over a dialog either.
  await run(page, `g.ui.unlockCard({ id: 'journal', icon: '📜', title: 'Journal', text: 'Test', when: () => true }); void g.ui.message('Hi', 'A dialog')`);
  await page.waitForTimeout(1500);
  check(await game<boolean>(page, `document.getElementById('unlock-card').hidden`), 'an unlock card came out over a dialog');
  await closeDialogs(page);
  await waitFor(page, 'the cards once free', async () => !!(await page.$('#unlock-card.show')), 5000);
});

scenario("a weapon class's handling path: every level, what it brings, and where you are", (g) => {
  g.save.mastery.sword = { lv: 3, xp: 40 };
}, async (page) => {
  await run(page, `g.ui.openMenu({ atForge: false, inVillage: true }, 'items')`);
  await page.click('#modal [data-sub="items:skills"]');
  await page.click('#modal [data-pick="hpath:sword"]');
  const nodes = page.locator('#modal .hnode');
  check(await nodes.count() === 10, 'the path should show all ten levels');
  check(await page.locator('#modal .hnode.done').count() === 3, 'Lv 1–3 should be ticked off');
  check(/Riposte/.test((await page.locator('#modal .hnode.trick').textContent()) ?? ''), "the Blades' trick isn't on its path");
  check(/Copper Sword/.test((await page.locator('#modal .htree').textContent()) ?? ''), 'the path should say which weapons it lets you wield');
  check(/40\/680 XP/.test((await page.locator('#modal .hnode.next').textContent()) ?? ''), 'the next level should show your progress');
  // Only the next two levels say what they bring; the rest are a mystery.
  check(await page.locator('#modal .hnode.secret').count() === 5, 'Lv 6–10 should be shrouded');
  check(!/Cyclone/.test((await page.locator('#modal .htree').textContent()) ?? ''), 'the Mastery finisher shows before you get close');
  if (SHOTS) await page.screenshot({ path: `${OUT}handling-path.png` });
  // Any class's path, trained or not.
  await page.click('#modal [data-pick="hpath:wand"]');
  check(/Blink/.test((await page.locator('#modal .htree').textContent()) ?? ''), "Magic's path doesn't show Blink");
  await page.click('#modal [data-pick="hpath:"]');
  check(!(await page.$('#modal .htree')), "Back didn't return to the Skills page");
});

scenario('winning a fight levels you up and reveals new gear (and the quest tracker counts materials)', (g) => {
  Object.assign(g.save, { lv: 4, xp: 109 }); // 2 short of Lv 5: even a slime you've outgrown gives 2
  g.save.owned.push('jellywhip');
  g.save.equip.weapon = 'jellywhip';
  g.save.mastery.whip.xp = 8; // 2 short of handling Lv 2 (rules.ts masteryXpToNext)
  // ★★ gear needs the Smithy.
  g.save.build.forge = 2;
}, async (page) => {
  // The quest tracker shows the goal's material progress.
  check(await page.$('#quest-pill:not([hidden]) .qbar'), 'no progress bar on the quest tracker');
  check((await page.$$('#quest-pill .qm')).length > 0, 'no material counts on the quest tracker');
  await run(page, 'g.encounter()');
  await page.waitForTimeout(900);
  await pinFoes(page, 1);
  await page.keyboard.press('KeyJ');
  if (SHOTS) {
    await page.waitForSelector('#hud .stat.gain');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}xp-fill.png`, clip: { x: 0, y: 0, width: 390, height: 140 } });
    await page.waitForSelector('#hud .stat.hand-gain');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}hand-fill.png`, clip: { x: 0, y: 0, width: 390, height: 140 } });
  }
  // Loot and XP stack on the right as the fight is won, clear of the quest tracker.
  await waitFor(page, 'the loot', async () => (await page.$$('#loot .lrow')).length > 0, 8000);
  const pill = await page.locator('#quest-pill').boundingBox();
  for (const r of await page.locator('#loot .lrow').all()) {
    const b = await r.boundingBox();
    check(!b || !pill || b.x >= pill.x + pill.width || b.y >= pill.y + pill.height, 'a loot row overlaps the quest tracker');
  }
  await waitFor(page, 'the level-up screen', async () => !!(await page.$('#modal:not([hidden]) .lvsheet')));
  // Its stats tick in one by one.
  await waitFor(page, "the level-up's stats", async () => /Max HP/.test((await page.textContent('#modal .sheet')) ?? ''), 5000);
  const screens = await closeDialogs(page);
  check(screens.some((t) => t.includes('Level up!') && t.includes('Max HP')), 'no combat level-up screen');
  check(screens.some((t) => /Whip handling/i.test(t) && t.includes('Spore Whip')), 'whip handling screen did not reveal the Spore Whip');
  // Weapon handling has its own bar under your XP, showing the weapon's class and handling level.
  check(await page.textContent('#hud-hlv') === String(await game<number>(page, 'g.save.mastery.whip.lv')), "the handling bar doesn't show your whip handling level");
  check(await game(page, 'g.save.lv') === 5, 'combat level did not go up');
});

scenario('every weapon waits between strikes, and handling shortens the wait', (g) => {
  g.save.owned.push('stonesword', 'stonehammer', 'jellywhip', 'jellywand');
}, async (page) => {
  for (const w of ['stonesword', 'stonehammer', 'jellywhip', 'jellywand']) {
    const style = GEAR[w].style!;
    const swings: number[] = [];
    for (const lv of [1, 10]) {
      await run(page, `g.save.equip.weapon = '${w}'; g.save.mastery.${style}.lv = ${lv}; g.encounter()`);
      await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle && g.battle.intro <= 0`), 8000);
      await pinFoes(page);
      const t0 = Date.now();
      while (Date.now() - t0 < 2000) {
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(40);
      }
      swings.push(await game<number>(page, 'g.battle.log.swings'));
      await winFight(page);
    }
    // Mashing is capped by the pace (a strike per strikeTime, plus the combo rest), and mastery really is faster.
    const m = MOVESETS[style], perStrike = comboTime(m, 1) / m.combo.length;
    const cap = Math.ceil(2 / perStrike) + 1;
    check(swings[0] <= cap, `${w}: ${swings[0]} swings in 2s at handling Lv 1 (its pace allows ≤${cap})`);
    check(swings[1] > swings[0], `${w}: mastered handling swung ${swings[1]} times, no more than Lv 1's ${swings[0]}`);
  }
});

scenario("a new move plays its preview when handling unlocks it, and watches again from the Skills menu's path", (g) => {
  g.save.mastery.sword = { lv: 2, xp: 0 };
  g.save.wins = 5;
}, async (page) => {
  // Win a fight that takes sword handling from Lv 2 to Lv 3: its level-up screen, then the Riposte's preview.
  await run(page, `g.save.mastery.sword.xp = ${masteryXpToNext(2) - 1}; g.fight('slime', 1, 1)`);
  await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle && g.battle.intro <= 0`), 8000);
  await endFight(page);
  await waitFor(page, 'the Riposte preview', async () => {
    const btn = await page.$('#modal:not([hidden]) .sheet:not(.preview) [data-dialog]:last-of-type');
    if (btn) await btn.click().catch(() => {});
    return !!(await page.$('#modal:not([hidden]) .sheet.preview canvas.demo-cv'));
  }, 20000);
  check(/Riposte/.test((await page.textContent('#modal .sheet.preview')) ?? ''), "the preview doesn't name the Riposte");
  // It's really playing: the demo battle draws frames into its window.
  const frame = () => page.$eval('#modal .sheet.preview canvas.demo-cv', (c) => (c as HTMLCanvasElement).toDataURL().length);
  const f1 = await frame();
  await page.waitForTimeout(400);
  check(f1 > 2000 && (await frame()) !== f1, 'the preview is not animating');
  await page.click('#modal .sheet.preview [data-dialog="ok"]');
  await waitFor(page, 'back on the map', async () => {
    await closeDialogs(page);
    return game<boolean>(page, `g.mode === 'world' && !g.battle`);
  }, 10000);
  check(await game<number>(page, 'g.save.mastery.sword.lv') >= 3, 'sword handling did not reach Lv 3');
  // The Skills menu's sword path: each unlocked special rank and the trick can be watched again.
  await run(page, `g.ui.openMenu({ atForge: false, inVillage: false }, 'items')`);
  await page.click('#modal [data-sub="items:skills"]');
  await page.click('#modal [data-pick="hpath:sword"]');
  check((await page.$$('#modal [data-preview]')).length === 2, 'the path should offer Spin and Riposte to watch');
  await page.click('#modal [data-preview="sword:2"]');
  await page.waitForSelector('#modal .sheet.preview canvas.demo-cv');
  check(/Spin/.test((await page.textContent('#modal .sheet.preview')) ?? ''), "the replay doesn't show Spin");
  await page.click('#modal .sheet.preview [data-dialog="ok"]');
  // Back on the same path afterwards.
  await page.waitForSelector('#modal .htree');
  check(!!(await page.$('#modal .htab.on[data-pick="hpath:sword"]')), 'did not come back to the sword path');
});

scenario("each class has its trick (Riposte, Stagger, Snare, Blink) and its special fires", (g) => {
  g.save.owned.push('stonesword', 'stonehammer', 'jellywhip', 'jellywand');
}, async (page) => {
  const fight = async (w: string) => {
    await run(page, `g.save.equip.weapon = '${w}'; g.save.mastery.${GEAR[w].style}.lv = 10; g.encounter()`);
    await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle && g.battle.intro <= 0`), 8000);
    await pinFoes(page);
  };
  const special = async (w: string) => {
    await page.waitForTimeout(1200);
    await page.keyboard.press('KeyL');
    await page.waitForTimeout(900);
    check(await game<number>(page, 'g.battle.log.skills') === 1, `${w}: its special didn't fire`);
  };

  // Blades: dodge through a blow, and the next strike is a sure crit.
  await fight('stonesword');
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(60);
  await run(page, `const b = g.battle; b.hurtPlayer(5, 1, b.p.x, b.p.y - 20, 'test')`);
  check(await game<number>(page, 'g.battle.p.riposte') > 0, 'stonesword: dodging through a blow readied no Riposte');
  await page.waitForTimeout(300);
  await pinFoes(page);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(400);
  check(await game<number>(page, 'g.battle.log.crits') >= 1, "stonesword: the Riposte didn't crit");
  await special('stonesword');
  await winFight(page);

  // Hammer: a slam knocks a monster out of the attack it's in the middle of.
  await fight('stonehammer');
  await run(page, `for (const e of g.battle.enemies) { e.state = 'busy'; e.windup = 1; }`);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(700);
  check(await game<boolean>(page, 'g.battle.enemies.every((e) => e.state !== "busy" && e.windup === 0)'), "stonehammer: the slam didn't stagger the monster out of its attack");
  await special('stonehammer');
  await winFight(page);

  // Whip: a crack at the tip yanks the foe in.
  await fight('jellywhip');
  await run(page, `const b = g.battle; for (const e of b.enemies) e.y = b.p.y - 125`);
  const far = await game<number>(page, 'Math.min(...g.battle.enemies.map((e) => g.battle.p.y - e.y))');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(900);
  const near = await game<number>(page, 'Math.min(...g.battle.enemies.map((e) => g.battle.p.y - e.y))');
  check(near < far - 25, `jellywhip: the crack didn't pull the foe in (${far.toFixed(0)} → ${near.toFixed(0)} away)`);
  await special('jellywhip');
  await winFight(page);

  // Magic: the dodge is a teleport.
  await fight('jellywand');
  const from = await game<[number, number]>(page, '[g.battle.p.x, g.battle.p.y]');
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(30);
  const to = await game<[number, number]>(page, '[g.battle.p.x, g.battle.p.y]');
  check(Math.hypot(to[0] - from[0], to[1] - from[1]) > 80, 'jellywand: the dodge didn\'t blink');
  await special('jellywand');
  await winFight(page);
});

scenario('travel: a campfire takes you home to Sowerby, and the Waystone takes you back out', (g) => {
  g.save.lv = 8;
  g.save.bosses.push('kingslime', 'alphawolf');
  g.save.visited.push('meadow', 'woods');
  g.save.build.warp = 1;
}, async (page) => {
  /** Stands you just in front of an object and presses the action key. */
  const use = async (find: string) => {
    await run(page, `const o = ${find}; g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.5)`);
    await page.waitForTimeout(400);
    await page.keyboard.press('KeyE');
  };
  // This scenario tests object interaction, not encounters. Calm still permits KeyE surprise attacks on nearby
  // monsters, and teleport resets it, so remove random roamers and suppress their refill for this fixture.
  await run(page, 'g.over.roamers.list = []; g.over.roamers.respawn = 1e9');
  // The Journal's map no longer warps you anywhere.
  await run(page, `g.ui.openMenu({ atForge: false, inVillage: false }, 'journey')`);
  check(!(await page.$('#modal [data-travel], #modal [data-do="home"]')), 'the Journal still has warp buttons');
  await run(page, 'g.ui.closeMenu()');
  // Beating the Slime King opened the road, but its campfire waits, cold, for you to light it.
  const camp = `g.over.world.objs.find((o) => o.kind === 'camp' && o.zone === 'woods')`;
  check(await game<boolean>(page, `!${camp}.hidden && ${camp}.label === 'Light'`), "the Woods campfire isn't there, cold, to light");
  await use(camp);
  await waitFor(page, 'the campfire lit', async () => game<boolean>(page, `g.save.camps.includes('woods') && ${camp}.label === 'Rest'`), 3000);
  check(await game<string>(page, 'g.save.respawn') === 'woods', "lighting the campfire didn't make it your checkpoint");
  // Rest there, then home.
  await page.waitForTimeout(500);
  await use(camp);
  await page.click('#modal:not([hidden]) [data-dialog="home"]', { timeout: 5000 });
  await waitFor(page, 'home in Sowerby', async () => game<boolean>(page, `g.mode === 'world' && g.over.currentZone.id === 'village'`), 8000);
  check(await game<string>(page, 'g.save.respawn') === 'woods', "resting at the campfire didn't save your checkpoint there");
  // The Waystone: out to the Woods campfire.
  await use(`g.over.world.objs.find((o) => o.kind === 'plot' && o.project === 'warp')`);
  await page.click('#modal:not([hidden]) [data-dialog="woods"]', { timeout: 5000 });
  await waitFor(page, 'out at the Woods campfire', async () => game<boolean>(page, `g.mode === 'world' && g.over.currentZone.id === 'woods'`), 8000);
});

scenario('a roaming group marked ×3 brings all three to the fight', (g) => {
  g.save.lv = 6;
}, async (page) => {
  await run(page, `g.warp('woods')`);
  await waitFor(page, 'roamers in the Woods', async () => game<boolean>(page, `g.over.roamers.list.some((r) => r.zone === 'woods')`), 5000);
  await run(page, `window.__r = g.over.roamers.list.find((r) => r.zone === 'woods'); window.__r.extra = 2`);
  await waitFor(page, 'bumping into it', async () => {
    await run(page, `if (g.mode === 'world') { window.__r.x = g.over.x; window.__r.y = g.over.y; }`);
    return game<boolean>(page, `g.mode === 'battle' && !!g.battle`);
  }, 10000);
  check(await game<number>(page, 'g.battle.setup.foes.length') === 3, `a ×3 group came as ${await game<number>(page, 'g.battle.setup.foes.length')}`);
});

scenario('monster tricks: spores poison, a screech dizzies, stone skin shrugs off hits, Impy dodges, a howl rallies the pack', null, async (page) => {
  const fight = async (kind: string, lv: number, n: number) => {
    await run(page, `g.fight('${kind}', ${lv}, ${n})`);
    await waitFor(page, `the ${kind} fight`, async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle && g.battle.intro <= 0`), 8000);
    await run(page, `for (const e of g.battle.enemies) { e.hp = e.maxHp = 1e6; }`);
  };
  // A spore that lands poisons you, and poison never takes you below 1 HP.
  await fight('shroom', 5, 1);
  await run(page, `const b = g.battle, e = b.enemies[0]; b.p.iframes = 0; b.p.hp = 3; b.enemyShoot({ ...e, x: b.p.x, y: b.p.y - 30, z: 0, r: 1 }, Math.PI / 2, 60, 12, '#c08ae0', 0.01, 3)`);
  await waitFor(page, 'poisoned', async () => game<boolean>(page, 'g.battle.p.poison > 0'), 3000);
  await page.waitForTimeout(2500);
  check(await game<number>(page, 'g.battle.p.hp') >= 1, 'poison knocked you out');
  await winFight(page);
  // A screech that catches you leaves you dizzy (unless you're mid-dodge).
  await fight('bat', 9, 1);
  check(await game<boolean>(page, `(() => { const b = g.battle; b.p.iframes = 0; return b.dizzyAround(b.p.x + 20, b.p.y, 125, 2) && b.p.dizzy > 0; })()`), 'the screech did not dizzy you');
  await winFight(page);
  // A Pebblor shrugs off hits while it walks, and is wide open right after its slam.
  await fight('golem', 9, 1);
  // Compare the armor states with identical, noncritical rolls. A random walking crit otherwise makes the
  // expected >2x gap intermittently fail after integer rounding (for example, 4 damage versus 8).
  const hitAs = (state: string) => game<number>(page, `(() => {
    const b = g.battle, e = b.enemies[0]; e.state = '${state}'; e.t = 9; e.stun = 99;
    const before = e.hp, random = Math.random;
    Math.random = () => 0.5;
    try { b.hitEnemy(e, 1, 0, 0); } finally { Math.random = random; }
    return before - e.hp;
  })()`);
  const walking = await hitAs('walk'), exposed = await hitAs('exposed');
  check(exposed > walking * 2, `stone skin: ${walking} damage while walking vs ${exposed} exposed`);
  await winFight(page);
  // Start an attack right next to an Impy and it blinks out of the way.
  await fight('imp', 14, 1);
  await run(page, `const b = g.battle, e = b.enemies[0]; e.stun = 0; e.x = b.p.x; e.y = b.p.y - 50; b.p.face = -Math.PI / 2`);
  const at = await game<[number, number]>(page, '[g.battle.enemies[0].x, g.battle.enemies[0].y]');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(200);
  check(await game<boolean>(page, `(() => { const e = g.battle.enemies[0]; return e.evadeCd > 0 && Math.hypot(e.x - ${at[0]}, e.y - ${at[1]}) > 60; })()`), 'Impy did not dodge the attack');
  await winFight(page);
  // A howl hurries the rest of the pack, and brings the howler straight back in.
  await fight('wolf', 6, 3);
  await run(page, `const [a, ...rest] = g.battle.enemies; for (const e of g.battle.enemies) e.stun = 0; a.state = 'howl'; a.t = 0.01; for (const o of rest) { o.state = 'circle'; o.t = 5; }`);
  await page.waitForTimeout(150);
  check(await game<boolean>(page, `(() => { const [a, ...rest] = g.battle.enemies; return (a.state === 'windup' || a.state === 'dash') && rest.every((o) => o.t <= 0.3 || o.state !== 'circle'); })()`), 'the howl did not rally the pack');
});

// Every monster, in two halves that run side by side.
const KINDS = Object.keys(MONSTERS);
for (const [half, kinds] of [['1/2', KINDS.slice(0, KINDS.length / 2)], ['2/2', KINDS.slice(KINDS.length / 2)]] as const) scenario(`every monster fights (and is drawn) without errors, ${half}`, (g) => {
  g.save.lv = 20;
  g.save.owned.push('wyrmbreaker');
  g.save.equip.weapon = 'wyrmbreaker';
}, async (page) => {
  for (const kind of kinds) {
    await run(page, `g.fight('${kind}', ${MONSTERS[kind as keyof typeof MONSTERS].boss ? 20 : 10}, 2)`);
    await waitFor(page, `a fight with ${kind}`, async () => (await game<boolean>(page, 'g.mode === "battle" && !!g.battle')));
    // Let it run through a few of its moves, with you too tough to fall, swinging now and then.
    const t0 = Date.now();
    while (Date.now() - t0 < 1800) {
      await run(page, 'if (g.battle) { g.battle.p.hp = 9999; g.battle.p.iframes = 1; }');
      await page.keyboard.press('KeyJ');
      await page.waitForTimeout(250);
    }
    const states = await game<string[]>(page, 'g.battle.enemies.map((e) => e.state)');
    check(states.length > 0, `${kind}: no enemies spawned`);
    await winFight(page);
  }
});

scenario('the Wyrmbreaker breathes fire that burns the ground', (g) => {
  g.save.lv = 18;
  g.save.owned.push('wyrmbreaker');
  g.save.equip.weapon = 'wyrmbreaker';
}, async (page) => {
  await run(page, 'g.encounter()');
  await page.waitForTimeout(900);
  await pinFoes(page);
  await page.keyboard.press('KeyJ');
  await waitFor(page, 'burning ground', async () => (await game<number>(page, 'g.battle.flames.length')) > 0, 3000);
});

scenario('an iron pick mines Glimmer Hollow crystal, slowly', (g) => {
  g.save.lv = 14;
  g.save.tools.mine = 3;
}, async (page) => {
  await run(page, `g.warp('hollow'); g.over.roamers.calm = 999`);
  await page.waitForTimeout(800);
  const placed = await game<boolean>(page, `(() => {
    const o = g.over, r = o.world.objs.find((x) => x.kind === 'node' && x.node === 'crystal' && !x.grass);
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const x = r.x + 0.4 + dx * 0.95, y = r.y + 0.6 + dy * 0.95;
      if (!o.world.blocked(x, y, 0.28)) { o.teleport(x, y); o.roamers.calm = 999; return true; }
    }
    return false;
  })()`);
  check(placed, 'no open spot next to a crystal cluster');
  await page.waitForTimeout(500);
  await page.keyboard.press('KeyE');
  await waitFor(page, 'the mining minigame', async () => (await game<string>(page, 'g.mode')) === 'gather');
  const power = await game<number>(page, 'g.chop.game.power');
  check(power > 0 && power < 1, `iron pick on crystal should be slow, got power ${power}`);
  await page.waitForTimeout(600); // a few frames of the minigame drawing
});

scenario('a tree falls and a rock breaks all the way, and what you earned lands in your bag', (g) => {
  g.save.tools.wood = 1;
  g.save.tools.mine = 1;
}, async (page) => {
  for (const [kind, mat] of [['oak', 'bark'], ['rock', 'stone']] as const) {
    const placed = await game<boolean>(page, `(() => {
      const o = g.over, w = o.world;
      for (const r of w.objs.filter((x) => x.kind === 'node' && x.node === '${kind}' && !x.grass && x.id.startsWith('meadow:'))) {
        for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
          const x = r.x + 0.4 + dx * 0.95, y = r.y + 0.6 + dy * 0.95;
          if (w.blocked(x, y, 0.28)) continue;
          o.teleport(x, y);
          o.roamers.calm = 999;
          if (o.nearbyObject() === r) return true;
        }
      }
      return false;
    })()`);
    check(placed, `no open spot next to a meadow ${kind}`);
    const before = await game<number>(page, `g.save.mats.${mat}`);
    await page.keyboard.press('KeyE');
    await waitFor(page, `the ${kind} minigame`, async () => (await game<string>(page, 'g.mode')) === 'gather');
    // Strike on the sweet spot until it gives way.
    for (let i = 0; i < 40 && !(await game<boolean>(page, 'g.chop?.game.done ?? true')); i++) {
      await waitFor(page, 'the sweet spot', async () => game<boolean>(page, `(() => { const c = g.chop?.game; return !c || c.done || (Math.abs(c.pos - c.center) < c.width * 0.3 && c.lock <= 0); })()`), 8000);
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(60);
    }
    // It falls or breaks, the loot pops out, and you're back on the map with it.
    await waitFor(page, `the ${kind} to finish`, async () => (await game<string>(page, 'g.mode')) !== 'gather', 5000);
    const after = await game<number>(page, `g.save.mats.${mat}`);
    check(after > before, `felling the ${kind} gave no ${mat} (${before} → ${after})`);
    await closeDialogs(page);
    await page.waitForTimeout(300);
  }
});

scenario('the Forge keeps gear a mystery until you reach its level', (g) => {
  g.save.tools.mine = 1;
  g.save.skills.mine = { lv: 1, xp: 0 };
}, async (page) => {
  const forgeCards = async () => {
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(400);
    await page.click('[data-tab="forge"]');
    await page.waitForTimeout(300);
    const r = { mysteries: (await page.$$('.tile.mystery')).length, names: await page.$$eval('.bench .tile:not(.mystery):not(.empty)', (els) => els.map((e) => e.getAttribute('aria-label') ?? '')) };
    // Undiscovered recipes are hidden until you ask to see their outlines.
    await page.click('[data-do="forge-locked"]');
    await page.waitForTimeout(200);
    Object.assign(r, { outlines: (await page.$$('.tile.mystery')).length });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    return r;
  };
  const before = await forgeCards();
  check(before.mysteries === 0, 'undiscovered recipes show before asking');
  check((before as { outlines?: number }).outlines! > 0, 'no outlines when asked for undiscovered recipes');
  check(before.names.some((n) => n.includes('Jelly Whip')), 'Jelly Whip (no level needed) is not shown');
  check(!before.names.some((n) => n.includes('Stone Sword')), 'Stone Sword is shown before Mining 2');
  await run(page, 'g.save.skills.mine.lv = 2');
  const after = await forgeCards();
  check(after.names.some((n) => n.includes('Stone Sword')), 'Stone Sword still hidden at Mining 2');
});

scenario('the play report records fights, waits between strikes, deaths and time, and exports', (g) => {
  g.save.owned.push('stonesword');
  g.save.equip.weapon = 'stonesword';
}, async (page) => {
  // A win where you mash the attack button (so you wait between strikes)…
  await run(page, 'g.encounter()');
  await page.waitForTimeout(900);
  await pinFoes(page);
  const t0 = Date.now();
  while (Date.now() - t0 < 1500) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(40); }
  await winFight(page);
  // Some time on the map (the time split counts in tenths of a minute).
  await page.waitForTimeout(3500);
  // …and a loss, so the report says what got you.
  await run(page, `g.fight('wolf', 12, 2)`);
  await waitFor(page, 'the wolf fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle`));
  await page.waitForTimeout(1500);
  await run(page, 'g.battle.p.hp = 1; g.battle.p.iframes = 0');
  await waitFor(page, 'back on the map as a spirit', async () => game<boolean>(page, `g.mode === 'world' && !g.battle && !!g.save.spirit`), 20000);

  await openMore(page);
  // The full report: a file with the summary, then one line per event.
  const download = page.waitForEvent('download');
  await page.click('[data-do="report"]');
  const text = readFileSync(await (await download).path(), 'utf8');
  const report = JSON.parse(text);
  const s = report.summary;
  check(s.fights >= 2 && s.deaths >= 1, `report has ${s.fights} fights, ${s.deaths} deaths`);
  const fight = report.events.fight;
  check(fight.cols.includes('cooling') && fight.rows.every((r: unknown[]) => r.length === fight.cols.length), 'fight rows do not line up with their columns');
  check(text.split('\n').length > fight.rows.length + 20, 'events are not one per line');
  const win = fight.rows.find((r: unknown[]) => r[fight.cols.indexOf('result')] === 'win');
  check(win[fight.cols.indexOf('cooling')] > 0 && win[fight.cols.indexOf('handling')] >= 1, 'mashing never waited between strikes in the report');
  const loss = s.defeatsAndRuns.find((d: { result: string }) => d.result === 'lose');
  check(/^wolf:(contact|shot)$/.test(loss?.by ?? ''), `the loss does not say what got you (${loss?.by})`);
  check(s.time.totalMinutes.fighting > 0 && s.time.totalMinutes.walking > 0 && s.time.byZone.meadow, 'no time split');
  check(s.fightsByWeapon.stonesword?.avgCoolingSec > 0, 'no per-weapon pace summary');
  // How each kill went, time per menu screen, and the story as chapters.
  const sw = s.fightsByWeapon.stonesword;
  check(sw.avgDamagePerHit > 0 && sw.strikesPerKill > 0 && sw.secondsPerKill > 0 && 'critShare' in sw && sw.actionsPerKill > 0, 'no per-kill numbers in the report');
  check(fight.cols.includes('kills') && fight.cols.includes('critDealt'), 'fights do not record kills and crit damage');
  check(s.time.menusByScreen && Object.keys(s.time.menusByScreen).length > 0, 'no menu time per screen');
  check(Array.isArray(s.storyline), 'no storyline in the report');

  // The summary copies to the clipboard, small enough to paste, both with the clipboard API and without it (http).
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const copied = async () => {
    await page.evaluate(`(window.__clip ?? navigator.clipboard).writeText("")`).catch(() => {});
    await page.click('[data-do="report-copy"]');
    await waitFor(page, 'the copied toast', async () => /copied/.test((await page.textContent('#toast')) ?? ''), 3000);
    return JSON.parse(await page.evaluate(`(window.__clip ?? navigator.clipboard).readText()`) as string);
  };
  const summary = await copied();
  check(summary.summary?.fights === s.fights && !summary.events, 'the copied summary is wrong (or includes every event)');
  check(JSON.stringify(summary).length < 20000, 'the copied summary is too big to paste');
  // Plain http has no clipboard API: hide it, and the copy should still work.
  await page.evaluate(`window.__clip = navigator.clipboard; Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2500);
  await openMore(page);
  check((await copied()).summary?.fights === s.fights, 'copying without the clipboard API failed');
});

scenario("Poppy's story plays from the rescue to the reunion", (g) => {
  g.save.lv = 5;
  g.save.pos = { x: 67, y: 15 };
}, async (page) => {
  const step = () => game<number>(page, `g.save.stories.poppy ?? 0`);
  const mode = (m: string) => async () => (await game<string>(page, 'g.mode')) === m;
  // Scene lines only: a popup that isn't someone talking (loot, a level up) is left for closeDialogs.
  const lines = async (max = 12) => {
    const said: string[] = [];
    for (let i = 0; i < max; i++) {
      let b = null;
      for (let t = 0; t < 5000 && !b; t += 150) {
        if ((b = await page.$('#modal:not([hidden]) .sheet.caption [data-dialog]'))) break;
        // Once it has said something, the scene is over when you're back in control.
        if (said.length && (await game<string>(page, 'g.mode')) === 'world') break;
        await page.waitForTimeout(150);
      }
      if (!b) break;
      said.push((await page.textContent('#modal .sheet')) ?? '');
      await b.dispatchEvent('pointerdown');
      await b.click();
      await page.waitForTimeout(400);
    }
    return said.join(' ');
  };
  const goTo = (x: number, y: number) => run(page, `g.over.teleport(${x}, ${y}); g.over.roamers.calm = 9999`);
  const win = async (what: string) => {
    await waitFor(page, what, async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle`), 8000);
    await page.waitForTimeout(1200);
    await endFight(page);
    // Story fights end in scenes, read by lines(): click through the result and level-up screens, not those.
    await waitFor(page, 'the fight to end', async () => {
      await closeDialogs(page, 8, '.sheet:not(.menu):not(.caption)');
      return !(await game<boolean>(page, '!!g.battle'));
    }, 10000);
  };

  // Only the meadow's south-east pocket starts it: not the south edge of any other area.
  await goTo(143.5, 24.5);
  await page.waitForTimeout(600);
  check((await step()) === 0 && (await game<string>(page, 'g.mode')) === 'world', "Poppy's story started outside the meadow");
  // Coming down into the meadow's south-east pocket: she's cornered in the grove's mouth.
  const M = 47;
  await goTo(M + 31, 21.6);
  check(/Somebody, help/.test(await lines()), 'no cry for help');
  await waitFor(page, 'free to walk', mode('world'));
  check((await step()) === 1 && !(await game<boolean>(page, `g.over.world.objs.find((o) => o.flag === 'poppy:rescue').hidden`)), 'the slimes are not blocking the grove');
  // Run up behind them: a surprise attack, with Poppy watching.
  await goTo(M + 28.4, 23.2);
  await waitFor(page, 'the rescue fight', async () => game<boolean>(page, `!!g.battle?.setup.bystander && !!g.battle.setup.ambush`), 8000);
  await win('the rescue fight');
  check(/walk me home/.test(await lines()), 'Poppy never asks to be walked home');
  check((await step()) === 2 && (await game<boolean>(page, `g.over.actors.get('poppy:poppy').follow`)), 'Poppy is not following you');

  // Home (she catches up when you travel), then the toy's gone.
  await waitFor(page, 'free to walk', mode('world'));
  await goTo(33, 11.5);
  await page.keyboard.down('KeyA'); await page.waitForTimeout(500); await page.keyboard.up('KeyA');
  check(/Mr\. Floppers/.test(await lines()), 'Poppy never misses Mr. Floppers');
  await waitFor(page, 'free to walk', mode('world'));
  check((await step()) === 3, `home scene left the story at step ${await step()}`);

  // Back at the grove: the thief runs in, and its friends guard the way.
  await goTo(M + 29, 23.3);
  await waitFor(page, 'the thief scene', mode('dialog'));
  await waitFor(page, 'the getaway', async () => !!(await page.$('#modal:not([hidden]) .sheet.caption')), 12000);
  check(/ran deep into the grove/.test(await lines()), 'nobody says where the thief went');
  await waitFor(page, 'free to walk', mode('world'));
  check((await step()) === 4, 'the chase never started');
  for (const [flag, x, y] of [['pack1', M + 24.4, 23.2], ['pack2', M + 19.5, 24.6], ['bigbun', M + 8.3, 23.2]] as const) {
    check(!(await game<boolean>(page, `g.over.world.objs.find((o) => o.flag === 'poppy:${flag}').hidden`)), `${flag} is not there`);
    await goTo(x, y);
    await win(`the ${flag} fight`);
    await waitFor(page, 'back on the map', async () => game<boolean>(page, `g.save.flags.includes('poppy:${flag}')`), 8000);
  }
  await waitFor(page, 'Mr. Floppers found', async () => (await step()) === 5, 8000);
  await closeDialogs(page);

  // Give him back: a hug, and Granny's boots.
  await waitFor(page, 'free to walk', mode('world'));
  await goTo(29.4, 11.5);
  // Turn to face her (you only talk to someone you're facing).
  await page.keyboard.down('KeyW'); await page.waitForTimeout(120); await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyE');
  await lines();
  await closeDialogs(page);
  await waitFor(page, 'the end', async () => (await step()) === 6, 8000);
  check(await game<boolean>(page, `g.save.perks.includes('trailboots') && g.over.actors.get('poppy:poppy').look.name === 'poppy_hug'`), 'no hug, or no boots');
});

scenario("Bram is at his camp before his story starts, and won't give you the time of day", null, async (page) => {
  check(await game<boolean>(page, `!g.save.bosses.includes('kingslime') && !!g.over.actors.get('bram:bram')`), "Bram isn't at his camp before his story");
  check(await game<string>(page, `g.over.actors.get('bram:bram').mood`) === '😤', "Bram isn't grumpy yet");
});

scenario("Bram's story plays from Granny's pie to his cabin, and Granny learns his stew", (g) => {
  const s = g.save;
  s.lv = 6;
  s.bosses.push('kingslime');
  s.camps.push('woods');
  s.visited.push('meadow', 'woods');
  s.quest = g.quests.findIndex((q: any) => q.id === 'smithy');
  s.stories.poppy = 6;
  s.flags.push('poppy:returned');
  s.tools = { wood: 2, mine: 1 };
  s.pos = { x: 31.8, y: 11.4 };
}, async (page) => {
  const step = () => game<number>(page, 'g.save.stories.bram ?? 0');
  /** Clicks through whatever's on screen (scenes, rewards) and wins any fight, until `until` holds. */
  const playUntil = async (what: string, until: () => Promise<boolean>, ms = 40000) => {
    await waitFor(page, what, async () => {
      if (await until()) return true;
      if (await game<boolean>(page, '!!g.battle && g.battle.intro <= 0 && !g.battle.done')) await endFight(page);
      const b = await page.$('#modal:not([hidden]) [data-dialog]:last-of-type');
      if (b) {
        await b.dispatchEvent('pointerdown');
        await b.click().catch(() => {});
      }
      await page.waitForTimeout(250);
      return false;
    }, ms);
  };
  const talk = (id: string) => run(page, `void g.over.actors.get('${id}').talk()`);

  // Granny's in her Kitchen: she has a favour to ask, and hands over the pie.
  await run(page, `g.enterRoom('kitchen')`);
  await waitFor(page, 'the Kitchen', () => settledIn(page, 'kitchen'));
  check(await game<string>(page, `g.over.room.actors.get('room:granny').label`) === 'Talk', 'Granny has no favour to ask');
  await run(page, `void g.over.room.actors.get('room:granny').talk()`);
  await playUntil('the pie', async () => game<boolean>(page, `g.save.flags.includes('bram:pie') && g.mode === 'world'`));
  await run(page, `g.leaveRoom()`);
  await playUntil('the pie', async () => (await step()) === 1);
  // The grump at his camp: the pie gets him talking.
  await run(page, 'g.over.teleport(95.9, 6.9)');
  await page.waitForTimeout(600);
  await waitFor(page, 'Bram at his camp', async () => game<boolean>(page, `!!g.over.actors.get('bram:bram')`));
  await talk('bram:bram');
  await playUntil('the contest', async () => (await step()) === 2 && (await game<string>(page, 'g.mode')) === 'world');
  // A loud chop brings Woolves early (and the tree waits).
  check(await game<boolean>(page, `g.over.world.objs.some((o) => o.kind === 'node' && o.node === 'pine' && o.x < 100 && o.y < 8)`), 'no pines at the camp');
  // Three pines felled (the chopping itself is covered by its own scenario), and the raid comes anyway.
  await run(page, `g.over.world.objs.filter((o) => o.kind === 'node' && o.node === 'pine' && o.x > 88 && o.x < 100 && o.y > 2.5 && o.y < 8).slice(0, 3).forEach((o) => g.save.flags.push('bram:pine:' + o.id))`);
  await playUntil('the raid and the scarred Woolf', async () => (await step()) === 6 && (await game<string>(page, 'g.mode')) === 'world', 90000);
  check(await game<boolean>(page, `['bram:wave1', 'bram:wave2', 'bram:scar'].every((f) => g.save.flags.includes(f))`), 'the raid did not play out');
  check(await game<boolean>(page, `g.over.actors.get('bram:bram').follow && g.over.actors.get('bram:bram').look.name === 'bram_hurt'`), 'Bram is not leaning on you');
  // The walk home: through both ambushes, then to Granny's door.
  for (const flag of ['bram:ambush1', 'bram:ambush2']) {
    await run(page, `const o = g.over.world.objs.find((o) => o.flag === '${flag}'); g.over.teleport(o.x + o.w / 2, o.y + o.h / 2)`);
    await page.waitForTimeout(400);
    await page.keyboard.press('KeyE');
    await playUntil(`the ${flag} fight`, async () => game<boolean>(page, `g.save.flags.includes('${flag}') && g.mode === 'world'`));
  }
  await run(page, `g.over.teleport(31.8, 11.4)`);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(150); await page.keyboard.up('KeyW');
  await playUntil('home in Sowerby', async () => (await step()) === 7 && (await game<string>(page, 'g.mode')) === 'world');
  check(await game<boolean>(page, `g.save.flags.includes('bram:home') && !g.over.world.objs.find((o) => o.project === 'sawmill').hidden`), 'no Sawmill plot');
  // Build the Sawmill from the village plans.
  await run(page, `Object.assign(g.save.mats, { pine: 24, stone: 24, copper: 12, bark: 60 }); const o = g.over.world.objs.find((o) => o.project === 'sawmill'); g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.5)`);
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await waitFor(page, 'the plans', async () => !!(await page.$('#modal:not([hidden]) [data-build="sawmill"]:not([disabled])')));
  await page.click('#modal [data-build="sawmill"]');
  // The Sawmill rises from its materials (skipped here), then it's back to the plans: close them.
  await page.waitForSelector('.craft-building');
  await page.keyboard.press('Escape');
  await page.click('#modal [data-dialog="ok"]');
  await page.waitForTimeout(400);
  if (await page.$('#modal:not([hidden]) .sheet.menu')) await page.keyboard.press('Escape');
  await playUntil('the Sawmill', async () => (await step()) === 8 && (await game<string>(page, 'g.mode')) === 'world');
  // Bram explains the stations before the cabin hand-in; it cannot open the old workbench menu.
  await talk('bram:bram');
  await playUntil('Bram to finish his advice', async () => game<boolean>(page, `g.mode === 'world' && !g.ui.isOpen`));
  // Saw the cabin's planks by hand (25 logs, with the clock wound on rather than waiting).
  await run(page, `g.enterRoom('sawmill')`);
  await waitFor(page, 'inside the mill', () => settledIn(page, 'sawmill'));
  for (let i = 0; i < 5; i++) await useStation(page, 'pile:bark');
  await useStation(page, 'bench');
  await useStation(page, 'lever');
  check(await game<number>(page, 'g.save.sawmill.queue.length') === 25 && await game<number>(page, 'g.save.mats.bark') === 35, 'the logs did not go to the saw');
  await run(page, 'g.save.sawmill.since -= 25 * 5000');
  await useStation(page, 'planks');
  check(await game<number>(page, 'g.save.mats.plank') === 50, 'the planks did not reach your bag');
  await run(page, `g.leaveRoom()`);
  await waitFor(page, 'outside the mill', () => settledIn(page, null));
  await talk('bram:bram');
  await playUntil('the cabin', async () => (await step()) === 9 && (await game<string>(page, 'g.mode')) === 'world');
  check(await game<boolean>(page, `!g.over.world.objs.find((o) => o.id === 'bramhut').hidden && g.save.flags.includes('bram:stew')`), 'no cabin, or no stew');
});

scenario("The drums in the dark: tail the Pebblors unseen (once spotted and dropped below), and the Echo Anklet dodges twice", (g) => {
  const s = g.save;
  s.lv = 9;
  s.wins = 40;
  s.bosses.push('kingslime', 'alphawolf');
  s.camps.push('woods', 'cave');
  s.visited.push('meadow', 'woods', 'cave');
  s.quest = g.quests.findIndex((q: any) => q.id === 'warp');
  s.stories.poppy = 6;
  s.flags.push('poppy:returned');
  s.perks.push('trailboots');
  s.tools = { wood: 2, mine: 2 };
  s.pos = { x: 29.4, y: 12.6 };
  s.tips.push('drums:look');
  s.unlocked.push('plots', 'warpplot', 'kitchen', 'village');
}, async (page) => {
  const C = 127;
  const step = () => game<number>(page, 'g.save.stories.drums ?? 0');
  const phase = () => game<string>(page, 'g.drums.proc?.phase ?? ""');
  const goTo = (x: number, y: number) => run(page, `if (g.over.underground && ${x} >= ${C} && ${x} < ${C + 40}) g.over.relocate(${x}, ${y}); else g.over.teleport(${x}, ${y})`);
  const shot = (name: string) => (SHOTS ? page.screenshot({ path: `${OUT}drums-${name}.png` }) : Promise.resolve());
  /** Clicks through scenes and popups until `until` holds. */
  const playUntil = async (what: string, until: () => Promise<boolean>, ms = 40000) => {
    await waitFor(page, what, async () => {
      if (await until()) return true;
      const b = await page.$('#modal:not([hidden]) [data-dialog]:last-of-type');
      if (b) {
        await b.dispatchEvent('pointerdown');
        await b.click().catch(() => {});
      }
      await page.waitForTimeout(250);
      return false;
    }, ms);
  };
  const free = async () => (await game<string>(page, 'g.mode')) === 'world' && !(await game<boolean>(page, '!!document.querySelector("#modal:not([hidden])")'));

  check(!(await game<boolean>(page, `!!g.over.actors.get('poppy:poppy')`)), 'Poppy is still at home');
  // Watch her run into the actual cave mouth, then follow and talk to her inside.
  await goTo(C + 25.4, 9.6);
  await playUntil('Poppy enters the cave', async () => (await step()) === 1 && (await free()));
  check(await game<boolean>(page, `!g.over.actors.get('drums:poppy') && g.over.echo.actors.get('drums:poppy').y < 8`), 'Poppy never entered the separate cave');
  await goTo(C + 26.5, 9.3);
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyE');
  await waitFor(page, 'the independent underground map', async () => game<boolean>(page, `!!g.over.underground && !g.trans && g.over.map !== g.over.world && g.over.cast === g.over.echo.actors`)).catch(async (e) => { throw new Error(`${e.message}: ${JSON.stringify(await game(page, `({mode:g.mode,x:g.over.x,y:g.over.y,near:g.over.nearbyObject(),prey:g.over.roamers.unaware(g.over.x,g.over.y)})`))}`); });
  await goTo(C + 26.5, 7.7);
  await run(page, 'g.over.face = -Math.PI / 2');
  await page.waitForTimeout(150);
  await page.keyboard.press('KeyE');
  await playUntil('catch Poppy', async () => (await step()) === 2 && (await free()));
  await waitFor(page, 'the procession shown', async () => (await game<number>(page, `['drums:g0','drums:g1','drums:g2','drums:g3'].filter((id) => g.over.cast.get(id)).length`)) === 4);
  await shot('intro');
  await playUntil('the way up', async () => free());

  // Tail them: three tiles behind the last one, ducking behind a pillar (or round a corner) whenever it looks back,
  // except the first time, out in the open: it stamps, and down you go.
  const HIDE = [[C + 26.7, 5.6], [C + 27.5, 6.6], [C + 29.6, 2.5]];
  let spottedOnce = false;
  await waitFor(page, 'the procession reaches the chamber', async () => {
    const p = await phase();
    if (p === 'arrived') return true;
    if (!(await free())) return false;
    if (p === 'warn' || p === 'look') {
      const i = (await game<number>(page, 'g.drums.proc.looks')) - 1;
      if (!spottedOnce) {
        // Right out in the open behind it.
        const [x, y] = await game<[number, number]>(page, `(() => { const r = g.drums.trail(2); return [r.x, r.y]; })()`);
        await goTo(x, y);
        await shot('looking');
        await waitFor(page, 'the fall', async () => (await game<number>(page, 'g.drums.falls')) === 1, 6000);
        spottedOnce = true;
        await waitFor(page, 'down in the pocket', async () => (await free()) && (await game<boolean>(page, `g.over.y > 17.5 && g.over.x < ${C + 11}`)), 6000);
        await shot('pocket');
        // Walk the winding tunnel back up to the slope.
        for (const [x, y] of [[2.5, 19.5], [3.6, 20.5], [5, 21.5], [7.6, 20.5], [8.6, 19.5], [9.9, 18.6]]) {
          await goTo(C + x, y);
          await page.waitForTimeout(120);
        }
        await waitFor(page, 'back up at the trail', async () => (await free()) && (await game<boolean>(page, `g.over.y < 9 && g.over.x > ${C + 25}`)), 6000);
        return false;
      }
      await goTo(HIDE[i][0], HIDE[i][1]);
      await page.waitForTimeout(150);
      return false;
    }
    const [x, y] = await game<[number, number]>(page, `(() => { const r = g.drums.trail(3); return [r.x, r.y]; })()`);
    await goTo(x, y);
    await page.waitForTimeout(100);
    return false;
  }, 90000);
  check(spottedOnce && (await game<number>(page, 'g.drums.falls')) === 1, `spotted ${await game<number>(page, 'g.drums.falls')} times`);
  check((await game<number>(page, 'g.drums.proc.looks')) === 3, 'not every look-back happened');

  // The chamber is barred. Reaching Poppy's ledge alone must not auto-start the exchange.
  await page.waitForTimeout(1500);
  check(await game<boolean>(page, `g.over.map.solidAt(${C + 25.5}, 3.5) && g.over.map.solidAt(${C + 24.5}, 2.5)`), 'ritual gates do not block movement');
  for (const [x, y] of [[30.6, 3.6], [30.6, 1.5], [24.5, 1.85]]) {
    await goTo(C + x, y); await page.waitForTimeout(150);
  }
  check((await step()) === 2 && (await free()), 'ending started without talking to Poppy');
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(350); await page.keyboard.up('ArrowDown');
  check(await game<boolean>(page, 'g.over.y < 2.03'), 'walked through the lattice into the ritual');
  await run(page, 'g.over.face = -Math.PI / 2');
  check(await game<string>(page, 'g.over.nearbyObject()?.id') === 'drums:poppy', 'Poppy cannot be talked to from her ledge');
  await page.keyboard.press('KeyE');
  await waitFor(page, 'the quiet scene', async () => (await game<string>(page, 'g.mode')) === 'dialog', 8000);
  check(await game<boolean>(page, `JSON.parse(localStorage.getItem('sprout-quest-save')).perks.filter((p) => p === 'echoanklet').length === 1`), 'gift is not durably saved before the scene can be interrupted');
  await shot('chamber');
  await playUntil('the Echo Anklet', async () => (await step()) === 3 && (await free()), 120000);
  check(await game<boolean>(page, `g.save.perks.includes('echoanklet') && !g.over.cast.get('drums:poppy')`), 'no anklet, or Poppy never left');
  check(await game<boolean>(page, `!g.over.map.objs.find((o) => o.id === 'prop_totem_new').hidden`), 'no new totem in the chamber');
  check(await game<boolean>(page, `!!g.over.actors.get('poppy:poppy')`), "Poppy isn't home");

  // Walk back up to the same cave mouth before returning home.
  await goTo(C + 26.5, 9.3);
  await page.keyboard.down('KeyS');
  await waitFor(page, 'outside the cave again', async () => game<boolean>(page, `!g.over.underground && !g.trans`)).finally(() => page.keyboard.up('KeyS'));
  check(await game<boolean>(page, `Math.hypot(g.over.x - ${C + 26.5}, g.over.y - 9.7) < .15`), 'cave exit returned to the wrong place');
  // Home: Poppy's in trouble with Granny.
  await goTo(31.6, 11.4);
  await playUntil('home', async () => (await step()) === 4 && (await free()));

  // A fight: dodge, and dodge again straight away (two pips on the button, both spent).
  await run(page, `g.fight('slime', 9, 1)`);
  await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle && g.battle.intro <= 0`), 30000);
  await pinFoes(page);
  check(await game<number>(page, `document.querySelectorAll('#btn-dodge .dpips:not([hidden]) i.on').length`) === 2, 'no dodge charge pips');
  await page.keyboard.press('KeyK');
  await waitFor(page, 'first dodge', async () => (await game<number>(page, 'g.battle.log.dodges')) === 1);
  await page.keyboard.press('KeyK');
  await waitFor(page, 'second dodge', async () => (await game<number>(page, 'g.battle.log.dodges')) === 2);
  check(await game<number>(page, 'g.battle.log.dodges') === 2, `dodged ${await game<number>(page, 'g.battle.log.dodges')} times, not twice in a row`);
  check(await game<number>(page, 'g.battle.dodgesReady') === 0, 'both charges were not spent');
  await shot('dodges');
  await winFight(page);
}, { webgl: true });

scenario('Echo cave: completed quests can enter, save underground, return through the mouth and revisit', (g) => {
  const s = g.save;
  s.lv = 10; s.bosses.push('kingslime', 'alphawolf');
  s.stories.poppy = 6; s.stories.bram = 9; s.stories.drums = 4;
  s.flags.push('poppy:returned', 'bram:home', 'bram:hut', 'bram:stew');
  s.perks.push('echoanklet'); s.mats.iron = 17;
  s.pos = { x: 153.5, y: 9.7 };
}, async (page) => {
  const atEntrance = async () => {
    await run(page, `g.over.teleport(153.5, 9.7); g.over.face = -Math.PI / 2`);
    await page.waitForTimeout(150);
    check(await game<string>(page, 'g.over.nearbyObject()?.label') === 'Enter cave', 'completed quest has no usable entrance');
  };
  await atEntrance();
  // The displayed cave action wins over a nearby monster's surprise-attack shortcut.
  await run(page, `const r = g.over.roamers.list.find((r) => r.zone === 'cave');
    Object.assign(r, { x: g.over.x + 1, y: g.over.y, hx: g.over.x + 1, hy: g.over.y, state: 'idle', t: 60 });
    g.over.roamers.calm = 10`);
  await page.waitForTimeout(150);
  check(await game<boolean>(page, `!!g.over.roamers.unaware(g.over.x, g.over.y) && document.querySelector('#btn-act').textContent.includes('Enter cave')`), 'nearby monster replaced the cave action');
  await page.keyboard.press('KeyE');
  await waitFor(page, 'underground', async () => game<boolean>(page, `!!g.over.underground && !g.trans && g.over.map !== g.over.world`));
  check(await game<boolean>(page, `!g.battle && g.mode === 'world'`), 'cave entry started a surprise battle');
  check(await game<boolean>(page, `g.over.cast === g.over.echo.actors && g.over.cast.list.filter((a) => a.id.startsWith('drums:g')).length === 4 && !g.over.cast.get('drums:poppy')`), 'completed cast did not stay underground');
  await run(page, `g.over.relocate(157.6, 6.6)`);
  await waitFor(page, 'the underground save', async () => game<boolean>(page, `JSON.parse(localStorage.getItem('sprout-quest-save')).underground?.x === 157.6`), 8000);
  await page.reload(); await page.waitForSelector('.title-btns:not([hidden])'); await page.click('#btn-continue');
  await waitFor(page, 'restored underground', async () => game<boolean>(page, `!!g.over.underground && g.mode === 'world' && !g.trans`));
  check(await game<boolean>(page, `g.over.x === 157.6 && g.over.y === 6.6 && g.save.stories.drums === 4 && g.save.perks.filter((p) => p === 'echoanklet').length === 1 && g.save.mats.iron === 17`), 'reload moved the player or changed quest rewards');
  await run(page, `g.over.relocate(153.5, 9.8); g.over.face = Math.PI / 2`);
  await page.keyboard.press('KeyE');
  await waitFor(page, 'back at the entrance', async () => game<boolean>(page, `!g.over.underground && !g.trans`));
  check(await game<boolean>(page, `Math.hypot(g.over.x - 153.5, g.over.y - 9.7) < .01 && !g.save.underground && !g.over.actors.get('drums:g0')`), 'outside state or cast leaked from the instance');
  // The same entrance also works by walking into it, without replaying Poppy's scene.
  await page.keyboard.down('KeyW');
  await waitFor(page, 'walk back into the cave', async () => game<boolean>(page, `!!g.over.underground && !g.trans`)).finally(() => page.keyboard.up('KeyW'));
  check(await game<boolean>(page, `g.mode === 'world' && g.save.stories.drums === 4 && !g.ui.isOpen`), 're-entry replayed the completed story');
  await run(page, `g.warp('village')`);
  await waitFor(page, 'save the warp out', async () => game<boolean>(page, `!JSON.parse(localStorage.getItem('sprout-quest-save')).underground`), 8000);
  await waitFor(page, 'warping leaves the instance', async () => game<boolean>(page, `!g.over.underground && !g.trans && g.over.currentZone.id === 'village' && !g.save.underground`));
});

const drumsReunionSeed = (g: any) => {
  const s = g.save;
  s.lv = 9; s.tools.mine = 2; s.skills.mine.lv = 2;
  s.mats.stone = 12; s.mats.bark = 6;
  s.bosses.push('kingslime', 'alphawolf');
  s.stories.poppy = 6; s.stories.bram = 9; s.stories.drums = 3;
  s.flags.push('poppy:returned', 'bram:home', 'bram:hut', 'bram:stew');
  s.perks.push('echoanklet');
  s.build.garden = 3; s.build.sawmill = 1;
  s.unlocked.push('plots', 'warpplot', 'kitchen', 'sawmill', 'village');
  s.pos = { x: 23.5, y: 11.4 };
};

scenario('Drums reunion: Poppy leaves the Garden for Granny after crafting and a sawmill visit', drumsReunionSeed, async (page) => {
  // A pending reunion must wait behind a room transition, even if we stand by Granny.
  await run(page, `g.over.teleport(31.6, 11.4); g.enterRoom('sawmill')`);
  await waitFor(page, 'the sawmill visit', () => settledIn(page, 'sawmill'));
  check(await game<number>(page, 'g.save.stories.drums') === 3, 'reunion started during a room transition');
  await run(page, `g.leaveRoom()`);
  await waitFor(page, 'outside the sawmill', () => settledIn(page, null));
  await page.keyboard.press('KeyB');
  await waitFor(page, 'the menu', async () => game<boolean>(page, `g.mode === 'dialog' && g.ui.isOpen`));
  await run(page, `g.ui.openMenu({atForge: true, inVillage: true}, 'forge')`);
  // Use the real crafting flow, including its saved materials and item reward.
  await page.click('[data-sub="forge:weapon"]');
  const recipe = page.locator('[data-pick="forge-weapon:stonesword"]');
  if (!await recipe.evaluate((el) => el.classList.contains('sel'))) await recipe.click();
  await page.click('[data-craft="stonesword"]');
  await page.locator('.sheet.crafting').waitFor();
  await page.locator('.craft-ready').waitFor();
  await page.click('#modal [data-dialog="later"]');
  await waitFor(page, 'back at the Forge', async () => !!(await page.$('#modal:not([hidden]) .sheet.menu')));
  check(await game<boolean>(page, `g.save.owned.includes('stonesword') && g.save.mats.stone === 0 && g.save.mats.bark === 0`), 'crafting did not save its cost and reward');
  // A pending scene must also wait behind an open menu at its trigger spot.
  await run(page, `g.over.teleport(31.6, 11.4)`);
  await page.waitForTimeout(300);
  check(await game<number>(page, 'g.save.stories.drums') === 3, 'reunion started over the Forge');
  await run(page, `g.ui.closeMenu()`);
  await waitFor(page, 'Granny speaks after Poppy arrives', async () => !!(await page.textContent('#modal:not([hidden]) .caption-text'))?.includes('A whole night'), 12000);
  const p = await game<{ x: number; y: number; path: number }>(page, `(() => {const p = g.over.actors.get('poppy:poppy'); return {x:p.x,y:p.y,path:p.path.length};})()`);
  check(Math.hypot(p.x - 30.7, p.y - 10.45) < .15 && p.path === 0, 'Poppy did not stay beside Granny');
  // Leave a line open long enough for the Garden's idle timer to fire.
  await page.waitForTimeout(6500);
  check(await game<boolean>(page, `g.over.actors.get('poppy:poppy').path.length === 0`), 'the Garden sent Poppy away during dialogue');
  const said = await closeDialogs(page);
  check(said.some((s) => s.includes('Thank you for bringing her home')), 'reunion dialogue did not finish');
  await waitFor(page, 'back in control after the reunion', async () => game<boolean>(page, `g.mode === 'world' && !document.body.classList.contains('cinema') && g.save.stories.drums === 4`));
  check(await game<boolean>(page, `g.over.actors.get('poppy:poppy').x > ${FX}`), 'Poppy did not return to tending the Garden');
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.click('#btn-continue');
  await waitFor(page, 'the completed save resumes normally', async () => game<boolean>(page, `g.mode === 'world' && !g.trans && !g.ui.isOpen && !document.body.classList.contains('cinema')`));
  check(await game<boolean>(page, `g.save.stories.drums === 4 && g.save.perks.includes('echoanklet') && g.save.owned.includes('stonesword') && g.save.mats.stone === 0 && g.save.mats.bark === 0`), 'reload lost or duplicated the rewards');
});

scenario('Drums reunion: walking into the Kitchen defers the outdoor scene until you leave', drumsReunionSeed, async (page) => {
  // The Kitchen doorway overlaps Granny's scene trigger. Walking up must finish
  // entering the room before the outdoor story checks later in that same frame.
  await page.keyboard.down('KeyW');
  await run(page, `g.over.teleport(30.5, 9.85)`);
  await waitFor(page, 'the Kitchen doorway', () => settledIn(page, 'kitchen'));
  await page.keyboard.up('KeyW');
  check(await game<boolean>(page, `g.save.stories.drums === 3 && !document.body.classList.contains('cinema') && !g.ui.isOpen`), 'outdoor reunion interrupted entering the Kitchen');
  await run(page, `g.leaveRoom()`);
  await waitFor(page, 'the reunion after leaving', async () => !!(await page.textContent('#modal:not([hidden]) .caption-text'))?.includes('A whole night'), 12000);
  await closeDialogs(page);
  await waitFor(page, 'the reunion finishes outside', async () => game<boolean>(page, `!g.room && g.mode === 'world' && g.save.stories.drums === 4 && !document.body.classList.contains('cinema')`));
});

scenario("Pip moves into the Guest Cottage, and his Rock Candy gets an extra handful of ore out of a rock", (g) => {
  const s = g.save;
  s.lv = 6;
  s.bosses.push('kingslime');
  s.camps.push('woods');
  s.visited.push('meadow', 'woods');
  s.quest = g.quests.findIndex((q: any) => q.id === 'smithy');
  s.stories.poppy = 6;
  s.stories.bram = 9;
  s.flags.push('poppy:returned', 'bram:pie', 'bram:met', 'bram:home', 'bram:hut', 'bram:stew');
  s.build.sawmill = 1;
  s.tools = { wood: 2, mine: 1 };
  Object.assign(s.mats, { bark: 12, plank: 32, stone: 36, copper: 18 });
  s.pos = { x: 35.9, y: 6.7 };
}, async (page) => {
  const said: string[] = [];
  /** Clicks through scenes and cards (noting what's said), until `until` holds. */
  const playUntil = async (what: string, until: () => Promise<boolean>, ms = 30000) => {
    await waitFor(page, what, async () => {
      if (await until()) return true;
      const b = await page.$('#modal:not([hidden]) [data-dialog]:last-of-type');
      if (b) {
        said.push((await page.textContent('#modal .sheet')) ?? '');
        await b.dispatchEvent('pointerdown');
        await b.click().catch(() => {});
      }
      await page.waitForTimeout(250);
      return false;
    }, ms);
  };
  const step = () => game<number>(page, 'g.save.stories.pip ?? 0');
  // Bram's settled in: bring him the Guest Cottage's planks outside the mill.
  await playUntil('the cottage plot', async () => game<boolean>(page, `g.mode === 'world' && !g.over.world.objs.find((o) => o.project === 'cottage').hidden`));
  check(!(await game<boolean>(page, `!!g.over.actors.get('pip:pip')`)), 'Pip is here before his cottage');
  await run(page, `const a = g.over.actors.get('bram:bram'); g.over.teleport(a.x, a.y + .6); g.over.face = -Math.PI / 2`);
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await waitFor(page, 'Bram’s plans', async () => !!(await page.$('#modal:not([hidden]) [data-dialog="home:pip:0"]:not([disabled])')));
  await page.click('#modal [data-dialog="home:pip:0"]');
  // The Guest Cottage rises from its materials (skipped here); Pip's arrival follows.
  await page.waitForSelector('.craft-building');
  await page.keyboard.press('Escape');
  await page.click('#modal [data-dialog="ok"]');
  await page.waitForTimeout(400);
  if (await page.$('#modal:not([hidden]) .sheet.house-plans')) await page.keyboard.press('Escape');
  // He pops up by the door, moves in and teaches Granny his Rock Candy.
  await playUntil('Pip moving in', async () => (await step()) === 1 && (await game<string>(page, 'g.mode')) === 'world' && !(await page.$('#modal:not([hidden])')));
  check(said.some((t) => t.includes("I'm Pip")), 'Pip never introduced himself');
  check(await game<boolean>(page, `g.save.build.cottage === 1 && g.save.flags.includes('pip:candy') && !!g.over.actors.get('pip:pip')`), 'Pip did not move in');
  // He has a few things to say, the Obsidian on Ember Peak among them.
  for (let i = 0; i < 5; i++) {
    await run(page, `void g.over.actors.get('pip:pip').talk()`);
    await playUntil('Pip to finish', async () => (await game<string>(page, 'g.mode')) === 'world' && !(await page.$('#modal:not([hidden])')), 8000);
  }
  check(said.some((t) => t.includes('Obsidian')), 'Pip never mentioned the Obsidian');
  // The recipe Pip taught Granny is in her book, made through the stations.
  const mats = () => game<number[]>(page, '[g.save.mats.stone, g.save.mats.copper]');
  const cost = await mats();
  await cookByHand(page, 'rockcandy');
  check(await game<boolean>(page, `g.save.meal?.id === 'rockcandy'`), 'Rock Candy was not served');
  check(JSON.stringify(await mats()) === JSON.stringify([cost[0] - 12, cost[1] - 6]), 'Rock Candy did not cost 12 stone and 6 copper');
  await run(page, `g.leaveRoom()`);
  await waitFor(page, 'outside the Kitchen', () => settledIn(page, null));
  // Out to a meadow rock: one miss (so it isn't flawless), then clean strikes until it breaks.
  const placed = await game<boolean>(page, `(() => {
    const o = g.over, w = o.world;
    for (const r of w.objs.filter((x) => x.kind === 'node' && x.node === 'rock' && !x.grass && x.id.startsWith('meadow:'))) {
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const x = r.x + 0.4 + dx * 0.95, y = r.y + 0.6 + dy * 0.95;
        if (w.blocked(x, y, 0.28)) continue;
        o.teleport(x, y);
        o.roamers.calm = 999;
        if (o.nearbyObject() === r) return true;
      }
    }
    return false;
  })()`);
  check(placed, 'no open spot next to a meadow rock');
  const before = await game<number>(page, 'g.save.mats.stone');
  await page.keyboard.press('KeyE');
  await waitFor(page, 'the mining minigame', async () => (await game<string>(page, 'g.mode')) === 'gather');
  await waitFor(page, 'a miss', async () => game<boolean>(page, `(() => { const c = g.chop.game; return Math.abs(c.pos - c.center) > c.width * 1.5 && c.lock <= 0; })()`), 8000);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(80);
  for (let i = 0; i < 40 && !(await game<boolean>(page, 'g.chop?.game.done ?? true')); i++) {
    await waitFor(page, 'the sweet spot', async () => game<boolean>(page, `(() => { const c = g.chop?.game; return !c || c.done || (Math.abs(c.pos - c.center) < c.width * 0.3 && c.lock <= 0); })()`), 8000);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(60);
  }
  await waitFor(page, 'the rock to break', async () => (await game<string>(page, 'g.mode')) !== 'gather', 5000);
  const gained = (await game<number>(page, 'g.save.mats.stone')) - before;
  check(gained === NODES.rock.safe.yield * 2, `a rock on Rock Candy gave ${gained} stone, not a handful (${NODES.rock.safe.yield}) more`);
  await closeDialogs(page);
});

// Poppy's field, in Sowerby's east end: its first plot's tile (World.placeField: the village's left edge + FIELD), the
// gate's column, and where to stand to work plot (column, row) or to reach the water butt and seed basket.
const FX = 16 + 23, FY = 17, GATE_X = FX + 2.5;
const onPlot = (c: number, r: number): [number, number] => [FX + c + 0.5, FY + r + 0.75];
const BASKET: [number, number, number] = [FX - 0.5, FY + 1.2, Math.PI / 2];
const BUTT: [number, number, number] = [FX - 0.5, FY + 0.95, -Math.PI / 2];
/** Helpers for the field scenarios: what you hold, the plots, standing somewhere facing somewhere, and the button. */
function fieldKit(page: Page) {
  const stand = async (x: number, y: number, face = Math.PI / 2) => {
    await run(page, `g.over.teleport(${x}, ${y}); g.over.face = ${face}`);
    await page.waitForTimeout(250);
  };
  return {
    garden: () => game<any>(page, 'g.garden'),
    plots: () => game<any[]>(page, 'g.save.garden?.plots ?? []'),
    label: () => game<string>(page, `g.over.world.objs.find((o) => o.project === 'garden').label`),
    stand,
    press: async () => {
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(200);
    },
    /** Holds the button and walks east along a row until past `x`. */
    sweepEast: async (x: number) => {
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(150);
      await page.keyboard.down('KeyD');
      await waitFor(page, 'along the row', async () => (await game<number>(page, 'g.over.x')) > x, 5000).finally(async () => {
        await page.keyboard.up('KeyD');
        await page.keyboard.up('KeyE');
      });
      await page.waitForTimeout(200);
    },
    /** Where plot (column, row)'s middle is on the screen. */
    onScreen: (c: number, r: number) => game<{ x: number; y: number }>(page, `(() => { const ts = g.over.ts, z = g.over.toMap(0, 0); return { x: (${FX + c + 0.5} - z.x) * ts, y: (${FY + r + 0.5} - z.y) * ts }; })()`),
  };
}

scenario("Poppy's Garden: conversation offers advice without a production menu", (g) => {
  const s = g.save;
  s.lv = 6;
  s.stories.poppy = 6;
  s.flags.push('poppy:returned');
  s.build.garden = 2;
  Object.assign(s.mats, { berryseed: 0, herbseed: 1, flowerseed: 0 });
  s.pos = { x: 33, y: 13.5 };
}, async (page) => {
  await waitFor(page, 'Poppy at the Garden', async () => game<boolean>(page, `(() => { const p = g.over.actors.get('poppy:poppy'); return !!p && p.label === 'Talk' && p.x > ${FX}; })()`));
  const before = await game<string>(page, 'JSON.stringify(g.save.mats)');
  await run(page, `void g.over.actors.get('poppy:poppy').talk()`);
  await waitFor(page, 'Poppy speaking', async () => !!(await page.$('#modal:not([hidden]) .talk')));
  check(!(await page.$('#modal .sheet.garden')) && !(await page.$('#modal [data-dialog^="plant:"]')), 'Poppy still opens a production menu');
  await closeDialogs(page);
  await waitFor(page, 'free to work', async () => game<boolean>(page, `g.mode === 'world'`));
  check(await game<string>(page, 'JSON.stringify(g.save.mats)') === before, 'conversation changed the materials');
  await run(page, `g.over.teleport(${GATE_X}, ${FY - 0.4}); g.over.face = -Math.PI / 2`);
  await waitFor(page, 'welcome seeds at the field', async () => game<boolean>(page, `g.garden.inside && g.save.mats.berryseed === 6`));
  check(!(await page.$('#modal:not([hidden]) .sheet.garden')), 'walking to the field opened a production menu');
});

scenario("Poppy's field by hand: seeds from the basket, hold the button down a row to plant, tug weeds, fill the can and water, tap a ripe plot, sweep a row to pick", (g) => {
  const s = g.save;
  s.lv = 6;
  s.stories.poppy = 6;
  s.flags.push('poppy:returned');
  s.build.garden = 2;
  Object.assign(s.mats, { berryseed: 0, herbseed: 1, flowerseed: 0, berry: 0, herb: 0, fluff: 6 });
  s.pos = { x: 41.5, y: 14 }; // GATE_X (seeds are sent as source)
}, async (page) => {
  const { garden, plots, label, stand, press, sweepEast, onScreen } = fieldKit(page);
  const poppy = () => game<{ x: number; y: number; speech: string }>(page, `(() => { const p = g.over.actors.get('poppy:poppy'); return { x: p.x, y: p.y, speech: p.speech?.text ?? '' }; })()`);
  // Walk in at the gate: Poppy hands over the Berry Seeds she saved. The camera stays as it is (the plots are whole tiles).
  const ts = await game<number>(page, 'g.over.ts');
  await stand(GATE_X, FY - 0.4);
  await waitFor(page, 'the field', async () => (await garden()).inside && (await game<number>(page, 'g.save.mats.berryseed')) === 6);
  await page.waitForTimeout(500);
  check(await game<number>(page, 'g.over.ts') === ts, 'the view leaned in');
  // Seeds from the basket.
  await stand(...BASKET);
  await press();
  check(JSON.stringify((await garden()).hand) === '{"seed":"berry"}', `no Berry Seeds in hand (${JSON.stringify((await garden()).hand)})`);
  // Hold the button and walk along the top row: a seed in every plot you pass, and none on the untilled end.
  await stand(...onPlot(1, 0), 0);
  check(await label() === 'Plant Berry', `the plot underfoot was not the target (${await label()})`);
  await sweepEast(FX + 4.3);
  let p = await plots();
  check([0, 1, 2].every((i) => p[i]?.crop === 'berry') && p.filter(Boolean).length === 3, `the row was not planted (${JSON.stringify(p.map((q) => q?.crop ?? null))})`);
  check(await game<number>(page, 'g.save.mats.berryseed') === 3, 'planting did not take the seeds');
  const pop = await poppy();
  check(Math.hypot(pop.x - (FX + 5.5), pop.y - (FY + 1.9)) > 0.5, `Poppy did not come over to help (${JSON.stringify(pop)})`);
  // The basket's next seed: Herb, into the second row.
  await stand(...BASKET);
  await press();
  check(JSON.stringify((await garden()).hand) === '{"seed":"herb"}', 'no Herb Seeds in hand');
  await stand(...onPlot(1, 1));
  await press();
  check((await plots())[3]?.crop === 'herb' && (await garden()).hand === null, 'the herb was not planted (or the empty seed bag stayed in hand)');
  // Trouble: the first plot thirsty, the second weedy. Three tugs pull the weeds.
  await run(page, `const [a, b] = g.save.garden.plots; for (const p of g.save.garden.plots) if (p) { delete p.thirstAt; delete p.weedsAt; } a.thirsty = true; b.weeds = true`);
  await stand(...onPlot(2, 0));
  check(await label() === 'Pull weeds', 'the weedy plot was not the target');
  for (let i = 0; i < 3; i++) await press();
  check(!(await plots())[1].weeds, 'three tugs did not pull the weeds');
  // Thirsty without the can: nothing. Fill it at the butt and water.
  await stand(...onPlot(1, 0));
  await press();
  check((await plots())[0].thirsty, 'watered without a can');
  await stand(...BUTT);
  await press();
  check(JSON.stringify((await garden()).hand) === '{"can":6}', `the can was not filled (${JSON.stringify((await garden()).hand)})`);
  await stand(...onPlot(1, 0));
  await press();
  check(!(await plots())[0].thirsty && (await garden()).hand.can === 5, 'watering did not take');
  // Much later: all ripe. A thumb landing on a plot to walk away (the joystick) doesn't pick it…
  await run(page, `for (const p of g.save.garden.plots) if (p) p.at -= 1e7`);
  await stand(...onPlot(2, 1), -Math.PI / 2);
  await page.waitForTimeout(400);
  let at = await onScreen(2, 0);
  await touchDrag(page, at.x, at.y, -70, 0);
  await page.waitForTimeout(200);
  check((await plots())[1] !== null && !(await page.$('#modal:not([hidden])')), 'a drag starting on the ripe plot picked it');
  // …a tap on it does (the first berries teach Granny her tart).
  await stand(...onPlot(2, 1), -Math.PI / 2);
  await page.waitForTimeout(600);
  at = await onScreen(2, 0);
  await page.touchscreen.tap(at.x, at.y);
  await waitFor(page, 'the new recipe', async () => ((await page.textContent('#modal:not([hidden]) .sheet').catch(() => '')) ?? '').includes('Berry Tart'));
  await closeDialogs(page, 1);
  check((await plots())[1] === null && (await game<number>(page, 'g.save.mats.berry')) === 3, 'tapping the ripe plot did not pick it');
  // Hold the button down the row for the rest of it, then the herb.
  await waitFor(page, 'free to work', async () => (await game<string>(page, 'g.mode')) === 'world');
  await stand(...onPlot(1, 0), 0);
  await sweepEast(FX + 3.6);
  p = await plots();
  check(!p[0] && !p[2], `sweeping the row did not pick it (${JSON.stringify(p.map((q) => q?.crop ?? null))})`);
  await stand(...onPlot(1, 1));
  await press();
  check(await game<boolean>(page, 'g.save.mats.berry === 9 && g.save.mats.herb === 2'), 'the harvest did not reach your bag');
  // The Bloom Garden's plots aren't tilled yet: Poppy says so.
  await stand(...onPlot(4, 0));
  check(await label() === 'Untilled', `untilled ground was not labelled (${await label()})`);
  await press();
  check((await poppy()).speech.includes('upgraded'), 'Poppy did not say the field grows with the Garden');
  // Walk off: the can goes back.
  await stand(GATE_X, 13.5);
  await waitFor(page, 'away from the field', async () => (await garden()).hand === null && !(await garden()).inside);
  // The field's harvest unlocks the recipe book's tart, made from one ingredient plate at the pot.
  const hp = await game<number>(page, 'g.save.hp');
  await cookByHand(page, 'tart');
  check(await game<boolean>(page, `g.save.meal?.id === 'tart' && g.save.mats.berry === 1 && g.save.mats.fluff === 0`), 'the tart did not charge the harvested berries and fluff');
  check(await game<number>(page, 'g.save.hp') > hp, 'the tart should raise your health');
});

scenario("Poppy's field grows: an old save's beds and place carry over, and the sign at the gate upgrades it to twelve plots", (g) => {
  const s = g.save;
  s.lv = 6;
  s.stories.poppy = 6;
  s.flags.push('poppy:returned', 'garden:welcome');
  s.build.garden = 1;
  Object.assign(s.mats, { cap: 12, plank: 24, stone: 12 });
  // A save from before the field: two beds growing, and standing in the meadow on the old, narrower map.
  delete s.field;
  s.pos = { x: 45, y: 13.5 };
  const now = Date.now();
  s.garden = { gift: now, plots: [{ crop: 'berry', grown: 100, at: now }, { crop: 'herb', grown: 50, at: now, thirsty: true }] };
}, async (page) => {
  const { plots, label, stand, press } = fieldKit(page);
  check(await game<boolean>(page, `g.save.pos.x > 53.5 && g.over.zone.id === 'meadow' && g.save.field === true`), `the old save was not moved along with the meadow (${await game<number>(page, 'g.save.pos.x')})`);
  // Its beds are the field's first plots.
  let p = await plots();
  check(p[0]?.crop === 'berry' && p[1]?.crop === 'herb' && p[1].thirsty, `the old beds did not carry over (${JSON.stringify(p)})`);
  await stand(...onPlot(1, 0));
  check(await label() === 'Growing', `the first plot is not the old berry bed (${await label()})`);
  await stand(...onPlot(2, 0));
  check(await label() === 'Thirsty', `the second plot is not the old thirsty herb bed (${await label()})`);
  // The Sprout Patch has six; the Berry Garden's are pegged out but not tilled.
  await stand(...onPlot(0, 0));
  check(await label() === 'Untilled', `the next level's plots were already tilled (${await label()})`);
  // The sign at the gate: the Garden's next level, from the village plans.
  await stand(FX + 4.6, FY - 2.1);
  await press();
  await waitFor(page, 'the plans', async () => !!(await page.$('#modal:not([hidden]) [data-build="garden"]:not([disabled])')));
  await page.click('#modal [data-build="garden"]');
  await page.waitForSelector('.craft-building');
  check((await page.locator('.craft-model').getAttribute('data-layers').catch(() => '')) !== null, 'no building scene');
  await page.keyboard.press('Escape');
  await page.click('#modal [data-dialog="ok"]');
  await page.waitForTimeout(400);
  if (await page.$('#modal:not([hidden]) .sheet.menu')) await page.keyboard.press('Escape');
  await waitFor(page, 'back on the map', async () => (await game<string>(page, 'g.mode')) === 'world');
  check(await game<number>(page, 'g.save.build.garden') === 2, 'the Berry Garden was not built');
  // Twelve plots: the new column is tilled, and what was growing stayed put.
  await stand(...onPlot(0, 0));
  check(await label() === 'Empty plot', `the new plots were not tilled (${await label()})`);
  await stand(...onPlot(1, 2));
  check(await label() === 'Empty plot', `the new row was not tilled (${await label()})`);
  p = await plots();
  check(p[0]?.crop === 'berry' && p[1]?.crop === 'herb', 'upgrading moved what was growing');
});

scenario("Granny's Kitchen: one ingredient plate from the book, the creation animation at the pot, enjoy and walk out", (g) => {
  const s = g.save;
  s.lv = 6; s.stories.poppy = 6;
  s.flags.push('poppy:returned');
  Object.assign(s.mats, { clover: 3, fluff: 20, goo: 12 });
  s.pos = { x: 31.4, y: 11.4 };
}, async (page) => {
  check(await game<boolean>(page, `!!g.over.actors.get('granny:granny')`), 'Granny should be outside for conversation and quests');
  await run(page, `const h = g.over.world.obj('house'); g.over.teleport(h.x + h.w / 2, h.y + h.h + 0.9)`);
  await page.keyboard.down('KeyW');
  await waitFor(page, 'the Kitchen', () => settledIn(page, 'kitchen'));
  await page.keyboard.up('KeyW');
  check(await game<boolean>(page, `!!g.over.room.actors.get('room:granny')`), 'Granny is not in the Kitchen');
  // Walk through the middle and across to the book; the side table must not block either leg.
  await page.keyboard.down('KeyW');
  await waitFor(page, 'the open middle of the Kitchen', async () => game<boolean>(page, 'g.over.y < 4.45'));
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyA');
  await waitFor(page, 'the recipe side of the Kitchen', async () => game<boolean>(page, 'g.over.x < 2.25'));
  await page.keyboard.up('KeyA');
  await run(page, `g.over.x = 3.25; g.over.y = 4.65; g.over.face = -Math.PI / 2`);
  await waitFor(page, 'Talk beside Granny', async () => !!(await page.textContent('#btn-act'))?.startsWith('Talk'));
  await page.keyboard.press('KeyE');
  await waitFor(page, 'Granny guiding you through the book', async () => !!(await page.textContent('.caption-text'))?.includes('flip through the recipe book'));
  await closeDialogs(page);
  const book = await game<any>(page, `g.over.room.station('book')`), pantry = await game<any>(page, `g.over.room.station('pantry')`);
  check(book.x >= pantry.x && book.x + book.w <= pantry.x + pantry.w && book.y >= pantry.y + pantry.h, 'the recipe book should stand in front of the pantry');
  check(await game<string>(page, `g.over.room.station('table').label`) === '', 'the table should be furniture, not another required station');
  check(await game<boolean>(page, `g.over.cast.get('room:granny').x > g.over.room.station('book').x + g.over.room.station('book').w && g.over.cast.get('room:granny').y < 4`), 'Granny should wait beside the book');
  await useStation(page, 'book');
  await waitFor(page, 'the recipe book', async () => !!(await page.$('[data-dialog="dish:tea"]')));
  await page.click('[data-dialog="dish:tea"]');
  await waitFor(page, 'the whole ingredient plate', async () => game<boolean>(page, `g.kitchen.held?.dish === 'tea' && g.mode === 'world'`));
  check(await game<string>(page, 'JSON.stringify(g.kitchen.held.ingredients)') === '{"clover":2}', 'the plate did not contain the whole recipe');
  check(await game<boolean>(page, `g.save.mats.clover === 3 && g.save.meal === null && g.kitchen.guide.next === 'stove'`), 'preparation should guide to the pot without spending or eating');
  await run(page, `g.over.x = 3.25; g.over.y = 4.65; g.over.face = -Math.PI / 2`);
  await waitFor(page, 'Talk while carrying the plate', async () => !!(await page.textContent('#btn-act'))?.startsWith('Talk'));
  await page.keyboard.press('KeyE');
  await waitFor(page, 'Granny explaining the cooking bench', async () => !!(await page.textContent('.caption-text'))?.includes('Bring it to the cooking bench'));
  check(await game<boolean>(page, `g.kitchen.held?.dish === 'tea'`), 'conversation should preserve the plate');
  await closeDialogs(page);
  await useStation(page, 'stove');
  await waitFor(page, 'the creation animation', async () => !!(await page.$('.sheet.crafting')));
  check(await game<boolean>(page, `g.save.meal?.id === 'tea' && g.save.mats.clover === 1 && g.kitchen.held === null`), 'the pot should commit the meal once before its animation');
  check(await game<boolean>(page, `JSON.parse(localStorage.getItem('sprout-quest-save')).mats.clover === 1`), 'the meal was not saved before the animation');
  await page.keyboard.press('Escape');
  await page.locator('.craft-ready').waitFor();
  check((await page.textContent('[data-dialog="ok"]'))?.startsWith('Drink'), 'tea should offer Drink after it is made');
  await page.click('[data-dialog="ok"]');
  await waitFor(page, 'free to walk', () => settledIn(page, 'kitchen'));
  check(await game<boolean>(page, `g.kitchen.held === null && !g.kitchen.cooking && g.kitchen.guide.next === 'book'`), 'cooking should finish without stirring or serving at the table');
  await useStation(page, 'stove');
  check(await game<number>(page, 'g.save.mats.clover') === 1, 'an empty plate charged for a second meal');
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])'); await page.click('#btn-continue');
  await waitFor(page, 'back in the Kitchen', () => settledIn(page, 'kitchen'), 8000);
  await closeDialogs(page);
  check(await game<boolean>(page, `g.save.meal?.id === 'tea' && g.save.mats.clover === 1 && g.kitchen.held === null`), 'reloading changed the finished meal');
  await run(page, `g.over.x = 4.5; g.over.y = 7.4`);
  await page.keyboard.down('KeyS');
  await waitFor(page, 'outside again', () => settledIn(page, null));
  await page.keyboard.up('KeyS');
  check(!(await game<boolean>(page, `'room' in g.save`)), 'still saved in the Kitchen');
  check(await game<boolean>(page, `!!g.over.cast.get('granny:granny')`), 'Granny should still be outside after leaving');
});

scenario("Bram's Sawmill: walk in, carry armfuls of oak to the bench, pull the lever, take the planks, ask Bram, and walk back out", (g) => {
  const s = g.save;
  s.lv = 6;
  s.stories.poppy = 6;
  s.stories.bram = 9;
  s.flags.push('poppy:returned', 'bram:pie', 'bram:met', 'bram:home', 'bram:hut', 'bram:stew');
  s.build.sawmill = 1;
  s.unlocked.push('sawmill');
  Object.assign(s.mats, { bark: 12, pine: 6, plank: 0 });
  s.pos = { x: 18.8, y: 8.4 };
}, async (page) => {
  const use = (id: string) => useStation(page, id);
  const mill = () => game<any>(page, 'g.sawmill');
  // Bram chats outside and joins you inside: in through the Sawmill's door, by the action button at it.
  check(await game<boolean>(page, `!!g.over.actors.get('bram:bram')`), 'Bram should be outside after settling in');
  await run(page, `void g.over.cast.get('bram:bram').talk()`);
  await waitFor(page, 'Bram’s house plans', async () => !!(await page.$('.sheet.house-plans')));
  await page.click('[data-dialog="mill"]');
  await waitFor(page, 'Bram explaining the mill', async () => !!(await page.textContent('.caption-text'))?.includes('Inside the mill'));
  await closeDialogs(page);
  await page.waitForSelector('.sheet.house-plans');
  await page.keyboard.press('Escape');
  await run(page, `const o = g.over.world.objs.find((o) => o.project === 'sawmill'); g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.5); g.over.face = -Math.PI / 2`);
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE');
  await waitFor(page, 'the Sawmill', () => settledIn(page, 'sawmill'));
  check(await game<boolean>(page, `!!g.over.cast.get('room:bram')`), 'Bram should join you inside');
  check(JSON.stringify((await mill()).guide.stations) === '["pile:bark"]', 'the available oak pile should glow, not locked pine');
  // Pine needs a better blade: the pile won't give.
  await use('pile:pine');
  check((await mill()).carrying === null, 'picked up pine with a copper blade');
  // An armful of oak, then hold the button for more.
  await use('pile:bark');
  check(JSON.stringify((await mill()).carrying) === '{"log":"bark","n":5}', `no armful of oak (${JSON.stringify((await mill()).carrying)})`);
  check(JSON.stringify((await mill()).guide.stations) === '["bench"]', 'carried logs should direct you to the bench');
  await page.keyboard.down('KeyE');
  await waitFor(page, 'the rest of the oak', async () => (await mill()).carrying?.n === 12, 4000);
  await page.keyboard.up('KeyE');
  check(await game<number>(page, 'g.save.mats.bark') === 12, 'carrying logs took them out of the bag');
  // Onto the bench, then the lever: they go to the saw.
  await use('bench');
  check((await mill()).bench.bark === 12 && (await mill()).carrying === null, 'the logs did not go on the bench');
  check(JSON.stringify((await mill()).guide.stations) === '["lever"]', 'benched logs should direct you to the lever');
  await use('lever');
  check(await game<number>(page, 'g.save.sawmill.queue.length') === 12 && await game<number>(page, 'g.save.mats.bark') === 0, 'the lever did not send the logs to the saw');
  await waitFor(page, 'the blade spinning', async () => (await mill()).spin > 3);
  // Later: the planks are stacked by the door.
  await run(page, 'g.save.sawmill.since -= 12 * 5000');
  check(JSON.stringify((await mill()).guide.stations) === '["planks"]', 'finished planks should glow');
  await use('planks');
  check((await mill()).loot > 0, 'collected planks did not animate toward the Bag');
  const target = await page.locator('#btn-bag').boundingBox();
  const to = (await mill()).lootTo;
  check(target && Math.abs(to.x - (target.x + target.width / 2)) < 1 && Math.abs(to.y - (target.y + target.height / 2)) < 1, 'planks are not aimed at the actual Bag button');
  await waitFor(page, 'plank pickup animation finished', async () => (await mill()).loot === 0);
  await use('planks');
  check(await game<number>(page, 'g.save.mats.plank') === 24, `the planks did not reach your bag (${await game<number>(page, 'g.save.mats.plank')})`);
  // Bram offers advice without a menu or another production path.
  await run(page, `const a = g.over.cast.get('room:bram'); g.over.x = a.x + 1; g.over.y = a.y; g.over.face = Math.PI`);
  await waitFor(page, 'Talk beside Bram', async () => !!(await page.textContent('#btn-act'))?.startsWith('Talk'));
  await page.keyboard.press('KeyE');
  await waitFor(page, 'Bram explaining the saw', async () => game<boolean>(page, `!!g.over.cast.get('room:bram').speech?.text.includes('One log, two planks')`));
  check(await game<boolean>(page, `g.mode === 'world' && !g.ui.isOpen && !!g.over.cast.get('room:bram').speech`), 'Bram still opens a production menu');
  // Out of the door.
  await run(page, `g.over.x = 4.5; g.over.y = 7.4`);
  await page.keyboard.down('KeyS');
  await waitFor(page, 'outside again', async () => (await game<string>(page, 'g.room')) === null, 5000);
  await page.keyboard.up('KeyS');
  check(await game<boolean>(page, `Math.hypot(g.over.x - 18.8, g.over.y - 8.2) < 1`), 'not back outside the Sawmill');
  check(await game<boolean>(page, `!!g.over.cast.get('bram:bram')`), 'Bram should still be outside after leaving');
});

scenario("Bram's Sawmill: mixed plank pickups, secondary guidance, and reduced motion on a small phone", (g) => {
  const s = g.save;
  s.stories.poppy = 6;
  s.stories.bram = 9;
  s.flags.push('poppy:returned', 'bram:pie', 'bram:home', 'bram:hut');
  s.build.sawmill = 4;
  s.unlocked.push('sawmill');
  Object.assign(s.mats, { bark: 5, pine: 5, glimwood: 5, emberwood: 5, plank: 0, pineplank: 0, glimplank: 0, emberplank: 0 });
  s.sawmill = { queue: [], ready: { plank: 2, pineplank: 2, glimplank: 2, emberplank: 2 }, since: Date.now() };
}, async (page) => {
  const mill = () => game<any>(page, 'g.sawmill');
  await page.setViewportSize({ width: 320, height: 640 });
  await run(page, `g.enterRoom('sawmill')`);
  await waitFor(page, 'the Sawmill', () => settledIn(page, 'sawmill'));
  await useStation(page, 'pile:bark');
  check(JSON.stringify((await mill()).guide.stations) === '["bench","planks"]', 'ready planks should remain highlighted while carrying logs');
  await useStation(page, 'bench');
  check(JSON.stringify((await mill()).guide.stations) === '["lever","planks"]', 'ready planks should remain highlighted while the lever is next');
  await useStation(page, 'planks');
  check(await game<boolean>(page, `['plank','pineplank','glimplank','emberplank'].every(p => g.save.mats[p] === 2)`), 'mixed planks did not all enter the bag');
  check((await mill()).loot === 8, 'mixed planks should use their individual material icons');
  const bag = await page.locator('#btn-bag').boundingBox(), to = (await mill()).lootTo;
  check(bag && Math.abs(to.x - (bag.x + bag.width / 2)) < 1 && Math.abs(to.y - (bag.y + bag.height / 2)) < 1, 'the pickup target is wrong at 320px');
  await waitFor(page, 'the pickup finished', async () => (await mill()).loot === 0);
  await useStation(page, 'planks');
  check(await game<number>(page, 'g.save.mats.plank') === 2 && (await mill()).loot === 0, 'an empty stack awarded or animated extra planks');
  check(JSON.stringify((await mill()).guide.stations) === '["lever"]', 'collection should preserve the waiting bench');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await useStation(page, 'lever');
  await run(page, 'g.save.sawmill.since -= 5 * 2000');
  await useStation(page, 'planks');
  check(await game<number>(page, 'g.save.mats.plank') === 12 && (await mill()).loot === 0, 'reduced motion should still collect once without travelling icons');
  const saved = await game<any>(page, `JSON.parse(localStorage.getItem('sprout-quest-save'))`);
  check(saved.mats.plank === 12 && Object.keys(saved.sawmill.ready).length === 0, 'pickup was not saved immediately');
});

scenario("Bram's Sawmill: leaving with logs in your arms or on the bench (by the door, by fast travel) costs nothing, and a reload carries on inside", (g) => {
  const s = g.save;
  s.lv = 6;
  s.stories.poppy = 6;
  s.stories.bram = 9;
  s.flags.push('poppy:returned', 'bram:pie', 'bram:met', 'bram:home', 'bram:hut', 'bram:stew');
  s.build.sawmill = 1;
  s.unlocked.push('sawmill');
  Object.assign(s.mats, { bark: 12, pine: 6, plank: 0 });
  s.pos = { x: 18.8, y: 8.4 };
}, async (page) => {
  const use = (id: string) => useStation(page, id);
  const mill = () => game<any>(page, 'g.sawmill');
  // In by walking up into its doorway.
  const goIn = async () => {
    await run(page, `const o = g.over.world.objs.find((o) => o.project === 'sawmill'); g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.9)`);
    await page.keyboard.down('KeyW');
    await waitFor(page, 'the Sawmill', () => settledIn(page, 'sawmill'));
    await page.keyboard.up('KeyW');
  };
  await goIn();
  // An armful of oak, out of the door with it: it goes back on its pile.
  await use('pile:bark');
  check((await mill()).carrying?.n === 5, 'no armful of oak');
  await run(page, `g.over.x = 4.5; g.over.y = 7.4`);
  await page.keyboard.down('KeyS');
  await waitFor(page, 'outside again', () => settledIn(page, null), 5000);
  await page.keyboard.up('KeyS');
  check(await game<number>(page, 'g.save.mats.bark') === 12, 'walking out with an armful cost logs');
  await goIn();
  check((await mill()).carrying === null, 'still carrying the armful after coming back in');
  // Logs on the bench, then fast travel away before the lever: they're still yours, and the bench is clear next time.
  await use('pile:bark');
  await use('bench');
  check((await mill()).bench.bark === 5, 'the logs did not go on the bench');
  await run(page, `g.warp('meadow')`);
  await waitFor(page, 'out in the meadow', async () => (await game<string>(page, 'g.room')) === null && (await game<string>(page, 'g.over.currentZone.id')) === 'meadow');
  check(await game<number>(page, 'g.save.mats.bark') === 12 && await game<number>(page, 'g.save.sawmill?.queue?.length ?? 0') === 0, 'fast travel off the bench cost logs');
  await run(page, `const o = g.over.world.objs.find((o) => o.project === 'sawmill'); g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.5)`);
  await goIn();
  check((await mill()).carrying === null && Object.keys((await mill()).bench).length === 0, `the bench kept logs from before fast travel (${JSON.stringify(await mill())})`);
  // Saved in here, a reload carries on in here, without the area's name popping up as if you'd walked into Sowerby.
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.click('#btn-continue');
  await waitFor(page, 'back in the Sawmill', () => settledIn(page, 'sawmill'), 8000);
  check(!(await game<boolean>(page, `document.getElementById('banner').classList.contains('show')`)), `a zone banner showed on reloading in a room (${await page.textContent('#banner')})`);
  check(await game<number>(page, 'g.save.mats.bark') === 12 && (await mill()).carrying === null, 'reloading in the Sawmill changed the logs');
});

scenario('The rooms fit a phone whole, and what Bram and Granny say never covers the stations, you or the labels while you work', (g) => {
  const s = g.save;
  s.lv = 6;
  s.stories.poppy = 6;
  s.stories.bram = 9;
  s.flags.push('poppy:returned', 'bram:pie', 'bram:met', 'bram:home', 'bram:hut', 'bram:stew');
  s.build.sawmill = 1;
  s.unlocked.push('sawmill');
  Object.assign(s.mats, { bark: 30, clover: 3 });
  s.pos = { x: 18.8, y: 8.4 };
}, async (page) => {
  type R = { x: number; y: number; w: number; h: number };
  const meets = (a: R, b: R) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  /** At each phone size: every station on screen and clear of the buttons, and nothing anyone says over any of it. */
  const checkSizes = async (where: string, who: string, line: string) => {
    for (const [vw, vh] of [[390, 844], [320, 640]]) {
      await page.setViewportSize({ width: vw, height: vh });
      await run(page, `g.over.room.actors.say('${who}', ${JSON.stringify(line)}, 5); g.over.room.actors.bubble('${who}', '😅', 5)`);
      await run(page, `g.ui.loot([{ icon: '🪵', text: '+2', name: 'Planks' }, { icon: '🌲', text: '+4', name: 'Pine Planks' }, { icon: '💎', text: '+6', name: 'Glimmerwood Planks' }, { icon: '🌋', text: '+8', name: 'Emberwood Planks' }])`);
      await page.waitForTimeout(400);
      const r = await game<{ stations: (R & { id: string })[]; hero: R; bubbles: R[]; caption: R | null; label: R | null }>(page, 'g.over.roomRects');
      check(r.caption, `${where} at ${vw}×${vh}: no line shown`);
      for (const loot of await page.locator('#loot .lrow').all()) {
        const b = await loot.boundingBox();
        check(b && !meets(r.caption!, { x: b.x, y: b.y, w: b.width, h: b.height }), `${where} at ${vw}×${vh}: a pickup covers the speech caption`);
        if (b) for (const st of r.stations) check(!meets(st, { x: b.x, y: b.y, w: b.width, h: b.height }), `${where} at ${vw}×${vh}: a pickup covers the ${st.id}`);
      }
      for (const st of r.stations) {
        check(st.x >= 0 && st.x + st.w <= vw && st.y >= 0 && st.y + st.h <= vh - 120, `${where} at ${vw}×${vh}: the ${st.id} is cut off or under the buttons (${JSON.stringify(st)})`);
      }
      for (const b of [r.caption!, ...r.bubbles]) {
        for (const st of r.stations) check(!meets(b, st), `${where} at ${vw}×${vh}: a bubble ${JSON.stringify(b)} covers the ${st.id} ${JSON.stringify(st)}`);
        check(!meets(b, r.hero), `${where} at ${vw}×${vh}: a bubble covers you`);
        if (r.label) check(!meets(b, r.label), `${where} at ${vw}×${vh}: a bubble covers the action label`);
      }
      check(r.label, `${where} at ${vw}×${vh}: no action label`);
      if (r.label) check(r.label.y + r.label.h <= r.hero.y + r.hero.h * 0.2, `${where} at ${vw}×${vh}: the action label sits on your head`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  };
  const use = (id: string) => useStation(page, id);
  // The Sawmill, the blade running, standing at the lever (and then the bench) while Bram talks.
  await run(page, `g.enterRoom('sawmill')`);
  await waitFor(page, 'the Sawmill', () => settledIn(page, 'sawmill'));
  await use('pile:bark');
  await use('bench');
  await use('lever');
  await use('pile:bark');
  await use('bench');
  await waitFor(page, 'the blade spinning', async () => (await game<any>(page, 'g.sawmill')).spin > 3);
  await run(page, `const o = g.over.room.station('lever'); g.over.x = o.x + o.w / 2; g.over.y = o.y + o.h + 0.45; g.over.face = -Math.PI / 2`);
  await checkSizes('the Sawmill, at the lever', 'room:bram', "She's already running.");
  await run(page, `const o = g.over.room.station('bench'); g.over.x = o.x + o.w / 2; g.over.y = o.y + o.h + 0.45; g.over.face = -Math.PI / 2`);
  await checkSizes('the Sawmill, at the bench', 'room:bram', 'Logs on the bench, then the lever. I keep her running.');
  // The Kitchen, book and pot clear of captions while carrying the entire plate.
  await run(page, `g.leaveRoom()`); await waitFor(page, 'outside', () => settledIn(page, null));
  check(await page.locator('#loot').evaluate((el) => (el as HTMLElement).style.top === ''), 'room loot position survived leaving the Sawmill');
  check(!await page.locator('#loot').evaluate((el) => el.classList.contains('in-room')), 'room loot layout survived leaving the Sawmill');
  await run(page, `g.enterRoom('kitchen')`); await waitFor(page, 'the Kitchen', () => settledIn(page, 'kitchen'));
  await use('book');
  await page.locator('[data-dialog="dish:tea"]').waitFor(); await page.click('[data-dialog="dish:tea"]');
  await waitFor(page, 'carrying the plate', async () => game<boolean>(page, `g.kitchen.held?.dish === 'tea'`));
  await checkSizes('the Kitchen, at the recipe book', 'room:granny', 'Everything on one plate. Bring it to the pot, dear.');
  await run(page, `const o = g.over.room.station('stove'); g.over.x = o.x + o.w / 2; g.over.y = o.y + o.h + 0.45; g.over.face = -Math.PI / 2`);
  await checkSizes('the Kitchen, at the pot', 'room:granny', 'All ready to cook, dear.');
});

scenario("Granny's Kitchen: cancel, change recipe, leave with a plate, and reload during creation without duplicate spending", (g) => {
  const s = g.save;
  s.stories.poppy = 6; s.flags.push('poppy:returned');
  Object.assign(s.mats, { clover: 4, fluff: 15, goo: 9 });
}, async (page) => {
  const choose = async (id: string) => {
    await useStation(page, 'book');
    await page.locator(`[data-dialog="dish:${id}"]`).waitFor();
    await page.click(`[data-dialog="dish:${id}"]`);
    await waitFor(page, 'the ingredient plate', async () => game<boolean>(page, `g.kitchen.held?.dish === '${id}' && g.mode === 'world'`));
  };
  await run(page, `g.enterRoom('kitchen')`); await waitFor(page, 'the Kitchen', () => settledIn(page, 'kitchen'));
  await choose('pancakes');
  check(await game<string>(page, 'JSON.stringify(g.kitchen.held.ingredients)') === '{"fluff":15,"goo":9}', 'multi-ingredient plate was incomplete');
  await useStation(page, 'book'); await page.locator('[data-dialog="close"]').click();
  await waitFor(page, 'the book closed', () => settledIn(page, 'kitchen'));
  check(await game<string>(page, 'g.kitchen.held.dish') === 'pancakes', 'cancelling the book should keep the carried plate');
  await choose('tea');
  check(await game<boolean>(page, `g.save.mats.fluff === 15 && g.save.mats.goo === 9 && g.save.mats.clover === 4 && g.save.meal === null`), 'changing recipes charged for ingredients');
  await run(page, `g.leaveRoom()`); await waitFor(page, 'outside', () => settledIn(page, null));
  await run(page, `g.enterRoom('kitchen')`); await waitFor(page, 'back in the Kitchen', () => settledIn(page, 'kitchen'));
  check(await game<boolean>(page, `g.kitchen.held === null && g.save.mats.clover === 4`), 'leaving with a plate spent ingredients or restored a stale plate');
  await choose('tea');
  await run(page, `g.save.mats.clover = 0`);
  await useStation(page, 'stove');
  check(await game<boolean>(page, `g.kitchen.held === null && g.save.meal === null && !g.ui.isOpen`), 'the pot should reject ingredients spent elsewhere');
  await run(page, `g.save.mats.clover = 4`);
  await choose('tea');
  await useStation(page, 'stove');
  await waitFor(page, 'the creation animation', async () => !!(await page.$('.sheet.crafting')));
  await page.keyboard.press('KeyE'); await page.keyboard.press('KeyE');
  check(await game<number>(page, 'g.save.mats.clover') === 2, 'repeated taps should not charge twice');
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])'); await page.click('#btn-continue');
  await waitFor(page, 'restored in the Kitchen', () => settledIn(page, 'kitchen'), 8000);
  await closeDialogs(page);
  check(await game<boolean>(page, `g.save.meal?.id === 'tea' && g.save.mats.clover === 2 && g.kitchen.held === null && !g.kitchen.cooking`), 'reloading during creation lost or duplicated the meal');
});

scenario("Poppy's field by hand: while Poppy's away in Echo Cavern, the basket, the water butt and the plots say she's not here", (g) => {
  const s = g.save;
  s.lv = 6;
  s.stories.poppy = 6;
  s.flags.push('poppy:returned', 'garden:welcome');
  s.build.garden = 2;
  Object.assign(s.mats, { berryseed: 2, herbseed: 0, flowerseed: 0 });
  s.pos = { x: 41.5, y: 14 }; // GATE_X (seeds are sent as source)
}, async (page) => {
  const { garden, stand } = fieldKit(page);
  const press = async () => {
    await run(page, `document.getElementById('toast').textContent = ''`);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);
  };
  await stand(GATE_X, FY - 0.4);
  await waitFor(page, 'the field', async () => (await garden()).inside);
  await stand(...BASKET);
  await press();
  check(JSON.stringify((await garden()).hand) === '{"seed":"berry"}', 'no Berry Seeds in hand');
  // Off she goes after the drums: the seeds go back, and nothing works the field till she's home.
  await run(page, `g.save.bosses.push('alphawolf'); g.save.stories.drums = 1`);
  await waitFor(page, 'the field closed', async () => (await garden()).hand === null && !(await garden()).inside);
  await closeDialogs(page);
  for (const [x, y, face, what] of [[...BASKET, 'basket'], [...BUTT, 'water butt'], [...onPlot(1, 0), Math.PI / 2, 'plots']] as const) {
    await stand(x, y, face);
    await press();
    check(((await page.textContent('#toast')) ?? '').includes("Poppy's not here"), `the ${what} did not say Poppy's not here`);
    check((await garden()).hand === null, `the ${what} put something in your hand`);
  }
  check(await game<boolean>(page, `g.save.mats.berryseed === 2 && !(g.save.garden?.plots ?? []).some(Boolean)`), 'the Garden was worked while Poppy was away');
});

scenario('fainting: back as a spirit at the checkpoint, walk to your body to wake, never onto a story fight', null, async (page) => {
  // A story fight's monsters blocking a spot (Poppy's first pack), with you right up against them.
  const foe = `g.over.world.objs.find((o) => o.flag === 'poppy:pack1')`;
  await run(page, `const o = ${foe}; o.hidden = false; g.over.teleport(o.x + o.w + 0.4, o.y + o.h / 2)`);
  await run(page, `g.fight('wolf', 12, 2)`);
  await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle`));
  await page.waitForTimeout(1500);
  await run(page, 'g.battle.p.hp = 1; g.battle.p.iframes = 0');
  await waitFor(page, 'a spirit at the checkpoint', async () => game<boolean>(page, `g.mode === 'world' && !g.battle && !!g.save.spirit && g.over.currentZone.id === g.save.respawn`), 20000);
  const gap = `(() => { const o = ${foe}, b = g.save.spirit; return Math.hypot(Math.max(o.x - b.x, 0, b.x - (o.x + o.w)), Math.max(o.y - b.y, 0, b.y - (o.y + o.h + 0.3))); })()`;
  check(await game<number>(page, gap) >= 1.5, 'your body lies on the story fight');
  check(await game<boolean>(page, `g.over.objective && Math.hypot(g.over.objective.x - g.save.spirit.x, g.over.objective.y - g.save.spirit.y) < 0.01`), "the waypoint doesn't lead to your body");
  if (SHOTS) {
    await run(page, `const b = g.save.spirit; g.over.teleport(b.x + 1.6, b.y)`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}spirit.png` });
  }
  // A spirit walks right past the monsters without a fight.
  await run(page, `const o = ${foe}; g.over.teleport(o.x + o.w + 0.3, o.y + o.h / 2)`);
  await page.waitForTimeout(800);
  check(await game<boolean>(page, `g.mode === 'world' && !g.battle`), 'a spirit started a fight');
  // Your body: you wake at half health, and nothing starts.
  await run(page, `const b = g.save.spirit; g.over.teleport(b.x, b.y)`);
  await waitFor(page, 'waking up', async () => game<boolean>(page, `!g.save.spirit`), 5000);
  check(await game<boolean>(page, `Math.abs(g.save.hp - Math.round(g.battle ? 0 : g.save.hp)) === 0 && g.save.hp > 0`), 'you woke with no health');
  await page.waitForTimeout(1000);
  check(await game<boolean>(page, `g.mode === 'world' && !g.battle`), 'waking up dropped you straight into the fight');
});

scenario('fainting on the walk home leaves Bram waiting at the last checkpoint, and the ambushes still count', (g) => {
  const s = g.save;
  s.lv = 6;
  s.bosses.push('kingslime');
  s.camps.push('woods');
  s.visited.push('meadow', 'woods');
  s.quest = g.quests.findIndex((q: any) => q.id === 'smithy');
  s.stories.poppy = 6;
  s.stories.bram = 6;
  s.flags.push('poppy:returned', 'bram:pie', 'bram:met', 'bram:wave1', 'bram:wave2', 'bram:scar', 'bram:ambush1');
  s.respawn = 'village';
  s.pos = { x: 87 + 16.5, y: 12 };
}, async (page) => {
  const bram = () => game<{ follow: boolean; x: number; y: number }>(page, `(() => { const a = g.over.actors.get('bram:bram'); return a && { follow: a.follow, x: a.x, y: a.y }; })()`);
  await waitFor(page, 'Bram at your side', async () => !!(await bram())?.follow);
  // Lose a fight on the way.
  await run(page, `g.fight('wolf', 12, 2)`);
  await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle`));
  await page.waitForTimeout(1500);
  await run(page, 'g.battle.p.hp = 1; g.battle.p.iframes = 0');
  // You come back as a spirit in Sowerby, your body left where you fell.
  await waitFor(page, 'a spirit in Sowerby', async () => game<boolean>(page, `g.mode === 'world' && !g.battle && g.over.currentZone.id === 'village' && !!g.save.spirit`), 20000);
  const b = await bram();
  check(b && !b.follow && Math.hypot(b.x - (87 + 16.5), b.y - 11.6) < 1, `Bram should wait past the first ambush, not follow you home (${JSON.stringify(b)})`);
  check(await game<boolean>(page, `g.save.flags.includes('bram:waiting')`), 'Bram is not waiting');
  // Back to your body to wake up (at half health)…
  await run(page, `const b = g.save.spirit; g.over.teleport(b.x, b.y)`);
  await waitFor(page, 'waking up', async () => game<boolean>(page, `!g.save.spirit && g.save.hp > 0`), 5000);
  // …and walking home without him (or without the second ambush) doesn't finish the escort.
  await run(page, 'g.over.teleport(31.8, 11.4)');
  await page.waitForTimeout(1200);
  check(await game<number>(page, 'g.save.stories.bram') === 6, 'the escort finished without Bram');
  // Fetch him: he follows again, and the second ambush is still there.
  await run(page, `g.over.teleport(87 + 16.5, 12.4)`);
  await page.waitForTimeout(500);
  await run(page, `void g.over.actors.get('bram:bram').talk()`);
  await closeDialogs(page);
  await waitFor(page, 'Bram following again', async () => !!(await bram())?.follow);
  check(await game<boolean>(page, `!g.over.world.objs.find((o) => o.flag === 'bram:ambush2').hidden`), 'the second ambush vanished');
});

scenario('leaving the game (home screen, another app, browser closed) silences it, and coming back brings the sound back', null, async (page) => {
  // A tap unlocks sound, as on a phone.
  await page.mouse.click(200, 400);
  await waitFor(page, 'sound to start', async () => (await game<string>(page, 'g.audio.context?.state')) === 'running');
  const away = (hidden: boolean) => page.evaluate((hidden) => {
    Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
    Object.defineProperty(document, 'visibilityState', { value: hidden ? 'hidden' : 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await away(true);
  await waitFor(page, 'the sound to stop', async () => (await game<string>(page, 'g.audio.context.state')) === 'suspended');
  await away(false);
  await waitFor(page, 'the sound to come back', async () => (await game<string>(page, 'g.audio.context.state')) === 'running');
});

scenario('sound settings: mute everything, or turn the music and the effects up and down, and they stay that way', null, async (page) => {
  await openMore(page);
  const slider = (kind: string) => `#modal:not([hidden]) input[data-vol="${kind}"]`;
  const slide = (kind: string, v: number) => page.$eval(slider(kind), (el, v) => {
    (el as HTMLInputElement).value = String(v);
    for (const t of ['input', 'change']) el.dispatchEvent(new Event(t, { bubbles: true }));
  }, v);
  check((await page.inputValue(slider('music'))) === '70' && (await page.inputValue(slider('effects'))) === '100', 'the sliders do not start at music 70%, effects 100%');
  await slide('music', 0);
  await slide('effects', 40);
  check(await game<boolean>(page, 'g.music.volume === 0 && g.audio.effects === 0.4'), 'the sliders did not set the volumes');
  check(/Off/.test((await page.textContent('#modal .mcard.sound')) ?? ''), 'music at zero does not read Off');
  await page.click('#modal:not([hidden]) .mcard.sound [data-do="mute"]');
  check(await game<boolean>(page, 'g.audio.muted') && (await page.isDisabled(slider('effects'))), 'muting did not mute, or left the sliders live');
  await page.click('#modal:not([hidden]) .mcard.sound [data-do="mute"]');
  check(await game<boolean>(page, '!g.audio.muted'), 'unmuting did not unmute');
  // A device setting: it outlives a reload, whichever save is loaded.
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  check(await game<boolean>(page, 'g.sound.music === 0 && g.sound.effects === 0.4 && !g.sound.muted && g.audio.effects === 0.4'), 'the settings were not kept');
});

scenario('chapter celebrations size loaded and fallback icons on phones and short screens', null, async (page) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 740, height: 500 }]) {
    await page.setViewportSize(viewport);
    for (const goal of ['craft', 'build', 'boss', 'mats', 'mend']) {
      await run(page, `void g.ui.questComplete(g.quests.find(q => q.goal.type === '${goal}'))`);
      const art = page.locator('.stage-art .icon');
      await art.waitFor();
      await page.waitForTimeout(750);
      check(await art.evaluate((el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0), `${goal}: missing chapter art`);
      const expected = viewport.height <= 560 ? 72 : 88;
      for (const fallback of [false, true]) {
        if (fallback) await art.evaluate((el) => el.dispatchEvent(new Event('error')));
        const box = await art.boundingBox();
        check(box && Math.abs(box.width - expected) < 1 && Math.abs(box.height - expected) < 1, `${goal}: ${fallback ? 'fallback' : 'image'} has wrong size`);
        const stageBox = await page.locator('.stage.small').boundingBox();
        check(box && stageBox && Math.abs(box.x + box.width / 2 - stageBox.x - stageBox.width / 2) < 1, `${goal}: icon is not centered`);
        check(await page.locator('[data-dialog="ok"]').isVisible(), `${goal}: reward action missing`);
      }
      await page.click('[data-dialog="ok"]');
    }
    // Crafted gear now has a workbench; exercise the retained reward layout with starter gear.
    for (const id of ['twig', 'tunic']) {
      await run(page, `void g.ui.newGear(${JSON.stringify(GEAR[id])}, null)`);
      await page.waitForTimeout(750);
      const art = page.locator('.stage-art .icon');
      const expected = viewport.height <= 560 ? 84 : 120;
      for (const fallback of [false, true]) {
        if (fallback) await art.evaluate((el) => el.dispatchEvent(new Event('error')));
        const box = await art.boundingBox();
        check(box && Math.abs(box.width - expected) < 1 && Math.abs(box.height - expected) < 1, `${id}: reward art has wrong size`);
      }
      await page.click('[data-dialog="later"]');
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await run(page, `void g.ui.questComplete(g.quests.find(q => q.id === 'gear'))`);
  await page.waitForTimeout(800);
});

scenario('music: it gets ready on the title (where you are first), plays from the first tap, and follows you into a fight and back', null, async (page) => {
  // Music is off in automated browsers unless the page asks for it.
  await page.goto(`${page.url().split('?')[0]}?music`);
  await page.waitForSelector('.title-btns:not([hidden])');
  // The save stands in the meadow: its theme loads first, before any tap, then the opening's.
  await waitFor(page, "the meadow's theme to load on the title", async () => (await game<string[]>(page, 'g.music.loaded'))[0] === 'meadow', 30000);
  await page.click('#btn-continue');
  await waitFor(page, "the meadow's theme straight after Continue", async () => (await game<string>(page, 'g.music.current')) === 'meadow', 2500);
  await closeDialogs(page);
  await waitFor(page, "the fight's theme to load", async () => (await game<string[]>(page, 'g.music.loaded')).includes('battleMeadow'), 30000);
  await run(page, `g.fight('slime', 1, 1)`);
  await waitFor(page, "the fight's theme", async () => (await game<string>(page, 'g.music.current')) === 'battleMeadow');
  await winFight(page);
  await waitFor(page, "back to the meadow's theme", async () => (await game<string>(page, 'g.music.current')) === 'meadow');
  await waitFor(page, 'all regional themes', async () => (await game<string[]>(page, 'g.music.loaded')).length === 13, 30000);
  const loaded = await game<string[]>(page, 'g.music.loaded');
  check(loaded.slice(0, 3).join() === 'meadow,glade,battleMeadow' && loaded.length === 13, `themes loaded in the wrong order, or not all: ${loaded.join()}`);
  // Deliberately keep the overworld in the meadow: music must read the battle's arena (as tower floors do).
  for (const [zone, theme] of [['glade', 'battleMeadow'], ['woods', 'battleWoods'], ['cave', 'battleCave'], ['hollow', 'battleHollow'], ['peak', 'battlePeak']]) {
    await run(page, `g.fight('slime', 1, 1)`);
    await waitFor(page, 'the arena after its entrance transition', async () => await game<boolean>(page, '!!g.battle'));
    await run(page, `g.battle.setup.zone = { ...g.battle.setup.zone, id: '${zone}' }`);
    await waitFor(page, `${zone} battle music`, async () => (await game<string>(page, 'g.music.current')) === theme);
    await run(page, `g.battle.setup.boss = true`);
    await waitFor(page, `${zone} boss priority`, async () => (await game<string>(page, 'g.music.current')) === 'guardian');
    await run(page, `g.battle.setup.boss = false`);
    await winFight(page);
  }

});

scenario('dev builds: a Battle Tower run climbs floor after floor from its camp, in its own slot', (g) => {
  g.lv = 3;
}, async (page) => {
  const camp = '#modal:not([hidden]) .tower-camp';
  /** Clicks through result and level-up screens until the camp is back. */
  const toCamp = (what: string) => waitFor(page, what, async () => {
    if (await page.$(camp)) return true;
    // (Never the camp's own buttons: it may have just opened.)
    const btn = await page.$('#modal:not([hidden]) .sheet:not(.menu):not(.tower-camp) [data-dialog]:last-of-type');
    if (btn) await btn.click();
    return false;
  }, 30000);
  const fightFloor = async (n: number) => {
    await page.click(`${camp} [data-dialog="fight"]`);
    await waitFor(page, `floor ${n}`, async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle && g.battle.intro <= 0`), 10000);
  };
  // Your real save: its progress (switching slots saves where you stand, which is fine).
  const progress = () => game<string>(page, `(() => { const k = JSON.parse(localStorage.getItem('sprout-quest-save')); return JSON.stringify([k.lv, k.xp, k.equip, k.mats, k.mastery, k.owned]) })()`);
  const main = await progress();
  await run(page, 'g.ui.devRow.open()');
  await page.click('#modal [data-dialog="tower:new"]');
  await waitFor(page, 'the camp', async () => !!(await page.$(camp)), 30000);
  check(await game<boolean>(page, `localStorage.getItem('sprout-quest-slot') === 'tower' && g.save.lv === 1 && g.save.equip.weapon === 'twig'`), 'the run should start at Lv 1 with the Twig Sword, in the tower slot');
  while (!(await page.textContent(`${camp} [data-dialog="rate"]`))?.includes('×25')) await page.click(`${camp} [data-dialog="rate"]`);
  if (SHOTS) await page.screenshot({ path: `${OUT}tower-camp.png` });
  // Three floors in a row, levelling up on the way.
  for (const n of [1, 2, 3]) {
    await fightFloor(n);
    await endFight(page);
    await toCamp(`the camp after floor ${n}`);
    check(await game<number>(page, 'g.save.tower.floor') === n + 1, `the run didn't move past floor ${n}`);
  }
  check(await game<number>(page, 'g.save.lv') > 3, 'three floors at ×25 XP barely levelled you up');
  check(await game<number>(page, 'g.save.mats.stone') > 0, "the floors' supplies didn't arrive");
  // The Forge opens over the camp, and the camp comes back when it closes.
  await page.click(`${camp} [data-dialog="forge"]`);
  await page.waitForSelector('#modal:not([hidden]) .sheet.menu');
  await run(page, 'g.ui.closeMenu()');
  await waitFor(page, 'the camp after the Forge', async () => !!(await page.$(camp)), 5000);
  // The camp says what the next floor (the Slime King) expects, ticked against you.
  check(/Suggested:.*Lv 3|Suggested:.*Lv \d/.test((await page.textContent(`${camp} .tower-ready`)) ?? ''), "the camp doesn't say what the next floor expects");
  if (SHOTS) await page.screenshot({ path: `${OUT}tower-camp-guardian.png` });
  // Training on a cleared floor: its fight and drops, but the run stays where it is.
  await page.selectOption('#tower-floor', '1');
  await page.click(`${camp} [data-dialog="train"]`);
  await waitFor(page, 'the training fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle && g.battle.setup.tower === 1 && g.battle.intro <= 0`), 10000);
  await endFight(page);
  await toCamp('the camp after training');
  check(await game<number>(page, 'g.save.tower.floor') === 4, 'training moved the run');
  // Any tower fight can be run from, guardians included, straight back to the camp.
  await fightFloor(4);
  await waitFor(page, 'getting away', async () => {
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(250);
    return game<boolean>(page, `!g.battle || g.battle.outcome?.result === 'run'`);
  }, 8000);
  await toCamp('the camp after running from the Slime King');
  check(await game<number>(page, 'g.save.tower.floor') === 4, 'running moved the run');
  // Fainting on the guardian's floor puts you back at the camp to try it again.
  await fightFloor(4);
  await run(page, 'g.battle.p.hp = 0');
  await toCamp('the camp after fainting');
  check(await game<number>(page, 'g.save.tower.floor') === 4, 'fainting moved the run');
  check(await progress() === main, 'the tower run changed the main save');
  // Out of the tower, an ordinary fight pays out as usual (an early build left every later fight giving nothing).
  await page.click(`${camp} [data-dialog="rest"]`);
  const xp0 = await game<number>(page, 'g.save.lv * 100000 + g.save.xp');
  await run(page, `g.encounter('meadow')`);
  await waitFor(page, 'an ordinary fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle && g.battle.intro <= 0`), 10000);
  await winFight(page);
  check(await game<number>(page, 'g.save.lv * 100000 + g.save.xp') > xp0, 'an ordinary fight after the tower gave no XP');
  // The tower's XP rate stays in the tower: a story slot (a fresh playthrough in a dev build) plays at ×1.
  await run(page, `localStorage.setItem('sprout-quest-slot', 'story-9')`);
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  check(await game<number>(page, 'g.xpRate') === 1, "the tower's XP rate leaked into a story slot");
  await run(page, `localStorage.removeItem('sprout-quest-dev-xp-rate'); localStorage.removeItem('sprout-quest-slot')`);
});

scenario('dev builds: a Battle Tower link opens the camp at that point, with that gear', null, async (page) => {
  const url = page.url().split('?')[0];
  await page.goto(`${url}?tower&floor=4&lv=3&weapon=jellywhip&h=whip:2&mats=goo:9&xp=5`);
  await waitFor(page, 'the camp', async () => !!(await page.$('#modal:not([hidden]) .tower-camp')), 30000);
  check(await game<boolean>(page, `localStorage.getItem('sprout-quest-slot') === 'tower' && g.save.tower.floor === 4 && g.save.lv === 3`), 'the link did not set the floor and level');
  check(await game<boolean>(page, `g.save.equip.weapon === 'jellywhip' && g.save.mastery.whip.lv === 2 && g.save.mats.goo === 9 && g.xpRate === 5`), 'the link did not set gear, handling, materials and XP rate');
  check(/Floor 4/.test((await page.textContent('#modal .tower-camp')) ?? ''), 'the camp is not on floor 4');
  await run(page, `localStorage.removeItem('sprout-quest-dev-xp-rate'); localStorage.removeItem('sprout-quest-slot')`);
});

scenario('dev builds: a preset plays in its own slot, and your real save is untouched', null, async (page) => {
  const url = page.url().split('?')[0];
  await page.goto(`${url}?preset=poppy-chase`);
  await waitFor(page, 'the preset to start', async () => game<boolean>(page, `g.mode === 'world' && g.save.stories.poppy === 4`), 20000);
  check(await game<boolean>(page, `localStorage.getItem('sprout-quest-slot') === 'preset-poppy-chase' && !location.search`), 'not in the preset slot');
  check(await game<boolean>(page, `JSON.parse(localStorage.getItem('sprout-quest-save')).lv === 4`), 'the main save changed');
  // And back to the real one.
  await page.goto(`${url}?slot=main`);
  await waitFor(page, 'the main save', async () => game<boolean>(page, `g.mode === 'world' && !g.save.stories.poppy && !localStorage.getItem('sprout-quest-slot')`), 20000);
  // The title offers every slot and preset.
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.click('#btn-dev');
  const panel = (await page.textContent('#modal .sheet')) ?? '';
  check(/preset-poppy-chase/.test(panel) && /Sandbox/.test(panel), 'the dev panel is missing slots or presets');
});

// Fluffy Vest presentation exercises the real transaction; every scenario starts with an unowned vest.
const fluffySeed = (g: any) => {
  g.save.lv = 4;
  g.save.build.forge = 1;
  g.save.equip.armor = 'tunic';
  g.save.owned = g.save.owned.filter((id: string) => id !== 'fluffvest');
  Object.assign(g.save.mats, { fluff: 72, goo: 36 });
};
async function openFluffyCraft(page: Page) {
  const selectRecipe = async (id: string) => {
    const tile = page.locator(`[data-pick="${id}"]`);
    await tile.waitFor({ state: 'visible' });
    // Selected cards bob forever. They already show this recipe, so don't wait for a redundant click to stabilize.
    if (!await tile.evaluate((el) => el.classList.contains('sel'))) await tile.click();
  };
  await run(page, `const forge = g.over.world.objs.find((o) => o.kind === 'forge'); g.over.teleport(forge.x + forge.w / 2, forge.y + forge.h + .7)`);
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE');
  await page.waitForSelector('[data-sub="forge:armor"]');
  await page.click('[data-sub="forge:weapon"]');
  await selectRecipe('forge-weapon:jellywhip');
  check(await page.locator('[data-craft="jellywhip"]').isEnabled(), 'second recipe must be craftable to exercise the mutex');
  await page.click('[data-sub="forge:armor"]');
  await selectRecipe('forge-armor:fluffvest');
  await page.click('[data-craft="fluffvest"]');
  await page.waitForSelector('.sheet.crafting');
}

scenario('Fluffy crafting assembles from the bag then equips, with one saved transaction', fluffySeed, async (page) => {
  await openFluffyCraft(page);
  check(await game(page, `g.save.owned.filter((id) => id === 'fluffvest').length`) === 1, 'craft did not grant one vest');
  check(await game(page, `g.save.mats.fluff`) === 36 && await game(page, `g.save.mats.goo`) === 24, 'wrong recipe charge');
  check(await game(page, `JSON.parse(localStorage.getItem('sprout-quest-save')).owned.includes('fluffvest')`), 'craft was not saved before animation');
  check(!await page.locator('[data-dialog="equip"]').isVisible(), 'equip offered before assembly');
  await page.waitForSelector('.craft-flight');
  if (SHOTS) await page.screenshot({ path: `${OUT}fluffy-flight.png` });
  await page.waitForSelector('.craft-ready', { timeout: 30000 });
  check(await page.textContent('[data-count="fluff"]') === '36', 'bag display did not end at real inventory count');
  check(await page.textContent('[data-count="goo"]') === '24', 'goo display did not end at real inventory count');
  if (SHOTS) await page.screenshot({ path: `${OUT}fluffy-complete.png` });
  await page.click('[data-dialog="equip"]');
  await waitFor(page, 'equipped vest', async () => await game(page, `g.save.equip.armor`) === 'fluffvest');
  check(await game(page, `g.save.mats.fluff`) === 36, 'equip charged the recipe again');
}, { webgl: true });

scenario('Fluffy crafting skips safely, ignores repeated craft requests, and keeps the vest', fluffySeed, async (page) => {
  await openFluffyCraft(page);
  // A queued second hook invocation may arrive after the first has already swapped out the Forge.
  await run(page, `void g.ui.hooks.craftGear('fluffvest'); void g.ui.hooks.craftGear('jellywhip')`);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.craft-ready', { timeout: 30000 });
  check(await game(page, `g.save.equip.armor`) === 'tunic', 'skip also equipped the vest');
  check(!await game(page, `g.save.owned.includes('jellywhip')`), 'second recipe raced the active reveal');
  await page.click('[data-dialog="later"]');
  await page.waitForTimeout(3500);
  check(await game(page, `g.save.equip.armor`) === 'tunic', 'keep unexpectedly equipped');
  check(await game(page, `g.save.owned.filter((id) => id === 'fluffvest').length`) === 1, 'duplicate ownership');
  check(await game(page, `g.save.mats.fluff`) === 36 && await game(page, `g.save.mats.goo`) === 24, 'double craft spent twice');
  check(await page.locator('.craft-flight').count() === 0, 'leftover ingredient animation');
}, { webgl: true });

scenario('Fluffy crafting respects reduced motion and fits a small phone', fluffySeed, async (page) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFluffyCraft(page);
  await page.waitForSelector('.craft-ready', { timeout: 30000 });
  check(await page.locator('.craft-flight').count() === 0, 'reduced-motion flight still played');
  check(!await page.locator('[data-craft-skip]').isVisible(), 'reduced-motion flow still waiting for animation');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check(!overflow, 'craft screen overflows horizontally on 320px phone');
  await page.locator('[data-dialog="equip"]').scrollIntoViewIfNeeded();
  const button = await page.locator('[data-dialog="equip"]').boundingBox();
  check(button && button.y >= 0 && button.y + button.height <= 568, 'equip button is unreachable on small phone');
  if (SHOTS) await page.screenshot({ path: `${OUT}fluffy-small-phone.png` });
  await page.click('[data-dialog="equip"]');
});

scenario('Fluffy crafting survives reloading during assembly', fluffySeed, async (page) => {
  await openFluffyCraft(page);
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.click('#btn-continue');
  await page.waitForTimeout(1500);
  await closeDialogs(page);
  check(await game(page, `g.save.owned.includes('fluffvest')`), 'reload lost crafted vest');
  check(await game(page, `g.save.mats.fluff`) === 36 && await game(page, `g.save.mats.goo`) === 24, 'reload changed charged materials');
  check(await game(page, `g.save.equip.armor`) === 'tunic', 'reload chose equip without player choice');
});

// Village building plays the crafting scene: the Cottage rises from stone, oak and a clover.
const cottageSeed = (g: any) => {
  g.save.build.home = 1;
  Object.assign(g.save.mats, { bark: 30, stone: 12, clover: 2 });
};
async function buildFromPlot(page: Page, project: string) {
  await run(page, `const o = g.over.world.objs.find((o) => o.kind === 'plot' && o.project === '${project}'); g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.6)`);
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await waitFor(page, 'the plans', async () => !!(await page.$(`#modal:not([hidden]) [data-build="${project}"]:not([disabled])`)));
  await page.click(`#modal [data-build="${project}"]`);
  await page.waitForSelector('.sheet.crafting .craft-building');
}
const homeSprite = (page: Page) => game<string>(page, `g.over.buildingSprite(g.over.world.objs.find((o) => o.kind === 'plot' && o.project === 'home')).name`);

scenario('building the Cottage raises it from its materials, and the house on the map upgrades', cottageSeed, async (page) => {
  check(await homeSprite(page) === 'home1', 'the tent is not on the map to start with');
  await buildFromPlot(page, 'home');
  check(await game(page, `g.save.build.home`) === 2, 'the Cottage was not built');
  check(await game(page, `JSON.parse(localStorage.getItem('sprout-quest-save')).build.home`) === 2, 'the build was not saved before the scene');
  check(await game(page, `g.save.mats.bark`) === 6 && await game(page, `g.save.mats.stone`) === 0 && await game(page, `g.save.mats.clover`) === 1, 'wrong cost charged');
  check(await homeSprite(page) === 'home2', 'the map still shows the tent behind the scene');
  check(!await page.locator('[data-dialog="ok"]').isVisible(), 'the button showed before the building rose');
  await page.waitForSelector('.craft-flight');
  if (SHOTS) await page.screenshot({ path: `${OUT}cottage-rising.png` });
  await page.waitForSelector('.craft-ready', { timeout: 30000 });
  check(await page.textContent('.craft-eyebrow') === 'BUILT BY YOU', 'the finished building is not marked built');
  check(await page.textContent('[data-count="bark"]') === '6' && await page.textContent('[data-count="stone"]') === '0', 'the bag display did not end at the real counts');
  check((await page.locator('.craft-model').getAttribute('data-layers'))?.split(' ').length === 6, 'the Cottage should stand in all six of its layers');
  if (SHOTS) await page.screenshot({ path: `${OUT}cottage-built.png` });
  await page.click('[data-dialog="ok"]');
  // Building the Cottage is the current chapter's goal: its celebration follows, then back to the map.
  await closeDialogs(page);
  await waitFor(page, 'back on the map', async () => {
    await closeDialogs(page);
    if (await page.$('#modal:not([hidden]) .sheet.menu')) await page.keyboard.press('Escape');
    return game<boolean>(page, `g.mode === 'world'`);
  }, 8000);
  check(await game(page, `g.save.build.home`) === 2 && await game(page, `g.save.mats.bark`) === 6, 'the scene changed the build or the bag');
}, { webgl: true });

scenario('building skips safely, ignores a second build request, and respects reduced motion on a small phone', (g) => {
  g.save.build.home = 1;
  Object.assign(g.save.mats, { bark: 90, stone: 36, clover: 3, royaljelly: 1, copper: 12 });
}, async (page) => {
  await buildFromPlot(page, 'home');
  // A second tap while the first scene plays does nothing: no Smithy, nothing spent twice.
  await run(page, `void g.ui.hooks.build('forge'); void g.ui.hooks.build('home')`);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.craft-ready', { timeout: 30000 });
  check(await page.locator('.craft-flight').count() === 0, 'leftover material flights after skipping');
  check(await game(page, `g.save.build.forge`) === 1 && await game(page, `g.save.build.home`) === 2, 'a second build raced the scene');
  check(await game(page, `g.save.mats.bark`) === 66, 'a build was charged twice');
  await page.click('[data-dialog="ok"]');
  await closeDialogs(page);
  if (await page.$('#modal:not([hidden]) .sheet.menu')) await page.keyboard.press('Escape');
  await waitFor(page, 'back on the map', async () => game<boolean>(page, `g.mode === 'world'`), 8000);
  // Reduced motion, on a small phone: the Smithy is simply there, with the button in reach.
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await run(page, `const o = g.over.world.objs.find((o) => o.kind === 'forge'); g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.7); g.mode = 'dialog'; g.ui.openMenu({ atForge: false, inVillage: true }, 'village', 'forge')`);
  await waitFor(page, 'the plans', async () => !!(await page.$('#modal:not([hidden]) [data-build="forge"]:not([disabled])')));
  await page.click('#modal [data-build="forge"]');
  await page.waitForSelector('.craft-ready', { timeout: 30000 });
  check(await page.locator('.craft-flight').count() === 0, 'reduced-motion flight still played');
  check(!await page.locator('[data-craft-skip]').isVisible(), 'reduced-motion scene still waiting on the animation');
  check(await game(page, `g.save.build.forge`) === 2, 'the Smithy was not built');
  check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'the building scene overflows a 320px phone');
  await page.locator('[data-dialog="ok"]').scrollIntoViewIfNeeded();
  const button = await page.locator('[data-dialog="ok"]').boundingBox();
  check(button && button.y >= 0 && button.y + button.height <= 568, 'the button is out of reach on a small phone');
  if (SHOTS) await page.screenshot({ path: `${OUT}smithy-small-phone.png` });
  await page.click('[data-dialog="ok"]');
});

scenario('Bram’s house plans: welcome Hazel and Moss, cook their recipes, upgrade and reload without duplicate costs', (g) => {
  const s = g.save;
  s.lv = 8; s.quest = g.quests.findIndex((q: any) => q.id === 'smithy');
  s.stories = { ...s.stories, poppy: 6, bram: 9, pip: 1, drums: 4, granny: 99 };
  s.flags.push('poppy:returned', 'bram:hut', 'bram:stew', 'pip:candy');
  s.build.sawmill = 2; s.build.home = 2; s.build.cottage = 1;
  s.unlocked.push('sawmill');
  for (const m in s.mats) s.mats[m] = 300;
  s.pos = { x: 20.2, y: 9.2 };
}, async (page) => {
  const plans = async () => {
    await run(page, `const a = g.over.actors.get('bram:bram'); g.over.teleport(a.x, a.y + .6); g.over.face = -Math.PI/2`);
    await page.waitForTimeout(300); await page.keyboard.press('KeyE');
    await page.waitForSelector('.sheet.house-plans');
  };
  const build = async (id: string, level: number) => {
    await page.click(`[data-dialog="home:${id}:${level}"]`);
    await page.waitForSelector('.craft-building');
    await page.keyboard.press('Escape'); await page.locator('.craft-ready').waitFor();
    await page.click('[data-dialog="ok"]'); await page.waitForSelector('.sheet.house-plans');
  };
  const meet = async (id: string) => {
    await run(page, `const o = g.over.world.objs.find((o) => o.home === '${id}'); g.over.teleport(o.x + o.w/2, o.y + o.h + 1.2); g.over.face = -Math.PI/2`);
    await page.waitForTimeout(400); await page.keyboard.press('KeyE');
    await waitFor(page, `meeting ${id}`, async () => {
      await closeDialogs(page);
      return game<boolean>(page, `g.save.flags.includes('${id}:recipe') && g.save.stories.${id} === 1 && g.mode === 'world' && !g.ui.isOpen`);
    }, 20000);
  };
  await plans();
  check(!await page.locator('[data-dialog="home:hazel:0"]').isDisabled(), 'Hazel’s house should be ready with Pip’s cottage');
  check(await page.locator('[data-dialog="home:moss:0"]').isDisabled(), 'Moss should wait for Hazel');
  for (const [width, height] of [[320,568],[390,844],[960,700]]) {
    await page.setViewportSize({ width, height });
    const fits = await page.evaluate(() => {
      const header = document.querySelector('.house-plans-head')!.getBoundingClientRect(), buttons = document.querySelector('.house-plans .btns')!.getBoundingClientRect();
      return header.top >= 0 && buttons.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
    });
    check(fits, `house plans clipped at ${width}×${height}`);
  }
  if (SHOTS) await page.screenshot({ path: `${OUT}bram-house-plans-wide.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await game<any>(page, `({ ...g.save.mats })`);
  await build('hazel', 0);
  check(await game<boolean>(page, `g.save.homes.hazel === 1 && g.save.mats.plank === ${before.plank - 48} && g.save.mats.stone === ${before.stone - 18} && !g.save.flags.includes('hazel:recipe')`), 'house was not charged once, or the recipe arrived before meeting Hazel');
  await build('moss', 0);
  await page.keyboard.press('Escape'); await waitFor(page, 'leaving the plans', async () => game<boolean>(page, `g.mode === 'world' && !g.ui.isOpen`));
  await meet('hazel'); await meet('moss');
  check(await game<boolean>(page, `!!g.over.actors.get('hazel:hazel') && !!g.over.actors.get('moss:moss')`), 'residents did not stay by their homes');
  if (SHOTS) await page.screenshot({ path: `${OUT}sowerby-new-neighbours.png` });
  await cookByHand(page, 'meadowtea');
  check(await game<boolean>(page, `g.save.meal?.id === 'meadowtea' && g.save.meal.left <= 240`), 'Hazel’s recipe did not cook through the pot');
  await run(page, `g.leaveRoom()`); await waitFor(page, 'outside', () => settledIn(page, null));
  await plans();
  const cost = await game<number>(page, 'g.save.mats.pineplank');
  await page.click('[data-dialog="home:hazel:1"]'); await page.waitForSelector('.craft-building');
  check(await game<boolean>(page, `g.save.homes.hazel === 2 && g.save.mats.pineplank === ${cost - 40}`), 'upgrade not committed before animation');
  await page.reload(); await page.waitForSelector('.title-btns:not([hidden])'); await page.click('#btn-continue');
  await page.waitForTimeout(2200); await closeDialogs(page);
  check(await game<boolean>(page, `g.save.homes.hazel === 2 && g.save.homes.moss === 1 && g.save.mats.pineplank === ${cost - 40} && g.save.flags.includes('hazel:recipe')`), 'reload lost or duplicated the addition');
  await cookByHand(page, 'meadowtea');
  check(await game<boolean>(page, `g.save.meal?.id === 'meadowtea' && g.save.meal.left > 295`), 'glasshouse bonus not applied to the next cup');
  await cookByHand(page, 'trailbuns');
  check(await game<boolean>(page, `g.save.meal?.id === 'trailbuns'`), 'Moss’s recipe did not replace the tea');
}, { webgl: true });

// The 3D characters: every model loads, and the hero, villagers and monsters render (in software WebGL here) without
// errors, on the map and in a fight.
const GL_NAME = 'characters are drawn in 3D: every model loads and renders on the map and in a fight';
if (!ONLY || GL_NAME.toLowerCase().includes(ONLY)) queue.push({ name: GL_NAME, run: async () => {
  const name = GL_NAME;
  const gl = await chromium.launch({ executablePath, env, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await gl.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors: string[] = [];
  const weaponRequests = new Set<string>();
  page.on('request', (r) => {
    const id = /\/models\/wpn_([^/]+)\.glb/.exec(r.url())?.[1];
    if (id) weaponRequests.add(id);
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  // (The preset link reloads the page once, cutting off the first page's downloads; those get retried.)
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /model/.test(m.text()) && !/Failed to fetch/.test(m.text()))) errors.push(m.text()); });
  const t0 = Date.now();
  try {
    await page.goto(`${URL_}?preset=poppy-done`);
    await waitFor(page, 'the game', async () => (await game<string>(page, 'g?.mode')) === 'world', 60000);
    await page.waitForTimeout(1500);
    if (SHOTS) await page.screenshot({ path: `${OUT}3d-map.png` });
    const map = await game<number>(page, 'g.modelStats.renders');
    check(map > 0, 'nothing was rendered in 3D on the map');
    // A weapon acquired after startup must load when equipped, without a reload or startup prewarming.
    const fresh = Object.values(GEAR).find((g) => g.slot === 'weapon' && !weaponRequests.has(g.id))!;
    check(!!fresh, 'no fresh weapon available for the loading check');
    const downloaded = page.waitForResponse((r) => r.url().endsWith(`/models/wpn_${fresh.id}.glb`) && r.status() === 200, { timeout: 30000 });
    await run(page, `g.save.owned.push('${fresh.id}'); g.save.equip.weapon = '${fresh.id}'`);
    await downloaded;
    // Only the worn armour comes at startup (on the one base hero); another loads when first worn.
    const armor = await game<string>(page, 'g.save.equip.armor');
    const other = Object.values(GEAR).find((g) => g.slot === 'armor' && g.id !== armor)!;
    const dressed = page.waitForResponse((r) => r.url().endsWith(`/models/armor_${other.id}.glb`) && r.status() === 200, { timeout: 30000 });
    await run(page, `g.save.owned.push('${other.id}'); g.save.equip.armor = '${other.id}'`);
    await dressed;
    await run(page, `g.fight('bunny', 3, 2)`);
    await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle`), 20000);
    await page.waitForTimeout(3000);
    check((await game<number>(page, 'g.modelStats.renders')) > map, 'nothing was rendered in 3D in the fight');
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    console.log(`  ✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failures.push(`${name}: ${(e as Error).message}`);
    console.log(`  ✗ ${name}: ${(e as Error).message}`);
  }
  await gl.close();
} });

/** How many pixels the live 3D view has painted, and a fingerprint of them (to see it turn). */
const liveCanvas = (page: Page) => page.locator('canvas.live3d').evaluate((c) => {
  const cv = c as HTMLCanvasElement, d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  let n = 0, sum = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { n++; sum = (sum * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) >>> 0; }
  return { n, sum, share: n / (d.length / 4) };
});

scenario('Found items, the Forge and the Bag show one item at a time in live 3D', (g) => {
  g.save.owned.push('stonesword', 'fluffvest');
  g.save.mats.bark = 5;
}, async (page) => {
  const live = () => game<string | null>(page, 'g.itemView');
  await run(page, `void g.ui.itemFound('twig', 'Twig Sword', 'A stick.', '🗡️', 'You found', true)`);
  await waitFor(page, 'the Twig Sword in 3D', async () => await live() === 'twig', 15000);
  check((await liveCanvas(page)).share > 0.02, 'the found item drew nothing');
  await page.click('[data-dialog="ok"]');
  check(await live() === null && await page.locator('canvas.live3d').count() === 0, 'the found view outlived its card');
  // The Bag opens on you, in your armour with your weapon.
  await run(page, `g.ui.openMenu({ atForge: true, inVillage: true }, 'items')`);
  await waitFor(page, 'you in 3D', async () => await live() === 'hero', 15000);
  check((await liveCanvas(page)).share > 0.02, 'the hero preview drew nothing');
  // Picking an item replaces it: still only one live view.
  await page.click('.sock[aria-label="Weapon"]');
  await waitFor(page, 'the weapon in 3D', async () => await live() === 'twig', 15000);
  check(await page.locator('canvas.live3d').count() === 1, 'more than one live view');
  await page.click('.portrait');
  await waitFor(page, 'back to you', async () => await live() === 'hero', 15000);
  // A material, from its own small model.
  await page.click('[data-sub="items:stuff"]');
  await waitFor(page, 'a material in 3D', async () => !!(await live()) && await live() !== 'hero', 15000);
  check((await liveCanvas(page)).share > 0.02, 'the material drew nothing');
  // The Forge's tag for the picked recipe.
  await page.click('[data-tab="forge"]');
  await waitFor(page, 'a recipe in 3D', async () => !!(await live()) && await live() !== 'hero', 15000);
  check(await page.locator('canvas.live3d').count() === 1, 'more than one live view in the Forge');
  await run(page, `g.ui.closeMenu()`);
  check(await live() === null && await page.locator('canvas.live3d').count() === 0, 'the view outlived the menu');
}, { webgl: true });

scenario('A live 3D item holds still with reduced motion, and turns when dragged', null, async (page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await run(page, `void g.ui.itemFound('meal_tea', 'Clover Tea', 'Warm.', '🍵', 'New recipe')`);
  await waitFor(page, 'the tea in 3D', async () => await game(page, 'g.itemView') === 'meal_tea', 15000);
  const still = await liveCanvas(page);
  await page.waitForTimeout(600);
  check((await liveCanvas(page)).sum === still.sum, 'it turned by itself with reduced motion');
  const box = (await page.locator('canvas.live3d').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  check((await liveCanvas(page)).sum !== still.sum, 'dragging did not turn it');
}, { webgl: true });

scenario('Without WebGL, found items and tags keep their icons', null, async (page) => {
  await run(page, `void g.ui.itemFound('twig', 'Twig Sword', 'A stick.', '🗡️', 'You found', true)`);
  await page.waitForSelector('.view3d img.icon');
  await page.waitForTimeout(500);
  check(await game(page, 'g.itemView') === null, 'a live view started without WebGL');
  check(await page.locator('canvas.live3d').count() === 0 && await page.locator('.view3d img.icon').isVisible(), 'the icon is not showing');
});

queue.sort((a, b) => weight(a.name) - weight(b.name));
let next = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
  while (next < queue.length) await queue[next++].run();
}));
console.log(`\n${queue.length} scenarios, ${JOBS} at a time: ${((Date.now() - START) / 1000).toFixed(0)}s`);
await browser.close();
if (glBrowser) await (await glBrowser).close();
server.stop(true);
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log('\nAll scenarios passed');
