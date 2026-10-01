import type { CraftPresentation } from '../types';
export default {
  id: 'crystalsword', model: 'assets/crafting3d/crystalsword.glb', duration: 3000,
  layers: ['glimwood-grip', 'iron-cradle', 'crystal-edge'].map(id => ({ id })),
  roles: { glimwood: 'Glimmerwood grip & end grain', iron: 'Guard, pommel & blade cradle', crystal: 'Faceted cutting edge' },
  targets: [
    { material: 'glimwood', part: 'glimwood-grip', at: 180, duration: 450, contact: 'solid', sound: 'craftStitch' },
    { material: 'iron', part: 'iron-cradle', at: 700, duration: 430, contact: 'solid', sound: 'craftStitch' },
    { material: 'crystal', part: 'crystal-edge', at: 1240, duration: 480, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Glimmerwood, shaped into a softly glowing grip…' },
    { at: 680, stage: 'mount', text: 'Iron, cradling the edge and capping the grip…' },
    { at: 1220, stage: 'facet', text: 'Crystal facets, settling into the iron cradle…' },
    { at: 2250, stage: 'reveal', text: 'A bright edge with a glimmering grip.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Glimmerwood forms the grip. Iron forms the guard, pommel and cradle. Crystal becomes the faceted blade.',
  pattern: 'a bright edge, a glowing grip', intro: 'Glimmerwood, iron, and a little crystal light.',
  finished: 'A Glimmerwood grip. An iron cradle. A crystal edge.',
} satisfies CraftPresentation;
