import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/embertonic-${part}.webp`;
export default {
  id: 'embertonic', duration: 2900,
  layers: ['bottle', 'ember-infusion', 'warm-swirl'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { ember: 'Warm orange infusion & glowing swirls' },
  targets: [
    { material: 'ember', part: 'ember-infusion', at: 220, duration: 560, x: .5, y: .52, contact: 'bind', sound: 'craftGoo' },
    { material: 'ember', part: 'warm-swirl', at: 1120, duration: 500, x: .5, y: .5254, contact: 'energy', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'warm', text: 'Embers, warming the tonic to a soft orange…' },
    { at: 1000, stage: 'mix', text: 'A slow stir, and the warmth curls through…' },
    { at: 2100, stage: 'reveal', text: 'A little bottled warmth, glowing gently.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Embers become the orange infusion and gentle warm swirls. There are no flashes or sparks outside the bottle.',
  pattern: 'slow warmth, bottled up', intro: 'A small glow, gently stirred.',
  finished: 'Ember warmth, curled into a golden-orange tonic.',
} satisfies CraftPresentation;
