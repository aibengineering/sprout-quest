// Balance model: where we expect the player to be at each point in the story, and how fights should feel there.
// tests/balance.test.ts enforces the targets; `bun run balance` prints the full table while tuning.
import { ARENA_RX, ARENA_RY } from './arena';
import { GEAR, MONSTERS, NODES, NODE_SPAWNS, PROJECTS, SKILL_MAX, SKILL_NAMES, TOOLS, ZONES, zoneAtX, type Gear, type MatId, type MonsterKind, type NodeKind, type Recipe, type SkillId, type Style, type ZoneId } from './data';
import { MOVESETS, comboDps, skillShape, strikeShape, tierScale } from './weapons';
import { GENTLE_ATK, calcDamage, playerStats, scaleMonster, skillXpToNext, xpToNext, type PlayerStats } from './rules';
import { World, type WorldObj } from './world';
import { newState } from './state';

export type Range = [min: number, max: number];

export interface Checkpoint {
  id: string;
  label: string;
  /** Expected player level and loadout on arrival. */
  lv: number;
  weapon: string;
  armor: string;
  charm?: string;
  training?: number;
  home?: number;
  zone: ZoneId;
  /** Scripted fights to check instead of the zone's random spawns. */
  foes?: { kind: MonsterKind; lv: number; gentle?: boolean }[];
  /** Swings (at combo multiplier 1, no crits) to kill each regular monster anywhere in the zone's level range. */
  hitsToKill: Range;
  /** Hits the player can take from a regular monster before going down. */
  hitsToDie: Range;
  /** Guardian fought here, with its own swing and survival targets. */
  boss?: { kind: MonsterKind; lv: number; hitsToKill: Range; hitsToDie: Range };
}

/** Kills (at mid zone level) needed to gain a level at each checkpoint, so levels neither fly by nor grind. */
export const KILLS_PER_LEVEL: Range = [4, 20];

// Regular monsters: 2–4 swings, dipping toward 2 right after an upgrade so new gear feels strong without one-shotting,
// then the next zone pulls it back up. Bosses: roughly 20–50 swings.
export const CHECKPOINTS: Checkpoint[] = [
  // The prologue fights teach the three-hit combo and should be nearly impossible to lose.
  {
    id: 'prologue', label: 'Prologue fights', lv: 1, weapon: 'twig', armor: 'tunic', zone: 'glade', hitsToKill: [2, 4], hitsToDie: [12, 30],
    foes: [{ kind: 'slime', lv: 1, gentle: true }, { kind: 'bunny', lv: 1, gentle: true }],
  },
  { id: 'meadow', label: 'Meadow, fresh start', lv: 1, weapon: 'twig', armor: 'tunic', zone: 'meadow', hitsToKill: [2, 4], hitsToDie: [5, 12] },
  { id: 'meadow-jelly', label: 'Meadow, Jelly Blade crafted', lv: 3, weapon: 'jelly', armor: 'tunic', zone: 'meadow', hitsToKill: [2, 3], hitsToDie: [5, 14] },
  {
    id: 'woods', label: 'Whisper Woods', lv: 4, weapon: 'jelly', armor: 'fluffvest', zone: 'woods', hitsToKill: [2, 5], hitsToDie: [4, 12],
    boss: { kind: 'kingslime', lv: 5, hitsToKill: [18, 50], hitsToDie: [4, 12] },
  },
  {
    id: 'cave', label: 'Crystal Cave', lv: 8, weapon: 'fangspear', armor: 'shroomhood', charm: 'toothcharm', training: 1, zone: 'cave', hitsToKill: [2, 5], hitsToDie: [4, 12],
    boss: { kind: 'alphawolf', lv: 9, hitsToKill: [18, 50], hitsToDie: [4, 12] },
  },
  {
    id: 'peak', label: 'Ember Peak', lv: 13, weapon: 'geode', armor: 'crystalmail', charm: 'toothcharm', training: 2, home: 2, zone: 'peak', hitsToKill: [2, 5], hitsToDie: [4, 12],
    boss: { kind: 'crystalking', lv: 14, hitsToKill: [18, 50], hitsToDie: [4, 12] },
  },
  // By the dragon you've outleveled the bottom of Ember Peak, so only the fight at the top of the zone needs to stay tense.
  {
    id: 'dragon', label: 'Emberwyrm', lv: 18, weapon: 'emberblade', armor: 'magmamail', charm: 'impring', training: 3, home: 3, zone: 'peak', hitsToKill: [1, 4], hitsToDie: [5, 24],
    boss: { kind: 'dragon', lv: 20, hitsToKill: [25, 60], hitsToDie: [3, 10] },
  },
];

