// Shared helpers for throwaway visual QA scripts (copied into tests/e2e/ to run, then deleted).
import { chromium, type Browser, type Page } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startServer } from '../../server';
import { GEAR, TOOLS, POTION_RECIPES, PROJECTS, type ProjectId } from '../../src/data';
import { MEALS } from '../../src/kitchen';
import { CRAFT_PRESENTATIONS } from '../../src/crafting/catalog';
import { BUILD_PRESENTATIONS } from '../../src/crafting/building-catalog';
import { craftFlights } from '../../src/crafting';

export const OUT = '/tmp/claude-1000/-home-ben-me-code-2609-game-test/a5682d6f-153a-45aa-aead-926fddecb583/scratchpad/visual/';
mkdirSync(OUT, { recursive: true });
export { CRAFT_PRESENTATIONS, BUILD_PRESENTATIONS, MEALS, GEAR, PROJECTS };
export const items = [...Object.values(GEAR).filter(g => g.recipe), ...TOOLS, ...POTION_RECIPES, ...Object.values(MEALS)];
export const item = (id: string) => items.find(i => i.id === id)!;

export const server = startServer(0);
export const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

export async function boot(b: Browser, width: number, height: number, errors: string[], dsf = 2) {
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${width}: ${e}`));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${width} console.${m.type()}: ${m.text()}`); });
  await page.goto(`http://localhost:${server.port}/?preset=sandbox`);
  await page.waitForFunction(() => (window as any).game?.mode === 'world', undefined, { timeout: 90000 });
  await page.waitForTimeout(500);
  await installClock(page);
  return page;
}

/** Which recipe/cost a scene uses, and the parts its lead flights land on, in launch order. */
export function sceneInfo(id: string) {
  const building = id in BUILD_PRESENTATIONS && !(id in CRAFT_PRESENTATIONS);
  const pres = building ? BUILD_PRESENTATIONS[id] : CRAFT_PRESENTATIONS[id];
  let recipe: Record<string, number>;
  let project: string | undefined, level: number | undefined;
  if (building) {
    const m = /^([a-z]+)(\d)$/.exec(id)!;
    project = m[1]; level = Number(m[2]);
    recipe = PROJECTS[project as ProjectId].levels[level - 1].cost as any;
  } else recipe = item(id).recipe as any;
  const flights = craftFlights(pres, recipe).map((f, i) => ({ ...f, i })).sort((a, b) => a.at - b.at || a.i - b.i);
  return { building, pres, recipe, project, level, flights };
}

/** Opens a scene's popup exactly as the game does (crafting e2e's way for gear; ui.built for buildings). */
export async function open(page: Page, id: string, virtual = false) {
  const info = sceneInfo(id);
  if (info.building) {
    await page.evaluate(({ project, level, before, virtual }) => {
      if (virtual) (window as any).__vc.enable();
      (window as any).__t0 = performance.now();
      void (window as any).game.ui.built(project, level, before, 'Built.');
    }, { project: info.project, level: info.level, before: Object.fromEntries(Object.keys(info.recipe).map(m => [m, 100])), virtual });
  } else {
    await page.evaluate(({ id, virtual, meal }) => {
      const g = (window as any).game, s = g.save;
      g.ui.closeMenu(true);
      s.owned = s.owned.filter((x: string) => x !== id);
      s.equip.weapon = 'twig'; s.equip.armor = 'tunic'; s.equip.charm = null;
      if (/^(axe|pick)\d$/.test(id)) s.tools.wood = s.tools.mine = 0; s.potions = 0;
      for (const k in s.mats) s.mats[k] = 100;
      for (const k in s.mastery) s.mastery[k].lv = 10;
      for (const k in s.skills) s.skills[k].lv = 10;
      s.lv = 20; s.build.forge = 5; s.stories.poppy = 6; s.stories.drums = 4;
      for (const flag of ['oldtools', 'bram:pie', 'bram:stew', 'pip:candy', 'garden:berries']) if (!s.flags.includes(flag)) s.flags.push(flag);
      if (meal) {
        // As Granny's kitchen does once she has cooked it (grannyCooks in stories/granny.ts).
        if (virtual) (window as any).__vc.enable();
        (window as any).__t0 = performance.now();
        void g.ui.madeItem({ ...meal, iconId: `meal_${id}` }, { ...s.mats }, meal.desc, meal.icon, 'Granny made', 'Enjoy!');
      } else {
        g.ui.openMenu({ atForge: true, inVillage: true }, 'forge');
        const method = /^(axe|pick)\d$/.test(id) ? 'craftTool' : ['jellypot', 'shroombrew', 'embertonic', 'herbtonic'].includes(id) ? 'craftPotion' : 'craftGear';
        if (virtual) (window as any).__vc.enable();
        (window as any).__t0 = performance.now();
        void g.ui.hooks[method](id);
      }
    }, { id, virtual, meal: (MEALS as any)[id] ?? null });
  }
  await page.waitForSelector('.sheet.crafting');
  return info;
}

