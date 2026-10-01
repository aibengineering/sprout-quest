import type { CraftPresentation } from '../types';

export default {
  id: 'tart', model: 'assets/crafting3d/tart.glb', eyebrow: 'Granny’s Kitchen', duration: 3300,
  layers: ['plate', 'fluff-crust', 'berry-filling', 'berries'].map((id) => ({ id })),
  roles: { fluff: 'Golden crimped pastry case', berry: 'Glossy berry filling & whole berries on top' },
  targets: [
    { material: 'fluff', part: 'fluff-crust', at: 220, duration: 520, contact: 'soft', sound: 'craftFluff' },
    { material: 'berry', part: 'berry-filling', at: 980, duration: 500, contact: 'bind', sound: 'craftGoo' },
    { material: 'berry', part: 'berries', at: 1640, duration: 500, contact: 'soft', sound: 'craftFluff' },
  ],
  phases: [
    { at: 0, stage: 'bake', text: 'Bunny Fluff, baking into a golden pastry case…' },
    { at: 900, stage: 'fill', text: 'Berries, bubbling down into a glossy filling…' },
    { at: 1560, stage: 'top', text: 'Whole berries on top, and a sprig of green.' },
    { at: 2500, stage: 'reveal', text: 'A Berry Tart, fresh from the Garden.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Bunny Fluff becomes the crimped pastry case. Berries from Poppy’s Garden become the glossy filling and the whole berries on top. The plate is reusable cookware.',
  pattern: 'pastry below, berries above', intro: 'Granny rolls out the pastry. Poppy counts the berries.',
  finished: 'Garden berries in a golden case. Ready from Granny’s kitchen.',
} satisfies CraftPresentation;
