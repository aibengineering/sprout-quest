// Presentation only: the game commits and saves the recipe before opening this modal.
// Every flight accounts for real ingredients. Animations never grant, charge or equip gear.
import { iconUrl } from './assets';
import type { Sfx } from './audio';
import { GEAR, MATS, PROJECTS, type Gear, type MatId, type ProjectId, type Recipe } from './data';
import fluffvest from './crafting/items/fluffvest';
import { CRAFT_PRESENTATIONS } from './crafting/catalog';
import { BUILD_PRESENTATIONS } from './crafting/building-catalog';
import type { CraftFlight, CraftItem, CraftPresentation } from './crafting/types';
export type { CraftFlight, CraftPresentation } from './crafting/types';
export { FLUFFY_PARTS, FLUFFY_BINDINGS, FLUFFY_DURATION } from './crafting/items/fluffvest';

/** Most pieces flown in for one contact (the count rides on the lead one), and the beat between them (ms). */
const STREAM_MAX = 6;
const STREAM_GAP = 55;

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

/** Scene art fetched ahead of time, and held so it stays loaded: a scene can start the moment its popup opens. */
const warm = new Map<string, HTMLImageElement>();
export function warmCraft(item: CraftPresentation | undefined) {
  if (!item || typeof Image === 'undefined') return;
  for (const src of [...item.layers.map((l) => l.src), item.complete]) {
    if (warm.has(src)) continue;
    const img = new Image();
    img.src = src;
    warm.set(src, img);
  }
}
export const warmGearCraft = (id: string) => warmCraft(CRAFT_PRESENTATIONS[id]);

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
      <div class="craft-garment" aria-hidden="true">${item.layers.map((p) => {
        const initial = p.initial ?? (p.showAt === undefined && !item.targets.some((t) => t.part === p.id));
        const style = `${p.clip ? `clip-path:${p.clip};` : ''}${initial ? 'opacity:1;' : ''}`;
        return `<img class="craft-part${p.binding === undefined ? '' : ' craft-binding'}" data-part="${esc(p.id)}"${p.binding === undefined ? '' : ` data-binding="${p.binding}"`}${style ? ` style="${esc(style)}"` : ''} src="${esc(p.src)}" alt="">`;
      }).join('')}<img class="craft-complete" src="${esc(item.complete)}" alt=""></div>
      <img class="craft-fallback" src="${iconUrl(g.iconId ?? g.id)}" alt="Finished ${esc(g.name)}" hidden>
      <div class="craft-sparkles" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i style="--i:${i}">✦</i>`).join('')}</div>
      <div class="craft-flights" aria-hidden="true"></div>
    </div>
    <p class="craft-status" role="status" aria-live="polite">${esc(item.intro)}</p>
    <div class="craft-bag" data-materials="${Object.keys(recipe).length}"><div class="craft-bag-label">🎒 FROM YOUR BAG</div>${(Object.keys(recipe) as MatId[]).map(bag).join('')}</div>
    <button type="button" class="craft-skip" data-craft-skip>Skip animation <span aria-hidden="true">›</span><kbd class="key">Esc</kbd></button>`;
}

// Compatibility wrappers keep the pilot's existing checks and call sites stable.
export const fluffyFlights = (recipe: Recipe) => craftFlights(fluffvest, recipe).map((f) => f.binding === undefined ? f : { ...f, part: 'goo-seams' });
export const fluffyCraftMarkup = (recipe: Recipe, before: Recipe) => craftMarkup({ ...GEAR.fluffvest, recipe }, fluffvest, before);
export const playFluffyCraft = (root: HTMLElement, recipe: Recipe, before: Recipe, sound: (s: Sfx) => void, ready: () => void) => playCraft(root, fluffvest, recipe, before, sound, ready);

