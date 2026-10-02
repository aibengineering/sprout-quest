// Granny's Kitchen: meals you eat for a short boost. One at a time; each lasts a few minutes of play (on the map, in
// fights, chopping; not in menus). They're a quick, repeatable way to spend the materials you pile up, not something
// to make last (see the story bible, Side quests).
import type { Recipe } from './data';
import { kitchenLevel } from './kitchenUpgrades';
import { hasMats, playerStats, spend } from './rules';
import type { SaveState } from './state';
import { homeLevel } from './housing';

export type MealId = 'pancakes' | 'tea' | 'goojelly' | 'stew' | 'rockcandy' | 'tart' | 'meadowtea' | 'trailbuns';

export interface Meal {
  id: MealId;
  name: string;
  icon: string;
  recipe: Recipe;
  /** What it does, for the menu. */
  desc: string;
  /** Seconds of play it lasts. */
  seconds: number;
  /** Who taught Granny this one (missing: she knew it all along). */
  from?: string;
}

export const MEALS: Record<MealId, Meal> = {
  meadowtea: { id: 'meadowtea', name: 'Meadow Tea', icon: '🍵', recipe: { herb: 6, flower: 2 },
    desc: 'A wider sweet spot when mining, for 4 minutes.', seconds: 240, from: 'Granny Clover' },
  trailbuns: { id: 'trailbuns', name: 'Trail Buns', icon: '🥖', recipe: { berry: 8, fluff: 6 },
    desc: '+20% woodcutting and mining XP for 4 minutes.', seconds: 240, from: 'Moss' },
  pancakes: {
    id: 'pancakes', name: 'Fluff Pancakes', icon: '🥞', recipe: { fluff: 15, goo: 9 },
    desc: '+15% XP from fights for 5 minutes.', seconds: 300,
  },
  tea: {
    id: 'tea', name: 'Clover Tea', icon: '🍵', recipe: { clover: 2 },
    desc: 'Heal a little after every win, for 5 minutes.', seconds: 300,
  },
  goojelly: {
    id: 'goojelly', name: 'Goo Jelly', icon: '🍮', recipe: { goo: 24 },
    desc: 'Monsters well below your level keep away, for 3 minutes.', seconds: 180,
  },
  stew: {
    id: 'stew', name: "Woodcutter's Stew", icon: '🍲', recipe: { pine: 9, cap: 6 },
    desc: 'A wider sweet spot when chopping, for 4 minutes.', seconds: 240, from: 'Bram',
  },
  rockcandy: {
    id: 'rockcandy', name: 'Rock Candy', icon: '🍬', recipe: { stone: 12, copper: 6 },
    desc: 'An extra handful of ore from every rock you mine, for 4 minutes.', seconds: 240, from: 'Pip',
  },
  tart: {
    id: 'tart', name: 'Berry Tart', icon: '🥧', recipe: { berry: 8, fluff: 6 },
    desc: '+10% max HP for 5 minutes.', seconds: 300, from: 'the Garden',
  },
};

export const MEAL_ORDER: MealId[] = ['pancakes', 'tea', 'goojelly', 'stew', 'rockcandy', 'tart', 'meadowtea', 'trailbuns'];

/** The flag that teaches Granny a newcomer's recipe (or, for her tart, the Garden's first berries). */
const TAUGHT: Partial<Record<MealId, string>> = { stew: 'bram:stew', rockcandy: 'pip:candy', tart: 'garden:berries', meadowtea: 'garden:herbs', trailbuns: 'moss:recipe' };

/** A better home gives the resident room to improve their own recipe, without adding a permanent combat bonus. */
export function mealSeconds(s: SaveState, id: MealId) {
  const resident = id === 'rockcandy' ? 'pip' : id === 'trailbuns' ? 'moss' : null;
  return MEALS[id].seconds + (id==='meadowtea' && s.legacyHerbLevel ? Math.max(0,s.legacyHerbLevel-1)*60 : resident ? Math.max(0, homeLevel(s, resident) - 1) * 60 : Math.max(0, kitchenLevel(s) - 1) * 30);
}
export const mealDescription = (s: SaveState, id: MealId) => MEALS[id].desc.replace(`${MEALS[id].seconds / 60} minutes`, `${mealSeconds(s, id) / 60} minutes`);

