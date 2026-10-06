import { describe, expect, test } from 'bun:test';
import { GEAR, MONSTERS } from '../src/data';
import { STAGES, WEAPONS, POLICIES, encounters, availability, fight, probe, mechanics, seeded, summarize, quantile } from './balance/combat';

describe('balance measurements from real combat', () => {
  test('the matrix covers every weapon, every story checkpoint, every native monster and each attack policy', () => {
    expect(WEAPONS.map(w => w.id).sort()).toEqual(Object.values(GEAR).filter(w => w.slot === 'weapon').map(w => w.id).sort());
    expect(POLICIES).toEqual(['normal', 'frequent-special', 'timed-special']);
    const kinds = new Set(STAGES.flatMap(s => encounters(s).flatMap(e => e.foes.map(f => f.kind))));
    expect([...kinds].map(String).sort()).toEqual(Object.keys(MONSTERS).sort());
    for (const s of STAGES.filter(s => !s.foes)) {
      expect(encounters(s).some(e => e.type === 'crowd')).toBe(true);
      expect(encounters(s).some(e => e.type === 'golden')).toBe(true);
    }
    expect(availability(STAGES.find(s => s.id === 'woods')!, 'wyrmfire')).not.toBe('stage tier');
    expect(availability(STAGES.find(s => s.id === 'dragon')!, 'wyrmfire')).toBe('dragon rematch gear');
  });

  test('seeded fights replay identically, restore global randomness and do not mutate stage definitions', () => {
    const s = STAGES.find(s => s.id === 'woods')!, e = encounters(s).find(e => e.id === 'kingslime')!;
    const before = JSON.stringify(s), random = Math.random;
    const a = fight(s, 'stonehammer', e, 'normal', 17), b = fight(s, 'stonehammer', e, 'normal', 17);
    expect(a).toEqual(b);
    expect(Math.random).toBe(random);
    expect(JSON.stringify(s)).toBe(before);
    expect(() => seeded(1, () => { throw new Error('fixture failure'); })).toThrow('fixture failure');
    expect(Math.random).toBe(random);
    expect(a.damage).toBeLessThanOrEqual(a.rawDamage);
    expect(a.healing).toBeCloseTo(a.lifeSteal + a.potionHealing + a.regenHealing, 5);
  });

  test('hammer probes measure actual normal/special hits, locked skills and the extra reach', () => {
    const normal = probe('stonehammer', 2, 'slime', 70, 'normal');
    const skill = probe('stonehammer', 2, 'slime', 70, 'special');
    expect(normal.direct).toBeGreaterThan(0);
    expect(skill.direct).toBeGreaterThan(0);
    expect(skill.hits).toBe(1);
    expect(skill.direct).toBeGreaterThan(normal.direct);
    expect(probe('stonehammer', 1, 'slime', 70, 'special').direct).toBe(0);
    expect(probe('stonehammer', 2, 'slime', 130, 'normal').direct).toBe(0);
    expect(probe('stonehammer', 2, 'slime', 130, 'special').direct).toBeGreaterThan(0);
  });

  test('boss helper cleanup does not count as damage dealt', () => {
    const s = STAGES.find(s => s.id === 'meadow-gear')!, e = encounters(s).find(e => e.id === 'bigbun')!;
    // This fight ends with living helpers, which native Battle.kill removes when their guardian dies.
    for (const seed of [17, 48, 79]) {
      const row = fight(s, 'twig', e, 'frequent-special', seed);
      expect(row.result).toBe('win');
      expect(row.damage).toBeLessThanOrEqual(row.rawDamage);
    }
  });

  test('stationary probes retain the real damage-over-time behavior', () => {
    const spore = probe('sporewand', 5, 'slime', 100, 'normal');
    expect(spore.total).toBeGreaterThan(spore.direct);
  });

  test('statistics retain losses and timeouts rather than reporting only favorable fights', () => {
    const s = STAGES.find(s => s.id === 'woods')!, e = encounters(s).find(e => e.id === 'kingslime')!;
    const row = fight(s, 'stonehammer', e, 'normal', 17);
    const summary = summarize([row, { ...row, result: 'timeout', activeSeconds: 120 }, { ...row, result: 'lose' }]);
    expect(summary.winPct).toBeCloseTo(100 / 3);
    expect(summary.timeoutPct).toBeCloseTo(100 / 3);
    expect(summary.winSeconds).toBe(row.activeSeconds);
    expect(quantile([10, 20], .5)).toBe(15);
  });

  for (const id of ['glimmer-chain', 'dragon-splash', 'fracture-fan']) test(`native combat contract: ${id}`, () => {
    const check = mechanics().find(c => c.id === id)!;
    expect({ id, ok: check.ok, observed: check.ok ? 'working' : check.observed }).toEqual({ id, ok: true, observed: 'working' });
  });

  test('elemental splash and chaining fire once per Scatter cast, even when several bolts land', () => {
    const glimmer = probe('glimmerwand', 10, 'kingslime', 70, 'special');
    const dragon = probe('wyrmfire', 10, 'kingslime', 70, 'special');
    expect(glimmer.hits).toBeGreaterThan(1);
    expect(glimmer.chains).toBe(1);
    expect(dragon.hits).toBeGreaterThan(1);
    expect(dragon.bursts).toBe(1);
  });
});