export function checkpointStats(c: Checkpoint): PlayerStats {
  const s = newState();
  s.lv = c.lv;
  s.equip = { weapon: c.weapon, armor: c.armor, charm: c.charm ?? null };
  s.build.training = c.training ?? 0;
  s.build.home = c.home ?? 1;
  return playerStats(s);
}

const avg = () => 0.5; // calcDamage's roll lands on exactly 1.0x and never crits

export interface Matchup { kind: MonsterKind; name: string; lv: number; hp: number; hitsToKill: number; hitsToDie: number; xp: number }

export function matchup(p: PlayerStats, kind: MonsterKind, lv: number, gentle = false): Matchup {
  const m = MONSTERS[kind];
  const s = scaleMonster(m, lv, false);
  const dealt = calcDamage(p.atk, s.def, 1, 0, avg).dmg;
  const taken = calcDamage(gentle ? Math.round(s.atk * GENTLE_ATK) : s.atk, p.def, m.boss ? 0.8 : 1, 0, avg).dmg;
  return { kind, name: m.name, lv, hp: s.hp, hitsToKill: Math.ceil(s.hp / dealt), hitsToDie: Math.ceil(p.maxHp / taken), xp: s.xp };
}

/** The checkpoint's scripted foes, or every regular monster in its zone at the bottom and top of the zone's level range. */
export function zoneMatchups(c: Checkpoint): Matchup[] {
  const zone = ZONES.find((z) => z.id === c.zone)!;
  const p = checkpointStats(c);
  if (c.foes) return c.foes.map((f) => matchup(p, f.kind, f.lv, f.gentle));
  const lvs = [...new Set(zone.lv)];
  return zone.monsters.flatMap((m) => lvs.map((lv) => matchup(p, m.kind, lv)));
}

/** Average kills in the zone (weighted by spawn odds, at mid zone level) to gain one level from the checkpoint. */
export function killsPerLevel(c: Checkpoint): number | null {
  const zone = ZONES.find((z) => z.id === c.zone)!;
  if (c.foes || !zone.monsters.length) return null;
  const lv = Math.round((zone.lv[0] + zone.lv[1]) / 2);
  const total = zone.monsters.reduce((a, m) => a + m.w, 0);
  const xp = zone.monsters.reduce((a, m) => a + (m.w / total) * scaleMonster(MONSTERS[m.kind], lv, false).xp, 0);
  return xpToNext(c.lv) / xp;
}

// ----------------------------------------------------------------------------- material economy

/** Everything that needs it (every building level, gear and tool recipe), farmed in its best spot, in ≤ this many minutes. */
export const MAX_FARM_MINUTES = 14;
/** Emberwyrm rematches (it levels up each time) to collect every Dragon Scale. */
export const MAX_DRAGON_FIGHTS = 4;

// Rough real-time costs, so fighting and chopping compare fairly.
/** One kill, including the walk through grass, the fight and the transitions. */
export const SECONDS_PER_KILL = 12;
/** Felling a tree with decent timing. */
const CHOP_SECONDS = 5;
/** Walking between trees on open ground. */
const SAFE_TRIP = 8;
/** Wading out to a tree in the grass and back, including about half a fight on the way. */
const GRASS_TRIP = 20;
/** Share of chops that are flawless (+1 wood). */
const FLAWLESS = 0.5;

export interface Farm {
  mat: MatId;
  need: number;
  /** Guaranteed from one-time guardian fights along the story. */
  fromGuardians: number;
  source: 'monsters' | 'gathering' | 'bosses';
  zone?: ZoneId;
  perMinute: number;
  /** Minutes in the best zone to cover what the guardians don't; 0 if the guardians cover it all. */
  minutes: number;
}

export function totalDemand(): Partial<Record<MatId, number>> {
  const out: Partial<Record<MatId, number>> = {};
  const add = (r: Recipe) => {
    for (const [m, n] of Object.entries(r)) out[m as MatId] = (out[m as MatId] ?? 0) + (n ?? 0);
  };
  for (const p of Object.values(PROJECTS)) p.levels.forEach((l) => add(l.cost));
  for (const g of Object.values(GEAR)) if (g.recipe) add(g.recipe);
  for (const t of TOOLS) add(t.recipe);
  return out;
}

