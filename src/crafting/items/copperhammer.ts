import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/copperhammer-${part}.webp`;

export default {
  id: 'copperhammer', duration: 3200,
  layers: ['pine-shaft', 'copper-core', 'copper-plates', 'copper-rivets'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { pine: 'Grained pine shaft', copper: 'Head, striking plates & rivets' },
  targets: [
    { material: 'pine', part: 'pine-shaft', at: 200, duration: 480, x: .376, y: .6299, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'copper-core', at: 800, duration: 430, x: .6523, y: .3584, contact: 'solid', sound: 'clink' },
    { material: 'copper', part: 'copper-plates', at: 1370, duration: 430, x: .6523, y: .3594, contact: 'solid', sound: 'clink' },
    { material: 'copper', part: 'copper-rivets', at: 1940, duration: 430, x: .6533, y: .3809, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'shaft', text: 'Pine, shaping into a sturdy shaft…' },
    { at: 800, stage: 'head', text: 'Copper plates, seating around the hammer head…' },
    { at: 1940, stage: 'fasten', text: 'Copper rivets hold every plate snug.' },
    { at: 2600, stage: 'reveal', text: 'A little heft. A lovely copper ring.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Pine Logs form the grained shaft. Copper Ore becomes a head with folded striking plates, a socket and peened rivets.',
  pattern: 'pine for the hold, copper for the heft',
  intro: 'A sturdy shaft. A few bright plates.',
  finished: 'Pine in the handle. Copper in every ringing plate.',
} satisfies CraftPresentation;
