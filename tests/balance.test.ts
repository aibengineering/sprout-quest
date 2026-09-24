import { describe, expect, test } from 'bun:test';
import { GEAR } from '../src/data';
import {
  CHECKPOINTS, KILLS_PER_LEVEL, MAX_DRAGON_FIGHTS, MAX_FARM_MINUTES, checkpointStats, dragonFights, farmTable, killsPerLevel, matchup, minutesToWoodLevel,
  weaponTrack, zoneMatchups, type Range,
} from '../src/balance';

// Run `bun run balance` to see the whole table while tuning.
const within = (v: number, [lo, hi]: Range) => v >= lo && v <= hi;

describe('balance', () => {
  for (const c of CHECKPOINTS) {
    test(`${c.label}: regular fights take ${c.hitsToKill.join('–')} swings and ${c.hitsToDie.join('–')} hits to lose`, () => {
      const off = zoneMatchups(c)
        .filter((m) => !within(m.hitsToKill, c.hitsToKill) || !within(m.hitsToDie, c.hitsToDie))
        .map((m) => `${m.name} lv${m.lv}: ${m.hitsToKill} swings to kill, ${m.hitsToDie} hits to die`);
      expect(off).toEqual([]);
    });

    const pace = killsPerLevel(c);
    if (pace !== null) test(`${c.label}: ${KILLS_PER_LEVEL.join('–')} kills per level`, () => {
      const kills = Math.round(pace);
      expect(kills).toBeGreaterThanOrEqual(KILLS_PER_LEVEL[0]);
      expect(kills).toBeLessThanOrEqual(KILLS_PER_LEVEL[1]);
    });

    const boss = c.boss;
    if (boss) {
      test(`${c.label}: boss takes ${boss.hitsToKill.join('–')} swings and ${boss.hitsToDie.join('–')} hits to lose`, () => {
        const b = matchup(checkpointStats(c), boss.kind, boss.lv);
        const off = [
          ...(within(b.hitsToKill, boss.hitsToKill) ? [] : [`${b.hitsToKill} swings to kill`]),
          ...(within(b.hitsToDie, boss.hitsToDie) ? [] : [`${b.hitsToDie} hits to die`]),
        ];
        expect(off).toEqual([]);
      });
    }
  }

  test(`every material for every building, gear piece and tool farms in ≤${MAX_FARM_MINUTES} minutes`, () => {
    const off = farmTable()
      .filter((f) => f.mat !== 'scale' && f.minutes > MAX_FARM_MINUTES)
      .map((f) => `${f.mat}: ${f.minutes.toFixed(1)} min from ${f.source} in ${f.zone ?? 'no zone'}`);
    expect(off).toEqual([]);
  });

  test('Woodcutting reaches the Fang Axe in ≤8 minutes of chopping and mastery in ≤20', () => {
    expect(minutesToWoodLevel(5)).toBeLessThanOrEqual(8);
    expect(minutesToWoodLevel(10)).toBeLessThanOrEqual(20);
  });

  test('every weapon tier has a hunter and a gatherer option, and the top tier needs both', () => {
    const weapons = Object.values(GEAR).filter((g) => g.slot === 'weapon' && g.recipe);
    for (const tier of [1, 2, 3, 4]) {
      const tracks = new Set(weapons.filter((g) => g.tier === tier).map(weaponTrack));
      expect({ tier, hunter: tracks.has('hunter'), gatherer: tracks.has('gatherer') }).toEqual({ tier, hunter: true, gatherer: true });
    }
    for (const g of weapons.filter((g) => g.tier === 5)) expect(weaponTrack(g)).toBe('both');
  });

  test(`every Dragon Scale takes ≤${MAX_DRAGON_FIGHTS} Emberwyrm fights`, () => {
    expect(dragonFights()).toBeLessThanOrEqual(MAX_DRAGON_FIGHTS);
  });
});
