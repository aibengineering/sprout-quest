import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/jellywand-${part}.webp`;

export default {
  id: 'jellywand', duration: 3400,
  layers: ['goo-rod', 'fluff-grip', 'goo-wraps', 'goo-crown', 'goo-drip'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { goo: 'Hardened rod, springy wraps & wobbly slime crown', fluff: 'Soft felted grip wrap' },
  targets: [
    { material: 'goo', part: 'goo-rod', at: 180, duration: 500, x: .45, y: .483, contact: 'solid', sound: 'craftGoo' },
    { material: 'fluff', part: 'fluff-grip', at: 780, duration: 450, x: .167, y: .482, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-wraps', at: 1330, duration: 440, x: .49, y: .483, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'goo-crown', at: 1850, duration: 500, x: .795, y: .472, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'goo-drip', at: 2420, duration: 400, x: .765, y: .586, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'rod', text: 'Slime Goo, setting into one glassy green rod…' },
    { at: 780, stage: 'grip', text: 'Bunny Fluff, felted into a soft grip…' },
    { at: 1330, stage: 'binding', text: 'Goo wraps, hugging the rod…' },
    { at: 1850, stage: 'crown', text: 'A wobbly green crown, settling on top…' },
    { at: 2420, stage: 'drip', text: 'A little goo drip finds its place…' },
    { at: 2900, stage: 'reveal', text: 'A bouncy little wand with a gooey heart.' },
  ],
  sceneLabel: 'Slime Goo sets into a solid green rod. Bunny Fluff is felted into a soft grip near the hand. More goo binds the rod with wraps and a rounded crown, then settles into a small drip.',
  pattern: 'goo carries the magic', intro: 'Goo, finding its shape. Fluff, finding your hand.',
  finished: 'A hardened Slime Goo rod with a Bunny Fluff grip, crowned in wobbly goo.',
} satisfies CraftPresentation;
