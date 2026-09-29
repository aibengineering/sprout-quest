import { describe, expect, test } from 'bun:test';
import { CHECKPOINTS } from '../src/balance';
import { ZONES } from '../src/data';
import { GEAR, MATS, NODES, type MatId } from '../src/data';
import { TOWER, checkpointFor, towerSupplies } from '../src/tower';

describe('the Battle Tower', () => {
  test("climbs through every area's monsters and every guardian, to the Emberwyrm at the top", () => {
    const kinds = new Set(TOWER.flatMap((f) => f.foes.map((x) => x.kind)));
    for (const z of ZONES) {
      for (const m of z.monsters) expect({ kind: m.kind, in: kinds.has(m.kind) }).toEqual({ kind: m.kind, in: true });
      if (z.guardian) expect(TOWER.some((f) => f.boss && f.foes[0].kind === z.guardian!.kind)).toBe(true);
    }
    expect(TOWER.at(-1)!.foes[0].kind).toBe('dragon');
    expect(TOWER.map((f) => f.n)).toEqual(TOWER.map((_, i) => i + 1));
  });

  test('never gets easier on the way up, and never fields more monsters than its area does', () => {
    for (let i = 1; i < TOWER.length; i++) expect(TOWER[i].foes[0].lv).toBeGreaterThanOrEqual(TOWER[i - 1].foes[0].lv - 1);
    for (const f of TOWER) expect(f.foes.length).toBeLessThanOrEqual(f.boss ? 1 : f.zone.maxEnemies);
  });

  test("each floor's suggested gear is the balance checkpoint for that stage, rising floor by floor", () => {
    const order = TOWER.map((f) => CHECKPOINTS.indexOf(checkpointFor(f)));
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThanOrEqual(order[i - 1]);
  });

  test("an area's first clears bring enough for any one weapon and one armor of its tier; replays bring only wood, stone and ore", () => {
    const off: string[] = [];
    for (let tier = 1; tier <= 5; tier++) {
      const got: Partial<Record<MatId, number>> = {};
      for (const f of TOWER.filter((f) => f.tier === tier)) for (const [m, n] of Object.entries(towerSupplies(f)) as [MatId, number][]) got[m] = (got[m] ?? 0) + n;
      const gear = Object.values(GEAR).filter((g) => g.tier === tier && g.recipe);
      for (const w of gear.filter((g) => g.slot === 'weapon')) for (const a of gear.filter((g) => g.slot === 'armor')) {
        for (const m of new Set([...Object.keys(w.recipe!), ...Object.keys(a.recipe!)]) as Set<MatId>) {
          const need = (w.recipe![m] ?? 0) + (a.recipe![m] ?? 0);
          if (!MATS[m].where.startsWith('Trophy') && (got[m] ?? 0) < need) off.push(`★${tier} ${w.id} + ${a.id}: ${m} ${got[m] ?? 0}/${need}`);
        }
      }
    }
    expect(off).toEqual([]);
    const gathered = (m: string) => Object.values(NODES).some((n) => n.mat === m);
    for (const f of TOWER) expect(Object.keys(towerSupplies(f, false)).every(gathered)).toBe(true);
  });
});
