import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/clovercharm-${part}.webp`;

export default {
  id: 'clovercharm', duration: 3000,
  layers: ['goo-binding', 'left-clover', 'right-clover', 'center-clover'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { clover: 'Three pressed, veined sprigs', goo: 'Cushion, hanging loop & stem binding' },
  targets: [
    { material: 'clover', part: 'left-clover', at: 180, duration: 480, x: .379, y: .55, contact: 'soft', sound: 'craftFluff' },
    { material: 'clover', part: 'right-clover', at: 390, duration: 480, x: .648, y: .575, contact: 'soft', sound: 'craftFluff' },
    { material: 'clover', part: 'center-clover', at: 600, duration: 480, x: .5, y: .453, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-binding', at: 1310, duration: 480, x: .5, y: .72, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'press', text: 'Clover sprigs, gently pressed into place…' },
    { at: 1250, stage: 'binding', text: 'Slime Goo cushions the leaves and holds their stems.' },
    { at: 2250, stage: 'reveal', text: 'A little luck, held together.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Three Clover sprigs form the leafy pendant. Slime Goo becomes its cushion, hanging loop and stem binding.',
  pattern: 'a little luck, handmade', intro: 'Three green sprigs. One soft little charm.',
  finished: 'Clover for luck. Goo to keep it close.',
} satisfies CraftPresentation;
