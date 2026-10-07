// Real mobile Journal/HUD/waypoint coverage. Run: bun run tests/e2e/quest-tracking.ts [--shots]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';
import { browserEnv } from './browser-env';

const shots = process.argv.includes('--shots');
const out = new URL('../../.amp/in/artifacts/quest-tracking/', import.meta.url).pathname;
if (shots) mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ env: browserEnv(shots), executablePath: process.env.CHROMIUM_PATH, args: ['--disable-webgl', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
const run = (code: string) => page.evaluate(`(() => { const g = window.game; ${code} })()`);
const state = <T>(code: string): Promise<T> => page.evaluate(`(() => { const g = window.game; return ${code}; })()`);
const shot = async (name: string) => { if (shots) await page.screenshot({ path: `${out}${name}.png` }); };
async function continueGame() {
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.click('#btn-continue');
  await page.waitForFunction(`window.game.mode === 'world' && !window.game.trans`);
}
async function journal() {
  await page.click('#btn-journal');
  await page.waitForSelector('[data-track="main"]');
  await page.waitForTimeout(350);
}
async function closeJournal() {
  await page.click('[data-do="close"]');
  await page.waitForTimeout(200);
}

try {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForSelector('.title-btns:not([hidden])');
  await run(`const s = g.save;
    s.lv = 7; s.quest = g.quests.findIndex(q => q.id === 'alphawolf');
    s.flags = ['sword', 'glade1', 'glade2', 'village', 'bram:pie', 'bram:home', 'poppy:returned'];
    s.stories = { poppy: 6, bram: 7 }; s.bosses = ['kingslime'];
    s.build.forge = 2; s.tools = { wood: 2, mine: 1 };
    s.pos = { x: 29.5, y: 12.5 }; s.unlocked = ['journal', 'bag', 'forge', 'village', 'plots'];
    s.tips = ['moved', 'chopped', 'mined']; Object.assign(s.mats, { pine: 7, stone: 23, copper: 2 });
    delete s.trackedQuest; localStorage.setItem('sprout-quest-save', JSON.stringify(s));`);
  await page.reload();
  await continueGame();
  check((await page.locator('#quest-pill').textContent())?.includes('Main story'), 'an old save must default to main, not an arbitrary side quest');
  const mainPoint = await state<{ x: number; y: number }>('g.over.objective');
  check(mainPoint, 'main story needs a waypoint');
  await journal();
  check(await page.locator('h3').filter({ hasText: /^Main story$/ }).count(), 'missing main story section');
  check(await page.locator('h3').filter({ hasText: /^Side quests$/ }).count(), 'missing side quest section');
  check(await page.locator('.quest-completed [data-track]').count() === 0, 'completed quests must not offer tracking');
  check(await page.locator('[data-quest="granny"]').count() === 0, 'an NPC with no quest steps is not a completed quest');
  check(await page.locator('[data-quest="drums"]').count() === 0, 'undiscovered hidden quests must stay hidden');
  await shot('journal-main');
  check(await page.locator('.quest-story .qtext').isHidden(), 'long narrative should be folded away by default');
  await page.click('.quest-story summary');
  check((await page.locator('.quest-story .qtext').innerText()).includes('Deep in Whisper Woods'), 'the story should remain readable on demand');
  await shot('journal-story-expanded');
  await page.click('.quest-story summary');
  const bram = page.locator('[data-quest="bram"]');
  const resources = await bram.locator('.quest-material').allTextContents();
  check(JSON.stringify(resources.map((s) => s.replace(/\s+/g, ' ').trim())) === JSON.stringify(['Pine Log7 / 18', 'Stone23 / 18 ✓', 'Copper Ore2 / 9']), `wrong bill: ${resources}`);
  check(await bram.locator('.quest-material.ok').count() === 1, 'only stone is ready');
  await page.click('[data-track="bram"]');
  check(await page.locator('[data-track="bram"]').getAttribute('aria-pressed') === 'true', 'selection should be visible');
  await bram.scrollIntoViewIfNeeded();
  await shot('journal-bram');
  await closeJournal();
  check((await page.locator('#quest-pill').textContent())?.includes('Side quest'), 'HUD must identify side quests');
  check((await page.locator('#quest-pill').innerText()).includes('7/18'), 'HUD needs Bram material counts');
  check(await page.locator('#quest-pill .qm.ok').count() === 1, 'HUD must cap surplus counts and mark ready materials');
  const sidePoint = await state<{ x: number; y: number }>('g.over.objective');
  check(sidePoint && Math.hypot(sidePoint.x - mainPoint.x, sidePoint.y - mainPoint.y) > 1, 'waypoint must follow the selected side quest');
  await shot('hud-bram');
  await run(`g.save.mats.pine = 18; g.save.mats.copper = 9`);
  await page.waitForFunction(`document.querySelectorAll('#quest-pill .qm.ok').length === 3`);
  const readyPoint = await state<{ x: number; y: number }>('g.over.objective');
  const expectedPoint = await state<{ x: number; y: number }>(`(() => { const o = g.over.world.obj('plot', 'sawmill'); return { x: o.x + o.w / 2, y: o.y + o.h + 0.6 }; })()`);
  check(Math.hypot(readyPoint.x - expectedPoint.x, readyPoint.y - expectedPoint.y) < .01, 'ready materials should point to the sawmill plot');
  check(await state<number>('g.save.stories.bram') === 7, 'having materials alone must not complete construction');
  await page.reload();
  await continueGame();
  check(await state<string>('g.save.trackedQuest') === 'bram', 'selection must survive reload');
  await page.click('#quest-pill');
  await page.waitForTimeout(350);
  check(await page.locator('[data-track="bram"]').count(), 'Change on HUD should open the quest journal');
  await page.click('[data-track="none"]');
  await closeJournal();
  check(await page.locator('#quest-pill').isHidden(), 'Stop should hide the tracker');
  check(await state('g.over.objective') === null, 'Stop should hide the waypoint');
  await page.reload();
  await continueGame();
  check(await state('g.save.trackedQuest') === null, 'no tracking must survive reload');
  await journal();
  check((await page.locator('.quest-summary').innerText()).includes('No quest tracked'), 'journal should explain tracking is off');
  await shot('journal-none');
  await page.click('[data-track="main"]');
  await closeJournal();
  check((await page.locator('#quest-pill').innerText()).includes('Howl in the Woods'), 'switching back should restore main story');
  await journal();
  await page.click('[data-track="bram"]');
  // Change steps without replaying the long construction scene (covered by smoke.ts).
  await run(`g.save.build.sawmill = 1; g.save.stories.bram = 8; g.save.mats.plank = 13; g.ui.refresh()`);
  check((await bram.innerText()).includes('13 / 48'), 'the next step should show cabin planks, not the mill recipe');
  await closeJournal();
  check((await page.locator('#quest-pill').innerText()).includes('13/48'), 'selection follows the story to its next step');
  await shot('hud-cabin');
  await run(`g.save.flags.push('bram:hut'); g.save.stories.bram = 9`);
  await page.waitForFunction(`document.querySelector('#quest-pill .qkind')?.textContent.includes('Main story')`);
  check((await page.locator('#quest-pill').innerText()).includes('Howl in the Woods'), 'completed side quest should fall back to main');
  await journal();
  await page.click('[data-track="main"]');
  await closeJournal();
  check(await page.locator('#quest-pill').isHidden(), 'Stop on a fallback main quest must also work');
  await run(`g.save.buildingJob = 'garden1'`);
  await journal();
  const construction = page.locator('[data-quest="construction"]');
  check((await construction.innerText()).includes('Plank'), 'requested village builds should expose their bill too');
  await page.click('[data-track="construction"]');
  await construction.scrollIntoViewIfNeeded();
  await shot('journal-construction');
  await closeJournal();
  check((await page.locator('#quest-pill').innerText()).includes('A Place for Everyone'), 'village builds must be trackable');
  check(errors.length === 0, `browser errors: ${errors.join('; ')}`);
  console.log('✓ quest tracking: named bills, selection, live HUD and waypoint, reload, none, next step, completion fallback, village requests');
} catch (error) {
  console.log(await state(`({ mode: g.mode, tracked: g.save.trackedQuest, pill: document.querySelector('#quest-pill')?.textContent, errors: document.querySelector('#modal:not([hidden])')?.textContent })`));
  await shot('failure');
  throw error;
} finally {
  await browser.close();
  server.stop(true);
}
