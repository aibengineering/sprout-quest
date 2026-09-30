import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/pancakes-${part}.webp`;
export default {
  id: 'pancakes', eyebrow: 'Granny’s Kitchen', duration: 3400,
  layers: ['plate', 'lower-pancake', 'middle-pancake', 'upper-pancake', 'goo-syrup'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { fluff: 'Airy golden pancake stack', goo: 'Glossy green syrup & drips' },
  targets: [
    { material: 'fluff', part: 'lower-pancake', at: 220, duration: 440, x: .5, y: .6504, contact: 'soft', sound: 'craftFluff' },
    { material: 'fluff', part: 'middle-pancake', at: 710, duration: 440, x: .5, y: .5439, contact: 'soft', sound: 'craftFluff' },
    { material: 'fluff', part: 'upper-pancake', at: 1200, duration: 440, x: .5, y: .4375, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-syrup', at: 1820, duration: 520, x: .48, y: .47, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'cook', text: 'Bunny Fluff, puffing into golden pancakes…' },
    { at: 1700, stage: 'pour', text: 'Slime Goo, drizzling over the soft stack…' },
    { at: 2620, stage: 'reveal', text: 'Airy pancakes. A glossy green drizzle.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Bunny Fluff becomes three airy pancakes, stacked with soft contacts. Slime Goo becomes their green syrup. The plate is reusable cookware.',
  pattern: 'puff, stack, drizzle', intro: 'Granny warms the pan. The fluff does the rest.',
  finished: 'Fluff inside. Goo over the top. Ready from Granny’s kitchen.',
} satisfies CraftPresentation;
