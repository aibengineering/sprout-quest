import type { CraftPresentation } from '../types';
const horns = ['horn-1', 'horn-2', 'horn-3', 'horn-4'] as const;
const embers = ['ember-1', 'ember-2', 'ember-3'] as const;

export default {
  id: 'impring', model: 'assets/crafting3d/impring.glb', duration: 3500,
  layers: [...horns, ...embers].map((id) => ({ id })),
  roles: { horn: 'Four ridged ivory band sections & clasps', ember: 'Three warm, nestled ember beads' },
  targets: [
    ...horns.map((part, i) => ({ material: 'horn' as const, part, at: 180 + i*180, duration: 460, contact: 'solid' as const, sound: 'craftStitch' as const })),
    ...embers.map((part, i) => ({ material: 'ember' as const, part, at: 1430 + i*190, duration: 480, contact: 'energy' as const, sound: 'craftGoo' as const })),
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
