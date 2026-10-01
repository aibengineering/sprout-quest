import type { CraftPresentation } from '../types';


export default {
  id: 'shroomhood', model: 'assets/crafting3d/shroomhood.glb', duration: 3300,
  layers: [
    ...['cap-mantle', 'cap-left', 'cap-right', 'cap-canopy', 'fang-toggles'].map(id => ({ id })),
  ],
  roles: { cap: 'Spotted canopy, gills & folded mantle', fang: 'Four ivory toggle closures' },
  targets: [
    { material: 'cap', part: 'cap-mantle', at: 200, duration: 500, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-left', at: 380, duration: 500, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-right', at: 560, duration: 500, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-canopy', at: 740, duration: 500, contact: 'soft', sound: 'craftGoo' },
    { material: 'fang', part: 'fang-toggles', at: 1400, duration: 720, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Shroom Caps, folding into a spotty little hood…' },
    { at: 1400, stage: 'binding', text: 'Wolf Fangs, slipping into four snug toggles…' },
    { at: 2500, stage: 'reveal', text: 'A spotted canopy, ready for a woodland wander.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Shroom Caps become a spotted hood with gills and a layered mantle. Wolf Fangs close its front.',
  pattern: 'caps for cover, fangs for closure', intro: 'Spots, soft folds, and four little toggles.',
  finished: 'Shroom Caps overhead. Fang toggles tucked snug.',
} satisfies CraftPresentation;