/** All temporary listeners, frames and Web Animations belong to this one modal and are cancelled together. */
export function playCraft(root: HTMLElement, item: CraftPresentation, recipe: Recipe, before: Recipe, sound: (s: Sfx) => void, ready: () => void) {
  const scene = root.querySelector<HTMLElement>('.craft-scene')!;
  const garment = root.querySelector<HTMLElement>('.craft-garment')!;
  const flightLayer = root.querySelector<HTMLElement>('.craft-flights')!;
  const status = root.querySelector<HTMLElement>('.craft-status')!;
  const skip = root.querySelector<HTMLButtonElement>('[data-craft-skip]')!;
  const flights = craftFlights(item, recipe), animations = new Set<Animation>();
  const parts = [...root.querySelectorAll<HTMLImageElement>('.craft-part')];
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const materials = Object.keys(recipe) as MatId[];
  let ended = false, disposed = false, frame = 0, start: number | null = null, phase = -1;
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
  const revealLayers = () => {
    parts.forEach((p, i) => {
      p.hidden = item.layers[i].finished === false;
      p.style.opacity = '1';
    });
  };
  const finish = (audible = true) => {
    if (ended || disposed) return;
    if (!scene.isConnected) { dispose(); return; }
    ended = true;
    clear();
    for (const id of materials) charged[id] = recipe[id] ?? 0;
    counts();
    revealLayers();
    scene.dataset.stage = 'ready';
    root.classList.add('craft-ready');
    skip.hidden = true;
    status.textContent = item.finished;
    root.querySelector('.craft-eyebrow')!.textContent = item.scene === 'building' ? 'BUILT BY YOU' : 'MADE BY YOU';
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
    const base = scene.getBoundingClientRect(), from = source.getBoundingClientRect(), to = garment.getBoundingClientRect();
    const x = from.x + from.width / 2 - base.x - 24, y = from.y + from.height / 2 - base.y - 24;
    const tx = to.x + to.width * f.x - base.x - 24, ty = to.y + to.height * f.y - base.y - 24;
    const transform = (px: number, py: number, scale: string, rotation: number) => `translate(${px}px,${py}px) rotate(${rotation}deg) scale(${scale})`;
    // A handful comes over as a little stream: the lead piece carries the count, a few more follow it in, each a beat
    // later and a touch off its line, so a big pile of planks looks like one.
    const pieces = Math.min(f.count, STREAM_MAX);
    for (let i = 0; i < pieces; i++) {
      const particle = document.createElement('div');
      particle.className = `craft-flight ${f.material}${i ? ' trail' : ''}`;
      particle.innerHTML = `<img src="${iconUrl(f.material)}" alt="">${i ? '' : `<b>×${f.count}</b>`}`;
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
    const part = root.querySelector<HTMLElement>(`[data-part="${f.part}"]`)!;
    part.style.opacity = '1';
    part.style.transformOrigin = `${f.x * 100}% ${f.y * 100}%`;
    if (f.contact === 'soft') {
      animate(part, [
        { transform: 'scale(.4,.28)', opacity: .3 }, { transform: 'scale(1.11,.85)', opacity: 1, offset: .45 },
        { transform: 'scale(.96,1.04)', offset: .72 }, { transform: 'scale(1)' },
      ], { duration: 370, easing: 'ease-out' });
      sound(f.sound ?? 'craftFluff');
    } else if (f.contact === 'bind') {
      animate(part, [{ opacity: 0, transform: 'scale(.9,1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
      animate(garment, [{ transform: 'scale(1)' }, { transform: 'scale(1.025,.975)' }, { transform: 'scale(1)' }], { duration: 220 });
      sound(f.sound ?? 'craftGoo');
    } else if (f.contact === 'solid') {
      animate(part, [{ transform: 'translateY(-8px) scale(.94)', opacity: .3 }, { transform: 'translateY(2px) scale(1.02,.98)', opacity: 1, offset: .65 }, { transform: 'none' }], { duration: 280, easing: 'ease-out' });
      animate(garment, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0)' }], { duration: 180 });
      sound(f.sound ?? 'craftStitch');
    } else {
      animate(part, [{ transform: 'scale(.7)', opacity: 0 }, { transform: 'scale(1.07)', opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 1 }], { duration: 340, easing: 'ease-out' });
      sound(f.sound ?? 'ding');
    }
  };
  const tick = (now: number) => {
    if (ended || disposed) return;
    if (!scene.isConnected) { dispose(); return; }
    start ??= now;
    const t = now - start;
    let next = -1;
    item.phases.forEach((p, i) => { if (t >= p.at) next = i; });
    if (phase !== next && next >= 0) {
      phase = next;
      const p = item.phases[next];
      scene.dataset.stage = p.stage;
      status.textContent = p.text;
      if (p.stage === 'reveal') revealLayers();
      if (p.sound) sound(p.sound);
    }
    flights.forEach((f, i) => {
      if (t >= f.at && !launched.has(i)) { launched.add(i); launch(f); }
      if (t >= f.at + f.duration && !landed.has(i)) { landed.add(i); land(f); }
    });
    item.layers.forEach((layer, i) => {
      if (layer.showAt !== undefined && t >= layer.showAt) parts[i].style.opacity = '1';
    });
    if (t >= item.duration) finish();
    else frame = requestAnimationFrame(tick);
  };
  // Decode before starting so the first bundle cannot arrive at an invisible garment on a slow connection (the menus
  // warm the art ahead, so this is usually instant). Some phones refuse decode() on art that loaded fine, so only art
  // that really didn't load, or a very slow connection, is a quiet completed reveal: never a blocked transaction or
  // an endless loading screen.
  let loadTimer = 0;
  const art = (img: HTMLImageElement) => img.decode().catch(() => { if (!img.complete || !img.naturalWidth) throw new Error('craft art unavailable'); });
  const loaded = Promise.all([...parts, root.querySelector<HTMLImageElement>('.craft-complete')!].map(art));
  const timeout = new Promise<never>((_, reject) => { loadTimer = window.setTimeout(() => reject(new Error('craft art timed out')), 6000); });
  if (media.matches || document.hidden) finish(!document.hidden);
  Promise.race([loaded, timeout]).then(() => {
    if (!ended && !disposed) frame = requestAnimationFrame(tick);
  }).catch((e) => {
    if (disposed || !scene.isConnected) { dispose(); return; }
    console.warn(e);
    garment.hidden = true;
    root.querySelector<HTMLImageElement>('.craft-fallback')!.hidden = false;
    finish();
  }).finally(() => clearTimeout(loadTimer));
  function dispose() {
    if (disposed) return;
    disposed = true;
    clear();
    clearTimeout(loadTimer);
    skip.removeEventListener('click', onSkip);
    document.removeEventListener('visibilitychange', onVisibility);
    media.removeEventListener('change', onMotion);
  };
  return { finish, dispose };
}
