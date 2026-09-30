import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/ironplate-${part}.webp`;

export default {
  id: 'ironplate', duration: 3650,
  layers: ['pine-braces', 'iron-shell', 'iron-helmet', 'stone-guards', 'copper-rivets'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { pine: 'Side braces & helmet ridge', iron: 'Layered cuirass, shoulders & open helm', stone: 'Shoulder & waist guards', copper: 'Rivets & neck clasp' },
  targets: [
    { material: 'pine', part: 'pine-braces', at: 180, duration: 470, x: 0.652, y: 0.656, contact: 'solid', sound: 'step' },
    { material: 'iron', part: 'iron-shell', at: 660, duration: 480, x: 0.5, y: 0.74, contact: 'solid', sound: 'craftStitch' },
    { material: 'iron', part: 'iron-helmet', at: 1050, duration: 480, x: 0.5, y: 0.27, contact: 'solid', sound: 'craftStitch' },
    { material: 'stone', part: 'stone-guards', at: 1480, duration: 500, x: 0.5, y: 0.857, contact: 'solid', sound: 'step' },
    { material: 'copper', part: 'copper-rivets', at: 2020, duration: 480, x: 0.5, y: 0.686, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'brace', text: 'Pine braces, cut to fit…' },
    { at: 640, stage: 'forge', text: 'Iron bands and an open helm, settling into shape…' },
    { at: 1460, stage: 'setting', text: 'Stone guards, seated at shoulders and waist…' },
    { at: 2000, stage: 'binding', text: 'Copper rivets, fastening the layers…' },
    { at: 2780, stage: 'reveal', text: 'Four materials. One sturdy suit.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Pine forms side braces and a helmet ridge. Iron forms overlapping armor and an open helm. Stone guards and copper rivets finish the suit.',
  pattern: 'braced, plated, riveted', intro: 'Iron for strength. Pine for support.',
  finished: 'Iron plates, pine braces, stone guards and warm copper rivets.',
} satisfies CraftPresentation;
