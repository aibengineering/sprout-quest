// End-to-end smoke test: plays the real game in headless Chromium, at phone size, through the flows the unit tests
// can't reach (fights, level-up screens, stamina, dragon breath, mining, the Forge, the play report).
//
//   bun run e2e            run every scenario
//   bun run e2e --shots    also save a screenshot per scenario to tests/e2e/out/
//
// Needs Playwright's Chromium once: `bunx playwright-core install chromium-headless-shell`.
import { chromium, type Page } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { startServer } from '../../server';
import { MONSTERS } from '../../src/data';

const SHOTS = process.argv.includes('--shots');
const OUT = new URL('./out/', import.meta.url).pathname;
if (SHOTS) mkdirSync(OUT, { recursive: true });

const server = startServer(0);
const URL_ = `http://localhost:${server.port}/`;
const browser = await chromium.launch();
const failures: string[] = [];

/** Changes a scenario makes to the save, on top of `base`. Sent to the page as source, so it can't use closures. */
type Seed = (game: any) => void;

/** A fresh page on a seeded save, past the title screen and any story popups. */
async function boot(seed: Seed) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, acceptDownloads: true });
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
  s.pos = { x: 50.5, y: 18 };
  s.unlocked.push('forge', 'bag', 'journal');
};

const game = <T>(page: Page, f: string): Promise<T> => page.evaluate(`(() => { const g = window.game; return ${f}; })()`) as Promise<T>;
const run = (page: Page, f: string) => page.evaluate(`(() => { const g = window.game; ${f}; })()`);

/** Clicks through popups (not the menu) until none are left; returns the text of each one. */
async function closeDialogs(page: Page, max = 8) {
  const seen: string[] = [];
  for (let i = 0; i < max; i++) {
    const btn = await page.$('#modal:not([hidden]) .sheet:not(.menu) [data-dialog]:last-of-type');
    if (!btn) break;
    seen.push((await page.textContent('#modal .sheet')) ?? '');
    await btn.click();
    await page.waitForTimeout(400);
  }
  return seen;
}

async function waitFor(page: Page, what: string, cond: () => Promise<boolean>, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await cond()) return true;
    await page.waitForTimeout(100);
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** Enemies that stand still in front of you and can't die (or die in one hit, with `hp: 1`). */
const pinFoes = (page: Page, hp = 1e6) => run(page, `const b = g.battle; for (const e of b.enemies) { e.hp = e.maxHp = ${hp}; e.stun = 99; e.x = b.p.x; e.y = b.p.y - 60; } b.p.face = -Math.PI / 2`);
const endFight = (page: Page) => run(page, `const b = g.battle; for (const e of b.enemies) if (!e.dead) { e.hp = 0; b.kill(e); }`);

