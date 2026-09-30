import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/crystalsword-${part}.webp`;
export default {
  id: 'crystalsword', duration: 3000,
  layers: ['pine-grip', 'iron-cradle', 'crystal-edge'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { pine: 'Pine grip & end grain', iron: 'Guard, pommel & blade cradle', crystal: 'Faceted cutting edge' },
  targets: [
    { material: 'pine', part: 'pine-grip', at: 180, duration: 450, x: .1943, y: .5, contact: 'solid', sound: 'craftStitch' },
    { material: 'iron', part: 'iron-cradle', at: 700, duration: 430, x: .25, y: .5, contact: 'solid', sound: 'craftStitch' },
    { material: 'crystal', part: 'crystal-edge', at: 1240, duration: 480, x: .624, y: .5, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Pine Wood, shaped into a comfortable grip…' },
    { at: 680, stage: 'mount', text: 'Iron, cradling the edge and capping the grip…' },
    { at: 1220, stage: 'facet', text: 'Crystal facets, settling into the iron cradle…' },
    { at: 2250, stage: 'reveal', text: 'A bright edge with a warm pine grip.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Pine Wood forms the grip. Iron forms the guard, pommel and cradle. Crystal becomes the faceted blade.',
  pattern: 'a bright edge, a warm grip', intro: 'Pine, iron, and a little crystal light.',
  finished: 'A pine grip. An iron cradle. A crystal edge.',
} satisfies CraftPresentation;
