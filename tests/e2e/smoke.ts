// End-to-end smoke test: plays the real game in headless Chromium, at phone size, through the flows the unit tests
// can't reach (fights, level-up screens, attack pacing, dragon breath, mining, the Forge, the play report).
//
//   bun run e2e            run every scenario
//   bun run e2e --shots    also save a screenshot per scenario to tests/e2e/out/
//   bun run e2e --only X   just the scenarios whose name contains X
//   bun run e2e -j N       N scenarios at a time (default: cores − 2; -j 1 runs them one by one)
//
// Needs Playwright's Chromium once: `bunx playwright-core install chromium-headless-shell`.
import { chromium, type Page } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { startServer } from '../../server';
import { GEAR, MONSTERS } from '../../src/data';
import { MOVESETS, comboTime } from '../../src/weapons';

const SHOTS = process.argv.includes('--shots');
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
const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-gpu'] });
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
async function closeDialogs(page: Page, max = 8, sheet = '.sheet:not(.menu)') {
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
const SLOW = ['Poppy', "Bram's story", 'every monster', 'characters are drawn in 3D', 'prologue', 'waits between strikes', 'play report'];
const weight = (name: string) => { const i = SLOW.findIndex((s) => name.includes(s)); return i < 0 ? SLOW.length : i; };

function scenario(name: string, seed: Seed | null, body: (page: Page) => Promise<void>) {
  if (ONLY && !name.toLowerCase().includes(ONLY)) return;
  queue.push({ name, run: () => runScenario(name, seed, body) });
}

async function runScenario(name: string, seed: Seed | null, body: (page: Page) => Promise<void>) {
  const b0 = Date.now();
  const { page, errors, close } = await boot(seed ?? (() => {}));
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
  }
  await waitFor(page, 'the level-up screen', async () => !!(await page.$('#modal:not([hidden]) .lvsheet')));
  // Its stats tick in one by one.
  await waitFor(page, "the level-up's stats", async () => /Max HP/.test((await page.textContent('#modal .sheet')) ?? ''), 5000);
  // Loot and XP stack on the right, clear of the quest tracker.
  const pill = await page.locator('#quest-pill').boundingBox(), rows = await page.locator('#loot .lrow').all();
  check(rows.length > 0, 'no loot rows');
  for (const r of rows) {
    const b = (await r.boundingBox())!;
    check(!pill || b.x >= pill.x + pill.width || b.y >= pill.y + pill.height, 'a loot row overlaps the quest tracker');
  }
  const screens = await closeDialogs(page);
  check(screens.some((t) => t.includes('Level up!') && t.includes('Max HP')), 'no combat level-up screen');
  check(screens.some((t) => /Whip handling/i.test(t) && t.includes('Spore Whip')), 'whip handling screen did not reveal the Spore Whip');
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

scenario("each class has its trick (Riposte, Sunder, Snare, Blink) and its special fires", (g) => {
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

  // Hammer: a slam sunders what it hits.
  await fight('stonehammer');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(700);
  check(await game<boolean>(page, 'g.battle.enemies.some((e) => e.sunder > 0)'), 'stonehammer: the slam sundered nothing');
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
  g.save.pos = { x: 58, y: 15 };
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
  await goTo(134.5, 24.5);
  await page.waitForTimeout(600);
  check((await step()) === 0 && (await game<string>(page, 'g.mode')) === 'world', "Poppy's story started outside the meadow");
  // Coming down into the meadow's south-east pocket: she's cornered in the grove's mouth.
  const M = 38;
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

  // Granny asks the favour and hands over the pie.
  await waitFor(page, 'Granny', async () => game<boolean>(page, `!!g.over.actors.get('granny:granny')`));
  await talk('granny:granny');
  await playUntil('the pie', async () => (await step()) === 1);
  // The grump at his camp: the pie gets him talking.
  await run(page, 'g.over.teleport(86.9, 6.9)');
  await page.waitForTimeout(600);
  await waitFor(page, 'Bram at his camp', async () => game<boolean>(page, `!!g.over.actors.get('bram:bram')`));
  await talk('bram:bram');
  await playUntil('the contest', async () => (await step()) === 2 && (await game<string>(page, 'g.mode')) === 'world');
  // A loud chop brings Woolves early (and the tree waits).
  check(await game<boolean>(page, `g.over.world.objs.some((o) => o.kind === 'node' && o.node === 'pine' && o.x < 91 && o.y < 8)`), 'no pines at the camp');
  // Three pines felled (the chopping itself is covered by its own scenario), and the raid comes anyway.
  await run(page, `g.over.world.objs.filter((o) => o.kind === 'node' && o.node === 'pine' && o.x > 79 && o.x < 91 && o.y > 2.5 && o.y < 8).slice(0, 3).forEach((o) => g.save.flags.push('bram:pine:' + o.id))`);
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
  await run(page, `Object.assign(g.save.mats, { pine: 8, stone: 8, copper: 4, bark: 20 }); const o = g.over.world.objs.find((o) => o.project === 'sawmill'); g.over.teleport(o.x + o.w / 2, o.y + o.h + 0.5)`);
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyE');
  await waitFor(page, 'the plans', async () => !!(await page.$('#modal:not([hidden]) [data-build="sawmill"]:not([disabled])')));
  await page.click('#modal [data-build="sawmill"]');
  await page.keyboard.press('Escape');
  await playUntil('the Sawmill', async () => (await step()) === 8 && (await game<string>(page, 'g.mode')) === 'world');
  // Saw six planks (the clock wound on, rather than waiting three minutes), take them, and bring them to Bram.
  await talk('bram:bram');
  await waitFor(page, 'the bench', async () => !!(await page.$('#modal:not([hidden]) [data-dialog="saw:5:bark"]')));
  await page.click('[data-dialog="saw:5:bark"]');
  await waitFor(page, 'saw one more', async () => !!(await page.$('#modal:not([hidden]) [data-dialog="saw:1:bark"]')));
  await page.click('[data-dialog="saw:1:bark"]');
  await page.waitForTimeout(300);
  await page.click('[data-dialog="close"]');
  await page.waitForTimeout(300);
  check(await game<number>(page, 'g.save.sawmill.queued') === 6 && await game<number>(page, 'g.save.mats.bark') === 8, 'the logs did not go to the saw');
  await run(page, 'g.save.sawmill.since -= 6 * 30000');
  await page.keyboard.press('KeyE');
  await waitFor(page, 'planks ready', async () => !!(await page.$('#modal:not([hidden]) [data-dialog="collect"]')), 8000).catch(async () => {
    await page.click('#modal [data-dialog="close"]').catch(() => {});
    await talk('bram:bram');
    await waitFor(page, 'planks ready', async () => !!(await page.$('#modal:not([hidden]) [data-dialog="collect"]')));
  });
  await page.click('[data-dialog="collect"]');
  await page.waitForTimeout(300);
  await page.click('[data-dialog="close"]');
  check(await game<number>(page, 'g.save.mats.plank') === 6, 'the planks did not reach your bag');
  await page.waitForTimeout(400);
  await talk('bram:bram');
  await playUntil('the cabin', async () => (await step()) === 9 && (await game<string>(page, 'g.mode')) === 'world');
  check(await game<boolean>(page, `!g.over.world.objs.find((o) => o.id === 'bramhut').hidden && g.save.flags.includes('bram:stew')`), 'no cabin, or no stew');
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
  s.pos = { x: 78 + 16.5, y: 12 };
}, async (page) => {
  const bram = () => game<{ follow: boolean; x: number; y: number }>(page, `(() => { const a = g.over.actors.get('bram:bram'); return a && { follow: a.follow, x: a.x, y: a.y }; })()`);
  await waitFor(page, 'Bram at your side', async () => !!(await bram())?.follow);
  // Lose a fight on the way.
  await run(page, `g.fight('wolf', 12, 2)`);
  await waitFor(page, 'the fight', async () => game<boolean>(page, `g.mode === 'battle' && !!g.battle`));
  await page.waitForTimeout(1500);
  await run(page, 'g.battle.p.hp = 1; g.battle.p.iframes = 0');
  await waitFor(page, 'fainting', async () => !!(await page.$('#modal:not([hidden]) [data-dialog]')), 15000);
  await closeDialogs(page);
  await waitFor(page, 'waking up in Sowerby', async () => game<boolean>(page, `g.mode === 'world' && !g.battle && g.over.currentZone.id === 'village'`), 8000);
  const b = await bram();
  check(b && !b.follow && Math.hypot(b.x - (78 + 16.5), b.y - 11.6) < 1, `Bram should wait past the first ambush, not follow you home (${JSON.stringify(b)})`);
  check(await game<boolean>(page, `g.save.flags.includes('bram:waiting')`), 'Bram is not waiting');
  // Walking home without him (or without the second ambush) doesn't finish the escort.
  await run(page, 'g.over.teleport(31.8, 11.4)');
  await page.waitForTimeout(1200);
  check(await game<number>(page, 'g.save.stories.bram') === 6, 'the escort finished without Bram');
  // Fetch him: he follows again, and the second ambush is still there.
  await run(page, `g.over.teleport(78 + 16.5, 12.4)`);
  await page.waitForTimeout(500);
  await run(page, `void g.over.actors.get('bram:bram').talk()`);
  await closeDialogs(page);
  await waitFor(page, 'Bram following again', async () => !!(await bram())?.follow);
  check(await game<boolean>(page, `!g.over.world.objs.find((o) => o.flag === 'bram:ambush2').hidden`), 'the second ambush vanished');
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

// The 3D characters: every model loads, and the hero, villagers and monsters render (in software WebGL here) without
// errors, on the map and in a fight.
const GL_NAME = 'characters are drawn in 3D: every model loads and renders on the map and in a fight';
if (!ONLY || GL_NAME.toLowerCase().includes(ONLY)) queue.push({ name: GL_NAME, run: async () => {
  const name = GL_NAME;
  const gl = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await gl.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // (The preset link reloads the page once, cutting off the first page's downloads; those get retried.)
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /model/.test(m.text()) && !/Failed to fetch/.test(m.text()))) errors.push(m.text()); });
  const t0 = Date.now();
  try {
    await page.goto(`${URL_}?preset=poppy-done`);
    await waitFor(page, 'the game', async () => (await game<string>(page, 'g?.mode')) === 'world', 60000);
    await page.waitForTimeout(1500);
    const map = await game<number>(page, 'g.modelStats.renders');
    check(map > 0, 'nothing was rendered in 3D on the map');
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

queue.sort((a, b) => weight(a.name) - weight(b.name));
let next = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
  while (next < queue.length) await queue[next++].run();
}));
console.log(`\n${queue.length} scenarios, ${JOBS} at a time: ${((Date.now() - START) / 1000).toFixed(0)}s`);
await browser.close();
server.stop(true);
if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log('\nAll scenarios passed');
