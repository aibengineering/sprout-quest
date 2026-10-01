// One item in live 3D, where a single item is shown on its own: the "You found" card, the Forge's and the Bag's tag
// for what you picked, and you in what you're wearing. It pops in and turns once round, then rests, drawn again only
// while you drag it round. The item is its crafting scene's model (or the model the hero holds, or a material's own),
// drawn by the same shared renderer and toon look as everything else, so there's never more than one WebGL context.
// Only one view is live at a time; it stops when its card closes or is replaced. Without WebGL (or before its model is
// in) the card keeps its icon.
import { drawHero } from './assets';
import { CRAFT_PRESENTATIONS } from './crafting/catalog';
import { GEAR, MATS, MAT_ORDER, POTION_RECIPES, TOOLS, type MatId } from './data';
import { MEALS } from './kitchen';
import { hasModel, itemModelReady, itemView, loadItemModel, loadModel, tumbleStrip, webglAvailable, type ItemModel } from './models';
import { MOVESETS } from './weapons';
import { carriedWeapon } from './weaponPose';

const deg = (d: number) => (d * Math.PI) / 180;

/**
 * How far from above each kind of item is seen, as its Blender icon was: weapons side on, tools and gear a little from
 * above, potions and meals looking down into them.
 */
function elevation(id: string): number {
  const g = GEAR[id];
  if (g) return g.slot === 'weapon' ? 0 : deg(12);
  if (TOOLS.some((t) => t.id === id)) return deg(8);
  return deg(24);
}

/**
 * The model that shows an item (by its icon id: meals are `meal_<id>`), or null if it has none: its crafting scene,
 * finished; a material's own small model; else, for the Twig Sword, the model the hero holds. (The starter Tunic's icon is you in it: the Bag shows
 * you live instead.)
 */
export function itemModel(iconId: string): ItemModel | null {
  const id = iconId.replace(/^meal_/, '');
  if (id !== iconId && !(id in MEALS)) return null;
  const p = CRAFT_PRESENTATIONS[id];
  if (p) return { url: p.model, gone: p.layers.filter((l) => l.finished === false).map((l) => l.id), elevation: elevation(id) };
  if (id in MATS) return { url: `assets/crafting3d/mat_${id}.glb`, elevation: deg(12) };
  const g = GEAR[id];
  if (g?.slot === 'weapon') return { url: `assets/models/wpn_${id}.glb`, elevation: elevation(id), tilt: true };
  return null;
}

/** Every inventory icon drawn from a model (scripts/icons3d.ts renders these): gear, tools, potions, meals and materials. */
export const MODEL_ICONS: string[] = [
  ...Object.keys(GEAR), ...Object.keys(MATS), ...TOOLS.map((t) => t.id), ...POTION_RECIPES.map((p) => p.id), ...Object.keys(MEALS).map((m) => `meal_${m}`),
].filter((id) => itemModel(id));

/** Marks up an item's picture (any `art`, usually its icon) to come alive in 3D when it's mounted. */
export const view3d = (id: string, art: string, cls = '') => itemModel(id) ? `<span class="view3d ${cls}" data-view3d="${id}">${art}</span>` : art;

/** …and you, in your armour with your weapon on your back. */
export const heroView = (armor: string, weapon: string, art: string) => `<span class="view3d hero" data-view3d="hero" data-armor="${armor}" data-weapon="${weapon}">${art}</span>`;

/** Radians a second of the turn it makes as it appears, and per pixel dragged. */
const SPIN = 1.4;
const DRAG = 0.014;

let live: { el: HTMLElement; stop: () => void } | null = null;

/** Is a view live (for tests: window.game.itemView)? */
export const liveView = () => (live ? live.el.dataset.view3d! : null);

/** Stops the live view, if any. */
export function stopItemView() {
  live?.stop();
  live = null;
}

/**
 * Brings the first `[data-view3d]` under `root` to life, replacing whichever view was live. Call after rendering a
 * card. Does nothing without WebGL.
 */
