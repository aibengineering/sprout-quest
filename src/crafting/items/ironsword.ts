import type { CraftPresentation } from '../types';

export default {
  id: 'ironsword', model: 'assets/crafting3d/ironsword.glb', duration: 3200,
  layers: ['pine-grip', 'iron-blade', 'iron-fittings'].map(id => ({ id })),
  roles: { pine: 'Grained wooden grip', iron: 'Forged blade, guard & collars' },
  targets: [
    { material: 'pine', part: 'pine-grip', at: 220, duration: 440, contact: 'solid', sound: 'craftFluff' },
    { material: 'iron', part: 'iron-blade', at: 900, duration: 480, contact: 'solid', sound: 'clink' },
    { material: 'iron', part: 'iron-fittings', at: 1530, duration: 440, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Pine Logs become a warm, grained grip…' },
    { at: 850, stage: 'forge', text: 'Iron Ore becomes a broad blade and a firm guard…' },
    { at: 2450, stage: 'reveal', text: 'The collars settle. Ready for the road.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Pine forms the grip. Iron forms the blade, crossguard and collars. The fitted sword settles on the workbench.',
  pattern: 'warm wood, steady iron', intro: 'Pine in your palm. Iron at the edge.',
  finished: 'A pine grip and a dependable iron edge.',
} satisfies CraftPresentation;
