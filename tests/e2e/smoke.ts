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

await scenario('a new game plays through the prologue to Elder Bloom', null, async (page) => {
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
    await waitFor(page, `the ${flag} result`, async () => !!(await page.$('#modal:not([hidden]) [data-dialog]')), 5000);
    await closeDialogs(page);
    await waitFor(page, 'back on the map', async () => game<boolean>(page, `g.mode === 'world' && !g.battle`), 5000);
    check(await game(page, `g.save.flags.includes('${flag}')`), `winning the ${flag} fight did not clear the path`);
  }
  // Walking into the village plays Elder Bloom's welcome tour.
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
  await closeDialogs(page);
  await page.waitForTimeout(500);
  check(await game(page, `g.mode`) === 'world', 'not back in control after the welcome');
  // Talking to Elder Bloom tells you what to do next, then hands you back the controls.
  await use(`g.over.world.obj('elder')`);
  const said = await closeDialogs(page);
  check(said.some((t) => t.includes('Elder Bloom')), 'Elder Bloom did not speak');
  await page.waitForTimeout(400);
  check(await game(page, `g.mode`) === 'world', 'not back in control after talking to Elder Bloom');
});

await scenario('patch notes: a dot until you read them, from the menu or the title', (g) => {
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

await scenario('the play report records fights, stamina, deaths and time, and exports', (g) => {
  g.save.owned.push('stonesword');
  g.save.equip.weapon = 'stonesword';
}, async (page) => {
  // A win where you mash the attack button (stamina runs dry)…
  await run(page, 'g.encounter()');
  await page.waitForTimeout(900);
  await pinFoes(page);
  const t0 = Date.now();
  while (Date.now() - t0 < 1500) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(40); }
  await endFight(page);
  await page.waitForTimeout(2600);
  await closeDialogs(page);
  // …and a loss, so the report says what got you.
  await run(page, `g.fight('wolf', 12, 2)`);
  await waitFor(page, 'the wolf fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle`));
  await page.waitForTimeout(1500);
  await run(page, 'g.battle.p.hp = 1; g.battle.p.iframes = 0');
  await waitFor(page, 'losing', async () => !!(await page.$('#modal:not([hidden]) [data-dialog]')), 15000);
  await closeDialogs(page);
  await waitFor(page, 'back on the map', async () => game<boolean>(page, `g.mode === 'world' && !g.battle`), 6000);

  await openMore(page);
  // The full report: a file with the summary, then one line per event.
  const download = page.waitForEvent('download');
  await page.click('[data-do="report"]');
  const text = readFileSync(await (await download).path(), 'utf8');
  const report = JSON.parse(text);
  const s = report.summary;
  check(s.fights >= 2 && s.deaths >= 1, `report has ${s.fights} fights, ${s.deaths} deaths`);
  const fight = report.events.fight;
  check(fight.cols.includes('emptied') && fight.rows.every((r: unknown[]) => r.length === fight.cols.length), 'fight rows do not line up with their columns');
  check(text.split('\n').length > fight.rows.length + 20, 'events are not one per line');
  const win = fight.rows.find((r: unknown[]) => r[fight.cols.indexOf('result')] === 'win');
  check(win[fight.cols.indexOf('emptied')] > 0, 'mashing never ran stamina dry in the report');
  const loss = s.defeatsAndRuns.find((d: { result: string }) => d.result === 'lose');
  check(/^wolf:(contact|shot)$/.test(loss?.by ?? ''), `the loss does not say what got you (${loss?.by})`);
  check(s.time.totalMinutes.fighting > 0 && s.time.totalMinutes.walking > 0 && s.time.byZone.meadow, 'no time split');
  check(s.fightsByWeapon.stonesword?.avgEmptied > 0, 'no per-weapon stamina summary');

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

await browser.close();
server.stop(true);
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log('\nAll scenarios passed');
