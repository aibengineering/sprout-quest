import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/coppersword-${part}.webp`;

export default {
  id: 'coppersword', duration: 3200,
  layers: ['bark-grip', 'copper-blade', 'copper-guard', 'copper-rivets'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { bark: 'Layered bark grip', copper: 'Folded blade, guard & rivets' },
  targets: [
    { material: 'bark', part: 'bark-grip', at: 200, duration: 480, x: .2676, y: .7246, contact: 'solid', sound: 'craftStitch' },
    { material: 'copper', part: 'copper-blade', at: 800, duration: 430, x: .5352, y: .4629, contact: 'solid', sound: 'clink' },
    { material: 'copper', part: 'copper-guard', at: 1370, duration: 430, x: .2812, y: .709, contact: 'solid', sound: 'clink' },
    { material: 'copper', part: 'copper-rivets', at: 1940, duration: 430, x: .3174, y: .6895, contact: 'solid', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'grip', text: 'Oak bark, layered into a comfortable grip…' },
    { at: 800, stage: 'forge', text: 'Copper, folding into a bright, keen blade…' },
    { at: 1940, stage: 'fasten', text: 'Small copper rivets seat the guard.' },
    { at: 2600, stage: 'reveal', text: 'A warm copper edge, ready for the woods.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Bark from Oak Logs forms the layered grip. Copper Ore becomes the folded blade, guard, pommel and rivets.',
  pattern: 'bark in hand, copper at the edge',
  intro: 'A bright edge begins with familiar materials.',
  finished: 'Copper for the edge. Bark for a steady grip.',
} satisfies CraftPresentation;
