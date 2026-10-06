import type { CraftPresentation } from '../types';

export default {
  id: 'crystalheart', model: 'assets/crafting3d/crystalheart.glb', duration: 3450,
  layers: ['left-wing', 'right-wing', 'wing-loop', 'glimmer-heart', 'clover-seal'].map(id => ({ id })),
  roles: { wing: 'Two veined membranes & a folded loop', glimmer: 'Glossy, lavender jelly heart', clover: 'One green clover seal' },
  targets: [
    { material: 'wing', part: 'left-wing', at: 180, duration: 520, contact: 'soft', sound: 'craftFluff' },
    { material: 'wing', part: 'right-wing', at: 390, duration: 520, contact: 'soft', sound: 'craftFluff' },
    { material: 'wing', part: 'wing-loop', at: 600, duration: 480, contact: 'bind', sound: 'craftStitch' },
    { material: 'glimmer', part: 'glimmer-heart', at: 1270, duration: 560, contact: 'bind', sound: 'craftGoo' },
    { material: 'clover', part: 'clover-seal', at: 1970, duration: 430, contact: 'soft', sound: 'craftFluff' },
  ],
  phases: [
    { at: 0, stage: 'fold', text: 'Bat Wings, folded into a veined cradle…' },
    { at: 1200, stage: 'binding', text: 'Glimmer Jelly, pooling into a glossy heart.' },
    { at: 1900, stage: 'seal', text: 'One Clover, pressed in as a little green seal.' },
    { at: 2660, stage: 'reveal', text: 'A glimmering heart, held by forest finds.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Three Bat Wings form a membrane cradle and loop. Glimmer Jelly makes the lavender heart. One Clover seals the front; no mined crystal is used.',
  pattern: 'a heart full of glimmer', intro: 'A little jelly glow, a pair of wings, a touch of green.',
  finished: 'Glimmer Jelly at its heart. Bat Wings around it. Clover to seal it.',
} satisfies CraftPresentation;
