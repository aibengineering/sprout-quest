import { describe, expect, test } from 'bun:test';
import { NODES, NODE_SPAWNS, SKILL_MAX, TOOLS, type ZoneId } from '../src/data';
import { BASE_SPEED, Chop } from '../src/gather';
import { canChop, craftGear, craftTool, fellTree, gainSkillXp, skillXpToNext, sweetWidth } from '../src/rules';
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
    expect(canChop(s, 'oak', 'x', 0)).toBe('tool');
    Object.assign(s.mats, { goo: 3, fluff: 2 });
    expect(craftTool(s, 'axe1')).toBe('ok');
    expect(craftTool(s, 'axe1')).toBe('owned');
    expect(canChop(s, 'oak', 'x', 0)).toBe('ok');
    expect(canChop(s, 'pine', 'y', 0)).toBe('tool');
    const r = fellTree(s, 'oak', 'x', true, true, () => 1, 0);
    expect(r.drops.bark).toBe(NODES.oak.grass.yield + 1);
    expect(s.mats.bark).toBe(NODES.oak.grass.yield + 1);
    expect(s.skills.wood.xp).toBe(NODES.oak.grass.xp);
    expect(canChop(s, 'oak', 'x', 1000)).toBe('regrowing');
    expect(canChop(s, 'oak', 'x', NODES.oak.grass.regrow * 1000)).toBe('ok');
  });

  test('grass trees can turn up a rare find; safe ones never do', () => {
    const s = newState();
    expect(fellTree(s, 'oak', 'a', true, false, () => 0, 0).drops.clover).toBe(1);
    expect(fellTree(s, 'oak', 'b', false, false, () => 0, 0).drops.clover).toBeUndefined();
  });

  test('skill levels gate better axes and gatherer gear, and stop at the cap', () => {
    const s = newState();
    for (const k in s.mats) s.mats[k as keyof typeof s.mats] = 99;
    s.build.forge = 1;
    expect(craftTool(s, 'axe2')).toBe('skill');
    expect(craftGear(s, 'timberaxe')).toBe('skill');
    gainSkillXp(s, 'wood', 10_000);
    expect(s.skills.wood.lv).toBe(SKILL_MAX);
    expect(craftTool(s, 'axe2')).toBe('ok');
    expect(craftGear(s, 'timberaxe')).toBe('ok');
    expect(gainSkillXp(s, 'wood', 10_000)).toBe(0);
    expect(skillXpToNext(1)).toBeGreaterThan(0);
  });

  test('every tree tier has an axe that can chop it', () => {
    for (const n of Object.values(NODES)) expect(TOOLS.some((t) => t.skill === n.skill && t.tier === n.tier)).toBe(true);
  });
});

describe('trees on the map', () => {
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
