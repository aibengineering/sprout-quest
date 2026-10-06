import type { CraftPresentation } from '../types';

export default {
  id: 'tea', model: 'assets/crafting3d/tea.glb', eyebrow: 'Granny’s Kitchen', duration: 2800,
  layers: ['cup', 'clover-infusion', 'clover-leaves', 'steam'].map((id) => ({ id, ...(id === 'steam' ? { showAt: 920 } : {}) })),
  roles: { clover: 'Pale green tea & floating four-leaf sprigs' },
  targets: [
    { material: 'clover', part: 'clover-infusion', at: 220, duration: 500, contact: 'bind', sound: 'craftGoo' },
    { material: 'clover', part: 'clover-leaves', at: 1020, duration: 520, contact: 'soft', sound: 'craftFluff' },
  ],
  phases: [
    { at: 0, stage: 'steep', text: 'Clover, releasing its green into the cup…' },
    { at: 920, stage: 'simmer', text: 'The four-leaf sprigs open. A warm wisp rises…' },
    { at: 2000, stage: 'reveal', text: 'A quiet cup of clover, ready to sip.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Clover becomes the pale green tea and the two visible four-leaf sprigs. Gentle steam rises from reusable cookware.',
  pattern: 'steeped slowly, sipped warm', intro: 'Granny sets a cup on the table.',
  finished: 'Clover in the cup, and a little warmth for the road.',
} satisfies CraftPresentation;
