// Scoped WebGL inspection of the four woodland armor contributions in the real game.
// CHROMIUM_PATH=/usr/bin/chromium bun run tests/e2e/woodland-armors.ts [--before]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startServer } from '../../server';
import barkvest from '../../src/crafting/items/barkvest';
import shroomhood from '../../src/crafting/items/shroomhood';
import batcloak from '../../src/crafting/items/batcloak';
import glimmershawl from '../../src/crafting/items/glimmershawl';

const items = ['barkvest', 'shroomhood', 'batcloak', 'glimmershawl'];
const stage = process.argv.includes('--before') ? 'before' : 'after';
const out = `tests/e2e/out/woodland-armors/${stage}`;
mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results: unknown[] = [];
try {
  for (const width of [390, 320]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors: string[] = [];
    const fetched = new Set<string>();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('response', r => { if (r.status() === 200 && r.url().endsWith('.glb')) fetched.add(r.url().split('/').pop()!); });
    page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /model/.test(m.text()) && !/Failed to fetch/.test(m.text()))) errors.push(m.text()); });
    await page.goto(`http://localhost:${server.port}/?preset=sandbox`);
    await page.waitForFunction(() => (window as any).game?.mode === 'world', { timeout: 60000 });
    if (width === 390) {
      const emptyContacts = await page.evaluate(async presentations => {
        const empty: string[] = [];
        for (const p of presentations) for (const t of p.targets) {
          const layer = p.layers.find(l => l.id === t.part)!;
          const image = new Image(); image.src = layer.src; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
          const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
          if (ctx.getImageData(Math.round(t.x * 512), Math.round(t.y * 512), 1, 1).data[3] < 10) empty.push(`${p.id}:${t.part}`);
        }
        return empty;
      }, [barkvest, shroomhood, batcloak, glimmershawl]);
      if (emptyContacts.length) throw new Error(`ingredient contacts miss visible geometry: ${emptyContacts.join(', ')}`);
      results.push({ registeredContacts: 'all targets land on visible registered geometry' });
    }
    await page.evaluate(() => {
      const g = (window as any).game;
      g.over.teleport(26.5, 13.5);
      g.zoom = 2;
      g.sound.muted = true;
    });
    for (const id of items) {
      const renders = await page.evaluate(() => (window as any).game.modelStats.renders);
      await page.evaluate(id => {
        const g = (window as any).game;
        if (!g.save.owned.includes(id)) g.save.owned.push(id);
        g.save.equip.armor = id;
        g.save.equip.weapon = 'stonesword';
        g.over.face = Math.PI / 2;
      }, id);
      await page.waitForFunction(({ renders }) => (window as any).game.modelStats.renders > renders, { renders }, { timeout: 30000 });
      await page.waitForTimeout(900);
      if (!fetched.has(`hero_${id}.glb`)) throw new Error(`${id}: equipped model was not fetched`);
      await page.screenshot({ path: `${out}/${id}-${width}-map.png` });
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(180);
      await page.screenshot({ path: `${out}/${id}-${width}-walk.png` });
      await page.keyboard.up('ArrowRight');
      results.push({ id, width, mapRenders: await page.evaluate(() => (window as any).game.modelStats.renders) - renders });
    }
    // All four classes exercise the same unchanged hand and mount pivots in combat.
    for (const [i, id] of items.entries()) {
      const weapon = ['stonesword', 'stonehammer', 'batwhip', 'glimmerwand'][i];
      await page.evaluate(({ id, weapon }) => {
        const g = (window as any).game;
        g.save.equip.armor = id;
        g.save.equip.weapon = weapon;
        g.fight('bunny', 3, 2);
      }, { id, weapon });
      await page.waitForFunction(() => (window as any).game?.mode === 'battle', { timeout: 30000 });
      await page.waitForTimeout(2400);
      await page.evaluate(() => {
        const g = (window as any).game;
        const b = g.battle;
        for (const e of b.enemies) { e.stun = 999; e.hp = e.maxHp = 1e8; e.x = b.p.x + 50; e.y = b.p.y; }
        b.p.hp = b.stats.maxHp;
        b.p.face = Math.PI / 2;
      });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}/${id}-${width}-battle.png` });
      if (!fetched.has(`wpn_${weapon}.glb`)) throw new Error(`${id}: weapon attachment did not load`);
      await page.keyboard.down('KeyJ');
      await page.waitForTimeout(180);
      await page.screenshot({ path: `${out}/${id}-${width}-attack.png` });
      await page.keyboard.up('KeyJ');
      if (!(await page.evaluate(() => (window as any).game.battle.log.swings > 0))) throw new Error(`${id}: attached weapon did not attack`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    results.push({ width, errors, modelsFetched: [...fetched] });
    await ctx.close();
  }
  writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(`PASS: ${stage} equipped map/combat inspection, 390px and 320px; ${items.length} armors, 4 weapon classes.`);
} finally {
  await browser.close();
  server.stop(true);
}
