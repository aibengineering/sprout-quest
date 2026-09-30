// In-process DOM coverage complements the real mobile Chromium scenarios. No network, GPU or timers are needed.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { fluffyCraftMarkup, playFluffyCraft, FLUFFY_BINDINGS, FLUFFY_DURATION } from '../src/crafting';
import { GEAR } from '../src/data';
import { UI, type UIHooks } from '../src/ui';

const recipe = GEAR.fluffvest.recipe!;
const before = { fluff: 24, goo: 8 };
let win: Window;
let root: HTMLElement;
let now = 0, id = 0, cancelled = 0, reduced = false, hidden = false;
let frames: Map<number, FrameRequestCallback>;
let media: EventTarget;
let restore: Map<string, PropertyDescriptor | undefined>;
const controllers: ReturnType<typeof playFluffyCraft>[] = [];
const drain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function frame(time: number) {
  now = time;
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((f) => f(now));
}

beforeEach(() => {
  win = new Window({ url: 'https://craft-test.invalid', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  reduced = hidden = false;
  now = id = cancelled = 0;
  frames = new Map();
  media = new win.EventTarget() as unknown as EventTarget;
  Object.defineProperty(media, 'matches', { get: () => reduced });
  Object.defineProperty(win, 'matchMedia', { value: () => media });
  Object.defineProperty(win.document, 'hidden', { get: () => hidden });
  Object.defineProperty(win.HTMLImageElement.prototype, 'decode', { configurable: true, value: () => Promise.resolve() });
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
  root.innerHTML = fluffyCraftMarkup(recipe, before);
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
  const controller = playFluffyCraft(root, recipe, before, (s) => sounds.push(s), () => ready++);
  controllers.push(controller);
  return { controller, sounds, ready: () => ready };
}

describe('Fluffy Vest presentation lifecycle', () => {
  test('staggered flights spend the displayed quantities and every goo landing contributes a separate seam', async () => {
    const s = start();
    await drain();
    frame(1);
    frame(221);
    expect(root.querySelector('[data-count="fluff"]')!.textContent).toBe('21');
    expect(root.querySelectorAll('.craft-flight')).toHaveLength(1);
    expect(s.sounds).toEqual(['craftPull']);
    frame(741);
    expect((root.querySelector('[data-part="left-panel"]') as HTMLElement).style.opacity).toBe('1');
    for (let i = 0; i < 4; i++) {
      frame(1911 + i * 140);
      expect((root.querySelector(`[data-binding="${i}"]`) as HTMLElement).style.opacity).toBe('1');
      expect(root.querySelector(`[data-binding="${i}"]`)!.getAttribute('style')).toContain(FLUFFY_BINDINGS[i].clip);
      if (i < 3) expect((root.querySelector(`[data-binding="${i + 1}"]`) as HTMLElement).style.opacity).not.toBe('1');
    }
    frame(FLUFFY_DURATION + 1);
    expect(s.ready()).toBe(1);
    expect(s.sounds.filter((x) => x === 'treasure')).toHaveLength(1);
    expect(root.querySelector('[data-count="fluff"]')!.textContent).toBe('12');
    expect(root.querySelector('[data-count="goo"]')!.textContent).toBe('4');
    expect(root.querySelectorAll('.craft-flight')).toHaveLength(0);
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

  test('missing component art falls back to a finished icon without blocking ownership or choices', async () => {
    Object.defineProperty(win.HTMLImageElement.prototype, 'decode', { configurable: true, value: () => Promise.reject(new Error('unavailable')) });
    const s = start();
    await drain();
    expect(s.ready()).toBe(1);
    expect((root.querySelector('.craft-garment') as HTMLElement).hidden).toBe(true);
    expect((root.querySelector('.craft-fallback') as HTMLElement).hidden).toBe(false);
    expect(frames.size).toBe(0);
  });

  test('disposing before art decodes prevents a late reveal from touching the next modal', async () => {
    let decode!: () => void;
    const promise = new Promise<void>((resolve) => decode = resolve);
    Object.defineProperty(win.HTMLImageElement.prototype, 'decode', { configurable: true, value: () => promise });
    const s = start();
    s.controller.dispose();
    root.innerHTML = '<p>Next screen</p>';
    decode();
    await drain();
    expect(s.ready()).toBe(0);
    expect(s.sounds).toHaveLength(0);
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
