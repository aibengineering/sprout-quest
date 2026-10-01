import type { CraftPresentation } from '../types';

export default {
  id: 'wyrmfire', model: 'assets/crafting3d/wyrmfire.glb', duration: 3300,
  layers: ['horn', 'scale', 'crystal', 'ember'].map(id => ({ id })),
  roles: { horn: 'Continuous stem & swept focus cage', scale: 'Grip plates & protective focus shell', crystal: 'Faceted focus & pointed lens', ember: 'Warm inner lens & grip bands' },
  targets: [
    { material: 'horn', part: 'horn', at: 160, duration: 430, contact: 'solid', sound: 'tick' },
    { material: 'scale', part: 'scale', at: 850, duration: 430, contact: 'bind', sound: 'thud' },
    { material: 'crystal', part: 'crystal', at: 1490, duration: 410, contact: 'solid', sound: 'tick' },
    { material: 'ember', part: 'ember', at: 2140, duration: 400, contact: 'energy', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Imp Horns form a stem and swept focus cage…' },
    { at: 850, stage: 'plate', text: 'Dragon Scales protect the grip and focus…' },
    { at: 1490, stage: 'set', text: 'Crystal seats inside the horn cage…' },
    { at: 2140, stage: 'warm', text: 'Ember lights the inner lens with a gentle glow…' },
    { at: 2710, stage: 'reveal', text: 'A quiet little hearth for dragonfire.' },
  ],
  sceneLabel: 'Imp Horns form the entire stem and swept cage. Dragon Scales shield the grip and focus. Crystal surrounds an Ember lens.',
  pattern: 'dragonfire, held gently', intro: 'A horn frame. A crystal focus. A warm Ember lens.',
  finished: 'A horn wand with Dragon Scale protection and a Crystal focus holding an Ember lens.',
} satisfies CraftPresentation;
