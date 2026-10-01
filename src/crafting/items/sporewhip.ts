import type { CraftPresentation } from '../types';

export default {
  id: 'sporewhip', model: 'assets/crafting3d/sporewhip.glb', duration: 3200,
  layers: ['fang-grip', 'cap-wraps', 'cap-coils', 'fang-tip'].map(id => ({ id })),
  roles: { fang: 'Ivory grip & hooked lash tip', cap: 'Soft wraps & spotted cap-fiber coils' },
  targets: [
    { material: 'fang', part: 'fang-grip', at: 180, duration: 420, contact: 'solid', sound: 'tick' },
    { material: 'cap', part: 'cap-wraps', at: 760, duration: 480, contact: 'bind', sound: 'craftGoo' },
    { material: 'cap', part: 'cap-coils', at: 1360, duration: 520, contact: 'soft', sound: 'craftFluff' },
    { material: 'fang', part: 'fang-tip', at: 1990, duration: 420, contact: 'solid', sound: 'tick' },
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
