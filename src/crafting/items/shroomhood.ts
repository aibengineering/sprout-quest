import type { CraftPresentation } from '../types';


export default {
  id: 'shroomhood', model: 'assets/crafting3d/shroomhood.glb', duration: 3300,
  layers: [
    ...['fluff-lining', 'goo-seams', 'cap-mantle', 'cap-left', 'cap-right', 'cap-canopy', 'fang-ornaments'].map(id => ({ id })),
  ],
  roles: { fluff: 'Quilted lining, sleeves & cloth hem', goo: 'Bound hems & sleeve seams', cap: 'Spotted canopy, gills & folded mantle', fang: 'Small hanging fang charms at one hip' },
  targets: [
    { material: 'fluff', part: 'fluff-lining', at: 120, duration: 480, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-seams', at: 620, duration: 450, contact: 'bind', sound: 'craftGoo' },
    { material: 'cap', part: 'cap-mantle', at: 200, duration: 500, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-left', at: 380, duration: 500, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-right', at: 560, duration: 500, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-canopy', at: 740, duration: 500, contact: 'soft', sound: 'craftGoo' },
    { material: 'fang', part: 'fang-ornaments', at: 1400, duration: 720, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'line', text: 'Bunny Fluff, forming a softly quilted lining…' },
    { at: 180, stage: 'shape', text: 'Shroom Caps, folding into a spotty little hood…' },
    { at: 620, stage: 'seam', text: 'Slime Goo, binding the cloth hems and cuffs…' },
    { at: 1400, stage: 'binding', text: 'Wolf Fangs, tied into little hip charms…' },
    { at: 2500, stage: 'reveal', text: 'A spotted canopy, ready for a woodland wander.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Shroom Caps become a spotted hood with gills and a layered mantle. Soft fluff lines the hood, goo binds its seams and small fang charms hang at one hip.',
  pattern: 'spotted cover, softly lined', intro: 'Spots, soft folds, and small woodland charms.',
  finished: 'A spotted hood, padded lining and little fang ornaments.',
} satisfies CraftPresentation;
