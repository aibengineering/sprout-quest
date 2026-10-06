import type { CraftPresentation } from '../types';


export default {
  id: 'glimmershawl', model: 'assets/crafting3d/glimmershawl.glb', duration: 3650,
  layers: ['fluff-lining', 'goo-seams', 'jelly-drape', 'jelly-collar', 'shard-left', 'shard-right', 'core-brooch'].map(id => ({ id })),
  roles: { fluff: 'Quilted lining, sleeves & cloth hem', goo: 'Bound hems & sleeve seams', glimmer: 'Glowing jelly drape & collar, hardened glass shoulder shards', core: 'One Golem Core brooch' },
  targets: [
    { material: 'fluff', part: 'fluff-lining', at: 120, duration: 480, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-seams', at: 620, duration: 450, contact: 'bind', sound: 'craftGoo' },
    { material: 'glimmer', part: 'jelly-drape', at: 200, duration: 520, contact: 'soft', sound: 'craftGoo' },
    { material: 'glimmer', part: 'jelly-collar', at: 800, duration: 520, contact: 'bind', sound: 'craftGoo' },
    { material: 'glimmer', part: 'shard-left', at: 1400, duration: 440, contact: 'solid', sound: 'tick' },
    { material: 'glimmer', part: 'shard-right', at: 1650, duration: 440, contact: 'solid', sound: 'tick' },
    { material: 'core', part: 'core-brooch', at: 2250, duration: 440, contact: 'energy', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'line', text: 'Bunny Fluff, forming a softly quilted lining…' },
    { at: 180, stage: 'shape', text: 'Glimmer Jelly, pouring into a soft glowing drape…' },
    { at: 620, stage: 'seam', text: 'Slime Goo, binding the cloth hems and cuffs…' },
    { at: 1400, stage: 'harden', text: 'More jelly, hardening into glassy shoulder shards…' },
    { at: 2250, stage: 'setting', text: 'One Golem Core, held in a ring of jelly…' },
    { at: 2850, stage: 'reveal', text: 'A quiet glow, crowned with glass.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Glimmer Jelly forms a glowing drape with a bubbly hem and a soft collar wrap. More jelly hardens into icy glass shards on both shoulders. One Golem Core rests in a jelly-ring brooch. Fluff forms the lining and goo binds the hems and cuffs.',
  pattern: 'a soft glow, crowned with glass', intro: 'Glimmer jelly, soft and hardened, and one steady core.',
  finished: 'Glowing folds over soft cloth, bound seams, glass shoulders and a core brooch.',
} satisfies CraftPresentation;
