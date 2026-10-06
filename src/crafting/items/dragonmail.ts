import type { CraftPresentation } from '../types';

export default {
  id: 'dragonmail', model: 'assets/crafting3d/dragonmail.glb', duration: 4200,
  layers: [
    { id: 'iron-shell' },
    { id: 'back-scales' },
    { id: 'front-scales' },
    { id: 'left-mantle' },
    { id: 'right-mantle' },
    { id: 'ember-seams' },
    { id: 'crystal-clasps' },
  ],
  roles: { iron: 'Inner shell, sleeves & crown rim', scale: 'Overlapping scale panels & crown',
    ember: 'Warm seams between the scales', crystal: 'Six bright finishing clasps' },
  targets: [
    { material: 'iron', part: 'iron-shell', at: 180, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'scale', part: 'back-scales', at: 780, duration: 460, contact: 'solid', sound: 'craftFluff' },
    { material: 'scale', part: 'front-scales', at: 990, duration: 470, contact: 'solid', sound: 'craftFluff' },
    { material: 'scale', part: 'left-mantle', at: 1230, duration: 460, contact: 'solid', sound: 'craftFluff' },
    { material: 'scale', part: 'right-mantle', at: 1460, duration: 460, contact: 'solid', sound: 'craftFluff' },
    { material: 'ember', part: 'ember-seams', at: 2060, duration: 480, contact: 'energy', sound: 'craftGoo' },
    { material: 'crystal', part: 'crystal-clasps', at: 2710, duration: 620, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Iron, forming the shell and open crown…' },
    { at: 780, stage: 'overlap', text: 'Four Dragon Scales, worked into overlapping panels…' },
    { at: 2060, stage: 'warm', text: 'Embers, settling between the scales…' },
    { at: 2710, stage: 'fasten', text: 'Six crystal clasps, fastening everything together…' },
    { at: 3570, stage: 'reveal', text: 'A dragon’s scales, ready for your next adventure.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Iron forms the inner shell and crown. Four Dragon Scales are worked into overlapping front, back, shoulder, and crown panels. Embers warm the seams and six crystals fasten the armor.',
  pattern: 'scales for a small brave sprout', intro: 'A dragon’s gift, made into something you can wear.',
  finished: 'Dragon Scales over iron, warm ember seams, and crystal clasps.',
} satisfies CraftPresentation;
