// Granny's Kitchen: meals you eat for a short boost. One at a time; each lasts a few minutes of play (on the map, in
// fights, chopping; not in menus). They're a quick, repeatable way to spend the materials you pile up, not something
// to make last (see the story bible, Side quests).
import type { Recipe } from './data';
import { hasMats, spend } from './rules';
import type { SaveState } from './state';

export type MealId = 'pancakes' | 'tea' | 'goojelly' | 'stew';

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
  pancakes: {
    id: 'pancakes', name: 'Fluff Pancakes', icon: '🥞', recipe: { fluff: 5, goo: 3 },
    desc: '+15% XP from fights for 5 minutes.', seconds: 300,
  },
  tea: {
    id: 'tea', name: 'Clover Tea', icon: '🍵', recipe: { clover: 2 },
    desc: 'Heal a little after every win, for 5 minutes.', seconds: 300,
  },
  goojelly: {
    id: 'goojelly', name: 'Goo Jelly', icon: '🍮', recipe: { goo: 8 },
    desc: 'Monsters well below your level keep away, for 3 minutes.', seconds: 180,
  },
  stew: {
    id: 'stew', name: "Woodcutter's Stew", icon: '🍲', recipe: { pine: 3, cap: 2 },
    desc: 'A wider sweet spot when chopping, for 4 minutes.', seconds: 240, from: 'Bram',
  },
};

export const MEAL_ORDER: MealId[] = ['pancakes', 'tea', 'goojelly', 'stew'];

/** The flag that teaches Granny a newcomer's recipe. */
const TAUGHT: Partial<Record<MealId, string>> = { stew: 'bram:stew' };

/** The kitchen opens once Mr. Floppers is home (Poppy's story finished). */
export const kitchenOpen = (s: SaveState) => (s.stories.poppy ?? 0) >= 6;

/** Recipes Granny can make: her own, plus whatever newcomers have taught her. */
export const knownMeals = (s: SaveState) => MEAL_ORDER.filter((id) => !TAUGHT[id] || s.flags.includes(TAUGHT[id]!));

/** Cooks a meal and eats it, replacing whatever you'd eaten before. */
export function cook(s: SaveState, id: MealId): 'ok' | 'missing' | 'unknown' {
  const m = MEALS[id];
  if (!m || !kitchenOpen(s) || !knownMeals(s).includes(id)) return 'unknown';
  if (!hasMats(s, m.recipe)) return 'missing';
  spend(s, m.recipe);
  s.meal = { id, left: m.seconds };
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
  if (s.meal.left <= 0) s.meal = null;
}

/** Woodcutter's Stew widens the sweet spot on trees. */
export const sweetBoost = (s: SaveState) => (eating(s, 'stew') ? 1.3 : 1);

/** What's left of your meal, for the HUD ("🥞 3"). */
export function mealLeft(s: SaveState): { icon: string; name: string; left: string } | null {
  if (!s.meal || s.meal.left <= 0) return null;
  const m = MEALS[s.meal.id], secs = Math.ceil(s.meal.left);
  const left = secs >= 60 ? `${Math.ceil(secs / 60)}m` : `${secs}s`;
  return { icon: m.icon, name: m.name, left };
}
