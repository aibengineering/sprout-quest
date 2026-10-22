import type { CraftPresentation } from '../types';

export default {
  id: 'sporewand', model: 'assets/crafting3d/sporewand.glb', duration: 3700,
  layers: ['pine-handle', 'cap-crown', 'cap-gills', 'fang-braces', 'lucky-clover'].map(id => ({ id })),
  roles: { pine: 'Carved wooden handle', cap: 'Spotted mushroom crown & gills', fang: 'Three ivory crown braces', clover: 'Magical finishing charm' },
  targets: [
    { material: 'pine', part: 'pine-handle', at: 180, duration: 520, contact: 'solid', sound: 'craftStitch' },
    { material: 'cap', part: 'cap-crown', at: 800, duration: 520, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-gills', at: 1420, duration: 460, contact: 'bind', sound: 'craftGoo' },
    { material: 'fang', part: 'fang-braces', at: 2020, duration: 420, contact: 'solid', sound: 'tick' },
    { material: 'clover', part: 'lucky-clover', at: 2540, duration: 360, contact: 'bind', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shaft', text: 'Pine Logs, carving into a wooden handle…' },
    { at: 800, stage: 'crown', text: 'Shroom Caps, opening into a spotted crown…' },
    { at: 2020, stage: 'brace', text: 'Three Wolf Fangs, cupping the crown.' },
    { at: 2540, stage: 'charm', text: 'One Lucky Clover: the little touch of magic.' },
    { at: 3100, stage: 'reveal', text: 'Wood, fangs and mushroom, brought to life by a clover.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Pine Logs form the handle. Shroom Caps form the crown and gills, supported by three Wolf Fangs. A Lucky Clover finishes the magical head.',
  pattern: 'a touch of magic',
  intro: 'A pine handle, fang supports, and one magical clover.',
  finished: 'A mushroom wand on a pine handle, braced with fangs and touched with clover magic.',
} satisfies CraftPresentation;
