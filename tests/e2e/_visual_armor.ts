// Hero armours on the map (idle, walking, the first-wear swap) and in battle, with WebGL on.
import { mkdirSync, writeFileSync } from 'node:fs';
import { OUT, launch, boot, tile, server, GEAR } from './_visual_lib';

const armors = Object.values(GEAR).filter((g: any) => g.slot === 'armor').map((g: any) => g.id);
const W = Number(process.env.WIDTH ?? 390), H = W === 320 ? 640 : 844;
mkdirSync(`${OUT}armor/`, { recursive: true });
const errors: string[] = [];
const browser = await launch();
const report: any = { armors, swaps: {} };
try {
  const page = await boot(browser, W, H, errors);
  await page.evaluate(() => (window as any).game.ui.closeMenu(true));
  const heroClip = async (h = 150) => {
    const p = await page.evaluate(() => { const o = (window as any).game.over, v = o.view; return { x: o.x * v.ts - v.left, y: o.y * v.ts - v.top, ts: v.ts }; });
    return { x: Math.max(0, p.x - 70), y: Math.max(0, p.y - h + 30), width: 140, height: h };
  };
  const start = await page.evaluate(() => { const o = (window as any).game.over; return { x: o.x, y: o.y, armor: (window as any).game.save.equip.armor, loaded: Object.keys((window as any).game).length }; });
  report.start = start;
  const shots: { buf: Buffer; label: string }[] = [];
  const swap: { buf: Buffer; label: string }[] = [];
  for (const a of armors) {
    await page.evaluate(({ a, x, y }) => { const g = (window as any).game; g.over.x = x; g.over.y = y; g.save.equip.armor = a; (window as any).__eq = performance.now(); }, { a, x: start.x, y: start.y });
    // Swap: the first frames after equipping something not yet loaded.
    const clip = await heroClip();
    for (const ms of [0, 60, 150, 300, 600]) {
      const now = await page.evaluate(() => performance.now() - (window as any).__eq);
      if (ms > now) await page.waitForTimeout(ms - now);
      const t = await page.evaluate(() => Math.round(performance.now() - (window as any).__eq));
      swap.push({ buf: await page.screenshot({ clip }), label: `${a} +${t}ms` });
    }
    await page.waitForTimeout(800);
    shots.push({ buf: await page.screenshot({ clip: await heroClip() }), label: `${a} idle` });
    for (const [key, n] of [['ArrowRight', 3], ['ArrowUp', 2], ['ArrowDown', 1]] as const) {
      await page.keyboard.down(key);
      for (let i = 0; i < n; i++) { await page.waitForTimeout(140); shots.push({ buf: await page.screenshot({ clip: await heroClip() }), label: `${a} ${key.slice(5)}${i}` }); }
      await page.keyboard.up(key);
    }
    await page.evaluate(({ x, y }) => { const o = (window as any).game.over; o.x = x; o.y = y; }, { x: start.x, y: start.y });
  }
  await tile(page, shots, 7, 0.5, `${OUT}armor/map-walk-${W}.png`);
  await tile(page, swap, 10, 0.5, `${OUT}armor/swap-${W}.png`);
  // Battle: one fight per armour, a frame after the intro.
  const battle: { buf: Buffer; label: string }[] = [];
  for (const a of armors) {
    await page.evaluate((a) => { const g = (window as any).game; g.save.equip.armor = a; g.save.hp = 9999; g.encounter(); }, a);
    await page.waitForFunction(() => { const g = (window as any).game; return g.mode === 'battle' && g.battle && g.battle.intro <= 0; }, undefined, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(300);
    const p = await page.evaluate(() => { const b = (window as any).game.battle; return b && { x: b.p.x, y: b.p.y }; });
    battle.push({ buf: await page.screenshot(), label: `${a} battle p=${p && Math.round(p.x)},${p && Math.round(p.y)}` });
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(250);
    battle.push({ buf: await page.screenshot(), label: `${a} battle walk` });
    await page.keyboard.up('ArrowLeft');
    await page.evaluate(() => { const b = (window as any).game.battle; if (b) for (const e of b.enemies) if (!e.dead) { e.hp = 0; b.kill(e); } });
    for (let i = 0; i < 40; i++) {
      const done = await page.evaluate(() => { const g = (window as any).game; return g.mode === 'world' && !g.battle; });
      if (done) break;
      const btn = await page.$('#modal:not([hidden]) [data-dialog]');
      if (btn) await btn.click().catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  await tile(page, battle, 6, 0.3, `${OUT}armor/battle-${W}.png`);
} finally {
  report.errors = errors.filter(e => !/preload|readback/.test(e)).map(e => e.slice(0, 200));
  writeFileSync(`${OUT}armor-${W}.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  await browser.close(); server.stop(true);
}
