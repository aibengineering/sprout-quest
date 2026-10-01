import type { CraftPresentation } from '../types';

export default {
  id: 'barkvest', model: 'assets/crafting3d/barkvest.glb', duration: 3400,
  layers: [
    ...['oak-back', 'oak-left', 'oak-right', 'shoulder-left', 'shoulder-right', 'stone-fasteners'].map(id => ({ id })),
  ],
  roles: { bark: 'Oak shingles & end grain shoulders', stone: 'Six smooth stone fasteners' },
  targets: [
    { material: 'bark', part: 'oak-back', at: 180, duration: 480, contact: 'solid', sound: 'craftFluff' },
    { material: 'bark', part: 'oak-left', at: 320, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'bark', part: 'oak-right', at: 460, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'bark', part: 'shoulder-left', at: 600, duration: 480, contact: 'solid', sound: 'craftFluff' },
    { material: 'bark', part: 'shoulder-right', at: 740, duration: 480, contact: 'solid', sound: 'craftFluff' },
    { material: 'stone', part: 'stone-fasteners', at: 1300, duration: 760, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Oak Logs, split into overlapping shingles…' },
    { at: 1300, stage: 'binding', text: 'Smooth stones, seating each wooden closure…' },
    { at: 2600, stage: 'reveal', text: 'Warm oak grain. Six snug stone buttons.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Oak Logs form overlapping panels and end grain shoulders. Six stones fasten the front.',
  pattern: 'oak grain, snug stone', intro: 'A little oak. A pocket of smooth stones.',
  finished: 'Oak for shelter. Stone to hold it close.',
} satisfies CraftPresentation;