async function scenario(name: string, seed: Seed | null, body: (page: Page) => Promise<void>) {
  const { page, errors, close } = await boot(seed ?? (() => {}));
  const t0 = Date.now();
  try {
    await body(page);
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    console.log(`  ✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failures.push(`${name}: ${(e as Error).message}`);
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

await scenario('quest tracker shows material progress', null, async (page) => {
  check(await page.$('#quest-pill:not([hidden]) .qbar'), 'no progress bar on the quest tracker');
  check((await page.$$('#quest-pill .qm')).length > 0, 'no material counts on the quest tracker');
});

await scenario('winning a fight levels you up and reveals new gear', (g) => {
  Object.assign(g.save, { lv: 4, xp: 108 });
  g.save.owned.push('jellywhip');
  g.save.equip.weapon = 'jellywhip';
  g.save.mastery.whip.xp = 28;
}, async (page) => {
  await run(page, 'g.encounter()');
  await page.waitForTimeout(900);
  await pinFoes(page, 1);
  await page.keyboard.press('KeyJ');
  await waitFor(page, 'the level-up screen', async () => !!(await page.$('#modal:not([hidden]) .lvup')));
  // Loot and XP stack on the right, clear of the quest tracker.
  const pill = await page.locator('#quest-pill').boundingBox(), rows = await page.locator('#loot .lrow').all();
  check(rows.length > 0, 'no loot rows');
  for (const r of rows) {
    const b = (await r.boundingBox())!;
    check(!pill || b.x >= pill.x + pill.width || b.y >= pill.y + pill.height, 'a loot row overlaps the quest tracker');
  }
  const screens = await closeDialogs(page);
  check(screens.some((t) => t.includes('Level 5')), 'no combat level-up screen');
  check(screens.some((t) => /Whip handling/i.test(t) && t.includes('Spore Whip')), 'whip handling screen did not reveal the Spore Whip');
  check(await game(page, 'g.save.lv') === 5, 'combat level did not go up');
});

await scenario('every weapon runs out of stamina when mashed', (g) => {
  g.save.owned.push('stonesword', 'stonehammer', 'jellywhip', 'jellysling');
}, async (page) => {
  for (const w of ['stonesword', 'stonehammer', 'jellywhip', 'jellysling']) {
    await run(page, `g.save.equip.weapon = '${w}'; g.encounter()`);
    await page.waitForTimeout(900);
    await pinFoes(page);
    let lowest = 99;
    const t0 = Date.now();
    while (Date.now() - t0 < 2000) {
      await page.keyboard.press('KeyJ');
      lowest = Math.min(lowest, await game<number>(page, 'g.battle.clip.n'));
      await page.waitForTimeout(40);
    }
    const { swings, max, regen, delay } = await game<{ swings: number; max: number; regen: number; delay: number }>(page, '({ swings: g.battle.log.swings, ...g.battle.moves.ammo })');
    check(lowest === 0, `${w}: stamina never ran out`);
    // A full meter, plus what refills while you pause between swings: well short of one swing per press.
    const cap = max + Math.ceil(2 / (regen + delay)) + 1;
    check(swings <= cap, `${w}: ${swings} swings in 2s (stamina allows ≤${cap})`);
    await endFight(page);
    await page.waitForTimeout(2600);
    await closeDialogs(page);
  }
});

await scenario('every monster fights (and is drawn) without errors', (g) => {
  g.save.lv = 20;
  g.save.owned.push('wyrmbreaker');
  g.save.equip.weapon = 'wyrmbreaker';
}, async (page) => {
  for (const kind of Object.keys(MONSTERS)) {
    await run(page, `g.fight('${kind}', ${MONSTERS[kind as keyof typeof MONSTERS].boss ? 20 : 10}, 2)`);
    await waitFor(page, `a fight with ${kind}`, async () => (await game<boolean>(page, 'g.mode === "battle" && !!g.battle')));
    // Let it run through a few of its moves, with you too tough to fall, swinging now and then.
    const t0 = Date.now();
    while (Date.now() - t0 < 2500) {
      await run(page, 'if (g.battle) { g.battle.p.hp = 9999; g.battle.p.iframes = 1; }');
      await page.keyboard.press('KeyJ');
      await page.waitForTimeout(250);
    }
    const states = await game<string[]>(page, 'g.battle.enemies.map((e) => e.state)');
    check(states.length > 0, `${kind}: no enemies spawned`);
    await endFight(page);
    await page.waitForTimeout(2600);
    await closeDialogs(page);
  }
});

await scenario('the Wyrmbreaker breathes fire that burns the ground', (g) => {
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

await scenario('an iron pick mines Glimmer Hollow crystal, slowly', (g) => {
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

await scenario('the Forge keeps gear a mystery until you reach its level', (g) => {
  g.save.tools.mine = 1;
  g.save.skills.mine = { lv: 1, xp: 0 };
}, async (page) => {
  const forgeCards = async () => {
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(400);
    await page.click('[data-tab="forge"]');
    await page.waitForTimeout(300);
    const r = { mysteries: (await page.$$('.rcp.mystery')).length, names: await page.$$eval('.rcp:not(.mystery) .name', (els) => els.map((e) => e.textContent ?? '')) };
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    return r;
  };
  const before = await forgeCards();
  check(before.mysteries > 0, 'no mystery cards');
  check(before.names.some((n) => n.includes('Jelly Whip')), 'Jelly Whip (no level needed) is not shown');
  check(!before.names.some((n) => n.includes('Stone Sword')), 'Stone Sword is shown before Mining 2');
  await run(page, 'g.save.skills.mine.lv = 2');
  const after = await forgeCards();
  check(after.names.some((n) => n.includes('Stone Sword')), 'Stone Sword still hidden at Mining 2');
});

await scenario('the play report exports fights', null, async (page) => {
  await run(page, 'g.encounter()');
  await page.waitForTimeout(900);
  await endFight(page);
  await page.waitForTimeout(2600);
  await closeDialogs(page);
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(400);
  await page.click('[data-tab="settings"]');
  await page.waitForTimeout(300);
  const download = page.waitForEvent('download');
  await page.click('[data-do="report"]');
  const report = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
  check(report.summary?.fights >= 1, 'report has no fights');
  check(report.events?.some((e: any) => e.kind === 'fight' && e.result === 'win'), 'report has no won fight event');
});

await browser.close();
server.stop(true);
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log('\nAll scenarios passed');