/** Average drops per kill of `mat` in each zone, from spawn weights and drop tables (no luck, no golden monsters). */
export function yieldPerKill(mat: MatId): Partial<Record<ZoneId, number>> {
  const out: Partial<Record<ZoneId, number>> = {};
  for (const z of ZONES) {
    const total = z.monsters.reduce((a, m) => a + m.w, 0);
    for (const m of z.monsters) {
      for (const d of MONSTERS[m.kind].drops) if (d.mat === mat) out[z.id] = (out[z.id] ?? 0) + (m.w / total) * d.chance * ((d.min + d.max) / 2);
    }
  }
  return out;
}

let trees: WorldObj[] | null = null;
const worldTrees = () => (trees ??= new World().objs.filter((o) => o.kind === 'node'));

/**
 * Per second, from chopping the zone's trees of one kind: grass trees first (they pay best), then safe ones with the
 * time left over. Each tree can only be felled once per regrowth. `per` picks what to count (wood, XP…).
 */
function chopRate(zone: ZoneId, kind: NodeKind, per: (spot: { yield: number; xp: number }) => number): number {
  const n = NODES[kind];
  const here = worldTrees().filter((o) => o.node === kind && zoneAtX(Math.floor(o.x)).id === zone);
  const g = here.filter((o) => o.grass).length, sf = here.length - g;
  const gCycle = CHOP_SECONDS + GRASS_TRIP, sCycle = CHOP_SECONDS + SAFE_TRIP;
  const gChops = Math.min(g / n.grass.regrow, 1 / gCycle);
  const busy = gChops * gCycle;
  const sChops = Math.min(sf / n.safe.regrow, (1 - busy) / sCycle);
  return gChops * per(n.grass) + sChops * per(n.safe);
}

/** Material per second from chopping or mining in each zone that has nodes giving it. */
export function gatherPerSecond(mat: MatId): Partial<Record<ZoneId, number>> {
  const out: Partial<Record<ZoneId, number>> = {};
  for (const [kind, n] of Object.entries(NODES) as [NodeKind, (typeof NODES)[NodeKind]][]) {
    if (n.mat !== mat) continue;
    for (const [zone, spawns] of Object.entries(NODE_SPAWNS) as [ZoneId, { kind: NodeKind }[]][]) {
      if (spawns.some((sp) => sp.kind === kind)) out[zone] = (out[zone] ?? 0) + chopRate(zone, kind, (sp) => sp.yield + FLAWLESS);
    }
  }
  return out;
}

export function farmTable(): Farm[] {
  const guardians = ZONES.flatMap((z) => (z.guardian ? [MONSTERS[z.guardian.kind]] : []));
  return Object.entries(totalDemand()).map(([k, need]) => {
    const mat = k as MatId;
    const fromGuardians = guardians.reduce((a, g) => a + g.drops.filter((d) => d.mat === mat && d.chance === 1).reduce((b, d) => b + d.min, 0), 0);
    const rest = Math.max(0, need! - fromGuardians);
    const best = (rates: Partial<Record<ZoneId, number>>) => (Object.entries(rates) as [ZoneId, number][]).sort((a, b) => b[1] - a[1])[0];
    const kill = best(yieldPerKill(mat)), wood = best(gatherPerSecond(mat));
    const killPerMin = kill ? (kill[1] * 60) / SECONDS_PER_KILL : 0, woodPerMin = wood ? wood[1] * 60 : 0;
    const trees = woodPerMin > killPerMin;
    const perMinute = Math.max(killPerMin, woodPerMin);
    return {
      mat, need: need!, fromGuardians,
      source: perMinute ? (trees ? 'gathering' : 'monsters') : 'bosses',
      zone: trees ? wood?.[0] : kill?.[0],
      perMinute,
      minutes: rest ? (perMinute ? rest / perMinute : Infinity) : 0,
    };
  });
}

export function dragonFights(): number {
  const scale = MONSTERS.dragon.drops.find((d) => d.mat === 'scale')!;
  return Math.ceil((totalDemand().scale ?? 0) / scale.min);
}

