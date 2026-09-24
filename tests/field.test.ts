import { describe, expect, test } from 'bun:test';
import { RingArena, TILE_UNITS, TileArena } from '../src/arena';
import { ZONES } from '../src/data';
import { CATCH_DIST, NOTICE_DIST, ROAMERS_PER_ZONE, Roamers } from '../src/roamers';
import { T, World } from '../src/world';

const w = new World();

/** An open tile in the meadow's grass with open ground around it. */
function meadowGrass() {
  const z = ZONES.find((z) => z.id === 'meadow')!;
  for (let y = 3; y < w.h - 3; y++)
    for (let x = z.x0 + 4; x < z.x0 + z.w - 4; x++) {
      if (w.tile(x, y) !== T.GRASS) continue;
      let open = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!w.blocked(x + dx + 0.5, y + dy + 0.8, 0.28)) open++;
      if (open === 25) return { x: x + 0.5, y: y + 0.8 };
    }
  throw new Error('no open meadow grass');
}

describe('fights on the map', () => {
  test('the arena is the open ground around you, and trees and water are walls', () => {
    const at = meadowGrass();
    const a = new TileArena(w, at.x, at.y, 6.5);
    expect(a.size).toBeGreaterThan(30);
    expect(a.inside(0, 0)).toBe(true);
    // Every open tile really is walkable on the map.
    for (const t of a.openTiles()) {
      const k = w.tile(t.tx, t.ty);
      expect(k === T.OBST || k === T.POOL).toBe(false);
    }
    // Nothing beyond the radius is part of the fight.
    expect(a.inside(TILE_UNITS * 8, 0)).toBe(false);
  });

  test('moving into a wall stops you (and says which way), and nearestFree finds open ground', () => {
    const at = meadowGrass();
    const a = new TileArena(w, at.x, at.y, 6.5);
    let p = { x: 0, y: 0 }, hit = false;
    for (let i = 0; i < 400 && !hit; i++) {
      const m = a.move(p.x, p.y, 10, 0, 8);
      hit = m.hitX;
      p = m;
    }
    expect(hit).toBe(true);
    expect(a.inside(p.x, p.y)).toBe(true);
    const f = a.nearestFree(TILE_UNITS * 20, 0, 8);
    expect(a.inside(f.x, f.y)).toBe(true);
  });

  test('the classic ring keeps bosses inside a circle', () => {
    const r = new RingArena(210);
    const m = r.move(200, 0, 50, 0, 12);
    expect(Math.hypot(m.x, m.y)).toBeCloseTo(198);
    expect(m.hitX).toBe(true);
  });
});

describe('monsters in the grass', () => {
  test('each monster zone fills up, always in tall grass and away from you', () => {
    const rs = new Roamers(w, () => Math.random());
    const start = w.entryPoint('village');
    rs.populate(start.x, start.y, false);
    for (const z of ZONES.filter((z) => z.monsters.length)) expect(rs.list.filter((r) => r.zone === z.id).length).toBe(ROAMERS_PER_ZONE);
    expect(rs.list.filter((r) => ZONES.find((z) => z.id === r.zone)!.monsters.length === 0)).toEqual([]);
    for (const r of rs.list) {
      expect(w.tile(Math.floor(r.x), Math.floor(r.y - 0.1))).toBe(T.GRASS);
      expect(Math.hypot(r.x - start.x, r.y - start.y)).toBeGreaterThanOrEqual(5);
    }
  });

  test('a monster notices you up close and catches you if you stand still, but not while you are calm', () => {
    const rs = new Roamers(w, () => 0.5);
    const at = meadowGrass();
    rs.list.push({
      id: 1, zone: 'meadow', kind: 'slime', lv: 1, golden: false, extra: 0, x: at.x + NOTICE_DIST - 0.5, y: at.y, hx: at.x + 2, hy: at.y,
      tx: at.x, ty: at.y, state: 'idle', t: 5, face: 1, moving: false, seed: 0,
    });
    rs.calm = 1;
    expect(rs.update(0.5, at.x, at.y, false)).toBeNull();
    expect(rs.list[0].state).toBe('idle');
    rs.calm = 0;
    let caught = null;
    for (let i = 0; i < 100 && !caught; i++) caught = rs.update(0.05, at.x, at.y, false);
    expect(caught?.id).toBe(1);
    expect(Math.hypot(caught!.x - at.x, caught!.y - at.y)).toBeLessThan(CATCH_DIST);
  });

  test('you can sneak up on a monster that has not noticed you yet', () => {
    const rs = new Roamers(w, () => 0.5);
    rs.list.push({
      id: 7, zone: 'meadow', kind: 'bunny', lv: 2, golden: false, extra: 1, x: 50, y: 10, hx: 50, hy: 10,
      tx: 50, ty: 10, state: 'idle', t: 5, face: 1, moving: false, seed: 0,
    });
    expect(rs.unaware(49, 10)?.id).toBe(7);
    rs.list[0].state = 'chase';
    expect(rs.unaware(49, 10)).toBeNull();
  });
});
