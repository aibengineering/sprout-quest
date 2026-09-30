import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/stonehammer-${part}.webp`;

export default {
  id: 'stonehammer', duration: 3050,
  layers: ['oak-shaft', 'stone-head', 'oak-clamp'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { bark: 'Grained oak shaft & split clamp', stone: 'Heavy, faceted mallet head' },
  targets: [
    { material: 'bark', part: 'oak-shaft', at: 180, duration: 500, x: .428, y: .512, contact: 'solid', sound: 'craftStitch' },
    { material: 'stone', part: 'stone-head', at: 850, duration: 600, x: .785, y: .514, contact: 'solid', sound: 'clink' },
    { material: 'bark', part: 'oak-clamp', at: 1580, duration: 500, x: .783, y: .497, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Oak Logs, shaped into a long handle…' },
    { at: 850, stage: 'stone', text: 'Stone, settling into the notched shaft…' },
    { at: 1580, stage: 'clamp', text: 'Split oak, clamping the head in place…' },
    { at: 2310, stage: 'reveal', text: 'A stout little hammer, ready to swing.' },
  ],
  sceneLabel: 'An oak shaft receives a heavy Stone head. Split oak clamps lock over the head with a small, firm settle.',
  pattern: 'oak carries the weight', intro: 'A sturdy handle. A good heavy rock.',
  finished: 'A Stone head and an oak grip, made for firm slams.',
} satisfies CraftPresentation;
