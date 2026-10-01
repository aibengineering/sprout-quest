import type { CraftPresentation } from '../types';

export const FLUFFY_PARTS = ['left-panel', 'right-panel', 'collar', 'left-cuff', 'right-cuff'] as const;
/** The goo goes on in four seams: each cuff, the hem, then the front. */
export const FLUFFY_SEAMS = ['seam-0', 'seam-1', 'seam-2', 'seam-3'] as const;
export const FLUFFY_DURATION = 3200;

export default {
  id: 'fluffvest', model: 'assets/crafting3d/fluffvest.glb', duration: FLUFFY_DURATION,
  layers: [...FLUFFY_PARTS, ...FLUFFY_SEAMS].map((id) => ({ id })),
  roles: { fluff: 'Panels, collar & cuffs', goo: 'Soft, springy seams' },
  targets: [
    ...FLUFFY_PARTS.map((part, i) => ({ material: 'fluff' as const, part, at: 220 + i * 155, duration: 520, contact: 'soft' as const })),
    ...FLUFFY_SEAMS.map((part, i) => ({ material: 'goo' as const, part, at: 1450 + i * 140, duration: 460, contact: 'bind' as const })),
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
