// The live 3D item view's lifecycle (src/itemview.ts) in an in-process DOM: the 3D drawing is stood in for by a fake
// that counts frames, so this checks when a view starts, stops and hands over, and that without WebGL the icon stays.
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { Window } from 'happy-dom';
import * as models from '../src/models';

let webgl = true, ready = true, loads = true, drawn: string[] = [];
mock.module('../src/models', () => ({
  ...models,
  webglAvailable: () => webgl,
  itemModelReady: () => ready,
  loadItemModel: async () => loads,
  itemView: (_c: HTMLCanvasElement, item: models.ItemModel) => (webgl ? { frame: (yaw: number, tip = 0) => { drawn.push(`${item.url}@${yaw.toFixed(2)}${tip ? `^${tip.toFixed(2)}` : ''}`); } } : null),
}));
const { MODEL_ICONS, TUMBLE_FRAMES, itemModel, liveView, loadMaterialArt, mountItemView, stopItemView, tumbled, view3d } = await import('../src/itemview');
const { MAT_ORDER } = await import('../src/data');
const { CRAFT_PRESENTATIONS } = await import('../src/crafting/catalog');

let win: Window, sheet: HTMLElement, now = 0, id = 0;
let frames: Map<number, FrameRequestCallback>;
let restore: Map<string, PropertyDescriptor | undefined>;
const drain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function frame(ms: number) {
  now += ms;
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((f) => f(now));
}
const card = (itemId: string) => `<div class="stage">${view3d(itemId, `<img class="icon" src="assets/icons/${itemId}.webp">`)}</div>`;

