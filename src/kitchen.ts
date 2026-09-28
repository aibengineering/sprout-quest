// Granny's Kitchen: meals you eat for a short boost. One at a time; each lasts a number of fights, minutes on the map,
// or chops. They're the repeatable way to spend the materials you pile up (see the story bible, Side quests).
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
  /** What it counts down in, and how many. */
  lasts: { per: 'fights' | 'seconds' | 'chops'; n: number };
  /** Who taught Granny this one (missing: she knew it all along). */
  from?: string;
}

export const MEALS: Record<MealId, Meal> = {
  pancakes: {
    id: 'pancakes', name: 'Fluff Pancakes', icon: '🥞', recipe: { fluff: 5, goo: 3 },
    desc: '+15% XP from your next 5 fights.', lasts: { per: 'fights', n: 5 },
  },
  tea: {
    id: 'tea', name: 'Clover Tea', icon: '🍵', recipe: { clover: 2 },
    desc: 'After each of your next 5 wins, heal a little.', lasts: { per: 'fights', n: 5 },
  },
  goojelly: {
    id: 'goojelly', name: 'Goo Jelly', icon: '🍮', recipe: { goo: 8 },
    desc: 'For 3 minutes, monsters well below your level keep away.', lasts: { per: 'seconds', n: 180 },
  },
  stew: {
    id: 'stew', name: "Woodcutter's Stew", icon: '🍲', recipe: { pine: 3, cap: 2 },
    desc: 'A wider sweet spot for your next 10 chops.', lasts: { per: 'chops', n: 10 }, from: 'Bram',
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
  s.meal = { id, left: m.lasts.n };
  return 'ok';
}

/** The meal you're on, if it's this one. */
export const eating = (s: SaveState, id: MealId) => s.meal?.id === id && s.meal.left > 0;

/** Counts a meal down; it's gone when it runs out. */
function use(s: SaveState, per: Meal['lasts']['per'], n = 1) {
  if (!s.meal || MEALS[s.meal.id].lasts.per !== per) return;
  s.meal.left -= n;
  if (s.meal.left <= 0) s.meal = null;
}

/** XP multiplier for a win. */
export const xpBoost = (s: SaveState) => (eating(s, 'pancakes') ? 1.15 : 1);

/** After a win: Clover Tea heals a little (returns how much), and fight meals count down. */
export function afterWin(s: SaveState, maxHp: number): number {
  let healed = 0;
  if (eating(s, 'tea')) {
    healed = Math.min(maxHp - s.hp, Math.round(maxHp * 0.15));
    s.hp += healed;
  }
  use(s, 'fights');
  return healed;
}

/** Goo Jelly: roaming monsters at or below this level keep away (null when it's not on). */
export const repelBelow = (s: SaveState) => (eating(s, 'goojelly') ? s.lv - 2 : null);

/** Time on the map counts down minute meals. */
export const mealTick = (s: SaveState, dt: number) => use(s, 'seconds', dt);

/** Woodcutter's Stew widens the sweet spot for the chops it has left; a chop counts it down. */
export const sweetBoost = (s: SaveState) => (eating(s, 'stew') ? 1.3 : 1);
export const afterChop = (s: SaveState) => use(s, 'chops');

/** What's left of your meal, for the HUD ("🥞 3"). */
export function mealLeft(s: SaveState): { icon: string; name: string; left: string } | null {
  if (!s.meal || s.meal.left <= 0) return null;
  const m = MEALS[s.meal.id];
  const left = m.lasts.per === 'seconds' ? `${Math.ceil(s.meal.left / 60)}m` : String(Math.ceil(s.meal.left));
  return { icon: m.icon, name: m.name, left };
}
