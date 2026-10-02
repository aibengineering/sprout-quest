import { KITCHEN_EXTENSION } from '../villageJobs';
import type { CraftPresentation } from './types';
export const KITCHEN_EXTENSION_PRESENTATION: CraftPresentation = {
  id: 'kitchen1', model: 'assets/crafting3d/kitchen1.glb', scene: 'building', duration: 4800, eyebrow: 'BRAM · CLOVER’S KITCHEN',
  layers: [{ id: 'base', initial: true }, ...['stone', 'frame', 'walls', 'roof', 'copper', 'flower'].map((id) => ({ id }))],
  roles: { stone: 'Oven and footing', plank: 'Kitchen frame, walls, benches and blue roof', copper: 'Oven hood and cookware', flower: 'Poppy’s window boxes' },
  targets: ['stone', 'frame', 'walls', 'roof', 'copper', 'flower'].map((part,i) => ({ material: (['frame','walls','roof'].includes(part) ? 'plank' : part) as 'stone' | 'plank' | 'copper' | 'flower', part, at: 240+i*560, duration: 480, contact: 'solid', sound: 'craftStitch' })),
  phases: [{ at: 0, stage: 'footing', text: 'Bram keeps Clover’s home and adds a kitchen beside it.' }, { at: 3600, stage: 'reveal', text: 'Room to cook together, with flowers from Poppy’s garden.', sound: 'ding' }],
  sceneLabel: 'A large blue-roofed kitchen extends Granny’s original house, with a stone oven, copper cookware and flower boxes.',
  pattern: 'a kitchen for the village', intro: 'Clover keeps her home. Bram makes room for the neighbours.', finished: KITCHEN_EXTENSION.perk,
};
