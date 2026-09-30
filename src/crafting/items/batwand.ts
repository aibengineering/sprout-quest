import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/batwand-${part}.webp`;

export default {
  id: 'batwand', duration: 3400,
  layers: ['wing-shaft', 'left-wing', 'right-wing', 'core-crown', 'core-pommel'].map(id => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { wing: 'Rolled membrane shaft & scalloped crown', core: 'Stone-ringed crown & pommel' },
  targets: [
    { material: 'wing', part: 'wing-shaft', at: 220, duration: 450, x: .368, y: .631, contact: 'bind', sound: 'craftPull' },
    { material: 'wing', part: 'left-wing', at: 810, duration: 460, x: .552, y: .21, contact: 'soft', sound: 'craftFluff' },
    { material: 'wing', part: 'right-wing', at: 1020, duration: 460, x: .79, y: .448, contact: 'soft', sound: 'craftFluff' },
    { material: 'core', part: 'core-crown', at: 1590, duration: 430, x: .652, y: .348, contact: 'energy', sound: 'tick' },
    { material: 'core', part: 'core-pommel', at: 1830, duration: 430, x: .15, y: .85, contact: 'energy', sound: 'tick' },
  ],
  phases: [
    { at: 0, stage: 'fold', text: 'Bat Wings roll into a shaft and spread into a scalloped crown…' },
    { at: 1540, stage: 'setting', text: 'Two Golem Cores find their homes, crown and pommel…' },
    { at: 2700, stage: 'reveal', text: 'The membranes settle around their cavern light.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Bat Wings form the rolled shaft and two ribbed crown membranes. One gray-ringed Golem Core seats at the crown, another at the pommel.',
  pattern: 'wings cradle cavern light', intro: 'Wing membranes. Cavern light.',
  finished: 'Bat-wing membranes holding two Golem Cores.',
} satisfies CraftPresentation;
