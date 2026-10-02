// Presentation only: the game commits and saves the recipe before opening this modal.
// Every flight accounts for real ingredients. Animations never grant, charge or equip gear.
import { iconUrl } from './assets';
import type { Sfx } from './audio';
import { MATS, PROJECTS, type Gear, type MatId, type ProjectId, type Recipe } from './data';
import { CRAFT_PRESENTATIONS } from './crafting/catalog';
import { BUILD_PRESENTATIONS } from './crafting/building-catalog';
import { HOUSE_PRESENTATIONS } from './crafting/houses';
import type { CraftFlight, CraftItem, CraftPresentation } from './crafting/types';
import { craftView, loadCraftScenes } from './models';
import { TUMBLE_FRAMES, tumbled } from './itemview';
export type { CraftFlight, CraftPresentation } from './crafting/types';

/** Most pieces flown in for one contact (the count rides on the lead one), and the beat between them (ms). */
const STREAM_MAX = 6;
const STREAM_GAP = 55;
/** The most a scene's clock moves on in one frame (ms). */
const MAX_STEP = 100;
/** What a landing sounds like, unless its target says otherwise. */
const CONTACT_SOUND = { soft: 'craftFluff', bind: 'craftGoo', solid: 'craftStitch', energy: 'ding' } as const;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A recipe's quantity is split over its material's contacts, including tiny/changed recipes. */
export function craftFlights(item: CraftPresentation, recipe: Recipe): CraftFlight[] {
  const seen: Recipe = {};
  return item.targets.map((target): CraftFlight => {
    const n = recipe[target.material] ?? 0;
    const slots = item.targets.filter((t) => t.material === target.material).length;
    const i = seen[target.material] ?? 0;
    seen[target.material] = i + 1;
    return { ...target, count: Math.floor(n / slots) + (i < n % slots ? 1 : 0) };
  }).filter((f) => f.count > 0);
}

/** Every material of the recipe lands somewhere, or the scene isn't ready for it. */
const covers = (item: CraftPresentation | undefined, recipe?: Recipe) =>
  recipe && item && Object.keys(recipe).every((id) => item.targets.some((t) => t.material === id)) ? item : undefined;

/** Leave recipes without a ready, complete contribution on the existing celebration. */
export function craftPresentation(g: Pick<Gear, 'id' | 'recipe'>): CraftPresentation | undefined {
  return covers(CRAFT_PRESENTATIONS[g.id], g.recipe);
}

/**
 * A village project level rising from its materials, keyed `<project><level>` (the Cottage is `home2`). Like gear, a
 * level whose cost gains a material its scene doesn't place yet keeps the old toast until the scene catches up.
 */
export function buildPresentation(project: ProjectId, level: number): CraftPresentation | undefined {
  return covers(BUILD_PRESENTATIONS[`${project}${level}`], PROJECTS[project].levels[level - 1]?.cost);
}

/** Every crafting and building scene's model, loaded on the title screen so no scene ever waits for one. */
export const loadCraftArt = (onProgress?: (done: number, total: number) => void) =>
  loadCraftScenes([...new Set([...Object.values(CRAFT_PRESENTATIONS), ...Object.values(BUILD_PRESENTATIONS), ...HOUSE_PRESENTATIONS].map((p) => p.model))], onProgress);

/** A layer that's there before any ingredient lands: untargeted supports (a bottle, the cookware), unless timed. */
const initially = (item: CraftPresentation, p: CraftPresentation['layers'][number]) =>
  p.initial ?? (p.showAt === undefined && !item.targets.some((t) => t.part === p.id));

