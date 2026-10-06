import type { CraftPresentation } from '../types';
export default {
  id: 'glimmerwand', model: 'assets/crafting3d/glimmerwand.glb', duration: 3400,
  layers: ['glass-shaft', 'shard-crown', 'core-heart', 'jelly-orb'].map(id => ({ id })),
  roles: { glimmer: 'Hardened glass shaft, icy shard cradle & glowing jelly orb', core: 'Golem Core heart inside the orb' },
  targets: [
    { material: 'glimmer', part: 'glass-shaft', at: 180, duration: 450, contact: 'solid', sound: 'tick' },
    { material: 'glimmer', part: 'shard-crown', at: 700, duration: 450, contact: 'solid', sound: 'tick' },
    { material: 'core', part: 'core-heart', at: 1230, duration: 430, contact: 'solid', sound: 'craftStitch' },
    { material: 'glimmer', part: 'jelly-orb', at: 1750, duration: 500, contact: 'bind', sound: 'craftGoo' },
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
