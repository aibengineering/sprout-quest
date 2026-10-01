import type { CraftPresentation } from '../types';

export default {
  id: 'stonesword', model: 'assets/crafting3d/stonesword.glb', duration: 2900,
  layers: ['oak-hilt', 'stone-blade', 'oak-splints'].map((id) => ({ id })),
  roles: { bark: 'Split oak hilt & clamping splints', stone: 'Chipped slab blade' },
  targets: [
    { material: 'bark', part: 'oak-hilt', at: 180, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'stone', part: 'stone-blade', at: 820, duration: 560, contact: 'solid', sound: 'clink' },
    { material: 'bark', part: 'oak-splints', at: 1510, duration: 470, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Oak Logs, split into a sturdy hilt…' },
    { at: 820, stage: 'stone', text: 'Stone, chipped into a broad blade…' },
    { at: 1510, stage: 'clamp', text: 'Oak splints, holding the blade tight…' },
    { at: 2180, stage: 'reveal', text: 'A little oak. A solid stone edge.' },
  ],
  sceneLabel: 'Oak Logs form the grip and splints. A chipped Stone blade slides into the split hilt and is clamped in place.',
  pattern: 'oak holds the edge', intro: 'Good wood. Honest stone.',
  finished: 'A chipped Stone blade, held fast by oak.',
} satisfies CraftPresentation;
