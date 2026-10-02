import { describe, expect, test } from 'bun:test';
import { MASTERY_FOR_TIER, GEAR, ZONES, MONSTERS, SKILL_MAX, TOOLS, forgeLevelFor } from '../src/data';
import { MOVESETS, SKILL_LEVELS, SKILL_RANKS, comboTime, handlingStep, skillShape, tierScale, type SkillKind } from '../src/weapons';
import { ARENA_AREA, cropsPerTree } from '../src/balance';
import {
  CHECKPOINTS, HUNTER_DPS, RANGED_DPS, MAX_HUNTER_BURST, dpsBand, KILLS_PER_LEVEL, LEGENDARY_EDGE, MAX_HANDLING_MINUTES, TRACK_SPREAD, oneWeaponRun, HEAVY_RUN, LIGHT_RUN, atLevelKills, CLASS_STRIKES, MAX_KILL_SECONDS, dpsVsGatherers, minutesToHandle, MAX_DRAGON_FIGHTS, MAX_FARM_MINUTES, MAX_MASTERED_SKILL_AREA, MAX_SKILL_AREA, MAX_STRIKE_AREA, MAX_STRIKE_REACH, weaponStats, checkpointStats, dragonFights, farmTable, killsPerLevel, matchup, minutesToSkillLevel, gearTrack,
  zoneMatchups, type Range,
} from '../src/balance';

// Run `bun run balance` to see the whole table while tuning.
const within = (v: number, [lo, hi]: Range) => v >= lo && v <= hi;

