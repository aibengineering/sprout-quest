import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/shroombrew-${part}.webp`;
export default {
  id: 'shroombrew', duration: 2800,
  layers: ['bottle', 'cap-infusion', 'spotted-caps'].map((id) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { cap: 'Rose-red brew & spotted cap pieces' },
  targets: [
    { material: 'cap', part: 'cap-infusion', at: 220, duration: 520, x: .5, y: .52, contact: 'bind', sound: 'craftGoo' },
    { material: 'cap', part: 'spotted-caps', at: 1040, duration: 500, x: .4844, y: .4072, contact: 'soft', sound: 'craftFluff' },
  ],
  phases: [
    { at: 0, stage: 'steep', text: 'Shroom Caps, steeping into a rosy brew…' },
    { at: 950, stage: 'mix', text: 'Spotted cap pieces, settling into the infusion…' },
    { at: 2000, stage: 'reveal', text: 'The caps keep their color, right down to the last sip.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Shroom Caps make both the rose-red infusion and the visible spotted mushroom pieces. The bottle is reusable cookware.',
  pattern: 'cap color, gently steeped', intro: 'A warm little mushroom brew.',
  finished: 'Shroom Caps, steeped rosy and bottled with their spots.',
} satisfies CraftPresentation;
