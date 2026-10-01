import type { CraftPresentation } from '../types';

export default {
  id: 'coppermail', model: 'assets/crafting3d/coppermail.glb', duration: 3400,
  layers: ['copper-shell', 'left-pauldron', 'right-pauldron', 'stone-studs', 'copper-bindings'].map((id) => ({ id })),
  roles: { copper: 'Hammered bands, shoulder plates & closures', stone: 'Matte protective studs' },
  targets: [
    { material: 'copper', part: 'copper-shell', at: 180, duration: 490, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'left-pauldron', at: 530, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'right-pauldron', at: 790, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'stone', part: 'stone-studs', at: 1260, duration: 500, contact: 'solid', sound: 'step' },
    { material: 'copper', part: 'copper-bindings', at: 1840, duration: 480, contact: 'solid', sound: 'craftStitch' },
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
