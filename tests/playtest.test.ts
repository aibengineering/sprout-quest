import { describe, expect, spyOn, test } from 'bun:test';
import type { Audio } from '../src/audio';
import { Battle } from '../src/battle/battle';
import type { BattleOutcome, Foe } from '../src/battle/types';
import { GEAR, NODES, zoneById } from '../src/data';
import { AutoInput, combatControls, GatherControls } from '../src/dev/autoInput';
import { Chop } from '../src/gather';
import type { Input } from '../src/input';
import { newState } from '../src/state';
import { playerStats } from '../src/rules';

function inputStub() {
  return { enabled: true, axis: () => ({ x: 0, y: 0 }), consume: () => false, isHeld: () => false, reset() {}, flush() {} } as unknown as Input;
}

describe('dev playtest controls', () => {
  test('reset, disable and pauses release the synthetic controls without suppressing later manual input', () => {
    const input = inputStub();
    input.axis = () => ({ x: 0.6, y: 0 });
    const auto = new AutoInput(input);
    const drive = () => auto.set({ move: { x: 0, y: 1 }, press: new Set(['dodge']), hold: new Set(['attack']) });
    drive();
    expect(input.isHeld('attack')).toBe(true);
    expect(input.consume('dodge')).toBe(true);
    expect(input.consume('dodge')).toBe(false);
    input.reset();
    expect(input.isHeld('attack')).toBe(false);
    expect(input.axis()).toEqual({ x: 0.6, y: 0 });
    drive();
    auto.clear();
    expect(input.consume('dodge')).toBe(false);
    expect(input.isHeld('attack')).toBe(false);
    drive();
    input.enabled = false;
    expect(input.isHeld('attack')).toBe(false);
    expect(input.consume('dodge')).toBe(false);
  });

  test('a starter character can fight moving meadow enemies through normal controls, including at slow frame rates', () => {
    const encounters: Foe[][] = [
      [{ kind: 'slime', lv: 3, golden: false }],
      [{ kind: 'bunny', lv: 2, golden: false }, { kind: 'slime', lv: 2, golden: true }],
    ];
    for (const dt of [1 / 60, 0.05]) for (const foes of encounters) for (const initial of [17, 29, 43]) {
      let seed = initial;
      const random = spyOn(Math, 'random').mockImplementation(() => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32));
      try {
        const save = newState(), input = inputStub(), auto = new AutoInput(input);
        let outcome: BattleOutcome | null = null;
        const b = new Battle({ zone: zoneById('meadow'), foes, boss: false }, save, input, { play() {} } as unknown as Audio, (o) => { outcome = o; });
        for (let t = 0; t < 120 && !outcome; t += dt) {
          auto.set(combatControls(b));
          b.update(dt);
          input.flush();
        }
        expect({ dt, foes, initial, result: b.outcome?.result }).toEqual({ dt, foes, initial, result: 'win' });
        expect(b.log.hits).toBeGreaterThan(0);
        expect(b.log.dodges).toBeGreaterThan(0);
        expect(save.lv).toBe(1);
        expect(save.equip.weapon).toBe('twig');
        expect(save.potions).toBeLessThanOrEqual(2);
      } finally { random.mockRestore(); }
    }
  });

  test('timed gathering actually completes trees and rocks without moving the marker or skipping cooldowns', () => {
    for (const dt of [1 / 60, 0.05]) for (const node of ['oak', 'rock'] as const) {
      const game = new Chop(NODES[node].hp, 1, 0.16, () => 0.63), driver = new GatherControls();
      for (let t = 0; t < 120 && !game.done; t += dt) {
        const controls = driver.frame(game, dt);
        game.update(dt);
        if (controls.press.has('act')) game.strike();
      }
      expect(game.done).toBe(true);
      expect(game.misses).toBe(0);
      expect(game.perfects).toBeGreaterThan(0);
    }
  });

  test('each weapon class can use its unlocked skill against the first guardian', () => {
    for (const weapon of ['stonesword', 'stonehammer', 'jellywhip', 'jellywand']) {
      let seed = 91;
      const random = spyOn(Math, 'random').mockImplementation(() => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32));
      try {
        const save = newState(), input = inputStub(), auto = new AutoInput(input);
        save.lv = 4;
        save.equip.weapon = weapon;
        save.mastery[GEAR[weapon].style!].lv = 2;
        save.hp = playerStats(save).maxHp;
        const b = new Battle({ zone: zoneById('meadow'), foes: [{ kind: 'kingslime', lv: 3, golden: false }], boss: true }, save, input, { play() {} } as unknown as Audio, () => {});
        for (let t = 0; t < 120 && !b.outcome; t += 0.05) {
          auto.set(combatControls(b));
          b.update(0.05);
          input.flush();
        }
        expect({ weapon, result: b.outcome?.result }).toEqual({ weapon, result: 'win' });
        expect(b.log.skills).toBeGreaterThan(0);
      } finally { random.mockRestore(); }
    }
  });

  test('a ranged character sidesteps the final boss projectiles with earned midgame equipment', () => {
    for (const dt of [1 / 60, 0.05]) for (const initial of [17, 29, 43]) {
      let seed = initial;
      const random = spyOn(Math, 'random').mockImplementation(() => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32));
      try {
        const save = newState(), input = inputStub(), auto = new AutoInput(input);
        save.lv = 13;
        save.build.home = 2;
        save.build.forge = 4;
        save.equip = { weapon: 'batwand', armor: 'glimmershawl', charm: 'crystalheart' };
        save.mastery.wand.lv = 6;
        save.potions = 5;
        save.hp = playerStats(save).maxHp;
        const b = new Battle({ zone: zoneById('peak'), foes: [{ kind: 'dragon', lv: 20, golden: false }], boss: true }, save, input, { play() {} } as unknown as Audio, () => {});
        for (let t = 0; t < 180 && !b.outcome; t += dt) {
          auto.set(combatControls(b));
          b.update(dt);
          input.flush();
        }
        expect({ dt, initial, result: b.outcome?.result }).toEqual({ dt, initial, result: 'win' });
        expect(b.log.dodges).toBeGreaterThan(0);
        expect(save.potions).toBeGreaterThan(0);
        expect(save.lv).toBe(13);
      } finally { random.mockRestore(); }
    }
  });
});
