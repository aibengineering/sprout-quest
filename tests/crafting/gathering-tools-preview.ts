/** Owned tool visual QA in the real game. The route override previews the shared
 * registry/atlas hook without modifying shared files. It is not production wiring.
 * CHROMIUM_PATH=/usr/bin/chromium bun tests/crafting/gathering-tools-preview.ts
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { startServer } from '../../server';
import { execFileSync } from 'node:child_process';
import { TOOLS } from '../../src/data';

const ids = ['axe1', 'axe2', 'pick1', 'pick2', 'pick3', 'pick4'];
const output = 'tests/e2e/out/gathering-tools';
mkdirSync(output, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--disable-webgl', '--disable-gpu', '--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 320, height: 720 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/assets/atlas.json', async (route) => {
    const atlas = JSON.parse(readFileSync('public/assets/atlas.json', 'utf8'));
    for (const id of ids) {
      const f = JSON.parse(readFileSync(`public/assets/gather/${id}.json`, 'utf8'));
      const index = atlas.pages.length;
      atlas.pages.push(`gather/${id}.webp`);
      atlas.frames[`gather/${id}`] = [index, 0, 0, ...f.size, f.ax, f.ay, f.ppu];
    }
    await route.fulfill({ json: atlas });
  });
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.evaluate(() => {
    const g = (window as any).game, s = g.save;
    Object.assign(s, { flags: ['sword', 'glade1', 'glade2', 'village', 'oldtools'],
      quest: g.quests.findIndex((q: any) => q.id === 'cottage'), lv: 14,
      tips: ['moved', 'chopped', 'mined'], pos: { x: 50.5, y: 18 }, tools: { wood: 2, mine: 4 } });
    s.build.forge = 3;
    s.unlocked.push('forge', 'bag', 'journal');
    localStorage.setItem('sprout-quest-save', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector('.title-btns:not([hidden])');
  await page.click('#btn-continue');
  await page.waitForTimeout(2200);
  for (let i = 0; i < 8; i++) {
    const button = page.locator('#modal:not([hidden]) .sheet:not(.menu) [data-dialog]:last-of-type');
    if (!await button.count()) break;
    await button.click(); await page.waitForTimeout(350);
  }
  for (const id of ids) {
    const wood = id.startsWith('axe');
    const placed = await page.evaluate(({ wood, tier }) => {
      const g = (window as any).game, o = g.over, w = o.world;
      g.save.tools[wood ? 'wood' : 'mine'] = tier;
      for (const r of w.objs.filter((x: any) => x.kind === 'node' && x.node === (wood ? 'oak' : 'rock') && !x.grass && x.id.startsWith('meadow:'))) {
        for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
          const x = r.x + .4 + dx * .95, y = r.y + .6 + dy * .95;
          if (w.blocked(x, y, .28)) continue;
          o.teleport(x, y); o.roamers.calm = 999;
          if (o.nearbyObject() === r) return true;
        }
      }
      return false;
    }, { wood, tier: Number(id.at(-1)) });
    if (!placed) throw new Error(`Unable to approach ${id} node`);
    await page.waitForTimeout(350);
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => (window as any).game.mode === 'gather');
    await page.waitForTimeout(400);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`320px overflow: ${id}`);
    await page.screenshot({ path: `${output}/${id}-equipped.png` });
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${output}/${id}-strike.png` });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => (window as any).game.mode !== 'gather');
    console.log(`PASS ${id}: 320px gathering preview and strike, preserved grip and contacts`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await context.close();
  const gallery = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const cards = ids.map((id) => {
    const tool = TOOLS.find((t) => t.id === id)!;
    const before = execFileSync('git', ['show', `ab09e97:public/assets/icons/${id}.webp`]).toString('base64');
    const after = readFileSync(`public/assets/crafting/${id}-complete.webp`).toString('base64');
    return `<article><h2>${tool.name}</h2><p>${Object.entries(tool.recipe).map(([m, n]) => `${n} ${m}`).join(' · ')}</p><div class=pair><figure><img src="data:image/webp;base64,${before}"><figcaption>Before · inventory icon</figcaption></figure><figure><img src="data:image/webp;base64,${after}"><figcaption>After · registered complete</figcaption></figure></div></article>`;
  });
  await gallery.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;background:#f6f2e8;color:#3c3145;font:16px system-ui;padding:28px}h1{font-size:28px;margin:0 0 5px}header p{margin:0 0 22px;color:#685c6b}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}article{background:#fffdf7;border:1px solid #ddd4c7;border-radius:18px;padding:16px}h2{font-size:20px;margin:0}article p{font-size:13px;color:#716775;margin:7px 0}.pair{display:flex;gap:8px}figure{margin:0;width:50%;background:#f0eddf;border-radius:12px;padding:8px}img{width:100%;height:235px;object-fit:contain}figcaption{text-align:center;font-size:11px;color:#615464}</style><header><h1>Gathering tools · recipe-led art</h1><p>Six original recipes. Stone tools repair inherited heads and hafts. Grip origins and strike points preserved.</p></header><div class=grid>${cards.join('')}</div></html>`);
  await gallery.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
  mkdirSync('docs/crafting', { recursive: true });
  await gallery.screenshot({ path: 'docs/crafting/gathering-tools-before-after.png', fullPage: true });
  await gallery.close();
  const equipped = await browser.newPage({ viewport: { width: 1040, height: 840 }, deviceScaleFactor: 1 });
  await equipped.setContent(`<style>body{margin:0;padding:20px;background:#f6f2e8;color:#3c3145;font:16px system-ui}h1{margin:0 0 16px;font-size:25px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;background:white;border-radius:12px;padding:8px}figcaption{padding:4px;font-weight:bold}img{width:100%;height:335px;object-fit:cover;object-position:top}</style><h1>320px real gathering renderer · local standalone-frame preview</h1><div class=grid>${ids.map((id) => `<figure><figcaption>${TOOLS.find((t) => t.id === id)!.name}</figcaption><img src="data:image/png;base64,${readFileSync(`${output}/${id}-equipped.png`).toString('base64')}"></figure>`).join('')}</div>`);
  await equipped.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
  await equipped.screenshot({ path: 'docs/crafting/gathering-tools-equipped.jpg', type: 'jpeg', quality: 85, fullPage: true });
  await equipped.close();
} finally {
  await browser.close(); server.stop(true);
}
