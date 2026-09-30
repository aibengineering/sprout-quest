import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/ironhammer-${part}.webp`;

export default {
  id: 'ironhammer', duration: 3200,
  layers: ['pine-shaft', 'iron-head', 'iron-collars'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { pine: 'Grained, resilient shaft', iron: 'Forged head, faces & collars' },
  targets: [
    { material: 'pine', part: 'pine-shaft', at: 220, duration: 440, x: .417, y: .583, contact: 'solid', sound: 'craftFluff' },
    { material: 'iron', part: 'iron-head', at: 930, duration: 520, x: .655, y: .345, contact: 'solid', sound: 'clink' },
    { material: 'iron', part: 'iron-collars', at: 1590, duration: 440, x: .366, y: .634, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Pine Logs become the sturdy shaft…' },
    { at: 880, stage: 'forge', text: 'Iron Ore becomes the head, striking faces and collars…' },
    { at: 2450, stage: 'reveal', text: 'One solid head. One comfortable grip.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Pine forms the shaft. Iron forms the head, bright striking faces and securing collars. The hammer settles into place automatically.',
  pattern: 'pine carries the weight', intro: 'A little grain. A good weight of iron.',
  finished: 'An iron head seated firmly on pine.',
} satisfies CraftPresentation;
