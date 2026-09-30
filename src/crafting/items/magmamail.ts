import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/magmamail-${part}.webp`;
const clasps = [
  { x: .209, y: .426, clip: 'inset(38% 75% 53% 17%)' },
  { x: .797, y: .426, clip: 'inset(38% 16% 53% 75%)' },
  { x: .342, y: .465, clip: 'inset(42% 62% 49% 30%)' },
  { x: .664, y: .465, clip: 'inset(42% 30% 49% 62%)' },
  { x: .342, y: .690, clip: 'inset(65% 62% 27% 30%)' },
  { x: .664, y: .690, clip: 'inset(65% 30% 27% 62%)' },
];

export default {
  id: 'magmamail', duration: 3900,
  layers: [
    { id: 'iron-shell', src: src('iron-shell') },
    { id: 'ember-seams', src: src('ember-seams') },
    { id: 'left-horns', src: src('left-horns') },
    { id: 'right-horns', src: src('right-horns') },
    ...clasps.map((clasp, i) => ({ id: `crystal-${i}`, src: src('crystal-clasps'), clip: clasp.clip })),
  ],
  complete: src('complete'),
  roles: { iron: 'Shaped shell & shoulder sockets', ember: 'Warm channels through the iron',
    horn: 'Curved shoulder guards', crystal: 'Six cooling fasteners' },
  targets: [
    { material: 'iron', part: 'iron-shell', at: 180, duration: 510, x: .50, y: .53, contact: 'solid', sound: 'craftStitch' },
    { material: 'ember', part: 'ember-seams', at: 810, duration: 490, x: .50, y: .54, contact: 'energy', sound: 'craftGoo' },
    { material: 'horn', part: 'left-horns', at: 1460, duration: 450, x: .123, y: .278, contact: 'solid', sound: 'craftFluff' },
    { material: 'horn', part: 'right-horns', at: 1660, duration: 450, x: .877, y: .278, contact: 'solid', sound: 'craftFluff' },
    ...clasps.map((clasp, i) => ({ material: 'crystal' as const, part: `crystal-${i}`, at: 2280 + i * 80,
      duration: 380, x: clasp.x, y: clasp.y, contact: 'solid' as const, sound: 'craftStitch' as const })),
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