export function mountItemView(root: ParentNode) {
  const found = root.querySelector<HTMLElement>('[data-view3d]');
  if (live?.el === found) return;
  stopItemView();
  if (!found || !webglAvailable()) return;
  const el = found;
  const id = el.dataset.view3d!;
  const item = id === 'hero' ? null : itemModel(id);
  let stopped = false, raf = 0;
  const me = { el, stop: () => { stopped = true; cancelAnimationFrame(raf); el.querySelector('canvas.live3d')?.remove(); el.classList.remove('live'); } };
  live = me;
  const ready = item ? (itemModelReady(item.url) ? Promise.resolve(true) : loadItemModel(item.url))
    : Promise.all([loadModel(`hero_${el.dataset.armor}`), loadModel(`wpn_${el.dataset.weapon}`)]).then(([hero]) => !!hero);
  void ready.then((ok) => { if (ok && !stopped && el.isConnected) start(); });

  function start() {
    const canvas = document.createElement('canvas');
    canvas.className = 'live3d';
    el.append(canvas);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round((el.clientWidth || 64) * dpr);
    canvas.height = Math.round((el.clientHeight || 64) * dpr);
    const draw = item ? itemView(canvas, item) : heroDrawer(canvas, el.dataset.armor!, el.dataset.weapon!);
    if (!draw) return me.stop();
    // It turns once round as it appears (unless motion is reduced), then rests, drawn again only while you drag it.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let yaw = 0, turnLeft = still ? 0 : Math.PI * 2, last = 0, dirty = false, drag: { id: number; x: number } | null = null;
    const wake = () => { if (!raf && !stopped) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    canvas.addEventListener('pointerdown', (e) => {
      drag = { id: e.pointerId, x: e.clientX };
      turnLeft = 0;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (drag?.id !== e.pointerId) return;
      yaw += (e.clientX - drag.x) * DRAG;
      drag.x = e.clientX;
      dirty = true;
      wake();
    });
    const release = (e: PointerEvent) => { if (drag?.id === e.pointerId) drag = null; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    function tick(now: number) {
      raf = 0;
      if (stopped) return;
      // Its card closed or was replaced: done.
      if (!canvas.isConnected || canvas.closest('[hidden]')) return stopItemView();
      // Scrolled out of sight, or the tab is hidden: wait (cheaply) to make its turn until you can see it.
      const r = canvas.getBoundingClientRect();
      const seen = !document.hidden && r.bottom > 0 && r.top < innerHeight && r.width > 0;
      if (seen && turnLeft > 0) {
        // Eases into the end of its turn, facing you again.
        const step = Math.min(turnLeft, ((now - last) / 1000) * SPIN * Math.min(1, 0.25 + turnLeft));
        yaw += step;
        turnLeft -= step;
        if (turnLeft < 0.002) turnLeft = 0;
        dirty = true;
      }
      last = now;
      if (seen && dirty) {
        draw!.frame(yaw);
        dirty = false;
      }
      if (turnLeft > 0) raf = requestAnimationFrame(tick);
    }
    draw.frame(yaw);
    el.classList.add('live');
    wake();
  }
}

/** You, standing in the Bag: your armour, your weapon on your back, breathing, turned to `yaw`. */
function heroDrawer(canvas: HTMLCanvasElement, armor: string, weapon: string) {
  const ctx = canvas.getContext('2d')!;
  const g = GEAR[weapon];
  const held = g ? carriedWeapon(g, MOVESETS[g.style ?? 'sword']?.size ?? 1) : undefined;
  const t0 = performance.now();
  return {
    frame(yaw: number) {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // Feet near the bottom, one model unit about half the height (the hero is about 1.5 tall with the hair).
      drawHero(ctx, armor, w / 2, h * 0.92, h * 0.56, Math.PI / 2 - yaw, false, (performance.now() - t0) / 1000, {}, 'bag-hero', held && hasModel(held.id) ? held : undefined);
    },
  };
}

/** Frames in a tumbling piece's strip, and its size in CSS pixels (as .craft-flight). */
export const TUMBLE_FRAMES = 12;
const TUMBLE_CSS = 48;
const strips = new Map<MatId, string>();

/**
 * Every material's model, for the Bag, and its tumbling pieces for crafting scenes: fetched in the background once the
 * title is up, one at a time, each piece made when the browser is idle, so none of it ever holds up a frame or a
 * crafting scene. Until a material's are made, its pieces fly as its icon.
 */
export async function loadMaterialArt() {
  for (const m of MAT_ORDER) {
    const item = itemModel(m)!;
    if (!(await loadItemModel(item.url))) continue;
    await new Promise((idle) => ('requestIdleCallback' in window ? requestIdleCallback(idle, { timeout: 2000 }) : setTimeout(idle, 50)));
    const strip = tumbleStrip(item, Math.round(TUMBLE_CSS * Math.min(2, window.devicePixelRatio || 1)), TUMBLE_FRAMES);
    const blob = strip && await new Promise<Blob | null>((done) => strip.toBlob(done));
    if (blob) strips.set(m, URL.createObjectURL(blob));
  }
}

/**
 * A material tumbling in 3D, as an image of TUMBLE_FRAMES frames side by side, or null if it isn't made yet (or
 * there's no WebGL).
 */
export const tumbled = (mat: MatId): string | null => strips.get(mat) ?? null;
