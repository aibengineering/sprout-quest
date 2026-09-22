// Pure game rules: stats, damage, leveling, drops and crafting. No DOM access, so it's unit-testable.
import { GEAR, MAX_POTIONS, POTION_RECIPES, type MatId, type MonsterDef, type Recipe, type Style } from './data';
import type { SaveState } from './state';

export type Rng = () => number;

export interface PlayerStats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  luck: number;
  regen: number;
  style: Style;
}

export function xpToNext(lv: number): number {
  return Math.floor(10 * Math.pow(lv, 1.6));
}

export function playerStats(s: SaveState): PlayerStats {
  const gear = [s.equip.weapon, s.equip.armor, s.equip.charm].map((id) => (id ? GEAR[id] : undefined)).filter((g) => !!g);
  const sum = (k: 'atk' | 'def' | 'hp' | 'spd' | 'luck' | 'regen') => gear.reduce((a, g) => a + (g[k] ?? 0), 0);
  return {
    maxHp: 24 + 6 * s.lv + sum('hp'),
    atk: Math.round(2 + 1.5 * s.lv) + sum('atk'),
    def: Math.floor(s.lv * 0.8) + sum('def'),
    spd: sum('spd'),
    luck: sum('luck'),
    regen: sum('regen'),
    style: GEAR[s.equip.weapon]?.style ?? 'sword',
  };
}

export function calcDamage(atk: number, def: number, mult: number, critChance: number, rng: Rng = Math.random) {
  const base = ((atk * atk) / (atk + def + 0.001)) * mult;
  const crit = rng() < critChance;
  const v = base * (0.9 + rng() * 0.2) * (crit ? 1.6 : 1);
  return { dmg: Math.max(1, Math.round(v)), crit };
}

export interface ScaledMonster { hp: number; atk: number; def: number; xp: number }

export function scaleMonster(m: MonsterDef, lv: number, golden: boolean): ScaledMonster {
  const k = Math.max(0.6, 1 + 0.15 * (lv - m.lv));
  const g = golden ? 1.5 : 1;
  return {
    hp: Math.round(m.hp * k * g),
    atk: Math.round(m.atk * k),
    def: Math.round(m.def * k),
    xp: Math.round(m.xp * k * (golden ? 2 : 1)),
  };
}

export function rollDrops(m: MonsterDef, luck: number, golden: boolean, rng: Rng = Math.random): Partial<Record<MatId, number>> {
  const out: Partial<Record<MatId, number>> = {};
  for (const d of m.drops) {
    const chance = golden ? 1 : Math.min(1, d.chance * (1 + luck));
    if (rng() < chance) {
      let n = d.min + Math.floor(rng() * (d.max - d.min + 1));
      if (golden) n *= 2;
      out[d.mat] = (out[d.mat] ?? 0) + n;
    }
  }
  return out;
}

export function mergeDrops(into: Partial<Record<MatId, number>>, add: Partial<Record<MatId, number>>) {
  for (const k in add) {
    const m = k as MatId;
    into[m] = (into[m] ?? 0) + (add[m] ?? 0);
  }
  return into;
}

/** Adds XP, applying level ups. Returns how many levels were gained. Level ups fully heal. */
export function gainXp(s: SaveState, amount: number): number {
  s.xp += amount;
  let gained = 0;
  while (s.xp >= xpToNext(s.lv)) {
    s.xp -= xpToNext(s.lv);
    s.lv++;
    gained++;
  }
  if (gained) s.hp = playerStats(s).maxHp;
  return gained;
}

export function hasMats(s: SaveState, recipe: Recipe): boolean {
  return Object.entries(recipe).every(([m, n]) => s.mats[m as MatId] >= (n ?? 0));
}

function spend(s: SaveState, recipe: Recipe) {
  for (const [m, n] of Object.entries(recipe)) s.mats[m as MatId] -= n ?? 0;
}

export type CraftResult = 'ok' | 'owned' | 'missing' | 'full' | 'unknown';

export function craftGear(s: SaveState, id: string): CraftResult {
  const g = GEAR[id];
  if (!g?.recipe) return 'unknown';
  if (s.owned.includes(id)) return 'owned';
  if (!hasMats(s, g.recipe)) return 'missing';
  spend(s, g.recipe);
  s.owned.push(id);
  return 'ok';
}

export function craftPotion(s: SaveState, id: string): CraftResult {
  const p = POTION_RECIPES.find((r) => r.id === id);
  if (!p) return 'unknown';
  if (s.potions >= MAX_POTIONS) return 'full';
  if (!hasMats(s, p.recipe)) return 'missing';
  spend(s, p.recipe);
  s.potions++;
  return 'ok';
}

export function equip(s: SaveState, id: string): boolean {
  const g = GEAR[id];
  if (!g || !s.owned.includes(id)) return false;
  const before = playerStats(s).maxHp;
  if (g.slot === 'charm') s.equip.charm = s.equip.charm === id ? null : id;
  else s.equip[g.slot] = id;
  // Keep the same amount of missing HP when max HP changes.
  const after = playerStats(s).maxHp;
  s.hp = Math.max(1, Math.min(after, s.hp + (after - before)));
  return true;
}

export function weightedPick<T extends { w: number }>(items: T[], rng: Rng = Math.random): T {
  const total = items.reduce((a, i) => a + i.w, 0);
  let r = rng() * total;
  for (const i of items) {
    r -= i.w;
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}
