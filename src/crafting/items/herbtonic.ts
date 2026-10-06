import type { CraftPresentation } from '../types';

export default {
  id: 'herbtonic', model: 'assets/crafting3d/herbtonic.glb', duration: 2800,
  layers: ['bottle', 'herb-infusion', 'herb-leaves'].map((id) => ({ id })),
  roles: { herb: 'Clear green tonic & a fresh sprig in the neck' },
  targets: [
    { material: 'herb', part: 'herb-infusion', at: 220, duration: 520, contact: 'bind', sound: 'craftGoo' },
    { material: 'herb', part: 'herb-leaves', at: 1040, duration: 500, contact: 'soft', sound: 'craftFluff' },
  ],
  phases: [
    { at: 0, stage: 'steep', text: 'Herbs, steeping into a clear green tonic…' },
    { at: 950, stage: 'mix', text: 'A fresh sprig, tucked into the neck…' },
    { at: 2000, stage: 'reveal', text: 'Grown in the Garden, bottled for the road.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Herbs make both the green infusion and the visible sprig of leaves. The bottle is reusable cookware.',
  pattern: 'garden green, gently steeped', intro: 'A quick tonic from Poppy’s herbs.',
  finished: 'Herbs, steeped green and bottled with a sprig.',
} satisfies CraftPresentation;
