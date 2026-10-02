import type { CraftPresentation } from '../types';

export default {
  id: 'meadowtea', model: 'assets/crafting3d/meadowtea.glb', eyebrow: 'Granny’s Kitchen', duration: 3200,
  layers: ['cup', 'herb-infusion', 'herb-leaves', 'flower', 'steam'].map((id) => ({ id, ...(id === 'steam' ? { showAt: 1500 } : {}) })),
  roles: { herb: 'Green infusion and floating herb leaves', flower: 'Two pale meadow blossoms' },
  targets: [
    { material: 'herb', part: 'herb-infusion', at: 220, duration: 480, contact: 'bind', sound: 'craftGoo' },
    { material: 'herb', part: 'herb-leaves', at: 900, duration: 480, contact: 'soft', sound: 'craftFluff' },
    { material: 'flower', part: 'flower', at: 1560, duration: 480, contact: 'soft', sound: 'craftFluff' },
  ],
  phases: [
    { at: 0, stage: 'steep', text: 'Poppy’s herbs steep into a soft green tea…' },
    { at: 1500, stage: 'bloom', text: 'Two meadow flowers open on the surface.' },
    { at: 2500, stage: 'reveal', text: 'Meadow Tea, ready for a steady hand.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Herbs form the green tea and floating leaves. Two flowers crown the reusable cup.',
  pattern: 'herbs below, flowers above', intro: 'Granny sets out her favourite cup.', finished: 'A warm cup for the mining trail.',
} satisfies CraftPresentation;
