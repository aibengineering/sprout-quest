import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/barkvest-${part}.webp`;
const buttons = [-1, 1].flatMap((side) => [0, 1, 2].map((row) => ({
  id: `stone-${side < 0 ? 'left' : 'right'}-${row}`,
  x: side < 0 ? .465 : .535, y: .40 + row * .135,
  clip: `inset(${row === 0 ? 0 : row === 1 ? 47 : 60.5}% ${side < 0 ? 50 : 0}% ${row === 0 ? 53 : row === 1 ? 39.5 : 0}% ${side < 0 ? 0 : 50}%)`,
})));

export default {
  id: 'barkvest', duration: 3400,
  layers: [
    ...['oak-back', 'oak-left', 'oak-right'].map(id => ({ id, src: src(id) })),
    { id: 'shoulder-left', src: src('oak-shoulders'), clip: 'inset(0 50% 0 0)' },
    { id: 'shoulder-right', src: src('oak-shoulders'), clip: 'inset(0 0 0 50%)' },
    ...buttons.map(b => ({ id: b.id, src: src('stone-fasteners'), clip: b.clip })),
  ],
  complete: src('complete'),
  roles: { bark: 'Oak shingles & end grain shoulders', stone: 'Six smooth stone fasteners' },
  targets: [
    { material: 'bark', part: 'oak-back', at: 180, duration: 480, x: .5, y: .5, contact: 'solid', sound: 'craftFluff' },
    { material: 'bark', part: 'oak-left', at: 320, duration: 480, x: .349, y: .519, contact: 'solid', sound: 'craftStitch' },
    { material: 'bark', part: 'oak-right', at: 460, duration: 480, x: .651, y: .519, contact: 'solid', sound: 'craftStitch' },
    { material: 'bark', part: 'shoulder-left', at: 600, duration: 480, x: .14, y: .437, contact: 'solid', sound: 'craftFluff' },
    { material: 'bark', part: 'shoulder-right', at: 740, duration: 480, x: .86, y: .437, contact: 'solid', sound: 'craftFluff' },
    ...buttons.map((b, i) => ({ material: 'stone' as const, part: b.id, at: 1300 + i * 125,
      duration: 380, x: b.x, y: b.y, contact: 'solid' as const, sound: 'craftStitch' as const })),
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Oak Logs, split into overlapping shingles…' },
    { at: 1300, stage: 'binding', text: 'Smooth stones, seating each wooden closure…' },
    { at: 2600, stage: 'reveal', text: 'Warm oak grain. Six snug stone buttons.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Oak Logs form overlapping panels and end grain shoulders. Six stones fasten the front.',
  pattern: 'oak grain, snug stone', intro: 'A little oak. A pocket of smooth stones.',
  finished: 'Oak for shelter. Stone to hold it close.',
} satisfies CraftPresentation;
