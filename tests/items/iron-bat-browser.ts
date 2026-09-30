// Item-owned WebGL evidence: real game, carried and combat poses, including the whip's uncoiled grip.
// CHROMIUM_PATH=/usr/bin/chromium bun tests/items/iron-bat-browser.ts [before]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';

const ids = ['ironsword', 'ironhammer', 'batwhip', 'batwand'];
const before = process.argv.includes('before');
const out = 'docs/iron-bat-weapons';
mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors: string[] = [];
const probe = await Bun.build({ entrypoints:['tests/items/iron-bat-rig-probe.ts'], target:'browser', define:{__DEV__:'true'} });
if(!probe.success) throw Error(probe.logs.join('\n'));
const probeCode=await probe.outputs[0].text();
try {
  for (const width of before ? [320] : [320, 1024]) {
    for (const id of ids) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 768 }, hasTouch: width === 320, isMobile: width === 320 });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'warning' && /model.*Error/.test(m.text()) && !/Failed to fetch/.test(m.text())) errors.push(m.text()); });
    await page.goto(`http://localhost:${server.port}/?preset=poppy-done`);
    await page.waitForFunction(() => (window as any).game?.mode === 'world', { timeout: 60000 });
      await page.evaluate((id) => {
        const g = (window as any).game;
        if (!g.save.owned.includes(id)) g.save.owned.push(id);
        g.save.equip.weapon = id;
        g.zoom=1.7;
        Object.assign(g.save.mastery, Object.fromEntries(['sword','hammer','whip','wand'].map(s => [s,{...g.save.mastery[s],lv:10}])));
      }, id);
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(240);
      await page.keyboard.up('KeyD');
      await page.waitForTimeout(1600);
      const renders = await page.evaluate(() => (window as any).game.modelStats.renders);
      if (!renders) throw Error('No WebGL renders');
      if (width === 320) await page.screenshot({ path: `${out}/${id}-${before?'before':'after'}-equipped.jpg`, type:'jpeg', quality:85 });
      if (!before) {
        await page.evaluate(() => (window as any).game.fight('bunny', 3, 2));
        await page.waitForFunction(() => (window as any).game?.mode === 'battle' && !!(window as any).game.battle, {timeout:20000});
        await page.waitForTimeout(1500);
        await page.evaluate(() => {
          const b = (window as any).game.battle;
          b.p.hp = b.p.maxHp = 9999;
          for (const e of b.enemies) { e.hp=e.maxHp=1e6; e.stun=99; e.x=b.p.x; e.y=b.p.y-60; }
          b.p.face = -Math.PI/2;
        });
        await page.keyboard.press('KeyJ');
        await page.waitForTimeout(id === 'batwhip' ? 200 : 120);
        await page.screenshot({ path: `${out}/${id}-combat-${width}.jpg`, type:'jpeg', quality:85 });
        if ((await page.evaluate(() => (window as any).game.modelStats.renders)) <= renders) throw Error(`${id}: combat failed to render`);
      }
      console.log(`PASS ${id} ${width}px ${before?'before':'equipped/combat'}: WebGL renders=${renders}`);
      if(!before && width===1024) {
        await page.addScriptTag({content:probeCode});
        const evidence=await page.evaluate(id=>(window as any).ironBatRigProbe(id),id);
        await page.locator('#iron-bat-probe').screenshot({path:`${out}/${id}-rig.jpg`,type:'jpeg',quality:90});
        console.log('RIG',JSON.stringify(evidence));
      }
    await context.close();
    }
  }
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); server.stop(true); }
