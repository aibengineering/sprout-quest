// Item-local WebGL QA. Run with CHROMIUM_PATH=/usr/bin/chromium bun tests/e2e/lateMailModels.ts.
// Includes real map carries, walking, all four weapon classes and combat input.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { startServer } from '../../server';

const out = new URL('./out/late-mail/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const server = startServer(0);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors: string[] = [];
try {
  for (const armor of ['magmamail', 'dragonmail']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const loaded = new Set<string>();
    page.on('response', (response) => {
      if (response.status() === 200 && response.url().endsWith('.glb')) loaded.add(response.url().split('/').pop()!);
    });
    page.on('pageerror', (error) => errors.push(`${armor}: ${error}`));
    page.on('console', (message) => {
      if (message.type() === 'error' || (message.type() === 'warning' && /model/.test(message.text()) && !/Failed to fetch/.test(message.text()))) {
        errors.push(`${armor}: ${message.text()}`);
      }
    });
    await page.goto(`http://localhost:${server.port}/?preset=sandbox`);
    await page.waitForFunction(() => (window as any).game?.mode === 'world', { timeout: 60_000 });
    await page.evaluate((armor) => {
      const g = (window as any).game;
      g.save.equip.armor = armor;
      g.save.equip.weapon = 'emberblade';
      g.over.teleport(47, 13);
      g.zoom = 3;
    }, armor);
    await page.waitForTimeout(3500);
    if (!loaded.has(`armor_${armor}.glb`)) throw new Error(`${armor} model was not loaded`);
    for (const [name, face] of [['front', Math.PI / 2], ['side', 0], ['back', -Math.PI / 2]] as const) {
      await page.evaluate((face) => { (window as any).game.over.face = face; }, face);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}${armor}-${name}.png` });
    }
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(400);
    if (!await page.evaluate(() => (window as any).game.over.moving)) throw new Error(`${armor} did not walk`);
    await page.screenshot({ path: `${out}${armor}-walk.png` });
    await page.keyboard.up('ArrowDown');
    for (const weapon of ['emberblade', 'wyrmbreaker', 'dragontail', 'wyrmfire']) {
      await page.evaluate((weapon) => { (window as any).game.save.equip.weapon = weapon; }, weapon);
      await page.waitForTimeout(1200);
      await page.evaluate(() => { (window as any).game.over.face = 0; });
      await page.screenshot({ path: `${out}${armor}-${weapon}-carry.png` });
      await page.evaluate(() => (window as any).game.fight('bunny', 3, 1));
      await page.waitForFunction(() => (window as any).game.mode === 'battle' && !!(window as any).game.battle, { timeout: 20_000 });
      await page.waitForFunction(() => (window as any).game.battle.intro <= 0, { timeout: 60_000 });
      await page.evaluate(() => {
        const b = (window as any).game.battle;
        for (const enemy of b.enemies) {
          enemy.hp = enemy.maxHp = 1e6;
          enemy.stun = 99;
          enemy.x = b.p.x;
          enemy.y = b.p.y - 60;
        }
        b.p.face = -Math.PI / 2;
      });
      await page.keyboard.down('KeyJ');
      await page.waitForFunction(() => (window as any).game.battle.log.swings > 0, { timeout: 20_000 });
      await page.screenshot({ path: `${out}${armor}-${weapon}-attack.png` });
      await page.keyboard.up('KeyJ');
      if (!loaded.has(`wpn_${weapon}.glb`)) throw new Error(`${armor}/${weapon} attachment did not load`);
      await page.evaluate(() => {
        const b = (window as any).game.battle;
        for (const enemy of b.enemies) if (!enemy.dead) { enemy.hp = 0; b.kill(enemy); }
      });
      await page.waitForFunction(() => (window as any).game.mode === 'world' && !(window as any).game.battle, { timeout: 20_000 });
      console.log(`✓ ${armor}: ${weapon} carry and attack`);
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await page.screenshot({ path: `${out}${armor}-small-phone.png` });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${armor} phone layout overflows`);
    await page.close();
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Late armor WebGL QA passed; images in tests/e2e/out/late-mail/');
} finally {
  await browser.close();
  server.stop(true);
}
