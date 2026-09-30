import type { CraftPresentation } from '../types';

export const FLUFFY_PARTS = ['left-panel', 'right-panel', 'collar', 'left-cuff', 'right-cuff', 'goo-seams'] as const;
export const FLUFFY_DURATION = 3200;
export const FLUFFY_BINDINGS = [
  { x: .2, y: .6, clip: 'inset(43.7% 70% 23% 0)' },
  { x: .8, y: .6, clip: 'inset(43.7% 0 23% 70%)' },
  { x: .38, y: .74, clip: 'inset(68% 30% 23% 30%)' },
  { x: .5, y: .54, clip: 'inset(43.7% 47% 23% 47%)' },
] as const;
const src = (part: string) => `assets/crafting/fluffvest-${part}.webp`;
const panels = [
  ['left-panel', .289, .541], ['right-panel', .711, .541], ['collar', .503, .340],
  ['left-cuff', .191, .613], ['right-cuff', .815, .613],
] as const;

export default {
  id: 'fluffvest', duration: FLUFFY_DURATION,
  layers: [
    ...FLUFFY_PARTS.slice(0, 5).map((id) => ({ id, src: src(id) })),
    ...FLUFFY_BINDINGS.map((b, binding) => ({ id: `seam-${binding}`, src: src('goo-seams'), clip: b.clip, binding })),
  ],
  complete: src('complete'),
  roles: { fluff: 'Panels, collar & cuffs', goo: 'Soft, springy seams' },
  targets: [
    ...panels.map(([part, x, y], i) => ({ material: 'fluff' as const, part, x, y, at: 220 + i * 155, duration: 520, contact: 'soft' as const })),
    ...FLUFFY_BINDINGS.map((b, i) => ({ material: 'goo' as const, part: `seam-${i}`, binding: i, x: b.x, y: b.y, at: 1450 + i * 140, duration: 460, contact: 'bind' as const })),
  ],
  phases: [
    { at: 0, stage: 'fluff', text: 'Bunny Fluff, finding its shape…' },
    { at: 1450, stage: 'binding', text: 'Slime Goo, sealing every seam…' },
    { at: 2450, stage: 'reveal', text: 'A soft little vest, made to last.', sound: 'craftStitch' },
  ],
  sceneLabel: "Bunny Fluff becomes the vest's panels, collar and cuffs. Slime Goo binds the seams.",
  pattern: 'soft things, made strong', intro: 'A little fluff. A little magic.',
  finished: 'Fluff for comfort. Goo to hold it together.',
} satisfies CraftPresentation;
