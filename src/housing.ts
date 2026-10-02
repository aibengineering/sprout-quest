// Resident homes have their own progression. Workshop levels continue to live in save.build.
import { PROJECTS, type Recipe } from './data';
import { neighbourReturned } from './neighbours';
import type { SaveState } from './state';

export type HomeId = 'pip' | 'hazel' | 'moss';
export type Homes = Record<HomeId, number>;
export interface HousePlan { name: string; cost: Recipe; mill: number; art: string; perk: string }
export const HOME_ORDER: HomeId[] = ['pip', 'hazel', 'moss'];
export const HOMES: Record<HomeId, { name: string; trade: string; icon: string; plans: HousePlan[] }> = {
  pip: { name: 'Pip', trade: 'Miner', icon: '⛏️', plans: [
    { name: 'Guest Cottage', cost: PROJECTS.cottage.levels[0].cost, mill: 1, art: 'cottage1', perk: 'Pip moves in and teaches Granny Rock Candy.' },
    { name: "Pip's Stone Study", cost: { pineplank: 48, iron: 9, flower: 6 }, mill: 2, art: 'res_pip2', perk: 'A place to sort his finds: Rock Candy lasts a minute longer.' },
    { name: "Pip's Glimmer Archive", cost: { glimplank: 64, crystal: 10, iron: 12, flower: 10 }, mill: 3, art: 'res_pip3', perk: 'Room to keep his finds: Rock Candy lasts two minutes longer.' },
  ] },
  hazel: { name: 'Hazel', trade: 'Herbalist', icon: '🌿', plans: [
    { name: "Hazel's Herb Cottage", cost: { plank: 64, stone: 24, herb: 8, flower: 6 }, mill: 1, art: 'res_hazel1', perk: 'Hazel moves in and teaches Granny Meadow Tea for mining.' },
    { name: "Hazel's Glasshouse", cost: { pineplank: 56, crystal: 8, flower: 8 }, mill: 2, art: 'res_hazel2', perk: 'Shelter for her herbs: Meadow Tea lasts a minute longer.' },
    { name: "Hazel's Glimmer Conservatory", cost: { glimplank: 64, crystal: 12, herb: 12, flower: 12 }, mill: 3, art: 'res_hazel3', perk: 'Space for delicate cuttings: Meadow Tea lasts two minutes longer.' },
  ] },
  moss: { name: 'Moss', trade: 'Baker', icon: '🥖', plans: [
    { name: "Moss's Pine Cottage", cost: { pineplank: 64, stone: 24, berry: 12, flower: 8 }, mill: 2, art: 'res_moss1', perk: 'Moss moves in and teaches Granny Trail Buns for gathering.' },
    { name: "Moss's Glimmer Larder", cost: { glimplank: 48, crystal: 8, flower: 10 }, mill: 3, art: 'res_moss2', perk: 'A cool pantry for his dough: Trail Buns last a minute longer.' },
    { name: "Moss's Ember Bakehouse", cost: { emberplank: 72, obsidian: 10, berry: 16, flower: 12 }, mill: 4, art: 'res_moss3', perk: 'A warm baking annex: Trail Buns last two minutes longer.' },
  ] },
};

export const homeLevel = (s: SaveState, id: HomeId) => Math.max(s.homes?.[id] ?? 0, id === 'pip' ? s.build.cottage : 0);
export const nextHouse = (s: SaveState, id: HomeId) => HOMES[id].plans[homeLevel(s, id)];
export function houseLock(s: SaveState, id: HomeId): string | null {
  const level = homeLevel(s, id), plan = nextHouse(s, id);
  if (!plan) return 'The home is complete.';
  if (!level && (!s.flags.includes('bram:hut') || !s.build.sawmill)) return 'Help Bram settle into Sowerby first.';
  if (!level && !neighbourReturned(s, id)) return `Meet ${HOMES[id].name} and bring them back to Sowerby first.`;
  if (!level && id === 'hazel' && !homeLevel(s, 'pip')) return 'Build the Guest Cottage for Pip first.';
  if (!level && id === 'moss' && !homeLevel(s, 'hazel')) return 'Build Hazel’s Herb Cottage first.';
  if (s.build.sawmill < plan.mill) return `Upgrade the Sawmill to level ${plan.mill} to cut the timber for this plan.`;
  return null;
}
export function canBuildHome(s: SaveState, id: HomeId): 'ok' | 'locked' | 'missing' | 'maxed' {
  const plan = nextHouse(s, id);
  if (!plan) return 'maxed';
  if (houseLock(s, id)) return 'locked';
  return Object.entries(plan.cost).every(([m, n]) => s.mats[m as keyof Recipe] >= n!) ? 'ok' : 'missing';
}
/** Charge and advance once, before any animation or welcome dialogue. Expected level rejects stale/double clicks. */
export function buildHome(s: SaveState, id: HomeId, expectedLevel: number): ReturnType<typeof canBuildHome> | 'stale' {
  if (homeLevel(s, id) !== expectedLevel) return 'stale';
  const result = canBuildHome(s, id);
  if (result !== 'ok') return result;
  const plan = nextHouse(s, id)!;
  for (const [m, n] of Object.entries(plan.cost)) s.mats[m as keyof Recipe] -= n!;
  s.homes ??= { pip: s.build.cottage, hazel: 0, moss: 0 };
  s.homes[id] = expectedLevel + 1;
  // Keep the existing Pip story and old saves working; new homes do not change workshop levels.
  if (id === 'pip') s.build.cottage = 1;
  return 'ok';
}
