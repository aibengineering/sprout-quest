import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/batcloak-${part}.webp`;

export default {
  id: 'batcloak', duration: 3400,
  layers: [
    ...['wing-back-left', 'wing-back-right', 'wing-lapels', 'wing-collar', 'fang-clasps'].map(id => ({ id, src: src(id) })),
  ],
  complete: src('complete'),
  roles: { wing: 'Scalloped membranes, raised ribs & collar', fang: 'Six ivory cloak clasps' },
  targets: [
    { material: 'wing', part: 'wing-back-left', at: 200, duration: 540, x: .295, y: .469, contact: 'soft', sound: 'craftPull' },
    { material: 'wing', part: 'wing-back-right', at: 400, duration: 540, x: .705, y: .469, contact: 'soft', sound: 'craftPull' },
    { material: 'wing', part: 'wing-lapels', at: 600, duration: 520, x: .5, y: .503, contact: 'soft', sound: 'craftFluff' },
    { material: 'wing', part: 'wing-collar', at: 780, duration: 500, x: .34, y: .312, contact: 'soft', sound: 'craftPull' },
    { material: 'fang', part: 'fang-clasps', at: 1450, duration: 700, x: .535, y: .48, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Bat Wings, unfolding into a scalloped cloak…' },
    { at: 1450, stage: 'binding', text: 'Wolf Fangs, clasping the soft folds…' },
    { at: 2600, stage: 'reveal', text: 'A wing-soft swoosh, fastened for the road.', sound: 'craftPull' },
  ],
  sceneLabel: 'Bat Wings form a ribbed cloak with scalloped hems and a folded collar. Six Wolf Fangs clasp the front.',
  pattern: 'wings that wrap, fangs that fasten', intro: 'Fold a wing. Catch a soft little swoosh.',
  finished: 'Bat membranes for movement. Fang clasps for a snug fit.',
} satisfies CraftPresentation;
