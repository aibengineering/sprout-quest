import type { CraftPresentation } from '../types';

export default {
  id: 'trailbuns', model: 'assets/crafting3d/trailbuns.glb', eyebrow: 'Granny’s Kitchen', duration: 2900,
  layers: ['plate', 'fluff-bread', 'berry-filling', 'steam'].map((id) => ({ id, ...(id === 'steam' ? { showAt: 1400 } : {}) })),
  roles: { fluff: 'Three golden bread rolls', berry: 'Sweet berry filling in each split bun' },
  targets: [
    { material: 'fluff', part: 'fluff-bread', at: 220, duration: 540, contact: 'soft', sound: 'craftFluff' },
    { material: 'berry', part: 'berry-filling', at: 1000, duration: 540, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'bake', text: 'Bunny Fluff rises into Moss’s golden buns…' },
    { at: 900, stage: 'fill', text: 'Garden berries make a sweet filling.' },
    { at: 2200, stage: 'reveal', text: 'Three Trail Buns, warm from the oven.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Bunny Fluff forms three bread rolls; berries become the visible filling. A reusable plate catches the crumbs.',
  pattern: 'bread and berries for the trail', intro: 'Granny follows Moss’s flour-dusted notes.', finished: 'A little extra learning with every good strike.',
} satisfies CraftPresentation;
