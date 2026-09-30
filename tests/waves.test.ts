import { describe, expect, test } from 'bun:test';
import type { Audio } from '../src/audio';
import { Battle } from '../src/battle/battle';
import { zoneById } from '../src/data';
import type { Input } from '../src/input';
import { newState } from '../src/state';
import { skillAt } from '../src/weapons';

/** A fight against one pinned-down foe, with a hammer at the given handling level; counts every hit the foe takes. */
function fight(weapon: string, kind: 'kingslime' | 'slime', handling: number) {
  const save = newState();
  save.equip.weapon = weapon;
  save.owned.push(weapon);
  save.mastery.hammer.lv = handling;
  save.lv = 20;
  const input = { axis: () => ({ x: 0, y: 0 }), consume: () => false, isHeld: () => false, peek: () => false, flush: () => {}, reset: () => {} } as unknown as Input;
  const b = new Battle({ zone: zoneById('woods'), foes: [{ kind, lv: 5, golden: false }], boss: kind === 'kingslime' }, save, input, { play: () => {} } as unknown as Audio, () => {});
  const hits: number[] = [];
  const bb = b as unknown as { hitEnemy: (...a: unknown[]) => void; skill: (r: unknown) => void };
  const hit = bb.hitEnemy.bind(b);
  bb.hitEnemy = (...a: unknown[]) => {
    hits.push(a[5] as number);
    return hit(...a);
  };
  // Past the fight's intro, then the foe stands still right in front of you, far too tough to fall.
  for (let i = 0; i < 120; i++) b.update(1 / 60);
  const e = b.enemies[0];
  const pin = () => {
    e.hp = e.maxHp = 1e9;
    e.stun = 99;
    e.x = b.p.x + 70;
    e.y = b.p.y;
  };
  pin();
  b.p.face = 0;
  hits.length = 0;
  return { b, e, hits, pin, cast: () => bb.skill(skillAt('quake', handling)) };
}

describe('waves of rock and fire', () => {
  test("one Fracture hits a guardian with its slam and at most one spike, however many spikes overlap it", () => {
    for (const handling of [2, 5, 8, 10]) {
      const f = fight('stonehammer', 'kingslime', handling);
      f.cast();
      // Hold the guardian where the whole fan passes over it, until every spike has run its course.
      for (let i = 0; i < 180; i++) {
        f.pin();
        f.b.update(1 / 60);
      }
      expect(f.b.waves.length).toBe(0);
      const spikeHits = new Set(f.hits).size;
      expect({ handling, hits: f.hits.length }).toEqual({ handling, hits: spikeHits });
      expect({ handling, atMost: f.hits.length <= 2 }).toEqual({ handling, atMost: true });
    }
  });
});
