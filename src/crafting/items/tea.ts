import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/tea-${part}.webp`;
export default {
  id: 'tea', eyebrow: 'Granny’s Kitchen', duration: 2800,
  layers: ['cup', 'clover-infusion', 'clover-leaves', 'steam'].map((id) => ({ id, src: src(id), ...(id === 'steam' ? { showAt: 920 } : {}) })),
  complete: src('complete'),
  roles: { clover: 'Pale green tea & floating four-leaf sprigs' },
  targets: [
    { material: 'clover', part: 'clover-infusion', at: 220, duration: 500, x: .5, y: .4004, contact: 'bind', sound: 'craftGoo' },
    { material: 'clover', part: 'clover-leaves', at: 1020, duration: 520, x: .498, y: .4014, contact: 'soft', sound: 'craftFluff' },
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
