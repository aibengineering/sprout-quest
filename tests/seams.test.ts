import { describe, expect, test } from 'bun:test';
import { SEAMS, openSeam, seamAvailable, seamOpen } from '../src/seams';
import { ResourceCave } from '../src/resourceCave';
import { World } from '../src/world';
import { Chop } from '../src/gather';
import { newState } from '../src/state';
function strike(c: Chop, clean: boolean) { c.lock = 0; c.pos = clean ? c.center : 0; return c.strike(); }
describe('Pip’s boulders and return tunnels', () => {
  test('every boulder waits for Pip’s explanation even with all roads and an endgame pick', () => {
    const s = newState();
    s.bosses.push('kingslime', 'alphawolf', 'echoqueen', 'crystalking');
    s.tools.mine = 4;
    // Being able to meet Pip is not the same as accepting his mining quest.
    s.flags.push('bram:hut', 'granny:extension');
    s.build.sawmill = 2;
    for (const p of SEAMS) {
      expect(seamAvailable(s, p.id)).toBe(false);
      expect(openSeam(s, p.id, p.streak)).toBe(false);
    }
    s.flags.push('pip:seam:met');
    for (const p of SEAMS) expect(seamAvailable(s, p.id)).toBe(true);
    expect(openSeam(s, 'stillwater', 10)).toBe(true);
    expect(seamAvailable(s, 'stillwater')).toBe(false);
    expect(seamAvailable(s, 'unknown')).toBe(false);
  });
  test('older saves with returned or settled Pip retain access without the explanation flag', () => {
    for (const legacy of ['returned', 'story', 'cottage', 'home']) {
      const s = newState();
      if (legacy === 'returned') s.flags.push('pip:returned');
      if (legacy === 'story') s.stories['journey-pip'] = 2;
      if (legacy === 'cottage') s.build.cottage = 1;
      if (legacy === 'home') s.homes.pip = 1;
      expect(seamAvailable(s, 'stillwater')).toBe(false);
      s.bosses.push('kingslime');
      expect(seamAvailable(s, 'stillwater')).toBe(true);
      expect(openSeam(s, 'stillwater', 10)).toBe(true);
    }
  });
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
    // The outside mouth moved with the main quarry; the instance keeps the old save coordinates.
    expect(c.x0).toBe(133);expect(c.spawn.x).toBe(140.5);
    c.sync(s);
    expect(c.blocked(c.spawn.x, 7.6, .28)).toBe(true);
    expect(c.objs.find(o => o.tunnel)?.hidden).toBe(true);
    expect(new Set(c.objs.filter(o => o.node && !o.boulder).map(o => o.node))).toEqual(new Set(['rock', 'copper', 'iron']));
    expect(openSeam(s, 'quarry', 10)).toBe(false);
    s.bosses.push('alphawolf');
    c.sync(s);
    expect(c.objs.find(o => o.boulder)?.label).toBe('');
    expect(c.nearestObj(c.spawn.x, 8.5, 1.4)).toBeNull();
    expect(c.blocked(c.spawn.x, 7.6, .28)).toBe(true);
    s.flags.push('pip:seam:met');
    c.sync(s);
    expect(c.nearestObj(c.spawn.x, 8.5, 1.4)?.label).toBe('Break boulder');
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
    s.flags.push('pip:seam:met');
    s.bosses.push('alphawolf');
    expect(openSeam(s, 'rootlight', 11)).toBe(false);
    s.bosses.push('echoqueen');
    expect(openSeam(s, 'rootlight', 10)).toBe(false);
    expect(openSeam(s, 'rootlight', 11)).toBe(true);
  });
});