export function craftMarkup(g: CraftItem, item: CraftPresentation, before: Recipe): string {
  const recipe = g.recipe!;
  const bag = (id: MatId) => `<div class="craft-material" data-material="${id}">
    <img src="${iconUrl(id)}" alt="" class="craft-source"><div><b>${esc(MATS[id].name)}</b><small>${esc(item.roles[id] ?? '')}</small></div>
    <span class="craft-count"><b data-count="${id}">${before[id] ?? recipe[id] ?? 0}</b><small>−${recipe[id] ?? 0}</small></span></div>`;
  const building = item.scene === 'building';
  return `<div class="craft-heading"><span class="craft-eyebrow">${esc(item.eyebrow ?? 'THE FORGE · HANDMADE')}</span><h2>${esc(g.name)}</h2></div>
    <div class="craft-scene${building ? ' craft-building' : ''}" data-stage="gather" data-item="${esc(g.id)}" aria-label="${esc(item.sceneLabel)}">
      <div class="craft-halo"></div><div class="craft-bench"><i></i><i></i><i></i></div>
      <div class="craft-pattern" aria-hidden="true">${building ? '📐' : '✂'}<span>${esc(item.pattern)}</span></div>
      <div class="craft-garment" aria-hidden="true"><canvas class="craft-model"></canvas></div>
      <img class="craft-fallback" src="${iconUrl(g.iconId ?? g.id)}" alt="Finished ${esc(g.name)}" hidden>
      <div class="craft-sparkles" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i style="--i:${i}">✦</i>`).join('')}</div>
      <div class="craft-flights" aria-hidden="true"></div>
    </div>
    <p class="craft-status" role="status" aria-live="polite">${esc(item.intro)}</p>
    <div class="craft-bag" data-materials="${Object.keys(recipe).length}"><div class="craft-bag-label">🎒 FROM YOUR BAG</div>${(Object.keys(recipe) as MatId[]).map(bag).join('')}</div>
    <button type="button" class="craft-skip" data-craft-skip>Skip animation <span aria-hidden="true">›</span><kbd class="key">Esc</kbd></button>`;
}

/**
 * Plays a crafting scene in 3D: ingredients fly from the bag to the part they become, which arrives with its contact's
 * motion, until the finished piece is revealed. All temporary listeners, frames and Web Animations belong to this one
 * modal and are cancelled together. Without WebGL (or the scene's model) it finishes at once on the item's icon.
 */
export function playCraft(root: HTMLElement, item: CraftPresentation, recipe: Recipe, before: Recipe, sound: (s: Sfx) => void, ready: () => void) {
  const scene = root.querySelector<HTMLElement>('.craft-scene')!;
  const garment = root.querySelector<HTMLElement>('.craft-garment')!;
  const canvas = root.querySelector<HTMLCanvasElement>('.craft-model')!;
  const flightLayer = root.querySelector<HTMLElement>('.craft-flights')!;
  const status = root.querySelector<HTMLElement>('.craft-status')!;
  const skip = root.querySelector<HTMLButtonElement>('[data-craft-skip]')!;
  const flights = craftFlights(item, recipe), animations = new Set<Animation>();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const materials = Object.keys(recipe) as MatId[];
  // The layers showing, also listed on the canvas (data-layers) for tests.
  const showing = new Set(item.layers.filter((p) => initially(item, p)).map((p) => p.id));
  const view = craftView(canvas, item.model, [...showing], item.scene ?? 'gear');
  const show = (layer: string, contact?: CraftFlight['contact']) => {
    showing.add(layer);
    canvas.dataset.layers = [...showing].join(' ');
    view!.show(layer, contact);
  };
  canvas.dataset.layers = [...showing].join(' ');
  let ended = false, disposed = false, frame = 0, t = -1, last = 0, phase = -1;
  const charged: Recipe = {};
  const launched = new Set<number>(), landed = new Set<number>();
  const animate = (el: HTMLElement, keys: Keyframe[], options: KeyframeAnimationOptions) => {
    if (!el.animate) return;
    const a = el.animate(keys, options);
    animations.add(a);
    a.onfinish = () => animations.delete(a);
  };
  const counts = () => {
    for (const id of materials) root.querySelector<HTMLElement>(`[data-count="${id}"]`)!.textContent = String((before[id] ?? recipe[id] ?? 0) - (charged[id] ?? 0));
  };
  const clear = () => {
    cancelAnimationFrame(frame);
    animations.forEach((a) => a.cancel());
    animations.clear();
    flightLayer.replaceChildren();
  };
  // The finished piece sways slowly while you look at it (unless motion is reduced).
  const sway = (now: number) => {
    if (disposed || !scene.isConnected) return;
    view!.frame(now);
    if (!media.matches) frame = requestAnimationFrame(sway);
  };
  const finish = (audible = true) => {
    if (ended || disposed) return;
    if (!scene.isConnected) { dispose(); return; }
    ended = true;
    clear();
    for (const id of materials) charged[id] = recipe[id] ?? 0;
    counts();
    scene.dataset.stage = 'ready';
    root.classList.add('craft-ready');
    skip.hidden = true;
    status.textContent = item.finished;
    root.querySelector('.craft-eyebrow')!.textContent = item.scene === 'building' ? 'BUILT BY YOU' : 'MADE BY YOU';
    if (view) {
      const gone = item.layers.filter((p) => p.finished === false).map((p) => p.id);
      canvas.dataset.layers = item.layers.map((p) => p.id).filter((id) => !gone.includes(id)).join(' ');
      view.reveal(gone);
      sway(performance.now());
    }
    if (audible) sound('treasure');
    ready();
  };
  const onSkip = (e: Event) => { e.stopPropagation(); finish(); };
  const onVisibility = () => { if (document.hidden) finish(false); };
  const onMotion = () => { if (media.matches) finish(); };
  skip.addEventListener('click', onSkip);
  document.addEventListener('visibilitychange', onVisibility);
  media.addEventListener('change', onMotion);

  const launch = (f: CraftFlight) => {
    charged[f.material] = (charged[f.material] ?? 0) + f.count;
    counts();
    const source = root.querySelector<HTMLElement>(`[data-material="${f.material}"] .craft-source`)!;
    const base = scene.getBoundingClientRect(), from = source.getBoundingClientRect(), to = canvas.getBoundingClientRect(), at = view!.at(f.part);
    const x = from.x + from.width / 2 - base.x - 24, y = from.y + from.height / 2 - base.y - 24;
    const tx = to.x + at.x - base.x - 24, ty = to.y + at.y - base.y - 24;
    const transform = (px: number, py: number, scale: string, rotation: number) => `translate(${px}px,${py}px) rotate(${rotation}deg) scale(${scale})`;
    // A handful comes over as a little stream: the lead piece carries the count, a few more follow it in, each a beat
    // later and a touch off its line, so a big pile of planks looks like one.
    const pieces = Math.min(f.count, STREAM_MAX), strip = tumbled(f.material);
    for (let i = 0; i < pieces; i++) {
      const particle = document.createElement('div');
      particle.className = `craft-flight ${f.material}${i ? ' trail' : ''}`;
      // The piece tumbles in 3D (its model, as a strip of frames), or flies as its icon.
      particle.innerHTML = `${strip ? `<i class="piece" style="--frames:${TUMBLE_FRAMES};background-image:url(${strip});animation-delay:-${(i * 97) % 600}ms"></i>` : `<img src="${iconUrl(f.material)}" alt="">`}${i ? '' : `<b>×${f.count}</b>`}`;
      flightLayer.prepend(particle);
      const jx = i ? (((i * 37) % 11) - 5) * 3 : 0, jy = i ? (((i * 23) % 9) - 4) * 3 : 0;
      animate(particle, [
        { transform: transform(x, y, '1', 0), opacity: 1, offset: 0 },
        { transform: transform(x, y + 7, '.85,1.12', -8), opacity: 1, offset: 0.13 },
        { transform: transform(x + (tx - x) * .25 + jx, Math.min(y, ty) - 36 + jy, '.92,1.12', f.contact === 'soft' ? -18 : 15), opacity: 1, offset: .6 },
        { transform: transform(tx + jx / 2, ty + jy / 2, '1.15,.8', 0), opacity: 1, offset: .92 },
        { transform: transform(tx, ty, '.3', 0), opacity: 0, offset: 1 },
      ], { duration: f.duration, delay: i * STREAM_GAP, easing: 'cubic-bezier(.3,.05,.4,1)', fill: 'both' });
    }
    animate(source, [{ transform: 'scale(1)' }, { transform: 'scale(.8,1.12)' }, { transform: 'scale(1)' }], { duration: 230 });
    sound('craftPull');
  };
  const land = (f: CraftFlight) => {
    show(f.part, f.contact);
    sound(f.sound ?? CONTACT_SOUND[f.contact]);
  };
  const tick = (now: number) => {
    if (ended || disposed) return;
    if (!scene.isConnected) { dispose(); return; }
    // The first frame draws the bench (readying a scene shown for the first time can take a moment), then the clock
    // starts. It moves on by at most a short step a frame, so a phone that's struggling plays the build in slow motion
    // rather than skipping to the end with everything popped in at once.
    if (t < 0) {
      view!.frame(now);
      t = 0;
      last = now;
      frame = requestAnimationFrame(tick);
      return;
    }
    t += Math.min(Math.max(now - last, 0), MAX_STEP);
    last = now;
    let next = -1;
    item.phases.forEach((p, i) => { if (t >= p.at) next = i; });
    if (phase !== next && next >= 0) {
      phase = next;
      const p = item.phases[next];
      scene.dataset.stage = p.stage;
      status.textContent = p.text;
      if (p.sound) sound(p.sound);
    }
    flights.forEach((f, i) => {
      if (t >= f.at && !launched.has(i)) { launched.add(i); launch(f); }
      if (t >= f.at + f.duration && !landed.has(i)) { landed.add(i); land(f); }
    });
    for (const layer of item.layers) {
      if (layer.showAt !== undefined && t >= layer.showAt && !showing.has(layer.id)) show(layer.id);
    }
    if (t >= item.duration) { finish(); return; }
    view!.frame(now);
    frame = requestAnimationFrame(tick);
  };
  if (!view) {
    garment.hidden = true;
    root.querySelector<HTMLImageElement>('.craft-fallback')!.hidden = false;
    finish();
  } else if (media.matches || document.hidden) finish(!document.hidden);
  else frame = requestAnimationFrame(tick);
  function dispose() {
    if (disposed) return;
    disposed = true;
    clear();
    skip.removeEventListener('click', onSkip);
    document.removeEventListener('visibilitychange', onVisibility);
    media.removeEventListener('change', onMotion);
  }
  return { finish, dispose };
}
