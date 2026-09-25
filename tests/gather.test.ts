import { describe, expect, test } from 'bun:test';
import { NODES, NODE_SPAWNS, SKILL_MAX, TOOLS, type ZoneId } from '../src/data';
import { BASE_SPEED, Chop } from '../src/gather';
import { canGather, craftGear, craftTool, gainSkillXp, harvest, skillXpToNext, sweetWidth, toolPower } from '../src/rules';
import { newState } from '../src/state';
import { T, World } from '../src/world';

/** Advance the marker until it sits at `p` (it sweeps both ways, so wait for it to pass). */
function moveTo(c: Chop, p: number) {
  for (let i = 0; i < 10000 && Math.abs(c.pos - p) > 0.004; i++) c.update(0.001);
}

describe('chopping minigame', () => {
  test('clean hits build a streak that speeds the marker up; a miss resets it and locks you out briefly', () => {
    const c = new Chop(100, 1, 0.2, () => 0.5);
    moveTo(c, c.center);
    expect(c.strike()).toBe('perfect');
    expect(c.streak).toBe(1);
    expect(c.speed).toBeGreaterThan(BASE_SPEED);
    c.update(0.2);
    moveTo(c, c.center > 0.5 ? 0.02 : 0.98);
    expect(c.strike()).toBe('miss');
    expect(c.streak).toBe(0);
    expect(c.speed).toBe(BASE_SPEED);
    expect(c.strike()).toBeNull();
    expect(c.flawless).toBe(false);
  });

  test('timing fells a tree in far fewer strikes than missing, but missing still finishes it', () => {
    const timed = new Chop(NODES.oak.hp, 1, 0.2, Math.random);
    let strikes = 0;
    while (!timed.done && strikes < 50) {
      timed.update(0.2);
      moveTo(timed, timed.center);
      if (timed.strike()) strikes++;
    }
    const sloppy = new Chop(NODES.oak.hp, 1, 0.2, () => 0.5);
    let misses = 0;
    while (!sloppy.done && misses < 50) {
      sloppy.update(0.5);
      moveTo(sloppy, sloppy.center > 0.5 ? 0.01 : 0.99);
      if (sloppy.strike()) misses++;
    }
    expect(timed.done && sloppy.done).toBe(true);
    expect(strikes).toBeLessThanOrEqual(4);
    expect(misses).toBeGreaterThan(strikes * 2);
  });

  test('the sweet spot grows with skill level', () => {
    expect(sweetWidth(SKILL_MAX)).toBeGreaterThan(sweetWidth(1));
  });
});

