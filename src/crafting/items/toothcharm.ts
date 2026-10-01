import type { CraftPresentation } from '../types';
const fangs = ['fang-1', 'fang-2', 'fang-3', 'fang-4'] as const;

export default {
  id: 'toothcharm', model: 'assets/crafting3d/toothcharm.glb', duration: 3350,
  layers: ['red-braid', 'cream-braid', ...fangs].map(id => ({ id })),
  roles: { cap: 'Two spotted cap-fiber braid strands', fang: 'Four curved ivory pendants' },
  targets: [
    { material: 'cap', part: 'red-braid', at: 180, duration: 520, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cream-braid', at: 440, duration: 520, contact: 'soft', sound: 'craftFluff' },
    ...fangs.map((part, i) => ({ material: 'fang' as const, part, at: 1150 + i*190, duration: 450, contact: 'solid' as const, sound: 'craftStitch' as const })),
  ],
  phases: [
    { at: 0, stage: 'braid', text: 'Shroom Cap fibers, curling into a soft spotted braid…' },
    { at: 1100, stage: 'thread', text: 'Four Fangs, settling into their little loops.' },
    { at: 2570, stage: 'reveal', text: 'A soft braid. A fierce little grin.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Two Shroom Caps become red and cream spotted fiber strands. Four Woolf Fangs nest into loops on the braid.',
  pattern: 'soft braid, fierce grin', intro: 'A few forest finds, ready to thread.',
  finished: 'Cap fibers for the braid. Four Fangs for a little bite.',
} satisfies CraftPresentation;
