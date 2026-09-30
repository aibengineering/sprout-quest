import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/sporewand-${part}.webp`;

export default {
  id: 'sporewand', duration: 3200,
  layers: ['cap-stem', 'cap-crown', 'cap-gills', 'fang-braces'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { cap: 'Rolled cap-flesh shaft, crown & gills', fang: 'Three ivory crown braces' },
  targets: [
    { material: 'cap', part: 'cap-stem', at: 180, duration: 520, x: .3906, y: .6201, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-crown', at: 800, duration: 520, x: .6924, y: .3242, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-gills', at: 1420, duration: 460, x: .6797, y: .3379, contact: 'bind', sound: 'craftGoo' },
    { material: 'fang', part: 'fang-braces', at: 2020, duration: 420, x: .6494, y: .3516, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'shaft', text: 'Soft cap flesh, rolling into a pale shaft…' },
    { at: 800, stage: 'crown', text: 'Shroom Caps, opening into a spotted crown…' },
    { at: 2020, stage: 'brace', text: 'Three Wolf Fangs, cupping the crown.' },
    { at: 2650, stage: 'reveal', text: 'A tiny mushroom, ready to send its spores.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Shroom Caps form a rolled tissue shaft, spotted mushroom crown and gills. Three Wolf Fangs brace the crown underneath.',
  pattern: 'caps above, fangs beneath',
  intro: 'Soft mushroom tissue. Strong ivory braces.',
  finished: 'A cap-flesh wand with three fang braces. Ready to bloom.',
} satisfies CraftPresentation;
