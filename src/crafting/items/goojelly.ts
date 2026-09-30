import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/goojelly-${part}.webp`;
export default {
  id: 'goojelly', eyebrow: 'Granny’s Kitchen', duration: 3000,
  layers: ['plate', 'jelly-base', 'jelly-belly', 'jelly-top'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { goo: 'Springy molded jelly, from base to crown' },
  targets: [
    { material: 'goo', part: 'jelly-base', at: 220, duration: 500, x: .5, y: .6357, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'jelly-belly', at: 800, duration: 500, x: .5, y: .5107, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'jelly-top', at: 1380, duration: 500, x: .5, y: .3799, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'pour', text: 'Slime Goo, pouring into the mold…' },
    { at: 800, stage: 'set', text: 'A soft belly, then a glossy green crown…' },
    { at: 2200, stage: 'reveal', text: 'One little wobble, and the jelly is ready.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Only Slime Goo becomes the fluted green jelly, built from its base to its crown. The plate is reusable cookware.',
  pattern: 'pour, set, wobble', intro: 'Granny knows just how much jiggle is enough.',
  finished: 'Pure Slime Goo, molded glossy and springy.',
} satisfies CraftPresentation;
