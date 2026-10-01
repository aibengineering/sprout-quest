import type { CraftPresentation } from '../types';

export default {
  id: 'stew', model: 'assets/crafting3d/stew.glb', eyebrow: 'Granny’s Kitchen', duration: 3400,
  // Fuel draws under the cookware. It is excluded from the finished complete image.
  layers: ['pine-fuel', 'pot', 'cap-broth', 'shroom-caps', 'steam'].map((id) => ({ id, ...(id === 'steam' ? { showAt: 1510 } : {}), ...(id === 'pine-fuel' ? { finished: false } : {}) })),
  roles: { pine: 'Cooking fuel below the pot', cap: 'Warm mushroom broth & spotted caps' },
  targets: [
    { material: 'pine', part: 'pine-fuel', at: 220, duration: 480, contact: 'solid', sound: 'craftFluff' },
    { material: 'cap', part: 'cap-broth', at: 960, duration: 500, contact: 'bind', sound: 'craftGoo' },
    { material: 'cap', part: 'shroom-caps', at: 1600, duration: 500, contact: 'soft', sound: 'craftFluff' },
  ],
  phases: [
    { at: 0, stage: 'warm', text: 'Pine Logs, tucked beneath the pot as fuel…' },
    { at: 820, stage: 'cook', text: 'Shroom Caps, stirring into a warm broth…', sound: 'craftStitch' },
    { at: 1510, stage: 'simmer', text: 'Spotted caps settle in. A gentle simmer…' },
    { at: 2600, stage: 'reveal', text: 'The firewood stays below. The stew is ready.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Pine Logs are fuel under the reusable pot. Shroom Caps become the broth and visible mushroom pieces. The finished stew contains no wood.',
  pattern: 'pine below, mushrooms above', intro: 'Bram’s recipe, warmed on Granny’s stove.',
  finished: 'Shroom Cap stew, gently cooked over Pine Log fuel.',
} satisfies CraftPresentation;
