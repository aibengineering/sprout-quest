// Pure game rules: stats, damage, leveling, drops and crafting. No DOM access, so it's unit-testable.
import { GEAR, MAX_POTIONS, NODES, POTION_RECIPES, PROJECTS, SKILL_MAX, TOOLS, forgeLevelFor, type MatId, type MonsterDef, type NodeKind, type ProjectId, type Recipe, type SkillId, type Style } from './data';
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
  // The flat 20 slows the first few levels (the meadow used to level you every other kill) without touching late ones.
  return Math.floor(20 + 10 * Math.pow(lv, 1.6));
}

export function playerStats(s: SaveState): PlayerStats {
  const gear = [s.equip.weapon, s.equip.armor, s.equip.charm].map((id) => (id ? GEAR[id] : undefined)).filter((g) => !!g);
  const sum = (k: 'atk' | 'def' | 'hp' | 'spd' | 'luck' | 'regen') => gear.reduce((a, g) => a + (g[k] ?? 0), 0);
  const home = s.build?.home ?? 1, training = s.build?.training ?? 0;
  return {
    maxHp: Math.round((24 + 6 * s.lv + sum('hp')) * (1 + 0.1 * (home - 1))),
    atk: Math.round((Math.round(2 + 1.5 * s.lv) + sum('atk')) * (1 + 0.05 * training)),
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

/** Clover-dropping kills in a row without a clover before one is guaranteed, so the Cottage never stalls on bad luck. */
export const CLOVER_PITY = 8;

/** Bad-luck protection for Lucky Clovers: adds one to `drops` after too many dry kills. Mutates the save's counter. */
export function cloverPity(s: SaveState, m: MonsterDef, drops: Partial<Record<MatId, number>>) {
  if (!m.drops.some((d) => d.mat === 'clover')) return;
  if (drops.clover) s.cloverDry = 0;
  else if (++s.cloverDry >= CLOVER_PITY) {
    drops.clover = 1;
    s.cloverDry = 0;
  }
}

/** Prologue foes hit this much softer, so a first-timer who hasn't learned to dodge yet can't lose. */
export const GENTLE_ATK = 0.5;

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

export type CraftResult = 'ok' | 'owned' | 'missing' | 'full' | 'unknown' | 'forge' | 'maxed' | 'skill';

/** How many potions the fountain tops you up to — grows with the Garden. */
export function potionRefill(s: SaveState): number {
  return Math.min(MAX_POTIONS, 2 + (s.build?.garden ?? 0));
}

export function canBuild(s: SaveState, id: ProjectId): CraftResult {
  const p = PROJECTS[id];
  const lv = s.build[id];
  if (lv >= p.levels.length) return 'maxed';
  return hasMats(s, p.levels[lv].cost) ? 'ok' : 'missing';
}

export function build(s: SaveState, id: ProjectId): CraftResult {
  const r = canBuild(s, id);
  if (r !== 'ok') return r;
  spend(s, PROJECTS[id].levels[s.build[id]].cost);
  s.build[id]++;
  return 'ok';
}

export function craftGear(s: SaveState, id: string): CraftResult {
  const g = GEAR[id];
  if (!g?.recipe) return 'unknown';
  if (s.owned.includes(id)) return 'owned';
  if ((s.build?.forge ?? 1) < forgeLevelFor(g)) return 'forge';
  if (missingSkill(s, g.needs)) return 'skill';
  if (!hasMats(s, g.recipe)) return 'missing';
  spend(s, g.recipe);
  s.owned.push(id);
  s.crafted = (s.crafted ?? 0) + 1;
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

// ----------------------------------------------------------------------------- gathering

/** The first gathering skill below what a recipe needs, if any. */
export function missingSkill(s: SaveState, needs?: Partial<Record<SkillId, number>>): { skill: SkillId; level: number } | null {
  for (const [k, lv] of Object.entries(needs ?? {}) as [SkillId, number][]) if (s.skills[k].lv < lv) return { skill: k, level: lv };
  return null;
}

export function skillXpToNext(lv: number): number {
  return 15 * lv + 5;
}

/** Adds gathering XP. Returns how many levels were gained (capped at SKILL_MAX). */
export function gainSkillXp(s: SaveState, skill: SkillId, amount: number): number {
  const sk = s.skills[skill];
  if (sk.lv >= SKILL_MAX) return 0;
  sk.xp += amount;
  let gained = 0;
  while (sk.lv < SKILL_MAX && sk.xp >= skillXpToNext(sk.lv)) {
    sk.xp -= skillXpToNext(sk.lv);
    sk.lv++;
    gained++;
  }
  if (sk.lv >= SKILL_MAX) sk.xp = 0;
  return gained;
}

export function craftTool(s: SaveState, id: string): CraftResult {
  const t = TOOLS.find((t) => t.id === id);
  if (!t) return 'unknown';
  if (s.tools[t.skill] >= t.tier) return 'owned';
  if (s.skills[t.skill].lv < t.level) return 'skill';
  if (!hasMats(s, t.recipe)) return 'missing';
  spend(s, t.recipe);
  s.tools[t.skill] = t.tier;
  return 'ok';
}

/** Why a node can't be gathered right now, or 'ok'. */
export function canGather(s: SaveState, kind: NodeKind, nodeId: string, now = Date.now()): 'ok' | 'tool' | 'regrowing' {
  const n = NODES[kind];
  if (s.tools[n.skill] < n.tier) return 'tool';
  if ((s.nodes[nodeId] ?? 0) > now) return 'regrowing';
  return 'ok';
}

/** Width of the timing bar's sweet spot (0–1): it grows with skill level. */
export function sweetWidth(lv: number): number {
  return 0.16 + 0.012 * (Math.min(SKILL_MAX, lv) - 1);
}

/** Damage per clean strike: a tool above the tree's tier bites deeper. */
export function toolPower(toolTier: number, nodeTier: number): number {
  return 1 + 0.5 * Math.max(0, toolTier - nodeTier);
}

export interface GatherReward { drops: Partial<Record<MatId, number>>; xp: number; levels: number }

/** Fells a tree or breaks a rock: pays out its material (+1 for a flawless job), a grass node's rare find, skill XP, and starts regrowth. */
export function harvest(s: SaveState, kind: NodeKind, nodeId: string, grass: boolean, flawless: boolean, rng: Rng = Math.random, now = Date.now()): GatherReward {
  const n = NODES[kind];
  const spot = grass ? n.grass : n.safe;
  const drops: Partial<Record<MatId, number>> = { [n.mat]: spot.yield + (flawless ? 1 : 0) };
  if (grass && rng() < n.grass.rare.chance) drops[n.grass.rare.mat] = (drops[n.grass.rare.mat] ?? 0) + 1;
  mergeDrops(s.mats, drops);
  s.nodes[nodeId] = now + spot.regrow * 1000;
  const levels = gainSkillXp(s, n.skill, spot.xp);
  return { drops, xp: spot.xp, levels };
}
