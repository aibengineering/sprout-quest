import type { CraftPresentation } from '../types';

const src = (part: string) => `assets/crafting/glimmershawl-${part}.webp`;
const jelly = [
  { id: 'weave-left', source: 'jelly-weave', x: .276, y: .488, side: 'left' },
  { id: 'weave-right', source: 'jelly-weave', x: .724, y: .488, side: 'right' },
  { id: 'edge-left', source: 'jelly-edging', x: .249, y: .725, side: 'left' },
  { id: 'edge-right', source: 'jelly-edging', x: .751, y: .725, side: 'right' },
] as const;

export default {
  id: 'glimmershawl', duration: 3650,
  layers: [
    ...['wing-left', 'wing-right'].map(id => ({ id, src: src(id) })),
    ...jelly.map(j => ({ id: j.id, src: src(j.source), clip: j.side === 'left' ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' })),
    { id: 'core-brooch', src: src('core-brooch') },
  ],
  complete: src('complete'),
  roles: { wing: 'Light membrane shawl & supporting ribs', glimmer: 'Jelly inlays & soft luminous edging', core: 'One glowing Golem Core brooch' },
  targets: [
    { material: 'wing', part: 'wing-left', at: 200, duration: 520, x: .29, y: .52, contact: 'soft', sound: 'craftPull' },
    { material: 'wing', part: 'wing-right', at: 420, duration: 520, x: .71, y: .52, contact: 'soft', sound: 'craftPull' },
    ...jelly.map((j, i) => ({ material: 'glimmer' as const, part: j.id, at: 1100 + i * 200,
      duration: 460, x: j.x, y: j.y, contact: 'bind' as const, sound: 'craftGoo' as const })),
    { material: 'core', part: 'core-brooch', at: 2250, duration: 440, x: .5, y: .445, contact: 'energy', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Bat Wings, opening into a light little shawl…' },
    { at: 1100, stage: 'binding', text: 'Glimmer Jelly, settling into luminous seams…' },
    { at: 2250, stage: 'setting', text: 'One Golem Core, nestled into the jelly brooch…' },
    { at: 2850, stage: 'reveal', text: 'A quiet glow, woven around one little heart.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Bat Wings support a shawl edged and inlaid with Glimmer Jelly. One Golem Core rests in its jelly brooch.',
  pattern: 'a soft glow, a steady heart', intro: 'Wings, glimmer, and one steady little core.',
  finished: 'Wing-soft folds. Jelly-lit edges. A single glowing core.',
} satisfies CraftPresentation;
