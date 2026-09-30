import type { CraftPresentation } from '../types';

export default {
  id: 'dragontail', duration: 3300,
  layers: ['pine', 'horn', 'scale', 'ember'].map(id => ({ id, src: `assets/crafting/dragontail-${id}.webp` })),
  complete: 'assets/crafting/dragontail-complete.webp',
  roles: { pine: 'Carved grip with visible grain', horn: 'Grip ferrules, pommel & lash tip', scale: 'Three linked, flexible lash coils', ember: 'Warm grip bands & coil seams' },
  targets: [
    { material: 'pine', part: 'pine', at: 180, duration: 420, x: .36, y: .31, contact: 'solid', sound: 'chop' },
    { material: 'horn', part: 'horn', at: 830, duration: 400, x: .474, y: .314, contact: 'solid', sound: 'tick' },
    { material: 'scale', part: 'scale', at: 1450, duration: 460, x: .654, y: .278, contact: 'bind', sound: 'thud' },
    { material: 'ember', part: 'ember', at: 2130, duration: 400, x: .659, y: .613, contact: 'energy', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'carve', text: 'Pine becomes a smooth, grained grip…' },
    { at: 830, stage: 'fit', text: 'Imp Horns become ferrules and a tapered lash tip…' },
    { at: 1450, stage: 'coil', text: 'Dragon Scales link into three springy coils…' },
    { at: 2130, stage: 'warm', text: 'Ember warms the bands and coil seams…' },
    { at: 2700, stage: 'reveal', text: 'A little dragon tail, ready to unfurl.' },
  ],
  sceneLabel: 'Pine forms the grip. Imp Horns reinforce the grip and tip. Dragon Scales form the flexible coils, with Ember in their seams.',
  pattern: 'scales with a little spring', intro: 'Carve the grip. Link the scales. Let it settle.',
  finished: 'Pine in your hand, horn at the ends, and a scaled lash with warm Ember seams.',
} satisfies CraftPresentation;
