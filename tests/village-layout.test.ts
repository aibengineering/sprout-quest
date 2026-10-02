import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { ZONES } from '../src/data';
import { T, World } from '../src/world';
import { RESIDENT_PLOTS, TOWN_CABIN, TOWN_SAWMILL, residentDoor } from '../src/villageLayout';

type Rect = { x: number; y: number; w: number; h: number };
const V = ZONES.find((z) => z.id === 'village')!.x0;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w - 1e-6 && a.x + a.w > b.x + 1e-6
  && a.y < b.y + b.h - 1e-6 && a.y + a.h > b.y + 1e-6;
const frames: Record<string, number[]> = Object.assign({}, ...['public/assets/atlas.json', 'public/assets/homes/atlas.json']
  .map((p) => JSON.parse(readFileSync(p, 'utf8')).frames));

describe('Sowerby’s lots and paths', () => {
  test('every path stays outside building foundations, including the unbuilt resident plots', () => {
    const world = new World();
    const buildings = world.objs.filter((o) => o.x >= V && o.x < V + 31 && !o.walkable
      && ['forge', 'house', 'fountain', 'plot', 'prop', 'residence'].includes(o.kind));
    for (let y = 0; y < 26; y++) for (let x = V; x < V + 31; x++) {
      if (world.tile(x, y) !== T.PATH) continue;
      for (const o of buildings) expect(overlaps({ x, y, w: 1, h: 1 }, o), `${o.home ?? o.project ?? o.id ?? o.kind} crosses path ${x - V},${y}`).toBe(false);
    }
  });

  test('the largest upgraded artwork leaves space between neighbours and keeps roofs off paths', () => {
    const world = new World();
    const art: [Rect, string, number][] = [
      [world.obj('forge')!, 'forge5', .42], [world.obj('house')!, 'kitchen3', .42],
      [world.obj('plot', 'home')!, 'home3', .42], [world.obj('plot', 'sawmill')!, 'sawmill4', .3],
      [TOWN_CABIN, 'bramhut', .2], [world.obj('fountain')!, 'fountain', .45],
      [world.obj('plot', 'training')!, 'training3', .28], [world.obj('plot', 'warp')!, 'warp1', .1],
      [RESIDENT_PLOTS.pip, 'res_pip3', .28], [RESIDENT_PLOTS.rook, 'res_rook3', .28],
      [RESIDENT_PLOTS.moss, 'res_moss3', .28],
    ];
    // Match drawBuilding/drawFrame: native Blender units are 1.6 per map tile.
    const bounds = art.map(([o, name, back]) => {
      const [, , , w, h, ax, ay, ppu] = frames[`env/${name}`], k = 1 / (1.6 * ppu);
      return { name, x: o.x + o.w / 2 - ax * k, y: o.y + o.h - back - ay * k, w: w * k, h: h * k, front: o.y + o.h };
    });
    for (let i = 0; i < bounds.length; i++) for (const b of bounds.slice(i + 1)) {
      const a = bounds[i];
      expect(overlaps({ ...a, x: a.x - .15, y: a.y - .15, w: a.w + .3, h: a.h + .3 }, b), `${a.name} crowds ${b.name}`).toBe(false);
    }
    for (const b of bounds) for (let y = Math.floor(b.y); y < b.front; y++) for (let x = Math.floor(b.x); x < b.x + b.w; x++) {
      if (world.tile(x, y) !== T.PATH) continue;
      // A front step may meet its path; the house and roof behind it may not.
      expect(overlaps({ ...b, h: Math.min(b.h, b.front - b.y) }, { x, y, w: 1, h: 1 }), `${b.name} covers path ${x - V},${y}`).toBe(false);
    }
  });

  test('Bram lives beside the mill and both fronts have a walkable shared approach', () => {
    const world = new World(), mill = TOWN_SAWMILL, cabin = TOWN_CABIN;
    expect(Math.hypot(mill.x + mill.w / 2 - cabin.x - cabin.w / 2, mill.y + mill.h - cabin.y - cabin.h)).toBeLessThan(5);
    const walk = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 8);
      for (let i = 0; i <= n; i++) expect(world.blocked(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, .28)).toBe(false);
    };
    const yard = { x: mill.x + mill.w / 2, y: 7.7 }, cabinFront = { x: cabin.x + cabin.w / 2, y: 6.6 };
    walk({ ...yard, y: 14.5 }, yard);
    walk(yard, { x: cabinFront.x, y: yard.y });
    walk({ x: cabinFront.x, y: yard.y }, cabinFront);
  });

  test('southern homes face the same lane with separate door paths and an open green behind them', () => {
    const world = new World();
    for (const o of [world.obj('plot', 'home')!, RESIDENT_PLOTS.rook, RESIDENT_PLOTS.moss]) {
      const x = Math.floor(o.x + o.w / 2), y = o.y + o.h;
      expect(y).toBe(21);
      expect(world.tile(x, y)).toBe(T.PATH);
      expect(world.tile(x, y + 1)).toBe(T.PATH);
      expect(world.blocked(o.x + o.w / 2, y + .6, .28)).toBe(false);
    }
    for (const id of ['rook', 'moss'] as const) {
      const door = residentDoor(id);
      expect(world.blocked(door.x, door.y, .28)).toBe(false);
      // No long vertical road running through the house's grass lot.
      expect(world.tile(Math.floor(door.x), 15)).not.toBe(T.PATH);
    }
  });
});
