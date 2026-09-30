// The Fluffy Vest's little making-of. Presentation only: the game commits and saves the recipe before opening it.
// Every flight has an ingredient, a quantity and a destination. Nothing is granted or charged by an animation.
import { iconUrl } from './assets';
import type { Sfx } from './audio';
import type { Recipe } from './data';

export const FLUFFY_PARTS = ['left-panel', 'right-panel', 'collar', 'left-cuff', 'right-cuff', 'goo-seams'] as const;
type Part = typeof FLUFFY_PARTS[number];
export interface CraftFlight { material: 'fluff' | 'goo'; count: number; part: Part; at: number; duration: number; x: number; y: number; binding?: number }
export const FLUFFY_DURATION = 3200;
/** Four visible pieces of adhesive: cuffs, hem, then the front closure. Bounds use the registered 512px art. */
export const FLUFFY_BINDINGS = [
  { x: .2, y: .6, clip: 'inset(43.7% 70% 23% 0)' },
  { x: .8, y: .6, clip: 'inset(43.7% 0 23% 70%)' },
  { x: .38, y: .74, clip: 'inset(68% 30% 23% 30%)' },
  { x: .5, y: .54, clip: 'inset(43.7% 47% 23% 47%)' },
] as const;

/** Split the real recipe into a handful of legible bundles, rather than 16 tiny, identical particles. */
export function fluffyFlights(recipe: Recipe): CraftFlight[] {
  const split = (n: number, slots: number) => Array.from({ length: slots }, (_, i) => Math.floor(n / slots) + (i < n % slots ? 1 : 0));
  const targets: [Part, number, number][] = [
    ['left-panel', 0.289, 0.541], ['right-panel', 0.711, 0.541], ['collar', 0.503, 0.340], ['left-cuff', 0.191, 0.613], ['right-cuff', 0.815, 0.613],
  ];
  return [
    ...split(recipe.fluff ?? 0, 5).map((count, i): CraftFlight => ({ material: 'fluff', count, part: targets[i][0], x: targets[i][1], y: targets[i][2], at: 220 + i * 155, duration: 520 })),
    ...split(recipe.goo ?? 0, 4).map((count, i): CraftFlight => ({ material: 'goo', count, part: 'goo-seams', binding: i, x: FLUFFY_BINDINGS[i].x, y: FLUFFY_BINDINGS[i].y, at: 1450 + i * 140, duration: 460 })),
  ].filter((f) => f.count > 0);
}

export function fluffyCraftMarkup(recipe: Recipe, before: Recipe): string {
  const bag = (id: 'fluff' | 'goo', name: string, role: string) => `<div class="craft-material" data-material="${id}">
    <img src="${iconUrl(id)}" alt="" class="craft-source"><div><b>${name}</b><small>${role}</small></div>
    <span class="craft-count"><b data-count="${id}">${before[id] ?? recipe[id] ?? 0}</b><small>−${recipe[id] ?? 0}</small></span></div>`;
  return `<div class="craft-heading"><span class="craft-eyebrow">THE FORGE · HANDMADE</span><h2>Fluffy Vest</h2></div>
    <div class="craft-scene" data-stage="gather" aria-label="Bunny Fluff becomes the vest's panels, collar and cuffs. Slime Goo binds the seams.">
      <div class="craft-halo"></div><div class="craft-bench"><i></i><i></i><i></i></div>
      <div class="craft-pattern" aria-hidden="true">✂<span>soft things, made strong</span></div>
      <div class="craft-garment" aria-hidden="true">${FLUFFY_PARTS.slice(0, 5).map((p) => `<img class="craft-part" data-part="${p}" src="assets/crafting/fluffvest-${p}.webp" alt="">`).join('')}${FLUFFY_BINDINGS.map((b, i) => `<img class="craft-part craft-binding" data-binding="${i}" style="clip-path:${b.clip}" src="assets/crafting/fluffvest-goo-seams.webp" alt="">`).join('')}<img class="craft-complete" src="assets/crafting/fluffvest-complete.webp" alt=""></div>
      <img class="craft-fallback" src="${iconUrl('fluffvest')}" alt="Finished Fluffy Vest" hidden>
      <div class="craft-sparkles" aria-hidden="true">${Array.from({ length: 7 }, (_, i) => `<i style="--i:${i}">✦</i>`).join('')}</div>
      <div class="craft-flights" aria-hidden="true"></div>
    </div>
    <p class="craft-status" role="status" aria-live="polite">A little fluff. A little magic.</p>
    <div class="craft-bag"><div class="craft-bag-label">🎒 FROM YOUR BAG</div>${bag('fluff', 'Bunny Fluff', 'Panels, collar & cuffs')}${bag('goo', 'Slime Goo', 'Soft, springy seams')}</div>
    <button type="button" class="craft-skip" data-craft-skip>Skip animation <span aria-hidden="true">›</span><kbd class="key">Esc</kbd></button>`;
}

