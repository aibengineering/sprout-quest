import { describe, expect, test } from 'bun:test';
import { GEAR, QUESTS, zoneAtX } from '../src/data';
import { PRESETS } from '../src/dev/presets';
import { World } from '../src/world';

const world = new World();

describe('dev preset saves', () => {
  test('ids are unique', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  for (const p of PRESETS) {
    test(`${p.name}: a save you could have played to`, () => {
      const s = p.make();
      expect(s.quest).toBeLessThanOrEqual(QUESTS.length);
      for (const id of [s.equip.weapon, s.equip.armor, ...(s.equip.charm ? [s.equip.charm] : [])]) {
        expect(GEAR[id]).toBeDefined();
        expect(s.owned).toContain(id);
      }
      // Standing somewhere you can walk, in an area you've been to.
      expect(world.blocked(s.pos.x, s.pos.y, 0.28)).toBe(false);
      expect(s.visited).toContain(zoneAtX(Math.floor(s.pos.x)).id);
      expect(s.hp).toBeGreaterThan(0);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    });
  }
});
