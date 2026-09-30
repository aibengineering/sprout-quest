import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/sporewhip-${part}.webp`;

export default {
  id: 'sporewhip', duration: 3200,
  layers: ['fang-grip', 'cap-wraps', 'cap-coils', 'fang-tip'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { fang: 'Ivory grip & hooked lash tip', cap: 'Soft wraps & spotted cap-fiber coils' },
  targets: [
    { material: 'fang', part: 'fang-grip', at: 180, duration: 420, x: .2793, y: .5918, contact: 'solid', sound: 'tick' },
    { material: 'cap', part: 'cap-wraps', at: 760, duration: 480, x: .2988, y: .5635, contact: 'bind', sound: 'craftGoo' },
    { material: 'cap', part: 'cap-coils', at: 1360, duration: 520, x: .5947, y: .4902, contact: 'soft', sound: 'craftFluff' },
    { material: 'fang', part: 'fang-tip', at: 1990, duration: 420, x: .8242, y: .541, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'grip', text: 'A Wolf Fang, settling into the grip…' },
    { at: 760, stage: 'weave', text: 'Shroom Caps, weaving into soft, spotted coils…' },
    { at: 1990, stage: 'tip', text: 'The second fang hooks into the lash tip.' },
    { at: 2650, stage: 'reveal', text: 'Springy coils, with a little bite.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Shroom Cap tissue becomes spotted coils and soft grip wraps. Wolf Fangs form the ivory handle and hooked lash tip.',
  pattern: 'soft caps, a little bite',
  intro: 'Spotted caps and two sharp little fangs.',
  finished: 'Shroom Caps for the spring. Wolf Fangs for the grip and tip.',
} satisfies CraftPresentation;
