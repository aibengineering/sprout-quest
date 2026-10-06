import type { CraftPresentation } from '../types';

export default {
  id: 'rockcandy', model: 'assets/crafting3d/rockcandy.glb', eyebrow: 'Granny’s Kitchen', duration: 3300,
  layers: ['plate', 'pebbles-back', 'pebbles-front', 'copper-sticks'].map((id) => ({ id })),
  roles: { stone: 'Sugary pebble candies, piled high', copper: 'Amber crystals, grown up two sticks' },
  targets: [
    { material: 'stone', part: 'pebbles-back', at: 220, duration: 460, contact: 'solid', sound: 'craftFluff' },
    { material: 'stone', part: 'pebbles-front', at: 760, duration: 460, contact: 'solid', sound: 'craftFluff' },
    { material: 'copper', part: 'copper-sticks', at: 1440, duration: 520, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'boil', text: 'Stone, boiled down into sugary pebbles…' },
    { at: 1320, stage: 'grow', text: 'Copper, a pinch of shine: amber crystals creep up the sticks…', sound: 'craftStitch' },
    { at: 2500, stage: 'reveal', text: 'Crunchy Rock Candy. Pip’s favourite.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Stone becomes a pile of sugary pebble candies on the plate. Copper becomes the amber crystals on two sticks. The plate is reusable; the sticks are handles.',
  pattern: 'pebbles below, crystals above', intro: 'Pip’s recipe, crunchy enough for a miner.',
  finished: 'Stone pebble candy and copper crystal sticks, ready to crunch.',
} satisfies CraftPresentation;
