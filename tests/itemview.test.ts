// The live 3D item view's lifecycle (src/itemview.ts) in an in-process DOM: the 3D drawing is stood in for by a fake
// that counts frames, so this checks when a view starts, stops and hands over, and that without WebGL the icon stays.
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { Window } from 'happy-dom';
import * as models from '../src/models';

let webgl = true, ready = true, drawn: string[] = [];
mock.module('../src/models', () => ({
  ...models,
  webglAvailable: () => webgl,
  itemModelReady: () => ready,
  loadItemModel: async () => true,
  itemView: (_c: HTMLCanvasElement, item: models.ItemModel) => (webgl ? { frame: (yaw: number) => { drawn.push(`${item.url}@${yaw.toFixed(2)}`); } } : null),
}));
const { MODEL_ICONS, itemModel, liveView, mountItemView, stopItemView, view3d } = await import('../src/itemview');
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
  webgl = ready = true;
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
  test('crafted things use their crafting scene, finished; meals by their icon id; the Twig Sword its hand-held model', () => {
    expect(itemModel('stonesword')).toEqual({ url: CRAFT_PRESENTATIONS.stonesword.model, gone: [], elevation: 0 });
    expect(itemModel('meal_stew')!.url).toBe(CRAFT_PRESENTATIONS.stew.model);
    expect(itemModel('meal_stew')!.gone).toEqual(CRAFT_PRESENTATIONS.stew.layers.filter((l) => l.finished === false).map((l) => l.id));
    expect(itemModel('twig')).toMatchObject({ url: 'assets/models/wpn_twig.glb', tilt: true });
    // No model: the picture stays an icon.
    for (const none of ['pie', 'echoanklet', 'tunic', 'meal_nope', 'goo']) expect(itemModel(none)).toBeNull();
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
});
