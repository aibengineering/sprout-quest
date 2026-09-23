import { describe, expect, test } from 'bun:test';
import { GEAR, PROJECTS, QUESTS, ZONES } from '../src/data';
import { advanceQuests, currentQuest, recordKills } from '../src/quests';
import { build, canBuild, craftGear, playerStats, potionRefill } from '../src/rules';
import { newState } from '../src/state';
import { World } from '../src/world';

describe('story', () => {
  test('the chain advances in order, only when each goal is met', () => {
    const s = newState();
    expect(currentQuest(s)!.id).toBe('hello');
    expect(advanceQuests(s)).toHaveLength(0);
    s.talked = true;
    expect(advanceQuests(s).map((q) => q.id)).toEqual(['hello']);
    recordKills(s, 'woods', 10); // wrong zone doesn't count
    expect(advanceQuests(s)).toHaveLength(0);
    recordKills(s, 'meadow', 6);
    const done = advanceQuests(s);
    expect(done.map((q) => q.id)).toEqual(['meadow']);
    expect(s.mats.clover).toBe(1); // reward
    expect(currentQuest(s)!.id).toBe('gear');
  });

  test('a step already satisfied completes as soon as it becomes current', () => {
    const s = newState();
    s.quest = QUESTS.findIndex((q) => q.id === 'kingslime');
    s.bosses.push('kingslime');
    s.build.forge = 2;
    expect(advanceQuests(s).map((q) => q.id)).toEqual(['kingslime', 'smithy']);
    expect(currentQuest(s)!.id).toBe('alphawolf');
  });

  test('every boss goal matches a guardian or the dragon, in world order', () => {
    const bossSteps = QUESTS.filter((q) => q.goal.type === 'boss').map((q) => (q.goal as { kind: string }).kind);
    expect(bossSteps).toEqual([...ZONES.filter((z) => z.guardian).map((z) => z.guardian!.kind), 'dragon']);
  });
});

describe('village', () => {
  test('building spends materials, levels up and grants perks', () => {
    const s = newState();
    expect(canBuild(s, 'home')).toBe('missing');
    Object.assign(s.mats, { goo: 20, fluff: 20, clover: 5, royaljelly: 1, fang: 10 });
    const hp = playerStats(s).maxHp, atk = playerStats(s).atk;
    expect(build(s, 'home')).toBe('ok');
    expect(s.build.home).toBe(2);
    expect(playerStats(s).maxHp).toBeGreaterThan(hp);
    expect(build(s, 'training')).toBe('ok');
    expect(build(s, 'training')).toBe('ok');
    expect(playerStats(s).atk).toBeGreaterThan(atk);
    expect(s.mats.royaljelly).toBe(0);
    expect(build(s, 'garden')).toBe('ok');
    expect(potionRefill(s)).toBe(3);
  });

  test('forge level gates higher-tier recipes', () => {
    const s = newState();
    for (const k in s.mats) s.mats[k as keyof typeof s.mats] = 99;
    expect(craftGear(s, 'geode')).toBe('forge');
    expect(craftGear(s, 'jelly')).toBe('ok');
    s.build.forge = 2;
    expect(craftGear(s, 'geode')).toBe('ok');
    expect(craftGear(s, 'emberblade')).toBe('forge');
  });

  test('every construction cost is obtainable', () => {
    const { MONSTERS } = require('../src/data');
    const droppable = new Set(Object.values(MONSTERS as Record<string, { drops: { mat: string }[] }>).flatMap((m) => m.drops.map((d) => d.mat)));
    for (const p of Object.values(PROJECTS)) for (const l of p.levels) for (const m of Object.keys(l.cost)) expect(droppable.has(m)).toBe(true);
    void GEAR;
  });
});

describe('world gates', () => {
  const w = new World();

  test('each guardian zone has a gate that fully blocks the road until opened', () => {
    for (const z of ZONES.filter((z) => z.guardian)) {
      const gate = w.obj('gate', z.id)!;
      expect(gate).toBeDefined();
      for (let y = 0; y < w.h; y++) expect(w.solidAt(z.x0 + 0.5, y + 0.5)).toBe(true);
      gate.hidden = true;
      const open = Array.from({ length: w.h }, (_, y) => !w.solidAt(z.x0 + 0.5, y + 0.5)).filter(Boolean).length;
      expect(open).toBeGreaterThanOrEqual(2);
      gate.hidden = false;
    }
  });

  test('campfire rest spots are walkable', () => {
    for (const z of ZONES.filter((z) => z.guardian)) {
      const p = w.campPoint(z.id);
      expect(w.blocked(p.x, p.y, 0.28)).toBe(false);
    }
  });
});
