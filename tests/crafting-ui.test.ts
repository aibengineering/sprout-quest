// In-process DOM coverage complements the real mobile Chromium scenarios (tests/e2e/crafting.ts). No network, GPU or
// timers are needed: the 3D scene is stood in for by a fake that records what it was asked to show.
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Window } from 'happy-dom';
import * as models from '../src/models';
import type { CraftView } from '../src/models';

/** What the scene was asked to do, and whether it can be drawn at all (WebGL). */
let shows: [string, string | undefined][] = [], revealed: string[] | null = null, webgl = true, initial: string[] = [];
mock.module('../src/models', () => ({
  ...models,
  craftView: (_canvas: HTMLCanvasElement, _url: string, shown: string[]): CraftView | null => {
    if (!webgl) return null;
    initial = shown;
    return {
      at: () => ({ x: 120, y: 90 }),
      show: (layer, contact) => { shows.push([layer, contact]); },
      reveal: (gone) => { revealed = gone; },
      frame: () => {},
    };
  },
}));
const { craftMarkup, playCraft } = await import('../src/crafting');
const { default: fluffvest, FLUFFY_DURATION, FLUFFY_PARTS, FLUFFY_SEAMS } = await import('../src/crafting/items/fluffvest');
const { CRAFT_PRESENTATIONS } = await import('../src/crafting/catalog');
const { GEAR, TOOLS, POTION_RECIPES } = await import('../src/data');
const { MEALS } = await import('../src/kitchen');
const { UI } = await import('../src/ui');
import type { CraftPresentation } from '../src/crafting/types';
import type { MatId, Recipe } from '../src/data';
import type { UIHooks } from '../src/ui';

const recipe = GEAR.fluffvest.recipe!;
const before = { fluff: 72, goo: 24 };
let win: Window;
let root: HTMLElement;
let now = 0, id = 0, cancelled = 0, reduced = false, hidden = false;
let frames: Map<number, FrameRequestCallback>;
let media: EventTarget;
let restore: Map<string, PropertyDescriptor | undefined>;
const controllers: ReturnType<typeof playCraft>[] = [];
const drain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
/** Runs frames up to `time`, 16ms apart like a browser (a scene's clock moves on by at most a short step a frame). */
function frame(time: number) {
  do {
    now = time > now ? Math.min(time, now + 16) : time;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((f) => f(now));
  } while (now < time && frames.size);
}
const layers = () => root.querySelector<HTMLCanvasElement>('.craft-model')!.dataset.layers!.split(' ');