/** All temporary listeners, frames and Web Animations belong to this one modal and are cancelled together. */
export function playFluffyCraft(root: HTMLElement, recipe: Recipe, before: Recipe, sound: (s: Sfx) => void, ready: () => void) {
  const scene = root.querySelector<HTMLElement>('.craft-scene')!;
  const garment = root.querySelector<HTMLElement>('.craft-garment')!;
  const flightLayer = root.querySelector<HTMLElement>('.craft-flights')!;
  const status = root.querySelector<HTMLElement>('.craft-status')!;
  const skip = root.querySelector<HTMLButtonElement>('[data-craft-skip]')!;
  const flights = fluffyFlights(recipe), animations = new Set<Animation>();
  const parts = [...root.querySelectorAll<HTMLImageElement>('.craft-part')];
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ended = false, disposed = false, frame = 0, start = 0, phase = '', charged = { fluff: 0, goo: 0 };
  const launched = new Set<number>(), landed = new Set<number>();
  const animate = (el: HTMLElement, keys: Keyframe[], options: KeyframeAnimationOptions) => {
    if (!el.animate) return;
    const a = el.animate(keys, options);
    animations.add(a);
    a.onfinish = () => animations.delete(a);
  };
  const counts = () => {
    for (const id of ['fluff', 'goo'] as const) root.querySelector<HTMLElement>(`[data-count="${id}"]`)!.textContent = String((before[id] ?? recipe[id] ?? 0) - charged[id]);
  };
  const clear = () => {
    cancelAnimationFrame(frame);
    animations.forEach((a) => a.cancel());
    animations.clear();
    flightLayer.replaceChildren();
  };
  const finish = (audible = true) => {
    if (ended || disposed) return;
    if (!scene.isConnected) { dispose(); return; }
    ended = true;
    clear();
    charged = { fluff: recipe.fluff ?? 0, goo: recipe.goo ?? 0 };
    counts();
    parts.forEach((p) => { p.style.opacity = '1'; });
    scene.dataset.stage = 'ready';
    root.classList.add('craft-ready');
    skip.hidden = true;
    status.textContent = 'Fluff for comfort. Goo to hold it together.';
    root.querySelector('.craft-eyebrow')!.textContent = 'MADE BY YOU';
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
    charged[f.material] += f.count;
    counts();
    const source = root.querySelector<HTMLElement>(`[data-material="${f.material}"] .craft-source`)!;
    const base = scene.getBoundingClientRect(), from = source.getBoundingClientRect(), to = garment.getBoundingClientRect();
    const x = from.x + from.width / 2 - base.x - 24, y = from.y + from.height / 2 - base.y - 24;
    const tx = to.x + to.width * f.x - base.x - 24, ty = to.y + to.height * f.y - base.y - 24;
    const particle = document.createElement('div');
    particle.className = `craft-flight ${f.material}`;
    particle.innerHTML = `<img src="${iconUrl(f.material)}" alt=""><b>×${f.count}</b>`;
    flightLayer.append(particle);
    const transform = (px: number, py: number, scale: string, rotation: number) => `translate(${px}px,${py}px) rotate(${rotation}deg) scale(${scale})`;
    animate(particle, [
      { transform: transform(x, y, '1', 0), opacity: 1, offset: 0 },
      { transform: transform(x, y + 7, '.85,1.12', -8), opacity: 1, offset: 0.13 },
      { transform: transform(x + (tx - x) * .25, Math.min(y, ty) - 36, '.92,1.12', f.material === 'fluff' ? -18 : 15), opacity: 1, offset: .6 },
      { transform: transform(tx, ty, '1.15,.8', 0), opacity: 1, offset: .92 },
      { transform: transform(tx, ty, '.3', 0), opacity: 0, offset: 1 },
    ], { duration: f.duration, easing: 'cubic-bezier(.3,.05,.4,1)', fill: 'forwards' });
    animate(source, [{ transform: 'scale(1)' }, { transform: 'scale(.8,1.12)' }, { transform: 'scale(1)' }], { duration: 230 });
    sound('craftPull');
  };
  const land = (f: CraftFlight) => {
    const part = root.querySelector<HTMLElement>(f.material === 'goo' ? `[data-binding="${f.binding}"]` : `[data-part="${f.part}"]`)!;
    part.style.opacity = '1';
    part.style.transformOrigin = `${f.x * 100}% ${f.y * 100}%`;
    if (f.material === 'fluff') {
      animate(part, [
        { transform: 'scale(.4,.28)', opacity: .3 }, { transform: 'scale(1.11,.85)', opacity: 1, offset: .45 },
        { transform: 'scale(.96,1.04)', offset: .72 }, { transform: 'scale(1)' },
      ], { duration: 370, easing: 'ease-out' });
      sound('craftFluff');
    } else {
      animate(part, [{ opacity: 0, transform: 'scale(.9,1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
      animate(garment, [{ transform: 'scale(1)' }, { transform: 'scale(1.025,.975)' }, { transform: 'scale(1)' }], { duration: 220 });
      sound('craftGoo');
    }
  };
  const tick = (now: number) => {
    if (ended || disposed) return;
    if (!scene.isConnected) { dispose(); return; }
    start ||= now;
    const t = now - start;
    const next = t < 1450 ? 'fluff' : t < 2450 ? 'binding' : 'reveal';
    if (phase !== next) {
      phase = next;
      scene.dataset.stage = next;
      status.textContent = next === 'fluff' ? 'Bunny Fluff, finding its shape…' : next === 'binding' ? 'Slime Goo, sealing every seam…' : 'A soft little vest, made to last.';
      if (next === 'reveal') sound('craftStitch');
    }
    flights.forEach((f, i) => {
      if (t >= f.at && !launched.has(i)) { launched.add(i); launch(f); }
      if (t >= f.at + f.duration && !landed.has(i)) { landed.add(i); land(f); }
    });
    if (t >= FLUFFY_DURATION) finish();
    else frame = requestAnimationFrame(tick);
  };
  // Decode before starting so the first bundle cannot arrive at an invisible garment on a slow connection.
  // A timeout or failed art is a quiet completed reveal, never a blocked transaction or an endless loading screen.
  let loadTimer = 0;
  const loaded = Promise.all([...parts, root.querySelector<HTMLImageElement>('.craft-complete')!].map((p) => p.decode().catch(() => { throw new Error('craft art unavailable'); })));
  const timeout = new Promise<never>((_, reject) => { loadTimer = window.setTimeout(() => reject(new Error('craft art timed out')), 2500); });
  if (media.matches || document.hidden) finish(!document.hidden);
  Promise.race([loaded, timeout]).then(() => {
    if (!ended && !disposed) frame = requestAnimationFrame(tick);
  }).catch(() => {
    if (disposed || !scene.isConnected) { dispose(); return; }
    garment.hidden = true;
    root.querySelector<HTMLImageElement>('.craft-fallback')!.hidden = false;
    finish();
  }).finally(() => clearTimeout(loadTimer));
  const dispose = () => {
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