beforeEach(() => {
  win = new Window({ url: 'https://items-test.invalid', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  webgl = ready = loads = true;
  drawn = [];
  now = id = 0;
  frames = new Map();
  Object.defineProperty(win, 'matchMedia', { value: () => ({ matches: false }) });
  // On screen (happy-dom has no layout).
  Object.defineProperty(win.HTMLElement.prototype, 'getBoundingClientRect', { configurable: true, value: () => ({ top: 10, bottom: 80, width: 70, height: 70 }) });
  const globals: Record<string, unknown> = {
    window: win, document: win.document, innerHeight: 800,
    requestAnimationFrame: (f: FrameRequestCallback) => { frames.set(++id, f); return id; },
    cancelAnimationFrame: (n: number) => frames.delete(n),
  };
  restore = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  win.document.body.innerHTML = '<div id="modal"><div class="sheet"></div></div>';
  sheet = win.document.querySelector('.sheet') as unknown as HTMLElement;
});

afterEach(() => {
  stopItemView();
  win.happyDOM.abort();
  for (const [key, descriptor] of restore) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
});

describe('which model shows an item', () => {
  test('crafted things use their crafting scene, finished; meals by their icon id; materials their own; the Twig Sword its hand-held model', () => {
    expect(itemModel('stonesword')).toEqual({ url: CRAFT_PRESENTATIONS.stonesword.model, gone: [], elevation: 0 });
    expect(itemModel('meal_stew')!.url).toBe(CRAFT_PRESENTATIONS.stew.model);
    expect(itemModel('meal_stew')!.gone).toEqual(CRAFT_PRESENTATIONS.stew.layers.filter((l) => l.finished === false).map((l) => l.id));
    expect(itemModel('goo')).toEqual({ url: 'assets/crafting3d/mat_goo.glb', elevation: (12 * Math.PI) / 180 });
    expect(itemModel('twig')).toMatchObject({ url: 'assets/models/wpn_twig.glb', tilt: true });
    // No model: the picture stays an icon.
    for (const none of ['pie', 'echoanklet', 'tunic', 'meal_nope']) expect(itemModel(none)).toBeNull();
    expect(view3d('pie', '<img>')).toBe('<img>');
  });

  test('every model icon has its model and its icon shipped', () => {
    expect(MODEL_ICONS.length).toBeGreaterThan(50);
    for (const iconId of MODEL_ICONS) {
      expect(existsSync(`public/${itemModel(iconId)!.url}`)).toBe(true);
      expect(existsSync(`public/assets/icons/${iconId}.webp`)).toBe(true);
    }
  });
});

describe('the live view', () => {
  test('opens over the icon, turns each frame, and stops when its card closes', async () => {
    sheet.innerHTML = card('stonesword');
    mountItemView(sheet);
    await drain();
    expect(liveView()).toBe('stonesword');
    expect(sheet.querySelector('.view3d.live canvas.live3d')).not.toBeNull();
    expect(sheet.querySelector('img')).not.toBeNull();
    const first = drawn.length;
    frame(500);
    frame(500);
    expect(drawn.length).toBe(first + 2);
    expect(new Set(drawn).size).toBe(drawn.length);
    // The menu closes (hidden): the next frame ends it, and nothing more is drawn.
    win.document.querySelector('#modal')!.setAttribute('hidden', '');
    frame(16);
    expect(liveView()).toBeNull();
    expect(sheet.querySelector('canvas')).toBeNull();
    const after = drawn.length;
    frame(16);
    expect(drawn.length).toBe(after);
    expect(frames.size).toBe(0);
  });

  test('turns once round as it appears, then rests until dragged', async () => {
    sheet.innerHTML = card('stonesword');
    mountItemView(sheet);
    await drain();
    let n = 0;
    while (frames.size && n < 2000) { frame(16); n++; }
    expect(frames.size).toBe(0);
    expect(n).toBeLessThan(800);
    expect(drawn.at(-1)).toBe(`${CRAFT_PRESENTATIONS.stonesword.model}@${(Math.PI * 2).toFixed(2)}`);
    const resting = drawn.length;
    const canvas = sheet.querySelector('canvas')!;
    canvas.dispatchEvent(new win.PointerEvent('pointerdown', { pointerId: 1, clientX: 10 }) as unknown as Event);
    canvas.dispatchEvent(new win.PointerEvent('pointermove', { pointerId: 1, clientX: 60 }) as unknown as Event);
    frame(16);
    expect(drawn.length).toBe(resting + 1);
    frame(16);
    expect(frames.size).toBe(0);
    expect(drawn.length).toBe(resting + 1);
  });

  test('only one is ever live: a new card replaces the old view', async () => {
    sheet.innerHTML = card('stonesword');
    mountItemView(sheet);
    await drain();
    sheet.innerHTML = card('meal_tea');
    mountItemView(sheet);
    await drain();
    expect(liveView()).toBe('meal_tea');
    expect(win.document.querySelectorAll('canvas.live3d')).toHaveLength(1);
    drawn = [];
    frame(16);
    expect(drawn.every((d) => d.startsWith(CRAFT_PRESENTATIONS.tea.model))).toBe(true);
    expect(frames.size).toBe(1);
    // Mounting the same card again keeps it as it is.
    mountItemView(sheet);
    expect(win.document.querySelectorAll('canvas.live3d')).toHaveLength(1);
    // A card without an item stops it.
    sheet.innerHTML = '<p>Hello</p>';
    mountItemView(sheet);
    expect(liveView()).toBeNull();
  });

  test('a card replaced before its model loads never comes alive', async () => {
    ready = false;
    sheet.innerHTML = card('twig');
    mountItemView(sheet);
    sheet.innerHTML = '';
    stopItemView();
    await drain();
    expect(drawn).toEqual([]);
  });

  test('without WebGL the icon is all there is', async () => {
    webgl = false;
    sheet.innerHTML = card('stonesword');
    mountItemView(sheet);
    await drain();
    expect(liveView()).toBeNull();
    expect(sheet.querySelector('canvas')).toBeNull();
    expect(sheet.querySelector('.view3d.live')).toBeNull();
    expect(frames.size).toBe(0);
  });

  test('a menu drawn again keeps its view as it is: no new canvas, no second turn', async () => {
    sheet.innerHTML = card('stonesword');
    mountItemView(sheet);
    await drain();
    frame(500);
    const canvas = sheet.querySelector('canvas.live3d'), turned = drawn.length;
    // The Bag re-renders (a refresh) with the same item picked.
    sheet.innerHTML = card('stonesword');
    mountItemView(sheet);
    expect(sheet.querySelector('canvas.live3d')).toBe(canvas);
    expect(sheet.querySelector('.view3d.live')).not.toBeNull();
    expect(liveView()).toBe('stonesword');
    // It carries on with the rest of its one turn rather than starting over.
    frame(16);
    expect(drawn.length).toBe(turned + 1);
    expect(drawn.at(-1)).not.toBe(`${CRAFT_PRESENTATIONS.stonesword.model}@0.00`);
    // You, in other armour, is a different view.
    sheet.innerHTML = '<span class="view3d hero" data-view3d="hero" data-armor="tunic" data-weapon="twig"></span>';
    mountItemView(sheet);
    expect(sheet.querySelector('canvas.live3d')).toBeNull();
  });

  test('is live only once it draws; a model that fails to load leaves the icon and no live view', async () => {
    ready = false;
    sheet.innerHTML = card('twig');
    mountItemView(sheet);
    expect(liveView()).toBeNull();
    await drain();
    expect(liveView()).toBe('twig');
    stopItemView();
    loads = false;
    sheet.innerHTML = card('stonesword');
    mountItemView(sheet);
    await drain();
    expect(liveView()).toBeNull();
    expect(sheet.querySelector('canvas')).toBeNull();
    // …and the same card can try again later.
    loads = true;
    mountItemView(sheet);
    await drain();
    expect(liveView()).toBe('stonesword');
  });
});

describe('tumbling materials', () => {
  test('each frame is drawn on its own, in an idle moment, into a strip of TUMBLE_FRAMES; until then, pieces fly as icons', async () => {
    const proto = win.HTMLCanvasElement.prototype as unknown as HTMLCanvasElement;
    const copied: number[] = [];
    Object.defineProperty(proto, 'getContext', { configurable: true, value: () => ({ drawImage: (_img: unknown, x: number) => copied.push(x) }) });
    Object.defineProperty(proto, 'toBlob', { configurable: true, value: (done: (b: Blob) => void) => done(new Blob(['strip'])) });
    let idles = 0;
    Object.defineProperty(win, 'requestIdleCallback', { configurable: true, value: (f: () => void) => { idles++; setTimeout(f, 0); } });
    expect(tumbled('goo')).toBeNull();
    await loadMaterialArt();
    expect(tumbled('goo')).toStartWith('blob:');
    // One idle moment to ready each material's model, then one per frame.
    expect(idles).toBe(MAT_ORDER.length * (1 + TUMBLE_FRAMES));
    const goo = drawn.filter((d) => d.startsWith('assets/crafting3d/mat_goo.glb'));
    expect(goo).toHaveLength(TUMBLE_FRAMES);
    expect(new Set(goo).size).toBe(TUMBLE_FRAMES);
    // Each frame is copied into its own square along the strip.
    expect(copied.slice(0, TUMBLE_FRAMES)).toEqual(Array.from({ length: TUMBLE_FRAMES }, (_, i) => i * copied[1]));
  });

  test('the stylesheet steps through however many frames the strip has (the count is written down once)', async () => {
    const css = await Bun.file('public/style.css').text();
    const piece = css.slice(css.indexOf('.craft-flight .piece'), css.indexOf('.craft-flight.trail'));
    expect(piece).toContain('steps(var(--frames))');
    expect(piece).toContain('calc(var(--frames) * 100%)');
    expect(piece).not.toMatch(/steps\(\d|\d{4,}%|\d\.\d+%/);
    expect(await Bun.file('src/crafting.ts').text()).toContain('--frames:${TUMBLE_FRAMES}');
  });
});