beforeEach(() => {
  win = new Window({ url: 'https://craft-test.invalid', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  reduced = hidden = false;
  webgl = true;
  shows = [];
  revealed = null;
  now = id = cancelled = 0;
  frames = new Map();
  media = new win.EventTarget() as unknown as EventTarget;
  Object.defineProperty(media, 'matches', { get: () => reduced });
  Object.defineProperty(win, 'matchMedia', { value: () => media });
  Object.defineProperty(win.document, 'hidden', { get: () => hidden });
  Object.defineProperty(win.HTMLElement.prototype, 'animate', { configurable: true, value: () => ({ cancel: () => cancelled++, onfinish: null }) });
  const globals: Record<string, unknown> = {
    window: win, document: win.document, HTMLElement: win.HTMLElement, HTMLButtonElement: win.HTMLButtonElement,
    requestAnimationFrame: (f: FrameRequestCallback) => { frames.set(++id, f); return id; },
    cancelAnimationFrame: (n: number) => frames.delete(n),
  };
  restore = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  win.document.body.innerHTML = '<div id="modal"><div class="sheet"></div></div>';
  root = win.document.querySelector('.sheet') as unknown as HTMLElement;
  root.innerHTML = craftMarkup({ ...GEAR.fluffvest, recipe }, fluffvest, before);
});

afterEach(() => {
  controllers.splice(0).forEach((c) => c.dispose());
  win.happyDOM.abort();
  for (const [key, descriptor] of restore) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
});

function start() {
  let ready = 0;
  const sounds: string[] = [];
  const controller = playCraft(root, fluffvest, recipe, before, (s) => sounds.push(s), () => ready++);
  controllers.push(controller);
  return { controller, sounds, ready: () => ready };
}

describe('Fluffy Vest presentation lifecycle', () => {
  test('staggered flights spend the displayed quantities and every goo landing shows its own seam', async () => {
    const s = start();
    await drain();
    expect(initial).toEqual([]);
    frame(1);
    frame(221);
    expect(root.querySelector('[data-count="fluff"]')!.textContent).toBe('64');
    // One contact's flight: the lead piece with the count, and a short stream of pieces behind it.
    expect(root.querySelectorAll('.craft-flight:not(.trail)')).toHaveLength(1);
    expect(root.querySelectorAll('.craft-flight.trail').length).toBeGreaterThan(0);
    // No tumbling pieces have been made for the material yet (src/itemview.ts loadMaterialArt): they fly as its icon.
    expect(root.querySelectorAll('.craft-flight img').length).toBe(root.querySelectorAll('.craft-flight').length);
    expect(root.querySelector('.craft-flight .piece')).toBeNull();
    expect(s.sounds).toEqual(['craftPull']);
    frame(741);
    expect(shows).toEqual([['left-panel', 'soft']]);
    expect(layers()).toEqual(['left-panel']);
    for (let i = 0; i < 4; i++) {
      frame(1911 + i * 140);
      expect(shows.at(-1)).toEqual([FLUFFY_SEAMS[i], 'bind']);
    }
    expect(shows.map(([layer]) => layer)).toEqual([...FLUFFY_PARTS, ...FLUFFY_SEAMS]);
    frame(FLUFFY_DURATION + 1);
    expect(s.ready()).toBe(1);
    expect(revealed).toEqual([]);
    expect(s.sounds.filter((x) => x === 'treasure')).toHaveLength(1);
    expect(root.querySelector('[data-count="fluff"]')!.textContent).toBe('36');
    expect(root.querySelector('[data-count="goo"]')!.textContent).toBe('12');
    expect(root.querySelectorAll('.craft-flight')).toHaveLength(0);
    // The finished piece sways until the popup closes.
    expect(frames.size).toBe(1);
    controllers[0].dispose();
    expect(frames.size).toBe(0);
  });

  test('skip is idempotent, cancels pending effects and leaves the finished choice available', async () => {
    const s = start();
    await drain();
    frame(1); frame(800);
    s.controller.finish();
    const n = s.sounds.length;
    s.controller.finish();
    frame(9000);
    expect(s.ready()).toBe(1);
    expect(s.sounds).toHaveLength(n);
    expect(cancelled).toBeGreaterThan(0);
    expect(revealed).toEqual([]);
    expect(root.classList.contains('craft-ready')).toBe(true);
    expect((root.querySelector('[data-craft-skip]') as HTMLButtonElement).hidden).toBe(true);
  });

  test('reduced motion never launches ingredients or schedules an animation frame', async () => {
    reduced = true;
    const s = start();
    await drain();
    expect(s.ready()).toBe(1);
    expect(frames.size).toBe(0);
    expect(s.sounds).toEqual(['treasure']);
    expect(root.querySelectorAll('.craft-flight')).toHaveLength(0);
    expect(revealed).toEqual([]);
  });

  test('backgrounding finishes quietly and resuming cannot replay sounds', async () => {
    const s = start();
    await drain();
    frame(1); frame(230);
    const n = s.sounds.length;
    hidden = true;
    win.document.dispatchEvent(new win.Event('visibilitychange'));
    hidden = false;
    frame(4000);
    expect(s.ready()).toBe(1);
    expect(s.sounds).toHaveLength(n);
    expect(root.classList.contains('craft-ready')).toBe(true);
  });

  test('without WebGL the finished icon shows at once, without blocking ownership or choices', async () => {
    webgl = false;
    const s = start();
    await drain();
    expect(s.ready()).toBe(1);
    expect((root.querySelector('.craft-garment') as HTMLElement).hidden).toBe(true);
    expect((root.querySelector('.craft-fallback') as HTMLElement).hidden).toBe(false);
    expect(frames.size).toBe(0);
  });

  test('disposing stops everything: no late reveal touches the next modal', async () => {
    const s = start();
    await drain();
    frame(1); frame(300);
    s.controller.dispose();
    root.innerHTML = '<p>Next screen</p>';
    frame(9000);
    expect(s.ready()).toBe(0);
    expect(revealed).toBeNull();
    expect(frames.size).toBe(0);
    expect(root.textContent).toBe('Next screen');
  });

  test('a detached modal cancels its animation rather than leaving a background frame loop', async () => {
    const s = start();
    await drain();
    root.remove();
    frame(1);
    expect(frames.size).toBe(0);
    expect(s.ready()).toBe(0);
  });

  test('keyboard skip does not also equip; Enter honors the focused Keep button', async () => {
    const ui = new UI({ sound: () => {} } as unknown as UIHooks);
    const choice = ui.newGear(GEAR.fluffvest, GEAR.tunic, before);
    win.dispatchEvent(new win.KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    expect(root.classList.contains('craft-ready')).toBe(true);
    const keep = root.querySelector<HTMLButtonElement>('[data-dialog="later"]')!;
    keep.focus();
    win.dispatchEvent(new win.KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
    expect(await choice).toBe('later');
  });
});

describe('shared crafting player', () => {
  const recipe: Recipe = { iron: 24, copper: 18, stone: 18, pine: 9 };
  const materials = Object.keys(recipe) as MatId[];
  const contacts = ['solid', 'energy', 'bind', 'soft'] as const;
  const presentation: CraftPresentation = {
    ...fluffvest, id: 'ironplate',
    roles: { iron: 'Plates', copper: 'Rivets', stone: 'Bracing', pine: 'Inner frame' },
    layers: [
      ...materials.map((id) => ({ id })),
      { id: 'bench-support' },
      { id: 'fuel', initial: true, finished: false },
      { id: 'steam', showAt: 1500 },
    ],
    targets: materials.map((material, i) => ({ material, part: material, at: 220 + i * 400, duration: 300, contact: contacts[i] })),
    phases: [{ at: 0, stage: 'assemble', text: 'Assembling…' }, { at: 2450, stage: 'reveal', text: 'Made by you.' }],
  };

  test('four recipe materials land independently; supports, steam and fuel follow their stages', async () => {
    root.innerHTML = craftMarkup({ ...GEAR.ironplate, recipe }, presentation, { iron: 48, copper: 36, stone: 36, pine: 18 });
    let ready = 0;
    const sounds: string[] = [];
    const controller = playCraft(root, presentation, recipe, { iron: 48, copper: 36, stone: 36, pine: 18 }, (s) => sounds.push(s), () => ready++);
    controllers.push(controller);
    expect(initial.sort()).toEqual(['bench-support', 'fuel']);
    await drain();
    frame(0); frame(1520);
    expect(layers()).toContain('steam');
    expect(shows).toContainEqual(['steam', undefined]);
    frame(2000);
    for (const id of materials) {
      expect(root.querySelector(`[data-count="${id}"]`)!.textContent).toBe(String(recipe[id]));
      expect(layers()).toContain(id);
    }
    expect(shows.filter(([, contact]) => contact).map(([, contact]) => contact)).toEqual([...contacts]);
    expect(sounds).toContain('craftStitch');
    expect(sounds).toContain('craftGoo');
    expect(sounds).toContain('craftFluff');
    expect(sounds).toContain('ding');
    frame(3200);
    expect(ready).toBe(1);
    expect(revealed).toEqual(['fuel']);
    expect(layers()).not.toContain('fuel');
    expect(sounds.filter((s) => s === 'treasure')).toHaveLength(1);
  });

  test('tools, potions and meals use the same explicit acknowledgement after keyboard skip', async () => {
    const ui = new UI({ sound: () => {} } as unknown as UIHooks);
    for (const item of [TOOLS[0], POTION_RECIPES[0], { ...MEALS.tea, iconId: 'meal_tea' }]) {
      const catalog = CRAFT_PRESENTATIONS as Record<string, CraftPresentation>;
      const original = catalog[item.id];
      catalog[item.id] = {
        ...presentation, id: item.id,
        roles: Object.fromEntries(Object.keys(item.recipe).map((id) => [id, 'Test ingredient'])),
        targets: (Object.keys(item.recipe) as MatId[]).map((material, i) => ({ material, part: materials[i], at: 220, duration: 300, contact: 'solid' })),
      };
      try {
        const before = { ...item.recipe };
        const choice = ui.madeItem(item, before, 'Ready to use.', '✨');
        win.dispatchEvent(new win.KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
        expect(root.classList.contains('craft-ready')).toBe(true);
        expect((root.querySelector('.btns') as HTMLElement).hidden).toBe(false);
        let settled = false;
        choice.then(() => settled = true);
        await drain();
        expect(settled).toBe(false);
        win.dispatchEvent(new win.KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
        expect(await choice).toBe('ok');
        expect(before).toEqual(item.recipe);
      } finally {
        if (original) catalog[item.id] = original;
        else delete catalog[item.id];
      }
    }
  });
});
