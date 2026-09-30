import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/glimmerwand-${part}.webp`;
export default {
  id: 'glimmerwand', duration: 3400,
  layers: ['wing-stem', 'wing-frame', 'core-heart', 'jelly-star'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { wing: 'Bat Wing stem & star cradle', core: 'Golem Core star heart', glimmer: 'Glimmer Jelly star & light channel' },
  targets: [
    { material: 'wing', part: 'wing-stem', at: 180, duration: 450, x: .4121, y: .5, contact: 'soft', sound: 'craftFluff' },
    { material: 'wing', part: 'wing-frame', at: 700, duration: 450, x: .7471, y: .5, contact: 'soft', sound: 'craftFluff' },
    { material: 'core', part: 'core-heart', at: 1230, duration: 430, x: .7891, y: .499, contact: 'solid', sound: 'craftStitch' },
    { material: 'glimmer', part: 'jelly-star', at: 1750, duration: 500, x: .79, y: .5, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'fold', text: 'Bat Wing membrane, folded into a stem and star cradle…' },
    { at: 1200, stage: 'anchor', text: 'A Golem Core, finding its place in the cradle…' },
    { at: 1720, stage: 'binding', text: 'Glimmer Jelly, settling into a softly shining star…' },
    { at: 2600, stage: 'reveal', text: 'A little star, held by folded wings.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Bat Wing membrane forms the wrapped stem and star cradle. A Golem Core sits at its heart. Glimmer Jelly forms the star and a light channel down the stem.',
  pattern: 'a little star, held by wings', intro: 'Folded wings. A core. A jelly star.',
  finished: 'Bat wings hold a jelly star with a Golem Core heart.',
} satisfies CraftPresentation;
