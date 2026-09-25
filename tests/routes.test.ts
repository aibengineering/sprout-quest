import { describe, expect, test } from 'bun:test';
import { WORLD_H, ZONES, type ZoneId } from '../src/data';
import { ROUTES } from '../src/routes';
import { GATE_Y } from '../src/world';

type P = { x: number; y: number };

function flood(rows: string[], from: P, ok: (c: string) => boolean): Set<string> {
  const seen = new Set([`${from.x},${from.y}`]);
  const q = [from];
  while (q.length) {
    const { x, y } = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (ny < 0 || ny >= rows.length || nx < 0 || nx >= rows[0].length || seen.has(k) || !ok(rows[ny][nx])) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}

const find = (rows: string[], c: string): P[] => rows.flatMap((r, y) => [...r].flatMap((ch, x) => (ch === c ? [{ x, y }] : [])));
const around = (p: P) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => `${p.x + dx},${p.y + dy}`);

describe('route maps', () => {
  for (const [id, rows] of Object.entries(ROUTES) as [ZoneId, string[]][]) {
    const zone = ZONES.find((z) => z.id === id)!;
    const last = zone === ZONES[ZONES.length - 1];
    const start = find(rows, 'E')[0];
    // Trees, signs, campfires and the lair are solid: you walk up beside them.
    const reach = flood(rows, start, (c) => '.,=*E'.includes(c));
    const offGrass = flood(rows, start, (c) => '.=*E'.includes(c));
    const exits = [0, 1, 2, 3].map((i) => `${rows[0].length - 1},${GATE_Y + i}`);

    test(`${zone.name}: the right size, only known tiles, one arrival point`, () => {
      expect(rows.length).toBe(WORLD_H);
      for (const r of rows) {
        expect(r.length).toBe(zone.w);
        expect(r).toMatch(/^[#.,=~*ESCLkKpPrRuUiI]+$/);
      }
      expect(find(rows, 'E').length).toBe(1);
      if (!zone.theme.pool) expect(rows.join('')).not.toContain('~');
    });

    test(`${zone.name}: only opens onto its neighbours through the gate rows`, () => {
      for (let y = 0; y < WORLD_H; y++) {
        const gate = y >= GATE_Y && y < GATE_Y + 4;
        expect(rows[y][0] !== '#').toBe(gate);
        expect(rows[y][zone.w - 1] !== '#').toBe(gate && !last);
      }
    });

    test(`${zone.name}: the route goes all the way through, and you can't get through without crossing tall grass`, () => {
      const goal = last ? find(rows, 'L').flatMap((l) => [...around(l), ...around({ x: l.x + 2, y: l.y + 2 })]) : exits;
      expect(goal.some((g) => reach.has(g))).toBe(true);
      expect(goal.some((g) => offGrass.has(g))).toBe(false);
    });

    test(`${zone.name}: every tree, rock, sign and campfire can be reached, grass nodes stand in grass`, () => {
      for (const c of 'kKpPrRuUiISC') {
        for (const p of find(rows, c)) {
          expect({ c, p, reachable: around(p).some((a) => reach.has(a)) }).toEqual({ c, p, reachable: true });
          if ('KPRUI'.includes(c)) {
            let grass = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (rows[p.y + dy]?.[p.x + dx] === ',') grass++;
            expect({ c, p, grass: grass >= 5 }).toEqual({ c, p, grass: true });
          }
          if ('kprui'.includes(c)) {
            const [x, y] = [p.x, p.y];
            const safeSide = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(`${x + dx},${y + dy}`) && '.=*'.includes(rows[y + dy][x + dx]));
            expect({ c, p, safeSide }).toEqual({ c, p, safeSide: true });
          }
        }
      }
    });
  }
});
