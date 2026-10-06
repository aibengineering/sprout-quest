import type { CraftPresentation } from '../types';
export default {
  id: 'crystalhammer', model: 'assets/crafting3d/crystalhammer.glb', duration: 3400,
  layers: ['iron-shaft', 'crystal-lower', 'crystal-upper', 'iron-yoke'].map(id => ({ id })),
  roles: { iron: 'Shaft, grip collars & head yoke', crystal: 'Twin faceted striking blocks' },
  targets: [
    { material: 'iron', part: 'iron-shaft', at: 180, duration: 430, contact: 'solid', sound: 'craftStitch' },
    { material: 'crystal', part: 'crystal-lower', at: 720, duration: 460, contact: 'solid', sound: 'tick' },
    { material: 'crystal', part: 'crystal-upper', at: 1200, duration: 460, contact: 'solid', sound: 'tick' },
    { material: 'iron', part: 'iron-yoke', at: 1800, duration: 430, contact: 'solid', sound: 'craftStitch' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Iron, forming a sturdy shaft…' },
    { at: 680, stage: 'facet', text: 'Two crystal blocks, nesting around the shaft…' },
    { at: 1780, stage: 'mount', text: 'An iron yoke, gently locking both blocks in place…' },
    { at: 2600, stage: 'reveal', text: 'Crystal weight, held securely by iron.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Iron forms the shaft and grip collars. Two crystal striking blocks settle at its end, then an iron yoke locks them together.',
  pattern: 'two facets, one sturdy hammer', intro: 'Crystal weight. Iron strength.',
  finished: 'Twin crystal blocks, secured by an iron yoke.',
} satisfies CraftPresentation;
