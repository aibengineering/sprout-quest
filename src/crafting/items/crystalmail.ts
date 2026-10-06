import type { CraftPresentation } from '../types';

export default {
  id: 'crystalmail', model: 'assets/crafting3d/crystalmail.glb', duration: 3500,
  layers: ['fluff-lining', 'iron-frame', 'crystal-scales', 'left-crystal', 'right-crystal', 'stone-anchors'].map((id) => ({ id })),
  roles: { fluff: 'Quilted lining, sleeves & cloth hem', iron: 'Frame, sockets & edge rails', crystal: 'Faceted scales & shoulder crystals', stone: 'Matte socket anchors' },
  targets: [
    { material: 'fluff', part: 'fluff-lining', at: 120, duration: 480, contact: 'soft', sound: 'craftFluff' },
    { material: 'iron', part: 'iron-frame', at: 180, duration: 480, contact: 'solid', sound: 'craftStitch' },
    { material: 'crystal', part: 'crystal-scales', at: 720, duration: 520, contact: 'energy', sound: 'tick' },
    { material: 'crystal', part: 'left-crystal', at: 1080, duration: 520, contact: 'energy', sound: 'tick' },
    { material: 'crystal', part: 'right-crystal', at: 1340, duration: 520, contact: 'energy', sound: 'tick' },
    { material: 'stone', part: 'stone-anchors', at: 1940, duration: 480, contact: 'solid', sound: 'step' },
  ],
  phases: [
    { at: 0, stage: 'line', text: 'Bunny Fluff, forming a softly quilted lining…' },
    { at: 180, stage: 'forge', text: 'Iron rails and sockets, forming a frame…' },
    { at: 680, stage: 'facet', text: 'Crystal scales, chiming into their seats…' },
    { at: 1900, stage: 'setting', text: 'Stone anchors, holding each socket steady…' },
    { at: 2660, stage: 'reveal', text: 'Cool facets. A frame that holds.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Iron makes the frame and shoulder sockets. Crystal becomes faceted scales and shoulder crystals. Stone anchors reinforce the sockets, and fluff pads the lining and sleeves.',
  pattern: 'every facet, firmly set', intro: 'A little mountain light, made wearable.',
  finished: 'Crystal plates in an iron frame, stone anchors and a padded cloth lining.',
} satisfies CraftPresentation;
