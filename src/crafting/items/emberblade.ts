import type { CraftPresentation } from '../types';

export default {
  id: 'emberblade', duration: 3300,
  layers: ['iron', 'horn', 'crystal', 'ember'].map(id => ({ id, src: `assets/crafting/emberblade-${id}.webp` })),
  complete: 'assets/crafting/emberblade-complete.webp',
  roles: { iron: 'Forged blade & grip', horn: 'Swept guard & grip rings', crystal: 'Four faceted blade channels', ember: 'Warm edge inlays & pommel' },
  targets: [
    { material: 'iron', part: 'iron', at: 160, duration: 420, x: .54, y: .5, contact: 'solid', sound: 'clink' },
    { material: 'horn', part: 'horn', at: 850, duration: 400, x: .24, y: .38, contact: 'solid', sound: 'tick' },
    { material: 'crystal', part: 'crystal', at: 1450, duration: 430, x: .507, y: .5, contact: 'solid', sound: 'tick' },
    { material: 'ember', part: 'ember', at: 2100, duration: 430, x: .59, y: .44, contact: 'energy', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'forge', text: 'Iron settles into a broad, keen blade…' },
    { at: 850, stage: 'guard', text: 'Imp Horns sweep into a protective guard…' },
    { at: 1450, stage: 'set', text: 'Crystal seats in four clean facets…' },
    { at: 2100, stage: 'warm', text: 'Ember fills the edge channels with warmth…' },
    { at: 2700, stage: 'reveal', text: 'A steady flame, held in iron.' },
  ],
  sceneLabel: 'Iron forms the blade and grip. Imp Horns form the guard. Crystal facets sit between Ember edge inlays.',
  pattern: 'a steady flame', intro: 'Iron, horn, crystal, ember. One lasting edge.',
  finished: 'An iron blade, guarded by horn, with crystal facets and warm Ember channels.',
} satisfies CraftPresentation;
