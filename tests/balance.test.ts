import { describe, expect, test } from 'bun:test';
import { CHECKPOINTS, KILLS_PER_LEVEL, checkpointStats, killsPerLevel, matchup, zoneMatchups, type Range } from '../src/balance';

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

    test(`${c.label}: ${KILLS_PER_LEVEL.join('–')} kills per level`, () => {
      const kills = Math.round(killsPerLevel(c));
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
});
