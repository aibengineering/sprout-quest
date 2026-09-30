import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/glimmerwhip-${part}.webp`;
export default {
  id: 'glimmerwhip', duration: 3500,
  layers: ['core-anchor', 'wing-grip', 'wing-lash', 'jelly-channels'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { core: 'Golem Core grip anchor', wing: 'Bat Wing grip & flexible lash', glimmer: 'Glimmer Jelly lash channels' },
  targets: [
    { material: 'core', part: 'core-anchor', at: 180, duration: 430, x: .1465, y: .3672, contact: 'solid', sound: 'craftStitch' },
    { material: 'wing', part: 'wing-grip', at: 720, duration: 470, x: .377, y: .3359, contact: 'soft', sound: 'craftFluff' },
    { material: 'wing', part: 'wing-lash', at: 1220, duration: 470, x: .7217, y: .5898, contact: 'soft', sound: 'craftFluff' },
    { material: 'glimmer', part: 'jelly-channels', at: 1800, duration: 500, x: .73, y: .57, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'anchor', text: 'A Golem Core, nestled at the grip…' },
    { at: 680, stage: 'fold', text: 'Bat Wing membrane, folding into grip and lash…' },
    { at: 1770, stage: 'binding', text: 'Glimmer Jelly, flowing through the membrane channels…' },
    { at: 2700, stage: 'reveal', text: 'A soft lash with a trail of glimmer.', sound: 'craftStitch' },
  ],
  sceneLabel: 'A Golem Core anchors the grip. Bat Wing membrane forms the grip wrap and coiled lash. Glimmer Jelly fills the channels with soft light.',
  pattern: 'soft membrane, a glimmering trail', intro: 'A core, a fold, a little jelly light.',
  finished: 'Wing membrane carries the glimmer. A Golem Core anchors the grip.',
} satisfies CraftPresentation;
