import type { CraftPresentation } from '../types';

export default {
  id: 'barkvest', model: 'assets/crafting3d/barkvest.glb', duration: 3400,
  layers: [
    ...['fluff-lining', 'goo-seams', 'oak-back', 'oak-left', 'oak-right', 'shoulder-left', 'shoulder-right', 'stone-fasteners'].map(id => ({ id })),
  ],
  roles: { fluff: 'Quilted lining, sleeves & cloth hem', goo: 'Bound hems & sleeve seams', bark: 'Oak shingles & end grain shoulders', stone: 'Smooth stone belt fasteners' },
  targets: [
    { material: 'fluff', part: 'fluff-lining', at: 120, duration: 480, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-seams', at: 620, duration: 450, contact: 'bind', sound: 'craftGoo' },
    { material: 'bark', part: 'oak-back', at: 180, duration: 480, contact: 'solid', sound: 'craftFluff' },
    { material: 'bark', part: 'oak-left', at: 320, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'bark', part: 'oak-right', at: 460, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'bark', part: 'shoulder-left', at: 600, duration: 480, contact: 'solid', sound: 'craftFluff' },
    { material: 'bark', part: 'shoulder-right', at: 740, duration: 480, contact: 'solid', sound: 'craftFluff' },
    { material: 'stone', part: 'stone-fasteners', at: 1300, duration: 760, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'line', text: 'Bunny Fluff, forming a softly quilted lining…' },
    { at: 180, stage: 'shape', text: 'Oak Logs, split into overlapping shingles…' },
    { at: 620, stage: 'seam', text: 'Slime Goo, binding the cloth hems and cuffs…' },
    { at: 1300, stage: 'binding', text: 'Smooth stones, seating each wooden closure…' },
    { at: 2600, stage: 'reveal', text: 'Warm oak grain over a softly lined vest.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Oak Logs form overlapping panels and end grain shoulders. Stone fasteners secure the waist; fluff pads the vest and goo binds the seams.',
  pattern: 'oak grain, snug stone', intro: 'A little oak. A pocket of smooth stones.',
  finished: 'Oak shingles, a padded cloth lining and stone belt fasteners.',
} satisfies CraftPresentation;
