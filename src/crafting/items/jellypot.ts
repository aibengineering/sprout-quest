import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/jellypot-${part}.webp`;
export default {
  id: 'jellypot', duration: 2800,
  layers: ['bottle', 'goo-infusion', 'fluff-foam'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { goo: 'Springy green infusion', fluff: 'Cloud-soft foam cap' },
  targets: [
    { material: 'goo', part: 'goo-infusion', at: 220, duration: 560, x: .5, y: .53, contact: 'bind', sound: 'craftGoo' },
    { material: 'fluff', part: 'fluff-foam', at: 1120, duration: 500, x: .5, y: .17, contact: 'soft', sound: 'craftFluff' },
  ],
  phases: [
    { at: 0, stage: 'pour', text: 'Slime Goo, pouring into a springy green base…' },
    { at: 1000, stage: 'mix', text: 'Bunny Fluff, whisking into a soft foam…' },
    { at: 2000, stage: 'reveal', text: 'A green little potion with a cloud on top.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Slime Goo fills the bottle. Bunny Fluff becomes the soft white foam cap. The bottle is reusable cookware.',
  pattern: 'whisked soft, bottled bright', intro: 'A little goo. A little fluff.',
  finished: 'Springy Slime Goo, finished with Bunny Fluff foam.',
} satisfies CraftPresentation;
