import type { CraftPresentation } from '../types';

export default {
  id: 'goojelly', model: 'assets/crafting3d/goojelly.glb', eyebrow: 'Granny’s Kitchen', duration: 3000,
  layers: ['plate', 'jelly-base', 'jelly-belly', 'jelly-top'].map((id) => ({ id })),
  roles: { goo: 'Springy molded jelly, from base to crown' },
  targets: [
    { material: 'goo', part: 'jelly-base', at: 220, duration: 500, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'jelly-belly', at: 800, duration: 500, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'jelly-top', at: 1380, duration: 500, contact: 'bind', sound: 'craftGoo' },
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