describe('woodcutting rules', () => {
  test('trees need the right axe, pay out wood and XP, then regrow', () => {
    const s = newState();
    expect(canGather(s, 'oak', 'x', 0)).toBe('tool');
    Object.assign(s.mats, { goo: 3, fluff: 2 });
    expect(craftTool(s, 'axe1')).toBe('ok');
    expect(craftTool(s, 'axe1')).toBe('owned');
    expect(canGather(s, 'oak', 'x', 0)).toBe('ok');
    // One tier up still works with a Stone Axe, just slowly; two tiers up doesn't.
    expect(canGather(s, 'pine', 'y', 0)).toBe('ok');
    expect(toolPower(1, NODES.pine.tier)).toBeLessThan(toolPower(1, NODES.oak.tier));
    const r = harvest(s, 'oak', 'x', true, true, () => 1, 0);
    expect(r.drops.bark).toBe(NODES.oak.grass.yield + 1);
    expect(s.mats.bark).toBe(NODES.oak.grass.yield + 1);
    expect(s.skills.wood.xp).toBe(NODES.oak.grass.xp);
    expect(canGather(s, 'oak', 'x', 1000)).toBe('regrowing');
    expect(canGather(s, 'oak', 'x', NODES.oak.grass.regrow * 1000)).toBe('ok');
  });

  test('grass trees can turn up a rare find; safe ones never do', () => {
    const s = newState();
    expect(harvest(s, 'oak', 'a', true, false, () => 0, 0).drops.clover).toBe(1);
    expect(harvest(s, 'oak', 'b', false, false, () => 0, 0).drops.clover).toBeUndefined();
  });

  test('skill levels gate better axes and gatherer gear, and stop at the cap', () => {
    const s = newState();
    for (const k in s.mats) s.mats[k as keyof typeof s.mats] = 99;
    s.build.forge = 1;
    expect(craftTool(s, 'axe2')).toBe('skill');
    expect(craftGear(s, 'barkvest')).toBe('skill');
    gainSkillXp(s, 'wood', 10_000);
    expect(s.skills.wood.lv).toBe(SKILL_MAX);
    expect(craftTool(s, 'axe2')).toBe('ok');
    expect(craftGear(s, 'barkvest')).toBe('ok');
    expect(gainSkillXp(s, 'wood', 10_000)).toBe(0);
    expect(skillXpToNext(1)).toBeGreaterThan(0);
  });

  test('each pick mines its own tier quickly and the next tier up slowly, and is made from the tier below it', () => {
    const s = newState();
    Object.assign(s.mats, { goo: 9, fluff: 9, stone: 20, bark: 20, pine: 20, fang: 9, copper: 20, iron: 20, crystal: 20 });
    expect(canGather(s, 'rock', 'r', 0)).toBe('tool');
    expect(craftTool(s, 'pick1')).toBe('ok');
    expect(canGather(s, 'rock', 'r', 0)).toBe('ok');
    expect(canGather(s, 'copper', 'c', 0)).toBe('ok');
    expect(canGather(s, 'iron', 'i', 0)).toBe('tool');
    expect(craftTool(s, 'pick2')).toBe('skill');
    const r = harvest(s, 'rock', 'r', false, false, () => 1, 0);
    expect(r.drops.stone).toBe(NODES.rock.safe.yield);
    expect(s.skills.mine.xp).toBe(NODES.rock.safe.xp);
    expect(s.skills.wood.xp).toBe(0);
    gainSkillXp(s, 'mine', 10_000);
    expect(craftTool(s, 'pick2')).toBe('ok');
    expect(canGather(s, 'iron', 'i', 0)).toBe('ok');
    expect(canGather(s, 'crystal', 'y', 0)).toBe('tool');
    expect(craftTool(s, 'pick3')).toBe('ok');
    expect(canGather(s, 'crystal', 'y', 0)).toBe('ok');
    expect(craftTool(s, 'pick4')).toBe('ok');
    // A tool is made from its own tier (mined slowly with the tool before it), never from a higher tier (the old
    // Iron Pick needed crystal, which you couldn't mine yet).
    for (const t of TOOLS) {
      const above = Object.values(NODES).filter((n) => n.tier > t.tier).map((n) => n.mat);
      expect({ tool: t.id, needsHigherTier: Object.keys(t.recipe).some((m) => above.includes(m as never)) }).toEqual({ tool: t.id, needsHigherTier: false });
    }
  });

  test('every node tier has a tool that can gather it', () => {
    for (const n of Object.values(NODES)) expect({ n: n.name, tool: TOOLS.some((t) => t.skill === n.skill && t.tier === n.tier) }).toEqual({ n: n.name, tool: true });
  });
});

describe('trees and rocks on the map', () => {
  const w = new World();
  const nodes = w.objs.filter((o) => o.kind === 'node');
  const reach = w.reachable();

  test('every zone grows the trees it promises, with unique ids', () => {
    for (const [zone, spawns] of Object.entries(NODE_SPAWNS) as [ZoneId, { kind: string; safe: number; grass: number }[]][]) {
      for (const sp of spawns) {
        const here = nodes.filter((o) => o.id!.startsWith(`${zone}:${sp.kind}:`));
        expect({ zone, kind: sp.kind, safe: here.filter((o) => !o.grass).length, grass: here.filter((o) => o.grass).length })
          .toEqual({ zone, kind: sp.kind, safe: sp.safe, grass: sp.grass });
      }
    }
    expect(new Set(nodes.map((o) => o.id)).size).toBe(nodes.length);
  });

  test('you can walk up to every tree; safe ones without touching grass, grass ones only through it', () => {
    for (const o of nodes) {
      const tx = Math.floor(o.x), ty = Math.floor(o.y);
      const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: tx + dx, y: ty + dy }));
      expect(around.some((p) => reach[p.y * w.w + p.x])).toBe(true);
      if (o.grass) expect(w.tile(tx, ty)).toBe(T.GRASS);
      else expect(around.some((p) => reach[p.y * w.w + p.x] && w.tile(p.x, p.y) !== T.GRASS)).toBe(true);
    }
  });
});
