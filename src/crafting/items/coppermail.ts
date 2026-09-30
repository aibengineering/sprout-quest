import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/coppermail-${part}.webp`;

export default {
  id: 'coppermail', duration: 3400,
  layers: ['copper-shell', 'left-pauldron', 'right-pauldron', 'stone-studs', 'copper-bindings'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { copper: 'Hammered bands, shoulder plates & closures', stone: 'Matte protective studs' },
  targets: [
    { material: 'copper', part: 'copper-shell', at: 180, duration: 490, x: 0.521, y: 0.57, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'left-pauldron', at: 530, duration: 480, x: 0.17, y: 0.41, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'right-pauldron', at: 790, duration: 480, x: 0.83, y: 0.41, contact: 'solid', sound: 'craftStitch' },
    { material: 'stone', part: 'stone-studs', at: 1260, duration: 500, x: 0.621, y: 0.648, contact: 'solid', sound: 'step' },
    { material: 'copper', part: 'copper-bindings', at: 1840, duration: 480, x: 0.5, y: 0.66, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'forge', text: 'Copper, pressed into overlapping bands…' },
    { at: 1220, stage: 'setting', text: 'Stone studs, snug in their copper seats…' },
    { at: 1800, stage: 'binding', text: 'Copper closures, tapping into place…' },
    { at: 2570, stage: 'reveal', text: 'Warm copper. Steady stone.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Copper becomes overlapping bands, shoulder plates and closures. Stone studs reinforce the finished mail.',
  pattern: 'hammered warm, held strong', intro: 'Bright ore. A handful of sturdy stone.',
  finished: 'Hammered copper plates with stone studs, ready for the road.',
} satisfies CraftPresentation;
