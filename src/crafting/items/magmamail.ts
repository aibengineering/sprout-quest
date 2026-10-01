import type { CraftPresentation } from '../types';

export default {
  id: 'magmamail', model: 'assets/crafting3d/magmamail.glb', duration: 3900,
  layers: [
    { id: 'iron-shell' },
    { id: 'ember-seams' },
    { id: 'left-horns' },
    { id: 'right-horns' },
    { id: 'crystal-clasps' },
  ],
  roles: { iron: 'Shaped shell & shoulder sockets', ember: 'Warm channels through the iron',
    horn: 'Curved shoulder guards', crystal: 'Six cooling fasteners' },
  targets: [
    { material: 'iron', part: 'iron-shell', at: 180, duration: 510, contact: 'solid', sound: 'craftStitch' },
    { material: 'ember', part: 'ember-seams', at: 810, duration: 490, contact: 'energy', sound: 'craftGoo' },
    { material: 'horn', part: 'left-horns', at: 1460, duration: 450, contact: 'solid', sound: 'craftFluff' },
    { material: 'horn', part: 'right-horns', at: 1660, duration: 450, contact: 'solid', sound: 'craftFluff' },
    { material: 'crystal', part: 'crystal-clasps', at: 2280, duration: 640, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Iron, pressed into a sturdy little shell…' },
    { at: 810, stage: 'warm', text: 'Embers, warming the channels…' },
    { at: 1460, stage: 'guard', text: 'Imp Horns, seated in the shoulder sockets…' },
    { at: 2280, stage: 'fasten', text: 'Crystal fasteners, clicking into place…' },
    { at: 3150, stage: 'reveal', text: 'Warm seams. Cool crystal. Ready to wear.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Iron becomes the shell and shoulder sockets. Embers fill its channels, four Imp Horns guard the shoulders, and six crystals fasten the mail.',
  pattern: 'a little warmth for the road', intro: 'Iron, embers, horns, and a cool crystal finish.',
  finished: 'Iron holds. Horns guard. Embers warm. Crystal fastens.',
} satisfies CraftPresentation;
