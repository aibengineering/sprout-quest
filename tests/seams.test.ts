import { describe, expect, test } from 'bun:test';
import { SEAMS, openSeam, seamOpen } from '../src/seams';
import { ResourceCave } from '../src/resourceCave';
import { World } from '../src/world';
import { Chop } from '../src/gather';
import { newState } from '../src/state';
function strike(c: Chop, clean: boolean) { c.lock = 0; c.pos = clean ? c.center : 0; return c.strike(); }
describe('Pip’s boulders and return tunnels', () => {
  for (const count of [10, 11])
    test(`${count} consecutive hits are required even with an endgame pick`, () => {
      const c = new Chop(10, 999, .2, () => .5, count);
      for (let i = 0; i < 50; i++)
        strike(c, false);
      expect(c.done).toBe(false);
      expect(c.dealt).toBe(0);
      for (let i = 1; i < count; i++) {
        strike(c, true);
        expect(c.done).toBe(false);
      }
      strike(c, false);
      expect(c.streak).toBe(0);
      expect(c.dealt).toBe(0);
      for (let i = 0; i < count; i++)
        strike(c, true);
      expect(c.done).toBe(true);
      expect(c.dealt).toBe(c.hp);
      expect(c.strike()).toBeNull();
    });
  test('a gallery cannot be entered through its boulder; clearing it reveals mixed resources and the home tunnel', () => {
    const s = newState(), c = new ResourceCave();
    c.sync(s);
    expect(c.blocked(c.spawn.x, 7.6, .28)).toBe(true);
    expect(c.objs.find(o => o.tunnel)?.hidden).toBe(true);
    expect(new Set(c.objs.filter(o => o.node && !o.boulder).map(o => o.node))).toEqual(new Set(['rock', 'copper', 'iron']));
    expect(openSeam(s, 'quarry', 10)).toBe(false);
    s.bosses.push('alphawolf');
    expect(openSeam(s, 'quarry', 9)).toBe(false);
    expect(openSeam(s, 'quarry', 10)).toBe(true);
    c.sync(s);
    expect(c.blocked(c.spawn.x, 7.6, .28)).toBe(false);
    expect(c.objs.find(o => o.tunnel)?.hidden).toBe(false);
    expect(openSeam(s, 'quarry', 10)).toBe(false);
    const w = new World();
    expect(w.blocked(c.outside.x, c.outside.y, .28)).toBe(false);
  });
  test('hidden return tunnels remain region-gated and approachable without widening routes', () => {
    const s = newState(), w = new World(), r = w.reachable();
    for (const d of SEAMS) {
      expect(w.blocked(d.at.x, d.at.y + .8, .28), d.name).toBe(false);
      expect(r[Math.floor(d.at.y + .8) * w.w + Math.floor(d.at.x)]).toBe(1);
      expect(seamOpen(s, d.id)).toBe(false);
    }
    s.bosses.push('alphawolf');
    expect(openSeam(s, 'rootlight', 11)).toBe(false);
    s.bosses.push('echoqueen');
    expect(openSeam(s, 'rootlight', 10)).toBe(false);
    expect(openSeam(s, 'rootlight', 11)).toBe(true);
  });
});
