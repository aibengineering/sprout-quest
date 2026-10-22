import { describe, expect, test } from 'bun:test';
import type { Audio } from '../src/audio';
import { Battle } from '../src/battle/battle';
import { zoneById } from '../src/data';
import type { Input } from '../src/input';
import { newState } from '../src/state';

const STEP = 0.01;
function fight(lv = 3, weapon = 'jellywand') {
  const save = newState();
  save.equip.weapon = weapon;
  save.mastery.wand.lv = lv;
  const presses = new Set<string>();
  const input = { axis: () => ({ x: 0, y: 0 }), consume: (k: string) => presses.delete(k), isHeld: () => false } as unknown as Input;
  const b = new Battle({ zone: zoneById('meadow'), foes: [{ kind: 'slime', lv: 1, golden: false }], boss: false }, save, input, { play: () => {} } as unknown as Audio, () => {});
  b.intro = 0;
  b.p.x = b.p.y = 0;
  b.p.face = 0.35;
  Object.assign(b.enemies[0], { x: -180, y: -100, hp: 1e9, maxHp: 1e9, stun: 1e9 });
  const tick = (secs: number) => { for (let t = 0; t < secs - 1e-9; t += STEP) b.update(STEP); };
  const cast = () => {
    for (let i = 0; !b.canStrike && i < 300; i++) b.update(STEP);
    expect(b.canStrike).toBe(true);
    b.projs = [];
    presses.add('attack');
    for (let i = 0; !b.projs.length && i < 100; i++) b.update(STEP);
    expect(b.projs).toHaveLength(1);
    return { ...b.projs[0] };
  };
  return { b, presses, tick, cast };
}

describe('Echo Cast', () => {
  test('unlocks at handling 3 and echoes every third released normal cast, not every hit', () => {
    const locked = fight(2);
    for (let i = 0; i < 6; i++) { locked.cast(); locked.tick(0.3); }
    expect(locked.b.trick).toBeNull();
    expect(locked.b.echoes).toBe(0);
    const f = fight();
    for (let i = 1; i <= 6; i++) {
      f.cast();
      expect(f.b.p.echoCount).toBe(i % 3);
      f.tick(0.3);
      expect(f.b.echoes).toBe(Math.floor(i / 3));
    }
    expect(f.b.hits).toBe(0); // Misses still build the rhythm.
    expect(f.b.log.swings).toBe(6);
    expect(fight().b.p.echoCount).toBe(0); // Each fight starts fresh.
  });

  test('the echo waits 0.16s, is smaller and half strength, and keeps the original outlet and aim through a dodge', () => {
    const f = fight(3, 'batwand');
    f.cast(); f.cast();
    const original = f.cast();
    f.b.p.face = -1.2;
    f.presses.add('dodge');
    f.tick(0.15);
    expect(f.b.echoes).toBe(0);
    expect(f.b.projs).toHaveLength(1);
    f.tick(0.01);
    expect(f.b.echoes).toBe(1);
    const echo = f.b.projs[1];
    expect(echo.mult).toBeCloseTo(0.9, 6); // Normal wand cast is 1.8×; echo is 0.9×.
    expect(echo.r).toBeCloseTo(9 * 1.18 * 0.7, 6); // Tier-three bolt, then 70% radius.
    // Undo the original's first homing step to recover the outlet, then add one straight echo step.
    expect(echo.x).toBeCloseTo(original.x - original.vx * STEP + Math.cos(0.35) * 400 * STEP, 6);
    expect(echo.y).toBeCloseTo(original.y - original.vy * STEP + Math.sin(0.35) * 400 * STEP, 6);
    expect(echo.vx).toBeCloseTo(Math.cos(0.35) * 400, 6);
    expect(echo.vy).toBeCloseTo(Math.sin(0.35) * 400, 6);
    expect(echo.homing).toBe(false);
    expect(echo.strikeId).toBe(original.strikeId);
    expect(f.b.p.dodgeT).toBeGreaterThan(0);
  });

  test('Scatter neither advances nor consumes a ready echo', () => {
    const f = fight();
    f.cast(); f.cast();
    expect(f.b.p.echoCount).toBe(2);
    f.b.p.skillCd = 0;
    f.b.projs = [];
    f.presses.add('skill'); f.tick(0.01);
    expect(f.b.projs).toHaveLength(5);
    f.tick(0.3);
    expect(f.b.p.echoCount).toBe(2);
    expect(f.b.echoes).toBe(0);
    f.cast(); f.tick(0.16);
    expect(f.b.echoes).toBe(1);
    expect(f.b.p.echoCount).toBe(0);
  });

  test('a normal cast cancelled during windup does not charge the echo', () => {
    const f = fight();
    f.presses.add('attack'); f.tick(0.01);
    expect(f.b.p.swing).not.toBeNull();
    f.b.p.skillCd = 0;
    f.presses.add('skill'); f.tick(0.01);
    f.tick(0.3);
    expect(f.b.p.echoCount).toBe(0);
    expect(f.b.echoes).toBe(0);
  });

  for (const weapon of ['glimmerwand', 'wyrmfire']) test(`${weapon}: both bolts hit, but the cast's elemental burst happens only once`, () => {
    const f = fight(3, weapon);
    let effects = 0;
    f.b.chain = () => { effects++; };
    f.b.dragonBurst = () => { effects++; };
    f.cast(); f.cast();
    const pr = f.cast();
    const e = f.b.enemies[0];
    Object.assign(e, { x: pr.x + pr.vx * 0.2, y: pr.y + pr.vy * 0.2 + e.r * 0.7 });
    f.tick(0.6);
    expect(f.b.hits).toBe(2);
    expect(f.b.echoes).toBe(1);
    expect(effects).toBe(1);
  });
});
