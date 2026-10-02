import type { Recipe } from './data';
import type { SaveState } from './state';
export const KITCHEN_PLANS: { name: string; cost: Recipe; mill: number; art: string; perk: string; request: string }[] = [
  { name: 'Granny’s Kitchen Extension', cost: { plank: 64, stone: 24, copper: 9, flower: 6 }, mill: 1, art: 'kitchen1',
    perk: 'A roomy kitchen: choose a recipe with Clover, carry one plate and cook together.',
    request: 'Clover wants room to cook with you. Timber for the benches, stone for the oven. Poppy offered flowers for the windows.' },
  { name: 'Granny’s Pine Pantry', cost: { pineplank: 56, iron: 9, herb: 8, flower: 8 }, mill: 2, art: 'kitchen2',
    perk: 'Shelves for Clover’s jars: her own meals last 30 seconds longer.',
    request: 'Clover’s jars need proper shelves. Pine for the pantry, iron brackets, and herbs from Poppy’s beds.' },
  { name: 'Granny’s Glimmer Kitchen', cost: { glimplank: 64, crystal: 10, flower: 12 }, mill: 3, art: 'kitchen3',
    perk: 'A bright cupboard and warm serving shelf: Clover’s own meals last a minute longer.',
    request: 'Clover wants a warm shelf for supper and light over the benches. Glimmer boards and crystal. Poppy’s choosing the flowers.' },
];
export const kitchenLevel = (s: SaveState) => Math.max(s.flags.includes('granny:extension') ? 1 : 0, Math.min(3, Math.max(0, Math.floor(s.kitchenLevel ?? 0))));
