// Balance model: where we expect the player to be at each point in the story, and how fights should feel there.
// tests/balance.test.ts enforces the targets; `bun run balance` prints the full table while tuning.
import { MONSTERS, ZONES, type MonsterKind, type ZoneId } from './data';
import { calcDamage, playerStats, scaleMonster, xpToNext, type PlayerStats } from './rules';
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
  /** Swings (at combo multiplier 1, no crits) to kill each regular monster anywhere in the zone's level range. */
  hitsToKill: Range;
  /** Hits the player can take from a regular monster before going down. */
  hitsToDie: Range;
  /** Guardian fought here, with its own swing and survival targets. */
  boss?: { kind: MonsterKind; lv: number; hitsToKill: Range; hitsToDie: Range };
}

// Regular monsters: 2–4 swings, dipping toward 2 right after an upgrade so new gear feels strong without one-shotting,
// then the next zone pulls it back up. Bosses: roughly 20–50 swings.
/** Kills (at mid zone level) needed to gain a level at each checkpoint, so levels neither fly by nor grind. */
export const KILLS_PER_LEVEL: Range = [4, 20];

export const CHECKPOINTS: Checkpoint[] = [
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

export function matchup(p: PlayerStats, kind: MonsterKind, lv: number): Matchup {
  const m = MONSTERS[kind];
  const s = scaleMonster(m, lv, false);
  const dealt = calcDamage(p.atk, s.def, 1, 0, avg).dmg;
  const taken = calcDamage(s.atk, p.def, m.boss ? 0.8 : 1, 0, avg).dmg;
  return { kind, name: m.name, lv, hp: s.hp, hitsToKill: Math.ceil(s.hp / dealt), hitsToDie: Math.ceil(p.maxHp / taken), xp: s.xp };
}

/** Every regular monster in the checkpoint's zone at the bottom and top of the zone's level range. */
export function zoneMatchups(c: Checkpoint): Matchup[] {
  const zone = ZONES.find((z) => z.id === c.zone)!;
  const p = checkpointStats(c);
  const lvs = [...new Set(zone.lv)];
  return zone.monsters.flatMap((m) => lvs.map((lv) => matchup(p, m.kind, lv)));
}

/** Average kills in the zone (weighted by spawn odds, at mid zone level) to gain one level from the checkpoint. */
export function killsPerLevel(c: Checkpoint): number {
  const zone = ZONES.find((z) => z.id === c.zone)!;
  const lv = Math.round((zone.lv[0] + zone.lv[1]) / 2);
  const total = zone.monsters.reduce((a, m) => a + m.w, 0);
  const xp = zone.monsters.reduce((a, m) => a + (m.w / total) * scaleMonster(MONSTERS[m.kind], lv, false).xp, 0);
  return xpToNext(c.lv) / xp;
}

export function report(): string {
  const out: string[] = [];
  const flag = (v: number, [lo, hi]: Range) => (v < lo || v > hi ? `${v}!` : `${v}`);
  for (const c of CHECKPOINTS) {
    const p = checkpointStats(c);
    out.push(`\n${c.label}  (Lv${c.lv} ${c.weapon}/${c.armor}${c.charm ? '/' + c.charm : ''}: atk ${p.atk} def ${p.def} hp ${p.maxHp}, ~${flag(Math.round(killsPerLevel(c)), KILLS_PER_LEVEL)} kills to level)`);
    out.push(`  ${'monster'.padEnd(18)} ${'lv'.padStart(3)} ${'hp'.padStart(5)}  kill ${c.hitsToKill.join('–').padEnd(5)}  die ${c.hitsToDie.join('–')}`);
    for (const m of zoneMatchups(c)) {
      out.push(`  ${m.name.padEnd(18)} ${String(m.lv).padStart(3)} ${String(m.hp).padStart(5)}  ${flag(m.hitsToKill, c.hitsToKill).padStart(10)}  ${flag(m.hitsToDie, c.hitsToDie).padStart(8)}`);
    }
    if (c.boss) {
      const b = matchup(p, c.boss.kind, c.boss.lv);
      out.push(`  ${(b.name + ' (boss)').padEnd(18)} ${String(b.lv).padStart(3)} ${String(b.hp).padStart(5)}  ${flag(b.hitsToKill, c.boss.hitsToKill).padStart(10)}  ${flag(b.hitsToDie, c.boss.hitsToDie).padStart(8)}   targets ${c.boss.hitsToKill.join('–')} / ${c.boss.hitsToDie.join('–')}`);
    }
  }
  return out.join('\n');
}

if (import.meta.main) console.log(report());
