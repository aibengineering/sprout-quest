import { describe, expect, test } from 'bun:test';
import type { Audio } from '../src/audio';
import { Battle } from '../src/battle/battle';
import { GEAR, zoneById } from '../src/data';
import type { Input } from '../src/input';
import { newState } from '../src/state';
import { skillAt } from '../src/weapons';

/** A fight against one pinned-down foe, with a hammer at the given handling level; counts every hit the foe takes. */
function fight(weapon: string, kind: 'kingslime' | 'slime', handling: number, positions = [{ x: 70, y: 0 }]) {
  const save = newState();
  save.equip.weapon = weapon;
  save.owned.push(weapon);
  save.mastery.hammer.lv = handling;
  save.lv = 20;
  const pressed = new Set<string>();
  const input = { axis: () => ({ x: 0, y: 0 }), consume: (key: string) => pressed.delete(key), isHeld: () => false, peek: () => false, flush: () => {}, reset: () => {} } as unknown as Input;
  const b = new Battle({ zone: zoneById('woods'), foes: positions.map(() => ({ kind, lv: 20, golden: false })), boss: kind === 'kingslime' }, save, input, { play: () => {} } as unknown as Audio, () => {});
  const hits: { target: object; id: number; mult: number; damage: number }[] = [];
  const bb = b as unknown as { hitEnemy: (...a: unknown[]) => void };
  const hit = bb.hitEnemy.bind(b);
  bb.hitEnemy = (...a: unknown[]) => {
    const before = b.log.dealt;
    hit(...a);
    hits.push({ target: a[0] as object, id: a[5] as number, mult: a[1] as number, damage: b.log.dealt - before });
  };
  // Past the fight's intro, then the foe stands still right in front of you, far too tough to fall.
  b.intro = 0; b.p.x = b.p.y = 0; b.p.skillCd = 0;
  const e = b.enemies[0];
  const pin = () => {
    b.p.iframes = 1e9;
    b.enemies.forEach((e, i) => {
      e.hp = e.maxHp = 1e9; e.stun = 99; e.kx = e.ky = 0;
      e.x = b.p.x + positions[i].x; e.y = b.p.y + positions[i].y;
    });
  };
  pin();
  b.p.face = 0;
  hits.length = 0;
  const tick = (dt = 1 / 60) => { pin(); b.update(dt); };
  const settle = (dt = 1 / 60) => { for (let t = 0; t < 3; t += dt) tick(dt); };
  return { b, e, hits, pin, tick, settle, cast: () => pressed.add('skill'), normal: () => pressed.add('attack') };
}

describe('waves of rock and fire', () => {
  test('one Fracture hits a guardian exactly once across its impact and overlapping spikes, at every rank and frame rate', () => {
    for (const handling of [2, 5, 8, 10]) for (const fps of [20, 30, 60, 120]) {
      const f = fight('stonehammer', 'kingslime', handling), dt = 1 / fps;
      f.cast();
      // Hold the guardian where the whole fan passes over it, until every spike has run its course.
      f.settle(dt);
      expect(f.b.waves.length).toBe(0);
      expect({ handling, fps, hits: f.hits.length }).toEqual({ handling, fps, hits: 1 });
      expect(f.hits[0].mult).toBe(skillAt('quake', handling)!.mult);
    }
  });

  test('each enemy in the fan takes one full hit; an enemy outside it takes none', () => {
    const f = fight('stonehammer', 'slime', 10, [{ x: 70, y: 0 }, { x: 150, y: -35 }, { x: 150, y: 35 }, { x: -160, y: 0 }]);
    f.cast(); f.settle();
    for (const e of f.b.enemies.slice(0, 3)) {
      const hits = f.hits.filter((h) => h.target === e);
      expect(hits.length).toBe(1);
      expect(hits[0].mult).toBe(skillAt('quake', 10)!.mult);
    }
    expect(f.hits.some((h) => h.target === f.b.enemies[3])).toBe(false);
  });

  test('a later hitId cannot let the same fan hit again; the next cast can hit the enemy again', () => {
    const f = fight('stonehammer', 'kingslime', 10);
    f.cast();
    for (let i = 0; i < 180; i++) { f.e.hitId = -123; f.tick(); }
    expect(f.hits.length).toBe(1);
    f.b.p.skillCd = 0; f.cast(); f.settle();
    expect(f.hits.length).toBe(2);
    expect(f.hits[0].id).not.toBe(f.hits[1].id);
  });

  test('every hammer’s special deals more direct damage than its normal slam, including targets reached only by the rocks', () => {
    const original = Math.random; Math.random = () => .5; // Same rolls and no critical hits for both attacks.
    try {
      for (const weapon of Object.values(GEAR).filter((g) => g.style === 'hammer')) for (const handling of [2, 5, 8, 10]) {
        const normal = fight(weapon.id, 'slime', handling); normal.normal(); normal.settle();
        const close = fight(weapon.id, 'slime', handling); close.cast(); close.settle();
        const far = fight(weapon.id, 'slime', handling, [{ x: 160, y: 0 }]); far.cast(); far.settle();
        expect(close.hits.length).toBe(1); expect(far.hits.length).toBe(1);
        expect(close.hits[0].damage).toBeGreaterThan(normal.hits[0].damage);
        expect(far.hits[0].damage).toBe(close.hits[0].damage);
      }
    } finally { Math.random = original; }
  });
});
