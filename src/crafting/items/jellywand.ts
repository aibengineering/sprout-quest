import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/jellywand-${part}.webp`;

export default {
  id: 'jellywand', duration: 3400,
  layers: ['fluff-spine', 'goo-wraps', 'goo-crown', 'goo-drip'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { fluff: 'Felted cream spine & cushioned grip', goo: 'Springy wraps & wobbly slime crown' },
  targets: [
    { material: 'fluff', part: 'fluff-spine', at: 180, duration: 530, x: .393, y: .483, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-wraps', at: 870, duration: 490, x: .491, y: .483, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'goo-crown', at: 1450, duration: 550, x: .795, y: .472, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'goo-drip', at: 2090, duration: 480, x: .765, y: .586, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'fluff', text: 'Bunny Fluff, felted into a wand-shaped spine…' },
    { at: 870, stage: 'binding', text: 'Slime Goo, wrapping the soft spine…' },
    { at: 1450, stage: 'crown', text: 'A wobbly green crown, settling on top…' },
    { at: 2090, stage: 'drip', text: 'A little goo drip finds its place…' },
    { at: 2780, stage: 'reveal', text: 'A soft little wand with a gooey heart.' },
  ],
  sceneLabel: 'Bunny Fluff is felted into a cream spine and grip. Slime Goo binds it with green wraps and a rounded crown, then settles into a small drip.',
  pattern: 'fluff carries the magic', intro: 'Fluff, finding its shape. Goo, finding its bounce.',
  finished: 'Felted Bunny Fluff, wrapped and crowned in Slime Goo.',
} satisfies CraftPresentation;
