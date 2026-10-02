import { HOMES, HOME_ORDER, type HomeId } from '../housing';
import cottage from './buildings/cottage1';
import type { CraftPresentation } from './types';

export const housePresentation = (id: HomeId, level: number): CraftPresentation => {
  if (id === 'pip' && level === 1) return cottage;
  const plan = HOMES[id].plans[level - 1];
  const timber = Object.keys(plan.cost).find((m) => m.endsWith('plank'))!;
  const materials = Object.keys(plan.cost).sort((a, b) => Number(b === 'stone') - Number(a === 'stone'));
  const layers = materials.flatMap((m) => m === timber ? ['frame', 'walls', 'roof'] : [m]);
  const targets = layers.map((part, i) => ({ material: (['frame', 'walls', 'roof'].includes(part) ? timber : part) as keyof typeof plan.cost,
    part, at: 240 + i * 560, duration: 480, contact: 'solid' as const, sound: 'craftStitch' as const }));
  const last = 240 + layers.length * 560;
  return {
    id: plan.art, model: `assets/crafting3d/${plan.art}.glb`, scene: 'building', eyebrow: 'BRAM’S HOUSE PLANS',
    duration: last + 1200, layers: [...(level > 1 ? [{ id: 'base', initial: true }] : []), ...layers.map((id) => ({ id }))],
    roles: Object.fromEntries(materials.map((m) => [m, m === timber ? 'Timber frame, boards and roof' : m === 'stone' ? 'Footing and chimney' : m === 'crystal' ? 'Bright glazing and a pantry lantern' : m === 'iron' ? 'Strong brackets for the study' : 'A window box from the Garden'])),
    targets, phases: [
      { at: 0, stage: 'frame', text: level > 1 ? 'Bram adds to the home that already stands.' : 'Bram sets out the footing and measures your timber.' },
      { at: last, stage: 'reveal', text: plan.perk, sound: 'ding' },
    ],
    sceneLabel: `${plan.name} is built from its listed materials. ${plan.perk}`, pattern: 'a home, made together',
    intro: 'The planks you carried from the mill become a place for a neighbour.', finished: plan.perk,
  };
};
export const HOUSE_PRESENTATIONS = HOME_ORDER.flatMap((id) => HOMES[id].plans.map((_, i) => housePresentation(id, i + 1)));
