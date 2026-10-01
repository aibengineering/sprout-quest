import type { CraftPresentation } from '../types';

export default {
  id: 'wyrmbreaker', model: 'assets/crafting3d/wyrmbreaker.glb', duration: 3400,
  layers: ['iron', 'scale', 'crystal', 'ember'].map(id => ({ id })),
  roles: { iron: 'Striking frame, shaft & collars', scale: 'Overlapping head & grip plates', crystal: 'Two faceted striking faces', ember: 'Inset hearth & warm seams' },
  targets: [
    { material: 'iron', part: 'iron', at: 180, duration: 460, contact: 'solid', sound: 'clink' },
    { material: 'scale', part: 'scale', at: 900, duration: 420, contact: 'bind', sound: 'thud' },
    { material: 'crystal', part: 'crystal', at: 1550, duration: 400, contact: 'solid', sound: 'tick' },
    { material: 'ember', part: 'ember', at: 2200, duration: 400, contact: 'energy', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'forge', text: 'Iron makes a sturdy spine and striking frame…' },
    { at: 900, stage: 'plate', text: 'Dragon Scales overlap into a protective shell…' },
    { at: 1550, stage: 'set', text: 'Crystal caps the two striking faces…' },
    { at: 2200, stage: 'warm', text: 'Ember settles into the little hearth…' },
    { at: 2780, stage: 'reveal', text: 'Heavy in the hand. Warm at the heart.' },
  ],
  sceneLabel: 'An iron hammer frame receives Dragon Scale plates, two Crystal striking faces and an inset Ember hearth.',
  pattern: 'a dragon-hearted hammer', intro: 'A sturdy spine. A scaled shell. A warm heart.',
  finished: 'Dragon Scales protect the iron frame; Crystal faces and an Ember hearth finish the hammer.',
} satisfies CraftPresentation;
