import type { CraftPresentation } from '../types';
const src = (part: string) => `assets/crafting/impring-${part}.webp`;
const horns = [['horn-1', .665, .490], ['horn-2', .495, .753], ['horn-3', .303, .556], ['horn-4', .5, .332]] as const;
const embers = [['ember-1', .404, .319], ['ember-2', .5, .294], ['ember-3', .596, .319]] as const;

export default {
  id: 'impring', duration: 3500,
  layers: [...horns, ...embers].map(([id]) => ({ id, src: src(id) })),
  complete: src('complete'),
  roles: { horn: 'Four ridged ivory band sections & clasps', ember: 'Three warm, nestled ember beads' },
  targets: [
    ...horns.map(([part, x, y], i) => ({ material: 'horn' as const, part, x, y, at: 180 + i*180, duration: 460, contact: 'solid' as const, sound: 'craftStitch' as const })),
    ...embers.map(([part, x, y], i) => ({ material: 'ember' as const, part, x, y, at: 1430 + i*190, duration: 480, contact: 'energy' as const, sound: 'craftGoo' as const })),
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Imp Horns, nesting into a ridged ivory band…' },
    { at: 1370, stage: 'warm', text: 'Three Embers, tucked softly between horn clasps.' },
    { at: 2710, stage: 'reveal', text: 'A tiny ring with a warm little heart.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Four Imp Horns form the ridged ring band and clasps. Three orange Embers nest on top. No metal or gemstone is added.',
  pattern: 'a little warmth, held close', intro: 'Ivory curves. Three warm forest sparks.',
  finished: 'Imp Horns hold the shape. Embers bring the warmth.',
} satisfies CraftPresentation;