describe('balance', () => {
  for (const c of CHECKPOINTS) {
    test(`${c.label}: regular fights take ${c.hitsToDie.join('–')} hits to lose${c.hitsToKill ? ` and ${c.hitsToKill.join('–')} swings to win` : ''}`, () => {
      const off = zoneMatchups(c)
        .filter((m) => (c.hitsToKill && !within(m.hitsToKill, c.hitsToKill)) || !within(m.hitsToDie, c.hitsToDie))
        .map((m) => `${m.name} lv${m.lv}: ${m.hitsToKill} swings to kill, ${m.hitsToDie} hits to die`);
      expect(off).toEqual([]);
    });

    const kills = atLevelKills(c);
    if (kills.length) test(`${c.label}: a fair fight is a real exchange with every class (Blades ${CLASS_STRIKES.sword.join('–')} strikes, Hammer and Whip ${CLASS_STRIKES.whip.join('–')}, Magic ${CLASS_STRIKES.wand.join('–')}), over within ${MAX_KILL_SECONDS}s`, () => {
      const off = kills
        .filter((k) => !within(k.kill.strikes, CLASS_STRIKES[k.style]) || k.kill.seconds > MAX_KILL_SECONDS)
        .map((k) => `${k.weapon} vs ${k.kind} lv${k.lv}: ${k.kill.strikes} strikes, ${k.kill.seconds.toFixed(1)}s`);
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

  // Poppy's story opens once you're about ready for a first ★ weapon: Big Bun should be a real fight at that point, but
  // no Slime King.
  test('Big Bun, the meadow mini-boss, takes 13–20 swings and 6–10 hits to lose: more than a regular fight, less than the Slime King', () => {
    const c = CHECKPOINTS.find((c) => c.id === 'meadow-gear')!, s = checkpointStats(c);
    const bun = matchup(s, 'bigbun', MONSTERS.bigbun.lv), king = matchup(s, 'kingslime', 5);
    expect(within(bun.hitsToKill, [13, 20]) && within(bun.hitsToDie, [6, 10])).toBe(true);
    expect(bun.hitsToKill < king.hitsToKill && bun.hitsToDie > king.hitsToDie).toBe(true);
  });

  test(`every material for every building, gear piece and tool farms in ≤${MAX_FARM_MINUTES} minutes`, () => {
    const off = farmTable()
      .filter((f) => f.mat !== 'scale' && f.minutes > MAX_FARM_MINUTES)
      .map((f) => `${f.mat}: ${f.minutes.toFixed(1)} min from ${f.source} in ${f.zone ?? 'no zone'}`);
    expect(off).toEqual([]);
  });

  test('each gathering skill reaches its next tool in ≤8 minutes of gathering, and mastery in ≤20', () => {
    for (const t of TOOLS.filter((t) => t.level > 1)) expect({ tool: t.id, minutes: minutesToSkillLevel(t.skill, t.level) <= 8 }).toEqual({ tool: t.id, minutes: true });
    for (const sk of ['wood', 'mine'] as const) expect(minutesToSkillLevel(sk, SKILL_MAX)).toBeLessThanOrEqual(20);
  });

  test('hunter gear is all monster drops, gatherer gear is all wood/stone/ore and needs a skill level', () => {
    for (const g of Object.values(GEAR).filter((g) => g.recipe)) {
      const track = gearTrack(g);
      expect({ id: g.id, needsSkill: !!g.needs }).toEqual({ id: g.id, needsSkill: track !== 'hunter' });
    }
  });

  test('every weapon tier and forge level has a hunter and a gatherer option, and the "both" gear beats them all', () => {
    const craftable = Object.values(GEAR).filter((g) => g.recipe);
    for (const tier of [1, 2, 3, 4]) {
      const tracks = new Set(craftable.filter((g) => g.slot === 'weapon' && g.tier === tier).map(gearTrack));
      expect({ tier, hunter: tracks.has('hunter'), gatherer: tracks.has('gatherer') }).toEqual({ tier, hunter: true, gatherer: true });
    }
    for (const tier of [1, 2, 3, 4]) {
      const tracks = new Set(craftable.filter((g) => g.slot === 'armor' && g.tier === tier).map(gearTrack));
      expect({ armorTier: tier, hunter: tracks.has('hunter'), gatherer: tracks.has('gatherer') }).toEqual({ armorTier: tier, hunter: true, gatherer: true });
    }
    for (const slot of ['weapon', 'armor'] as const) {
      const both = craftable.filter((g) => g.slot === slot && gearTrack(g) === 'both');
      const single = craftable.filter((g) => g.slot === slot && gearTrack(g) !== 'both');
      expect(both.length).toBeGreaterThan(0);
      const power = (g: (typeof craftable)[number]) => (slot === 'weapon' ? g.atk ?? 0 : g.def ?? 0);
      for (const b of both) expect({ id: b.id, strongest: single.every((o) => power(b) > power(o)) }).toEqual({ id: b.id, strongest: true });
    }
  });

  test(`every Dragon Scale takes ≤${MAX_DRAGON_FIGHTS} Emberwyrm fights`, () => {
    expect(dragonFights()).toBeLessThanOrEqual(MAX_DRAGON_FIGHTS);
  });

  test(`hunter weapons stay below their tier's best gatherer damage, non-hammer tracks stay even, and legendaries lead`, () => {
    const ws = weaponStats().filter((w) => w.tier > 0), rel = dpsVsGatherers(), burst = dpsVsGatherers('burst');
    const off: string[] = [];
    for (const w of ws.filter((w) => w.track === 'hunter')) {
      const band = dpsBand(w);
      if (rel[w.id] < band[0] || rel[w.id] > band[1]) off.push(`${w.id}: ${rel[w.id].toFixed(2)}× gatherers`);
      if (burst[w.id] > MAX_HUNTER_BURST) off.push(`${w.id}: opens with ${burst[w.id].toFixed(2)}× gatherers' burst`);
    }
    for (const w of ws) {
      if (w.style === 'hammer') continue; // Hammers deliberately trade normal DPS for Stagger and their heavy special.
      const peers = ws.filter((o) => o.tier === w.tier && o.track === w.track && o.style !== 'hammer');
      const mean = peers.reduce((a, o) => a + o.dps, 0) / peers.length;
      if (Math.abs(w.dps / mean - 1) > TRACK_SPREAD) off.push(`${w.id}: ${(w.dps / mean).toFixed(2)}× its track`);
    }
    const best4 = Math.max(...ws.filter((w) => w.tier === 4).map((w) => w.dps));
    for (const w of ws.filter((w) => w.tier === 5)) if (w.dps < best4 * LEGENDARY_EDGE) off.push(`${w.id}: only ${(w.dps / best4).toFixed(2)}× the best ★4`);
    expect(off).toEqual([]);
  });

  test('hammers trade normal DPS for Stagger and Fracture, without making regular attacks irrelevant', () => {
    const ws = weaponStats();
    for (const hammer of ws.filter((w) => w.style === 'hammer')) {
      const blade = ws.find((w) => w.style === 'sword' && w.tier === hammer.tier)!;
      expect(hammer.dps / blade.dps).toBeGreaterThanOrEqual(.7);
      expect(hammer.dps / blade.dps).toBeLessThanOrEqual(.9);
    }
  });

  test("handling: the skill unlocks at Lv 2 and ranks up at 5, 8 and 10, the class's trick comes at 3, and the levels between speed up your attacks", () => {
    expect(SKILL_LEVELS).toEqual([2, 5, 8, 10]);
    expect(handlingStep(3)).toBe('trick');
    for (let lv = 2; lv <= 10; lv++) expect(handlingStep(lv)).not.toBeNull();
    const sword = MOVESETS.sword;
    // Speed only moves on speed levels, and every one of them is a real step.
    for (let lv = 2; lv <= 10; lv++) {
      const faster = comboTime(sword, lv - 1) / comboTime(sword, lv) - 1;
      if (handlingStep(lv) === 'speed') expect(faster).toBeGreaterThan(0.05);
      else expect(faster).toBe(0);
    }
  });

  test('skills: non-hammer specials keep comparable damage; every special grows and stays smaller than the arena', () => {
    const kinds: SkillKind[] = ['spin', 'whirl', 'scatter'];
    const off: string[] = [];
    for (let r = 1; r <= 4; r++) {
      const mults = kinds.map((k) => skillShape(k, 1, r).mult), mean = mults.reduce((a, b) => a + b, 0) / mults.length;
      kinds.forEach((k, i) => {
        if (Math.abs(mults[i] / mean - 1) > 0.25) off.push(`${k} rank ${r}: ${mults[i].toFixed(2)}× vs ${mean.toFixed(2)}× average`);
        if (r > 1 && mults[i] <= skillShape(k, 1, r - 1).mult) off.push(`${k} rank ${r} is no stronger than rank ${r - 1}`);
      });
    }
    for (let r = 1; r <= 4; r++) {
      const quake = skillShape('quake', 1, r);
      expect(quake.mult).toBeGreaterThan(MOVESETS.hammer.combo[0].mult);
      expect(quake.mult).toBeLessThanOrEqual(MOVESETS.hammer.combo[0].mult * 2);
      if (r > 1) expect(quake.mult).toBeGreaterThan(skillShape('quake', 1, r - 1).mult);
    }
    for (const g of Object.values(GEAR).filter((g) => g.slot === 'weapon')) {
      const a = skillShape(MOVESETS[g.style!].skill, tierScale(g.tier ?? 0), 4).area / ARENA_AREA;
      if (a > MAX_MASTERED_SKILL_AREA) off.push(`${g.name}: a mastered skill covers ${(a * 100).toFixed(0)}% of the arena`);
    }
    expect(off).toEqual([]);
  });

  test('skills: Spin and Whirl retain comparable crowd damage and their steep rank curve', () => {
    // Crowd value: damage × the ground it lands on (the whirl counts every lash). Nova's bolts fly off one per enemy, so it's left out.
    const kinds: SkillKind[] = ['spin', 'whirl'];
    const off: string[] = [];
    for (let r = 1; r <= 4; r++) {
      const crowd = kinds.map((k) => skillShape(k, 1, r).crowd), mean = crowd.reduce((a, b) => a + b, 0) / crowd.length;
      kinds.forEach((k, i) => { if (crowd[i] > mean * 1.3) off.push(`${k} rank ${r}: ${(crowd[i] / mean).toFixed(2)}× the average crowd damage`); });
    }
    for (const k of ['spin', 'whirl', 'scatter'] as SkillKind[]) {
      const one = skillShape(k, 1, 1).mult, four = skillShape(k, 1, 4).mult;
      if (one > 1.4) off.push(`${k} rank I hits ${one.toFixed(2)}×`);
      if (four < one * 2.2) off.push(`${k} Mastery is only ${(four / one).toFixed(2)}× rank I`);
    }
    expect(off).toEqual([]);
  });

  test("one weapon through the story: handling 3 by the Slime King, each tier's handling just as you reach it, Mastery around the Emberwyrm", () => {
    const run = oneWeaponRun(), h = (id: string) => run[id].handling;
    expect({ meadow: h('meadow') }).toEqual({ meadow: 3 });
    expect(h('woods')).toBeGreaterThanOrEqual(MASTERY_FOR_TIER[3]);
    expect(h('woods')).toBeLessThanOrEqual(5);
    expect(h('cave')).toBeGreaterThanOrEqual(MASTERY_FOR_TIER[4]);
    expect(h('cave')).toBeLessThanOrEqual(7);
    expect(h('hollow')).toBeLessThan(MASTERY_FOR_TIER[5] + 1);
    expect(h('peak')).toBeGreaterThanOrEqual(MASTERY_FOR_TIER[5]);
    expect(h('peak')).toBeLessThan(10);
    expect(h('dragon')).toBe(10);
    // A lighter playthrough isn't mastered by the end; a heavy one is, sooner.
    expect(oneWeaponRun(LIGHT_RUN).dragon.handling).toBeLessThan(10);
    expect(oneWeaponRun(HEAVY_RUN).peak.handling).toBe(10);
  });

  test('a natural playthrough meets each guardian about at its level: at most one over, at most two under', () => {
    const run = oneWeaponRun(), areas = ZONES.filter((z) => z.monsters.length), off: string[] = [];
    areas.forEach((z, i) => {
      const g = areas[i + 1]?.guardian ?? { kind: 'dragon', lv: 20 };
      const gap = run[z.id].lv - g.lv;
      if (gap > 1 || gap < -2) off.push(`Lv ${run[z.id].lv} leaving ${z.id} for ${g.kind} (Lv ${g.lv})`);
    });
    expect(off).toEqual([]);
  });

  test('every weapon class has a weapon at every tier, and switching to a new class never costs long to train up', () => {
    const weapons = Object.values(GEAR).filter((g) => g.slot === 'weapon' && g.recipe);
    for (const style of ['sword', 'hammer', 'whip', 'wand'] as const)
      for (const tier of [1, 2, 3, 4, 5]) expect({ style, tier, has: weapons.some((g) => g.style === style && g.tier === tier) }).toEqual({ style, tier, has: true });
    for (const tier of [2, 3, 4, 5]) expect({ tier, ok: minutesToHandle(tier) <= MAX_HANDLING_MINUTES }).toEqual({ tier, ok: true });
  });

  test('no strike reaches or covers too much of the arena, and no skill clears it', () => {
    const off = weaponStats().flatMap((w) => [
      ...(w.reach > MAX_STRIKE_REACH ? [`${w.name} reaches ${w.reach.toFixed(2)} of the arena`] : []),
      ...(w.area > MAX_STRIKE_AREA ? [`${w.name} strike covers ${(w.area * 100).toFixed(0)}%`] : []),
      ...(w.skillArea > MAX_SKILL_AREA ? [`${w.name} skill covers ${(w.skillArea * 100).toFixed(0)}%`] : []),
    ]);
    expect(off).toEqual([]);
  });

  test("Poppy's field: a bigger field lets you plant more at once, not get more crops for your chopping", () => {
    // What each felled oak or pine's seed grows into, as in the old six-bed Garden (20% for a seed, 6 berries or 4 herbs).
    expect(cropsPerTree('berry')).toBeCloseTo(0.2 * 6, 5);
    expect(cropsPerTree('herb')).toBeCloseTo(0.2 * 4, 5);
  });
});
