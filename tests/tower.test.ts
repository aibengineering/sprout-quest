import { describe, expect, test } from 'bun:test';
import { CHECKPOINTS } from '../src/balance';
import { ZONES } from '../src/data';
import { TOWER, checkpointFor } from '../src/tower';

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
});
