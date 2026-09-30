import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/shroomhood-${part}.webp`;
const toggles = [-1, 1].flatMap((side) => [0, 1].map((row) => ({
  id: `fang-${side < 0 ? 'left' : 'right'}-${row}`,
  x: side < 0 ? .462 : .538, y: row === 0 ? .697 : .778,
  clip: `inset(${row === 0 ? 0 : 73.5}% ${side < 0 ? 50 : 0}% ${row === 0 ? 26.5 : 0}% ${side < 0 ? 0 : 50}%)`,
})));

export default {
  id: 'shroomhood', duration: 3300,
  layers: [
    ...['cap-mantle', 'cap-left', 'cap-right', 'cap-canopy'].map(id => ({ id, src: src(id) })),
    ...toggles.map(t => ({ id: t.id, src: src('fang-toggles'), clip: t.clip })),
  ],
  complete: src('complete'),
  roles: { cap: 'Spotted canopy, gills & folded mantle', fang: 'Four ivory toggle closures' },
  targets: [
    { material: 'cap', part: 'cap-mantle', at: 200, duration: 500, x: .5, y: .729, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-left', at: 380, duration: 500, x: .37, y: .726, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-right', at: 560, duration: 500, x: .63, y: .726, contact: 'soft', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-canopy', at: 740, duration: 500, x: .5, y: .278, contact: 'soft', sound: 'craftGoo' },
    ...toggles.map((t, i) => ({ material: 'fang' as const, part: t.id, at: 1400 + i * 160,
      duration: 380, x: t.x, y: t.y, contact: 'solid' as const, sound: 'craftStitch' as const })),
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
