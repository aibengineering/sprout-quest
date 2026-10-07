import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { Actors, type ActorSpec } from '../src/actors';
import { TileMap, T } from '../src/world';

describe('villager wandering', () => {
  let random: ReturnType<typeof spyOn<typeof Math, 'random'>>;
  beforeEach(() => { random = spyOn(Math, 'random').mockReturnValue(0.25); });
  afterEach(() => { random.mockRestore(); });

  const spec: ActorSpec = { id: 'resident', look: { kind: 'walker', name: 'pip' }, x: 8.3, y: 10.1, wander: 2, label: 'Talk' };
  const hero = { x: 18, y: 18 };
  function setup() {
    const actors = new Actors(), map = new TileMap(24, 24);
    map.tiles.fill(T.GRASS);
    const a = actors.add(spec);
    const advance = (seconds: number, near = hero, enabled = true) => {
      for (let i = 0; i < seconds * 60; i++) actors.update(1 / 60, near, map, enabled);
    };
    return { actors, map, a, advance };
  }

  test('rests, strolls slowly, and rests again at the destination', () => {
    const { a, advance } = setup();
    advance(2);
    expect(a.y).toBe(10.1);
    expect(a.moving).toBe(false);
    advance(2);
    expect(a.x).toBeCloseTo(8.3);
    expect(a.y).toBeCloseTo(10.75, 1);
    expect(a.face).toBeCloseTo(Math.PI / 2);
    expect(a.moving).toBe(true);
    advance(2);
    expect(Math.abs(a.y - 11.1)).toBeLessThan(0.06);
    expect(a.moving).toBe(false);
  });

  test('many strolls stay anchored near home, not near the last stop', () => {
    const { a, advance, map } = setup();
    let seed = 91;
    random.mockImplementation(() => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32));
    let maxDistance = 0;
    for (let i = 0; i < 600; i++) {
      advance(1);
      const distance = Math.hypot(a.x - 8.3, a.y - 10.1);
      maxDistance = Math.max(maxDistance, distance);
      expect(distance).toBeLessThanOrEqual(2.000001);
      expect(map.blocked(a.x, a.y, 0.28)).toBe(false);
    }
    expect(maxDistance).toBeGreaterThan(1.5);
  });

  test('cannot cross an obstacle even when the destination beyond it is clear', () => {
    const { actors, map, a, advance } = setup();
    map.objs.push({ kind: 'house', x: 7.5, y: 10.6, w: 2, h: 0.1, label: 'Wall' });
    expect(map.blocked(8.3, 11.1, 0.28)).toBe(false);
    advance(3);
    actors.update(3, hero, map); // A long frame must not tunnel through the wall.
    expect(a.y).toBeGreaterThan(10.1);
    expect(a.y).toBeLessThan(10.62);
    expect(map.blocked(a.x, a.y, 0.28)).toBe(false);
    advance(1);
    expect(a.moving).toBe(false);
  });

  test('rejects destinations on water, chasms and solid terrain', () => {
    for (const tile of [T.POOL, T.CHASM, T.OBST]) {
      const { map, a, advance } = setup();
      map.tiles[11 * map.w + 8] = tile;
      advance(12);
      expect({ x: a.x, y: a.y }).toEqual({ x: 8.3, y: 10.1 });
      expect(a.moving).toBe(false);
    }
  });

  test('pauses an in-flight stroll near the hero and while the world is frozen', () => {
    const { a, advance } = setup();
    advance(4);
    const at = { x: a.x, y: a.y };
    advance(10, { x: a.x + 1.3, y: a.y });
    expect({ x: a.x, y: a.y }).toEqual(at);
    expect(a.moving).toBe(false);
    advance(10, hero, false);
    expect({ x: a.x, y: a.y }).toEqual(at);
    advance(0.5);
    expect(a.y).toBeGreaterThan(at.y);
  });

  test('story sync preserves a stroll but relocating or disabling it takes effect', () => {
    const { actors, a, advance } = setup();
    advance(4);
    const at = { x: a.x, y: a.y };
    actors.sync({ ...spec, label: 'Meet Pip', face: 0 });
    expect({ x: a.x, y: a.y }).toEqual(at);
    expect(a.face).toBeCloseTo(Math.PI / 2);
    expect(a.label).toBe('Meet Pip');
    actors.sync({ ...spec, x: 14.7, y: 5.2 });
    expect({ x: a.x, y: a.y }).toEqual({ x: 14.7, y: 5.2 });
    advance(4);
    expect(a.x).toBeCloseTo(14.7);
    expect(a.y).toBeGreaterThan(5.2);
    actors.sync({ ...spec, wander: undefined });
    advance(12);
    expect({ x: a.x, y: a.y }).toEqual({ x: 8.3, y: 10.1 });
    expect(a.moving).toBe(false);
  });

  test('scripted walks still complete while idle wandering is paused', async () => {
    const { actors, a, advance } = setup();
    advance(4);
    const done = actors.walk(a.id, [{ x: 12, y: 7 }], 2);
    advance(5, hero, false);
    await done;
    expect(Math.hypot(a.x - 12, a.y - 7)).toBeLessThan(0.06);
    expect(a.path).toHaveLength(0);
    expect(a.moving).toBe(false);
    actors.sync(spec);
    expect({ x: a.x, y: a.y }).toEqual({ x: 8.3, y: 10.1 });
  });

  test('followers and actors without wandering keep their existing behavior', () => {
    const { actors, map, a } = setup();
    a.follow = true;
    actors.update(0.1, { x: 11.3, y: 10.1 }, map, false);
    expect(a.x).toBeGreaterThan(8.3);
    expect(a.y).toBe(10.1);
    actors.sync({ ...spec, follow: true });
    expect(a.x).toBeGreaterThan(8.3);
    const still = actors.add({ ...spec, id: 'still', wander: undefined });
    for (let i = 0; i < 60; i++) actors.update(1, hero, map);
    expect({ x: still.x, y: still.y }).toEqual({ x: 8.3, y: 10.1 });
  });
});
