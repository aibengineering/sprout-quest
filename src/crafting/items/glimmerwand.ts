import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/glimmerwand-${part}.webp`;
export default {
  id: 'glimmerwand', duration: 3400,
  layers: ['glass-shaft', 'shard-crown', 'core-heart', 'jelly-orb'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { glimmer: 'Hardened glass shaft, icy shard cradle & glowing jelly orb', core: 'Golem Core heart inside the orb' },
  targets: [
    { material: 'glimmer', part: 'glass-shaft', at: 180, duration: 450, x: .386, y: .622, contact: 'solid', sound: 'tick' },
    { material: 'glimmer', part: 'shard-crown', at: 700, duration: 450, x: .62, y: .40, contact: 'solid', sound: 'tick' },
    { material: 'core', part: 'core-heart', at: 1230, duration: 430, x: .727, y: .282, contact: 'solid', sound: 'craftStitch' },
    { material: 'glimmer', part: 'jelly-orb', at: 1750, duration: 500, x: .726, y: .282, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'harden', text: 'Glimmer Jelly, setting into clear glassy facets…' },
    { at: 1200, stage: 'anchor', text: 'A Golem Core, cradled between the shards…' },
    { at: 1720, stage: 'binding', text: 'Soft Glimmer Jelly, swelling into a glowing orb…' },
    { at: 2600, stage: 'reveal', text: 'A glass wand, holding a little moon.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Glimmer Jelly hardens into a faceted glass shaft and a cradle of icy shards. A Golem Core sits in the cradle. More jelly swells around it into a glowing orb, with a pink light channel down the shaft.',
  pattern: 'hardened glimmer, a glowing heart', intro: 'Jelly glass. A core. A soft glowing orb.',
  finished: 'Glassy glimmer shards cradle a glowing orb with a Golem Core heart.',
} satisfies CraftPresentation;