/** The kitchen opens once Mr. Floppers is home (Poppy's story finished). */
export const kitchenOpen = (s: SaveState) => (s.stories.poppy ?? 0) >= 6 && (!s.villageJobs || s.flags.includes('granny:extension'));

/** Recipes Granny can make: her own, plus whatever newcomers have taught her. */
export const knownMeals = (s: SaveState) => MEAL_ORDER.filter((id) => !TAUGHT[id] || s.flags.includes(TAUGHT[id]!) || (id==='meadowtea' && s.flags.includes('hazel:recipe')));

/** Cooks a meal and eats it, replacing whatever you'd eaten before. */
export function cook(s: SaveState, id: MealId): 'ok' | 'missing' | 'unknown' {
  const m = MEALS[id];
  if (!m || !kitchenOpen(s) || !knownMeals(s).includes(id)) return 'unknown';
  if (!hasMats(s, m.recipe)) return 'missing';
  spend(s, m.recipe);
  const before = playerStats(s).maxHp;
  s.meal = { id, left: mealSeconds(s, id) };
  fitHp(s, before);
  return 'ok';
}

/** The meal you're on, if it's this one. */
export const eating = (s: SaveState, id: MealId) => s.meal?.id === id && s.meal.left > 0;


/** XP multiplier for a win. */
export const xpBoost = (s: SaveState) => (eating(s, 'pancakes') ? 1.15 : 1);

/** After a win, Clover Tea heals a little; returns how much. */
export function afterWin(s: SaveState, maxHp: number): number {
  if (!eating(s, 'tea')) return 0;
  const healed = Math.min(maxHp - s.hp, Math.round(maxHp * 0.15));
  s.hp += healed;
  return healed;
}

/** Goo Jelly: roaming monsters at or below this level keep away (null when it's not on). */
export const repelBelow = (s: SaveState) => (eating(s, 'goojelly') ? s.lv - 2 : null);

/** Playing (not sitting in a menu) counts your meal down; it's gone when it runs out. */
export function mealTick(s: SaveState, dt: number) {
  if (!s.meal) return;
  s.meal.left -= dt;
  if (s.meal.left > 0) return;
  const before = playerStats(s).maxHp;
  s.meal = null;
  fitHp(s, before);
}

/** A Berry Tart's extra max HP comes with the health to fill it, and goes again when it wears off. */
function fitHp(s: SaveState, before: number) {
  const after = playerStats(s).maxHp;
  s.hp = Math.min(after, s.hp + Math.max(0, after - before));
}

/** Woodcutter's Stew widens the sweet spot on trees. */
export const sweetBoost = (s: SaveState) => (eating(s, 'stew') ? 1.3 : 1);
export const miningSweetBoost = (s: SaveState) => (eating(s, 'meadowtea') ? 1.3 : 1);
export const gatheringXpBoost = (s: SaveState) => (eating(s, 'trailbuns') ? 1.2 : 1);

/** Rock Candy: extra ore from every rock you break (see rules.ts, harvest). */
export const oreBoost = (s: SaveState) => (eating(s, 'rockcandy') ? 1 : 0);
/** Berry Tart: max HP multiplier. */
export const hpBoost = (s: SaveState) => (eating(s, 'tart') ? 1.1 : 1);

// ---------------------------------------------------------------- a prepared plate, carried to the stove

export interface MealTray {
  dish: MealId;
  /** The whole recipe, gathered together without spending it yet. */
  ingredients: Recipe;
}

/** Pick up all ingredients in one trip. The stove commits the recipe through cook(). */
export function prepareMeal(s: SaveState, id: MealId): MealTray | 'missing' | 'unknown' {
  if (!kitchenOpen(s) || !knownMeals(s).includes(id)) return 'unknown';
  if (!hasMats(s, MEALS[id].recipe)) return 'missing';
  return { dish: id, ingredients: { ...MEALS[id].recipe } };
}

/** What's left of your meal, for the HUD ("🥞 3"). */
export function mealLeft(s: SaveState): { icon: string; name: string; left: string } | null {
  if (!s.meal || s.meal.left <= 0) return null;
  const m = MEALS[s.meal.id], secs = Math.ceil(s.meal.left);
  const left = secs >= 60 ? `${Math.ceil(secs / 60)}m` : `${secs}s`;
  return { icon: m.icon, name: m.name, left };
}
