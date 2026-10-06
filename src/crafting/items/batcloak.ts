import type { CraftPresentation } from '../types';

export default {
  id: 'batcloak', model: 'assets/crafting3d/batcloak.glb', duration: 3650,
  layers: ['fluff-lining', 'goo-seams', 'wing-back-left', 'wing-back-right', 'wing-lapels', 'wing-collar', 'copper-clasp', 'fang-ornaments'].map(id => ({ id })),
  roles: { fluff: 'Soft lining, sleeves & cloth hem', goo: 'Bound hems & cuffs',
    wing: 'Scalloped cape, diagonal folds & shoulder collar', copper: 'Round shoulder clasp', fang: 'Small hanging shoulder ornaments' },
  targets: [
    { material: 'fluff', part: 'fluff-lining', at: 120, duration: 480, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-seams', at: 620, duration: 450, contact: 'bind', sound: 'craftGoo' },
    { material: 'wing', part: 'wing-back-left', at: 780, duration: 500, contact: 'soft', sound: 'craftPull' },
    { material: 'wing', part: 'wing-back-right', at: 960, duration: 500, contact: 'soft', sound: 'craftPull' },
    { material: 'wing', part: 'wing-lapels', at: 1140, duration: 480, contact: 'soft', sound: 'craftPull' },
    { material: 'wing', part: 'wing-collar', at: 1320, duration: 480, contact: 'soft', sound: 'craftFluff' },
    { material: 'copper', part: 'copper-clasp', at: 1870, duration: 440, contact: 'solid', sound: 'craftStitch' },
    { material: 'fang', part: 'fang-ornaments', at: 2220, duration: 440, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'line', text: 'Bunny Fluff, stitched into a soft cloak lining…' },
    { at: 620, stage: 'binding', text: 'Slime Goo, binding hems and cuffs…' },
    { at: 780, stage: 'drape', text: 'Bat Wings, folded into a sweeping cape…' },
    { at: 1870, stage: 'fasten', text: 'Copper, shaped into a round shoulder clasp…' },
    { at: 2220, stage: 'adorn', text: 'Wolf Fangs, tied on as little shoulder ornaments…' },
    { at: 2880, stage: 'reveal', text: 'A soft lining. A wing-light swoosh.', sound: 'craftPull' },
  ],
  sceneLabel: 'Fluff lines the cloak and goo binds the seams. Bat Wings form scalloped drapes, an overlapping front fold and a collar. A copper shoulder clasp holds the cloak; small fangs hang beside it as ornaments.',
  pattern: 'lined for comfort, clasped for travel', intro: 'Soft cloth, sweeping wings and a little copper shine.',
  finished: 'A lined wing cloak with a copper shoulder clasp and small fang ornaments.',
} satisfies CraftPresentation;