/** Minutes of chopping to reach a Woodcutting level, always at the best trees your axe (and level) allow. */
/** Minutes of gathering to reach a skill level, always at the best nodes your tools (which need levels too) allow. */
export function minutesToSkillLevel(skill: SkillId, target: number): number {
  let secs = 0;
  for (let lv = 1; lv < Math.min(target, SKILL_MAX + 1); lv++) {
    const tier = Math.max(...TOOLS.filter((t) => t.skill === skill && t.level <= lv).map((t) => t.tier));
    const kinds = (Object.keys(NODES) as NodeKind[]).filter((k) => NODES[k].skill === skill && NODES[k].tier <= tier);
    const xpPerSec = Math.max(...kinds.flatMap((k) => (Object.entries(NODE_SPAWNS) as [ZoneId, { kind: NodeKind }[]][])
      .filter(([, sp]) => sp.some((x) => x.kind === k)).map(([z]) => chopRate(z, k, (sp) => sp.xp))));
    secs += skillXpToNext(lv) / xpPerSec;
  }
  return secs / 60;
}

const gathered = (m: string) => Object.values(NODES).some((n) => n.mat === m);

/**
 * Gear tracks: hunter gear is made only from monster drops; gatherer gear only from wood, stone and ore (and needs a
 * gathering skill level); the strongest top-tier pieces need both.
 */
export function gearTrack(g: Gear): 'hunter' | 'gatherer' | 'both' {
  const mats = Object.keys(g.recipe ?? {});
  const wild = mats.some(gathered), hunted = mats.some((m) => !gathered(m));
  return wild && hunted ? 'both' : wild ? 'gatherer' : 'hunter';
}

// ----------------------------------------------------------------------------- weapons

/** The arena's area, for judging how much of it one strike covers. */
export const ARENA_AREA = Math.PI * ARENA_RX * ARENA_RY;
/** No regular strike (shockwave included) reaches further than this share of the arena's half-width. */
export const MAX_STRIKE_REACH = 0.7;
/** …or covers more than this share of the arena. */
export const MAX_STRIKE_AREA = 0.1;
/** A skill can clear a crowd, but not the whole arena. */
export const MAX_SKILL_AREA = 0.3;
/** A weapon's damage per second (attack × combo rate) stays within this share of its tier's average. */
export const DPS_SPREAD = 0.2;

export interface WeaponStats { id: string; name: string; tier: number; style: Style; dps: number; reach: number; area: number; skillArea: number; skillMult: number }

export function weaponStats(): WeaponStats[] {
  return Object.values(GEAR).filter((g) => g.slot === 'weapon').map((g) => {
    const m = MOVESETS[g.style ?? 'sword'], k = tierScale(g.tier ?? 0);
    const shapes = m.combo.map((s) => strikeShape(s, k)).filter((_, i) => m.combo[i].shape !== 'shot');
    const sk = skillShape(m.skill, k);
    return {
      id: g.id, name: g.name, tier: g.tier ?? 0, style: g.style ?? 'sword',
      dps: comboDps(m) * (g.atk ?? 0),
      reach: Math.max(0, ...shapes.map((s) => s.reach)) / ARENA_RX,
      area: Math.max(0, ...m.combo.map((s) => strikeShape(s, k).area)) / ARENA_AREA,
      skillArea: sk.area / ARENA_AREA,
      skillMult: sk.mult,
    };
  });
}

/** Each weapon's damage per second relative to the average of its tier. */
export function dpsVsTier(): Record<string, number> {
  const ws = weaponStats(), out: Record<string, number> = {};
  for (const w of ws) {
    const same = ws.filter((o) => o.tier === w.tier);
    out[w.id] = w.dps / (same.reduce((a, o) => a + o.dps, 0) / same.length);
  }
  return out;
}

const flag = (v: number, [lo, hi]: Range) => (v < lo || v > hi ? `${v}!` : `${v}`);

function levelPace(c: Checkpoint): string {
  const k = killsPerLevel(c);
  return k === null ? '' : `, ~${flag(Math.round(k), KILLS_PER_LEVEL)} kills to level`;
}

