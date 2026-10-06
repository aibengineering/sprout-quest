import type { CraftPresentation } from '../types';

export default {
  id: 'sporewand', model: 'assets/crafting3d/sporewand.glb', duration: 3200,
  layers: ['cap-stem', 'cap-crown', 'cap-gills', 'fang-braces'].map(id => ({ id })),
  roles: { cap: 'Rolled cap-flesh shaft, crown & gills', fang: 'Three ivory crown braces' },
  targets: [
    { material: 'cap', part: 'cap-stem', at: 180, duration: 520, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-crown', at: 800, duration: 520, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-gills', at: 1420, duration: 460, contact: 'bind', sound: 'craftGoo' },
    { material: 'fang', part: 'fang-braces', at: 2020, duration: 420, contact: 'solid', sound: 'tick' },
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
