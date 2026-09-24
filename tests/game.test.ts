import { describe, expect, test } from 'bun:test';
import { GEAR, MONSTERS, NODES, TOOLS, ZONES } from '../src/data';
import { CLOVER_PITY, calcDamage, cloverPity, craftGear, craftPotion, equip, gainXp, playerStats, rollDrops, scaleMonster, xpToNext } from '../src/rules';
import { newState } from '../src/state';
import { T, World } from '../src/world';

describe('rules', () => {
  test('leveling carries over extra XP and heals', () => {
    const s = newState();
    s.hp = 1;
    const levels = gainXp(s, xpToNext(1) + xpToNext(2) + 3);
    expect(levels).toBe(2);
    expect(s.lv).toBe(3);
    expect(s.xp).toBe(3);
    expect(s.hp).toBe(playerStats(s).maxHp);
  });

  test('damage is at least 1 and crits hit harder', () => {
    expect(calcDamage(1, 999, 1, 0, () => 0.5).dmg).toBe(1);
    const normal = calcDamage(20, 5, 1, 0, () => 0.5).dmg;
    const crit = calcDamage(20, 5, 1, 1, () => 0.5).dmg;
    expect(crit).toBeGreaterThan(normal);
  });

  test('crafting spends materials once and equipping applies stats', () => {
    const s = newState();
    expect(craftGear(s, 'jelly')).toBe('forge'); // the forge starts in ruins
    s.build.forge = 1;
    expect(craftGear(s, 'jelly')).toBe('missing');
    s.mats.goo = 6;
    s.mats.fluff = 2;
    const atkBefore = playerStats(s).atk;
    expect(craftGear(s, 'jelly')).toBe('ok');
    expect(s.mats.goo).toBe(0);
    expect(craftGear(s, 'jelly')).toBe('owned');
    expect(equip(s, 'jelly')).toBe(true);
    expect(playerStats(s).atk).toBe(atkBefore - GEAR.twig.atk! + GEAR.jelly.atk!);
  });

  test('potions cap out', () => {
    const s = newState();
    s.mats.cap = 100;
    while (craftPotion(s, 'shroombrew') === 'ok');
    expect(s.potions).toBe(5);
    expect(craftPotion(s, 'shroombrew')).toBe('full');
  });

  test('golden monsters always drop double', () => {
    const d = rollDrops(MONSTERS.slime, 0, true, () => 0);
    expect(d.goo).toBe(2);
    expect(d.clover).toBe(2);
  });

  test('a clover is guaranteed after a run of dry kills, and only clover droppers count', () => {
    const s = newState();
    for (let i = 1; i < CLOVER_PITY; i++) {
      const d = { goo: 1 };
      cloverPity(s, MONSTERS.slime, d);
      expect(d).toEqual({ goo: 1 });
    }
    cloverPity(s, MONSTERS.wolf, {});
    expect(s.cloverDry).toBe(CLOVER_PITY - 1);
    const d: Partial<Record<'goo' | 'clover', number>> = { goo: 1 };
    cloverPity(s, MONSTERS.slime, d);
    expect(d.clover).toBe(1);
    expect(s.cloverDry).toBe(0);
  });

  test('monster scaling grows with level', () => {
    expect(scaleMonster(MONSTERS.wolf, 7, false).hp).toBeGreaterThan(scaleMonster(MONSTERS.wolf, 4, false).hp);
  });

  test('every recipe material is obtainable from some monster or tree', () => {
    const droppable = new Set([...Object.values(MONSTERS).flatMap((m) => m.drops.map((d) => d.mat)), ...Object.values(NODES).map((n) => n.mat)]);
    for (const g of Object.values(GEAR)) for (const m of Object.keys(g.recipe ?? {})) expect(droppable.has(m as never)).toBe(true);
    for (const t of TOOLS) for (const m of Object.keys(t.recipe)) expect(droppable.has(m as never)).toBe(true);
  });
});

describe('world', () => {
  const w = new World();

  const lairReachable = () => {
    const start = w.entryPoint('village');
    const seen = new Uint8Array(w.w * w.h);
    const q: [number, number][] = [[Math.floor(start.x), Math.floor(start.y - 0.5)]];
    const walk = (x: number, y: number) => !w.solidAt(x + 0.5, y + 0.5);
    while (q.length) {
      const [x, y] = q.pop()!;
      if (x < 0 || y < 0 || x >= w.w || y >= w.h || seen[y * w.w + x] || !walk(x, y)) continue;
      seen[y * w.w + x] = 1;
      q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    const lair = w.objs.find((o) => o.kind === 'lair')!;
    return [0, 1, 2, 3].some((dx) => seen[Math.floor(lair.y + lair.h + 0.5) * w.w + Math.floor(lair.x) + dx]);
  };

  test('guardian gates block the way to the dragon until they are opened', () => {
    expect(lairReachable()).toBe(false);
    const gates = w.objs.filter((o) => o.kind === 'gate');
    gates.forEach((g) => (g.hidden = true));
    expect(lairReachable()).toBe(true);
    gates.forEach((g) => (g.hidden = false));
  });

  test('zone entry points are walkable and every monster zone has grass', () => {
    for (const z of ZONES) {
      const p = w.entryPoint(z.id);
      expect(w.blocked(p.x, p.y, 0.28)).toBe(false);
      if (z.monsters.length) {
        let grass = 0;
        for (let x = z.x0; x < z.x0 + z.w; x++) for (let y = 0; y < w.h; y++) if (w.tile(x, y) === T.GRASS) grass++;
        expect(grass).toBeGreaterThan(80);
      }
    }
  });
});