export async function close(page: Page) {
  await page.waitForSelector('.craft-ready', { timeout: 30000 });
  const btn = page.locator('#modal:not([hidden]) .sheet.crafting .btns [data-dialog]').first();
  await btn.click();
  await page.waitForSelector('#modal:not([hidden]) .sheet.crafting', { state: 'detached' });
  for (let i = 0; i < 4; i++) {
    const more = await page.$('#modal:not([hidden]) .sheet:not(.menu) [data-dialog]');
    if (!more) break;
    await more.click(); await page.waitForTimeout(100);
  }
  await page.evaluate(() => (window as any).game.ui.closeMenu(true));
}

/**
 * A virtual clock: while on, requestAnimationFrame callbacks and performance.now() only advance when stepped, and every
 * Web/CSS animation is paused and seeked to match, so frame strips are deterministic however slow software GL is.
 */
export async function installClock(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    if (w.__vc) return;
    const realNow = performance.now.bind(performance), realRaf = window.requestAnimationFrame.bind(window), realCancel = window.cancelAnimationFrame.bind(window);
    const vc = w.__vc = { on: false, t: 0, q: [] as [number, FrameRequestCallback][], id: 1e9, seen: new Map<Animation, number>() } as any;
    performance.now = () => vc.on ? vc.t : realNow();
    window.requestAnimationFrame = (cb) => { if (!vc.on) return realRaf(cb); const i = ++vc.id; vc.q.push([i, cb]); return i; };
    window.cancelAnimationFrame = (i) => { if (i > 1e9) vc.q = vc.q.filter((x: any) => x[0] !== i); else realCancel(i); };
    const sync = () => {
      for (const a of document.getAnimations()) {
        if (!vc.seen.has(a)) { vc.seen.set(a, vc.t - (Number(a.currentTime) || 0)); }
        if (a.playState !== 'paused') a.pause();
        a.currentTime = vc.t - vc.seen.get(a)!;
      }
    };
    vc.enable = () => { vc.on = true; vc.t = realNow(); vc.seen.clear(); };
    vc.disable = () => {
      vc.on = false;
      const q = vc.q; vc.q = [];
      for (const [, cb] of q) realRaf(cb);
      for (const a of vc.seen.keys()) if (a.playState === 'paused') a.play();
      vc.seen.clear();
    };
    vc.step = (dt: number) => {
      vc.t += dt;
      const q = vc.q; vc.q = [];
      for (const [, cb] of q) cb(vc.t);
      sync();
    };
    vc.sync = sync;
  });
}

/** Tiles PNG buffers into one image in the browser (no PIL here). */
export async function tile(page: Page, pngs: { buf: Buffer; label: string }[], cols: number, scale: number, path: string) {
  const urls = pngs.map(p => ({ src: 'data:image/png;base64,' + p.buf.toString('base64'), label: p.label }));
  const b64 = await page.evaluate(async ({ urls, cols, scale }) => {
    const imgs = await Promise.all(urls.map(u => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u.src; })));
    const w = Math.max(...imgs.map(i => i.width)) * scale, h = Math.max(...imgs.map(i => i.height)) * scale, lh = 16;
    const rows = Math.ceil(imgs.length / cols);
    const c = document.createElement('canvas');
    c.width = cols * (w + 4); c.height = rows * (h + lh + 4);
    const x = c.getContext('2d')!;
    x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, k) => {
      const cx = (k % cols) * (w + 4), cy = Math.floor(k / cols) * (h + lh + 4);
      x.fillStyle = '#fff'; x.font = '12px monospace'; x.fillText(urls[k].label, cx + 2, cy + 12);
      x.drawImage(im, cx, cy + lh, im.width * scale, im.height * scale);
    });
    return c.toDataURL('image/png').split(',')[1];
  }, { urls, cols, scale });
  writeFileSync(path, Buffer.from(b64, 'base64'));
}