export function report(): string {
  const out: string[] = [];
  for (const c of CHECKPOINTS) {
    const p = checkpointStats(c);
    out.push(`\n${c.label}  (Lv${c.lv} ${c.weapon}/${c.armor}${c.charm ? '/' + c.charm : ''}: atk ${p.atk} def ${p.def} hp ${p.maxHp}${levelPace(c)})`);
    out.push(`  ${'monster'.padEnd(18)} ${'lv'.padStart(3)} ${'hp'.padStart(5)}  kill ${c.hitsToKill.join('–').padEnd(5)}  die ${c.hitsToDie.join('–')}`);
    for (const m of zoneMatchups(c)) {
      out.push(`  ${m.name.padEnd(18)} ${String(m.lv).padStart(3)} ${String(m.hp).padStart(5)}  ${flag(m.hitsToKill, c.hitsToKill).padStart(10)}  ${flag(m.hitsToDie, c.hitsToDie).padStart(8)}`);
    }
    if (c.boss) {
      const b = matchup(p, c.boss.kind, c.boss.lv);
      out.push(`  ${(b.name + ' (boss)').padEnd(18)} ${String(b.lv).padStart(3)} ${String(b.hp).padStart(5)}  ${flag(b.hitsToKill, c.boss.hitsToKill).padStart(10)}  ${flag(b.hitsToDie, c.boss.hitsToDie).padStart(8)}   targets ${c.boss.hitsToKill.join('–')} / ${c.boss.hitsToDie.join('–')}`);
    }
  }
  out.push(`\nMaterials for every building, gear piece and tool  (target: ≤${MAX_FARM_MINUTES} min in the best spot)`);
  out.push(`  ${'material'.padEnd(12)} ${'need'.padStart(4)} ${'boss'.padStart(5)}  ${'from'.padEnd(9)} ${'zone'.padEnd(7)} ${'/min'.padStart(5)}  minutes`);
  for (const f of farmTable()) {
    if (f.mat === 'scale') continue;
    const mins = f.minutes === Infinity ? 'none!' : flag(Math.round(f.minutes * 10) / 10, [0, MAX_FARM_MINUTES]);
    out.push(`  ${f.mat.padEnd(12)} ${String(f.need).padStart(4)} ${String(f.fromGuardians).padStart(5)}  ${f.source.padEnd(9)} ${(f.zone ?? '-').padEnd(7)} ${f.perMinute.toFixed(1).padStart(5)}  ${mins.padStart(7)}`);
  }
  out.push(`  scale: ${totalDemand().scale ?? 0} needed, ${flag(dragonFights(), [0, MAX_DRAGON_FIGHTS])} Emberwyrm fights`);
  for (const sk of Object.keys(SKILL_NAMES) as SkillId[]) {
    const tools = TOOLS.filter((t) => t.skill === sk && t.level > 1).map((t) => `Lv ${t.level} (${t.name}) in ~${minutesToSkillLevel(sk, t.level).toFixed(1)} min`);
    out.push(`${SKILL_NAMES[sk]}: ${tools.join(', ')}, Lv ${SKILL_MAX} in ~${minutesToSkillLevel(sk, SKILL_MAX).toFixed(1)} min`);
  }
  const tiers = [1, 2, 3, 4, 5].map((t) => {
    const ws = Object.values(GEAR).filter((g) => g.slot === 'weapon' && g.tier === t);
    return `  ★${t}: ${ws.map((g) => `${g.name} (${gearTrack(g)})`).join(', ')}`;
  });
  out.push(`\nWeapon tracks\n${tiers.join('\n')}`);
  const rel = dpsVsTier();
  out.push(`\nWeapons  (targets: DPS within ±${DPS_SPREAD * 100}% of its tier, reach ≤${MAX_STRIKE_REACH} of the arena's half-width, strike ≤${MAX_STRIKE_AREA * 100}% / skill ≤${MAX_SKILL_AREA * 100}% of the arena)`);
  out.push(`  ${'weapon'.padEnd(16)} ${'★'.padStart(2)} ${'style'.padEnd(7)} ${'dps'.padStart(5)} ${'vs tier'.padStart(8)} ${'reach'.padStart(6)} ${'area'.padStart(6)} ${'skill'.padStart(6)} ${'×skill'.padStart(7)}`);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  for (const w of weaponStats()) {
    const vs = Math.abs(rel[w.id] - 1) > DPS_SPREAD ? `${rel[w.id].toFixed(2)}!` : rel[w.id].toFixed(2);
    out.push(`  ${w.name.padEnd(16)} ${String(w.tier).padStart(2)} ${w.style.padEnd(7)} ${w.dps.toFixed(0).padStart(5)} ${vs.padStart(8)} ${(w.reach.toFixed(2) + (w.reach > MAX_STRIKE_REACH ? '!' : '')).padStart(6)} ${(pct(w.area) + (w.area > MAX_STRIKE_AREA ? '!' : '')).padStart(6)} ${(pct(w.skillArea) + (w.skillArea > MAX_SKILL_AREA ? '!' : '')).padStart(6)} ${w.skillMult.toFixed(1).padStart(7)}`);
  }
  return out.join('\n');
}

if (import.meta.main) console.log(report());
