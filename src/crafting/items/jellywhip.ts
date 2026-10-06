import type { CraftPresentation } from '../types';

export default {
  id: 'jellywhip', model: 'assets/crafting3d/jellywhip.glb', duration: 3300,
  layers: ['fluff-grip', 'goo-collar', 'goo-coils', 'goo-tip'].map((id) => ({ id })),
  roles: { fluff: 'Cloud-soft felted grip', goo: 'Springy collar, coiled lash & sticky tip' },
  targets: [
    { material: 'fluff', part: 'fluff-grip', at: 180, duration: 510, contact: 'soft', sound: 'craftFluff' },
    { material: 'goo', part: 'goo-collar', at: 850, duration: 440, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'goo-coils', at: 1370, duration: 550, contact: 'bind', sound: 'craftGoo' },
    { material: 'goo', part: 'goo-tip', at: 2020, duration: 460, contact: 'bind', sound: 'craftGoo' },
  ],
  phases: [
    { at: 0, stage: 'fluff', text: 'Bunny Fluff, pressed into a soft grip…' },
    { at: 850, stage: 'binding', text: 'Slime Goo, hugging the fluff…' },
    { at: 1370, stage: 'coil', text: 'A gooey lash, curling into springy loops…' },
    { at: 2020, stage: 'tip', text: 'One last sticky tip…' },
    { at: 2670, stage: 'reveal', text: 'Soft in your hand. Springy at the tip.' },
  ],
  sceneLabel: 'Bunny Fluff compresses into a cream grip. Slime Goo seals a collar, curls into green coils, and finishes in a sticky rounded tip.',
  pattern: 'soft grip, springy lash', intro: 'A handful of fluff. A wobble of goo.',
  finished: 'Bunny Fluff for your hand. Slime Goo for the lash.',
} satisfies CraftPresentation;
