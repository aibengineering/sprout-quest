import type { CraftPresentation } from '../types';

export default {
  id: 'stonehammer', model: 'assets/crafting3d/stonehammer.glb', duration: 3050,
  layers: ['oak-shaft', 'stone-head', 'oak-clamp'].map((id) => ({ id })),
  roles: { bark: 'Grained oak shaft & split clamp', stone: 'Heavy, faceted mallet head' },
  targets: [
    { material: 'bark', part: 'oak-shaft', at: 180, duration: 500, contact: 'solid', sound: 'craftStitch' },
    { material: 'stone', part: 'stone-head', at: 850, duration: 600, contact: 'solid', sound: 'clink' },
    { material: 'bark', part: 'oak-clamp', at: 1580, duration: 500, contact: 'solid', sound: 'craftStitch' },
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
