import type { CraftPresentation } from '../types';

export default {
  id: 'coppermail', model: 'assets/crafting3d/coppermail.glb', duration: 3400,
  layers: ['fluff-lining', 'goo-seams', 'copper-shell', 'left-pauldron', 'right-pauldron', 'stone-studs', 'copper-bindings'].map((id) => ({ id })),
  roles: { fluff: 'Quilted lining, sleeves & cloth hem', goo: 'Bound hems & sleeve seams', copper: 'Hammered bands, shoulder plates & closures', stone: 'Shoulder studs & waist fittings' },
  targets: [
    { material: 'fluff', part: 'fluff-lining', at: 120, duration: 480, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-seams', at: 620, duration: 450, contact: 'bind', sound: 'craftGoo' },
    { material: 'copper', part: 'copper-shell', at: 180, duration: 490, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'left-pauldron', at: 530, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'right-pauldron', at: 790, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'stone', part: 'stone-studs', at: 1260, duration: 500, contact: 'solid', sound: 'step' },
    { material: 'copper', part: 'copper-bindings', at: 1840, duration: 480, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'line', text: 'Bunny Fluff, forming a softly quilted lining…' },
    { at: 180, stage: 'forge', text: 'Copper, pressed into overlapping bands…' },
    { at: 620, stage: 'seam', text: 'Slime Goo, binding the cloth hems and cuffs…' },
    { at: 1220, stage: 'setting', text: 'Stone studs, snug in their copper seats…' },
    { at: 1800, stage: 'binding', text: 'Copper closures, tapping into place…' },
    { at: 2570, stage: 'reveal', text: 'Warm copper. Steady stone.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Copper becomes overlapping bands, shoulder plates and closures. Stone studs reinforce shoulders and waist; fluff lines the mail and goo binds the seams.',
  pattern: 'hammered warm, held strong', intro: 'Bright ore. A handful of sturdy stone.',
  finished: 'Hammered copper plates over quilted cloth, with sturdy stone fittings.',
} satisfies CraftPresentation;
