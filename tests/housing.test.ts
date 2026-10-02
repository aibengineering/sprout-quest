import { describe, expect, test } from 'bun:test';
import { HOMES, HOME_ORDER, buildHome, canBuildHome, homeLevel } from '../src/housing';
import { cook, gatheringXpBoost, knownMeals, mealDescription, mealSeconds, mealTick, miningSweetBoost } from '../src/kitchen';
import { loadState, newState, saveState } from '../src/state';
import { harvest, playerStats } from '../src/rules';
import { housePresentation } from '../src/crafting/houses';
import { craftFlights } from '../src/crafting';
import { sceneModel } from './sceneModel';
import { RESIDENT_PLOTS, residentDoor } from '../src/villageLayout';
import { World } from '../src/world';
import { existsSync } from 'node:fs';
import type { MatId } from '../src/data';

function ready() {
  const s = newState(); s.flags.push('bram:hut','pip:returned','hazel:returned','moss:returned'); s.stories.bram = 9; s.stories.poppy = 6; s.flags.push('granny:extension'); s.build.sawmill = 1;
  for (const m of Object.keys(s.mats) as MatId[]) s.mats[m] = 500;
  return s;
}
describe('Bram’s resident homes', () => {
  test('welcomes neighbours in order and requires the appropriate mill, even with plenty of planks', () => {
    const s = ready();
    expect(canBuildHome(s, 'hazel')).toBe('locked');
    expect(buildHome(s, 'pip', 0)).toBe('ok');
    expect(buildHome(s, 'hazel', 0)).toBe('ok');
    expect(canBuildHome(s, 'moss')).toBe('locked');
    expect(canBuildHome(s, 'hazel')).toBe('locked');
    s.build.sawmill = 2;
    expect(buildHome(s, 'moss', 0)).toBe('ok');
    expect(buildHome(s, 'hazel', 1)).toBe('ok');
    expect(canBuildHome(s, 'moss')).toBe('locked');
    s.build.sawmill = 3;
    expect(buildHome(s, 'moss', 1)).toBe('ok');
    expect(buildHome(s, 'pip', 1)).toBe('ok');
    for (const id of ['pip','hazel'] as const) expect(buildHome(s,id,2)).toBe('ok');
    expect(canBuildHome(s,'moss')).toBe('locked'); s.build.sawmill=4;
    expect(buildHome(s,'moss',2)).toBe('ok');
    for (const id of HOME_ORDER) expect(canBuildHome(s, id)).toBe('maxed');
  });
  test('costs real planks once; stale clicks and insufficient materials cannot advance or charge a home', () => {
    const s = ready(); s.build.cottage = 1;
    const before = { ...s.mats }, workshops = { ...s.build }, stats = playerStats(s);
    s.mats.plank = 63;
    expect(buildHome(s, 'hazel', 0)).toBe('missing');
    expect(homeLevel(s, 'hazel')).toBe(0); expect(s.mats.stone).toBe(before.stone);
    s.mats.plank = 64;
    expect(buildHome(s, 'hazel', 0)).toBe('ok');
    expect(s.mats.plank).toBe(0); expect(s.mats.stone).toBe(before.stone - 24); expect(s.mats.herb).toBe(before.herb - 8);
    const paid = { ...s.mats };
    expect(buildHome(s, 'hazel', 0)).toBe('stale'); expect(s.mats).toEqual(paid);
    expect(s.build).toEqual(workshops); expect(playerStats(s)).toEqual(stats);
  });
  test('old Guest Cottages retain Pip and his recipe, without charging again; partial home saves round-trip', () => {
    const store: Record<string, string> = {};
    globalThis.localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } } as Storage;
    const s = ready(); s.build.cottage = 1; s.stories.pip = 1; s.flags.push('pip:candy');
    delete (s as Partial<typeof s>).homes;
    saveState(s);
    const old = loadState()!;
    expect(old.homes).toEqual({ pip: 1, hazel: 0, moss: 0 }); expect(old.mats).toEqual(s.mats);
    expect(old.stories.pip).toBe(1); expect(knownMeals(old)).toContain('rockcandy');
    old.build.sawmill = 2; buildHome(old, 'hazel', 0); buildHome(old, 'hazel', 1);
    saveState(old); expect(loadState()).toEqual(old);
  });
  test('recipes are learned by meeting residents, and additions improve only their own recipe', () => {
    const s = ready(); s.homes = { pip: 2, hazel: 2, moss: 2 };
    expect(cook(s, 'meadowtea')).toBe('unknown'); expect(cook(s, 'trailbuns')).toBe('unknown');
    s.flags.push('hazel:recipe', 'moss:recipe', 'pip:candy');
    for (const dish of ['meadowtea', 'trailbuns', 'rockcandy'] as const) {
      expect(mealSeconds(s, dish)).toBe(300); expect(mealDescription(s, dish)).toContain('5 minutes');
      expect(cook(s, dish)).toBe('ok'); expect(s.meal?.left).toBe(300);
    }
    expect(mealSeconds(s, 'stew')).toBe(240); expect(mealSeconds(s, 'goojelly')).toBe(180);
    cook(s, 'meadowtea'); expect(miningSweetBoost(s)).toBe(1.3); expect(gatheringXpBoost(s)).toBe(1);
    cook(s, 'trailbuns'); expect(miningSweetBoost(s)).toBe(1);
    const plain = ready();
    expect(harvest(s, 'rock', 'tea-rock', false, false, () => .5).xp).toBe(Math.round(harvest(plain, 'rock', 'plain-rock', false, false, () => .5).xp * 1.2));
    mealTick(s, 301); expect(gatheringXpBoost(s)).toBe(1);
  });
  test('each completed home has a clear doorstep connected to the road, with no overlapping building footprints', () => {
    const world = new World();
    const plots = Object.values(RESIDENT_PLOTS);
    for (const p of plots) for (const o of world.objs.filter((o) => ['forge', 'house', 'fountain', 'plot', 'prop', 'residence'].includes(o.kind))) {
      if (p.x === o.x && p.y === o.y) continue;
      expect(p.x < o.x + o.w && p.x + p.w > o.x && p.y < o.y + o.h && p.y + p.h > o.y, `${o.project ?? o.id ?? o.kind} overlaps a home`).toBe(false);
    }
    // Flood the actual collision grid with the player's feet width; no teleport-only doorsteps.
    const start = { x: 22, y: 14.5 }, q = [start], seen = new Set<string>([`${start.x},${start.y}`]);
    for (let i = 0; i < q.length; i++) {
      const p = q[i];
      for (const [dx, dy] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]) {
        const x = p.x + dx, y = p.y + dy, key = `${x},${y}`;
        if (x < 16 || x > 47 || y < 3 || y > 24 || seen.has(key) || world.blocked(x, y, .28)) continue;
        seen.add(key); q.push({ x, y });
      }
    }
    for (const id of HOME_ORDER) {
      const door = residentDoor(id);
      expect(world.blocked(door.x, door.y, .28), id).toBe(false);
      expect(q.some((p) => Math.hypot(p.x-door.x,p.y-door.y) < .3), `${id} cannot be reached from the road`).toBe(true);
    }
  });
  for (const id of HOME_ORDER) for (let level = 1; level <= HOMES[id].plans.length; level++) test(`${id} level ${level}: native layers and ingredient flights match the paid plan`, () => {
    const plan = HOMES[id].plans[level-1], p = housePresentation(id, level), model = sceneModel(p.model);
    expect(model.toon && model.compressed).toBe(true); expect(model.bytes).toBeLessThan(120*1024);
    expect(Object.keys(model.layers).sort()).toEqual(p.layers.map((l) => l.id).sort());
    for (const m of Object.keys(plan.cost) as MatId[]) expect(craftFlights(p, plan.cost).filter((f) => f.material === m).reduce((n,f) => n+f.count,0)).toBe(plan.cost[m]!);
    if (level > 1) expect(p.layers.find((l) => l.id === 'base')?.initial).toBe(true);
    expect(existsSync(`public/assets/icons/b_${plan.art}.webp`)).toBe(true);
  });
});
