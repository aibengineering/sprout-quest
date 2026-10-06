import { describe, expect, test } from 'bun:test';
import { GEAR, PROJECTS, QUESTS, ZONES } from '../src/data';
import { advanceQuests, currentQuest, recordKills } from '../src/quests';
import { checkUnlocks } from '../src/unlocks';
import { build, canBuild, craftGear, craftTool, playerStats, plotOpen, potionRefill } from '../src/rules';
import { newState } from '../src/state';
import { World } from '../src/world';

describe('story', () => {
  test('the prologue and chapter 1 advance in order, only when each goal is met', () => {
    const s = newState();
    expect(currentQuest(s)!.id).toBe('wake');
    expect(advanceQuests(s)).toHaveLength(0);
    s.flags.push('sword');
    expect(advanceQuests(s).map((q) => q.id)).toEqual(['wake']);
    s.flags.push('glade1', 'glade2');
    expect(advanceQuests(s).map((q) => q.id)).toEqual(['firstfight', 'dodge']);
    // Arriving, Elder Oswin hands over his old axe and pick.
    s.flags.push('village', 'oldtools');
    advanceQuests(s);
    expect(currentQuest(s)!.id).toBe('meadow');
    // Trip one: monster drops. Defeating monsters or holding the materials isn't enough: the tools must be mended.
    recordKills(s, 'meadow', 3);
    Object.assign(s.mats, { goo: 12, fluff: 9 });
    expect(advanceQuests(s)).toHaveLength(0);
    expect(craftTool(s, 'axe1')).toBe('ok');
    expect(advanceQuests(s)).toHaveLength(0);
    expect(craftTool(s, 'pick1')).toBe('ok');
    expect(advanceQuests(s).map((q) => q.id)).toEqual(['meadow']);
    expect(currentQuest(s)!.id).toBe('repair');
    // Trip two: the forge is stone and wood (and a little goo for the bellows).
    expect(build(s, 'forge')).toBe('missing');
    Object.assign(s.mats, { stone: 12, bark: 9, goo: 6 });
    expect(build(s, 'forge')).toBe('ok');
    expect(advanceQuests(s).map((q) => q.id)).toEqual(['repair']);
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
    Object.assign(s.mats, { goo: 60, fluff: 60, bark: 60, stone: 60, copper: 60, clover: 5, royaljelly: 1, fang: 20, plank: 100, pineplank: 100 });
    const hp = playerStats(s).maxHp, atk = playerStats(s).atk;
    expect(build(s, 'home')).toBe('ok');
    expect(s.build.home).toBe(2);
    expect(playerStats(s).maxHp).toBeGreaterThan(hp);
    s.unlocked.push('plots'); s.flags.push('fox:trusted');
    expect(build(s, 'training')).toBe('ok');
    expect(build(s, 'training')).toBe('ok');
    expect(playerStats(s).atk).toBeGreaterThan(atk);
    expect(s.mats.royaljelly).toBe(0);
    expect(build(s, 'garden')).toBe('ok');
    expect(potionRefill(s)).toBe(3);
  });

  test('the Garden opens after the Slime King, training after fox trust, Waystone after Alpha Woolf', () => {
    const s = newState();
    for (const k in s.mats) s.mats[k as keyof typeof s.mats] = 99;
    for (const id of ['garden', 'training', 'warp'] as const) expect(build(s, id)).toBe('locked');
    expect(s.build.garden + s.build.training + s.build.warp).toBe(0);
    s.bosses.push('kingslime');
    checkUnlocks(s);
    expect(build(s, 'garden')).toBe('ok');
    expect(build(s, 'training')).toBe('locked');
    s.flags.push('fox:trusted');
    expect(build(s, 'training')).toBe('ok');
    expect(build(s, 'warp')).toBe('locked');
    s.bosses.push('alphawolf');
    checkUnlocks(s);
    expect(build(s, 'warp')).toBe('ok');
    // Saves that built one before its plot opened keep it (it shows on the map, and can be upgraded).
    const early = newState();
    early.build.training = 1;
    expect(plotOpen(early, 'training')).toBe(true);
    expect(plotOpen(early, 'garden')).toBe(false);
  });

  test("the Guest Cottage opens once Bram's settled in (his Sawmill built and his cabin up), and its card follows", () => {
    const s = newState();
    for (const k in s.mats) s.mats[k as keyof typeof s.mats] = 99;
    expect(plotOpen(s, 'cottage')).toBe(false);
    expect(build(s, 'cottage')).toBe('locked');
    // Moved in, with the Sawmill up but no cabin yet: not yet.
    s.flags.push('bram:home');
    s.build.sawmill = 1;
    expect(plotOpen(s, 'cottage')).toBe(false);
    expect(checkUnlocks(s).map((u) => u.id)).not.toContain('cottage');
    s.flags.push('bram:hut');
    expect(plotOpen(s, 'cottage')).toBe(true);
    expect(checkUnlocks(s).map((u) => u.id)).toContain('cottage');
    expect(build(s, 'cottage')).toBe('ok');
    expect(s.build.cottage).toBe(1);
    expect(build(s, 'cottage')).toBe('maxed');
    // Its plot is on the map, in Sowerby, clear of the Waystone.
    const w = new World(), plot = w.obj('plot', 'cottage')!;
    expect(plot).toBeDefined();
    const village = ZONES.find((z) => z.id === 'village')!;
    expect(plot.x).toBeGreaterThanOrEqual(village.x0);
    expect(plot.x + plot.w).toBeLessThanOrEqual(village.x0 + village.w);
    const stone = w.obj('plot', 'warp')!;
    expect(plot.y + plot.h <= stone.y || plot.x >= stone.x + stone.w || plot.x + plot.w <= stone.x).toBe(true);
  });

  test('forge level gates higher-tier recipes', () => {
    const s = newState();
    for (const k in s.mats) s.mats[k as keyof typeof s.mats] = 99;
    for (const k in s.mastery) s.mastery[k as keyof typeof s.mastery].lv = 10;
    for (const k in s.skills) s.skills[k as keyof typeof s.skills].lv = 10;
    expect(craftGear(s, 'jellywhip')).toBe('forge');
    // One Forge level per tier.
    const steps: [number, string, string][] = [[1, 'jellywhip', 'sporewhip'], [2, 'sporewhip', 'batwhip'], [3, 'batwhip', 'glimmerwhip'], [4, 'glimmerwhip', 'dragontail']];
    for (const [lv, ok, locked] of steps) {
      s.build.forge = lv;
      expect({ lv, ok: craftGear(s, ok), locked: craftGear(s, locked) }).toEqual({ lv, ok: 'ok', locked: 'forge' });
    }
    s.build.forge = 5;
    expect(craftGear(s, 'emberblade')).toBe('ok');
  });

  test('every construction cost is obtainable', () => {
    const { MONSTERS, NODES } = require('../src/data');
    const droppable = new Set([
      ...Object.values(MONSTERS as Record<string, { drops: { mat: string }[] }>).flatMap((m) => m.drops.map((d) => d.mat)),
      ...Object.values(NODES as Record<string, { mat: string }>).map((n) => n.mat),
      // Sawn from logs at Bram's Sawmill, a plank for each wood.
      ...Object.values(require('../src/sawmill').SAW as Record<string, { plank: string }>).map((v) => v.plank),
      // Grown in Poppy's Garden, from seeds.
      ...Object.keys(require('../src/garden').CROPS),
    ]);
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

describe('onboarding unlocks', () => {
  const { checkUnlocks } = require('../src/unlocks');
  test('systems reveal one at a time as the story progresses', () => {
    const s = newState();
    const ids = () => checkUnlocks(s).map((u: { id: string }) => u.id);
    expect(ids()).toEqual([]);
    s.flags.push('sword', 'glade1');
    s.wins = 1;
    expect(ids()).toEqual(['bag']); // loot from the first prologue fight
    s.flags.push('glade2', 'village');
    s.wins = 2;
    advanceQuests(s);
    s.flags.push('oldtools');
    expect(ids()).toEqual(['journal']); // arriving in the village
    Object.assign(s.mats, { goo: 12, fluff: 9 });
    s.wins = 3;
    expect(ids()).toEqual(['mend']); // enough to mend a tool
    s.mastery.sword.lv = 2;
    expect(ids()).toEqual(['skill']); // sword handling Lv 2 unlocks its skill
    craftTool(s, 'axe1');
    craftTool(s, 'pick1');
    advanceQuests(s);
    expect(ids()).toEqual(['village']); // time to repair the forge
    expect(s.unlocked).not.toContain('forge');
  });
});

test('the first trip is monster drops for mending the tools; the forge is then built from what they gather', () => {
  const { PROJECTS, TOOLS } = require('../src/data');
  const mending = TOOLS.filter((t: { tier: number }) => t.tier === 1).flatMap((t: { recipe: object }) => Object.keys(t.recipe));
  expect(new Set(mending)).toEqual(new Set(['goo', 'fluff']));
  expect(Object.keys(PROJECTS.forge.levels[0].cost)).toEqual(expect.arrayContaining(['stone', 'bark']));
  // You can't craft a stone axe from nothing: the first axe and pick are Elder Oswin's, mended.
  const s = newState();
  Object.assign(s.mats, { goo: 27, fluff: 27 });
  expect(craftTool(s, 'axe1')).toBe('unknown');
});
