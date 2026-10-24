import { describe, expect, test } from 'bun:test';
import type { Audio, Sfx } from '../src/audio';
import { Battle } from '../src/battle/battle';
import { zoneById } from '../src/data';
import type { Input } from '../src/input';
import { newState } from '../src/state';
import { CHARGE, MOVESETS, chargeTime, comboDps } from '../src/weapons';

const STEP = 1 / 60;
const CAST = MOVESETS.wand.combo[0];

/** A wand fight against a far-off, harmless dummy, with buttons you can hold, press and steer. */
function fight(lv = 1, weapon = 'jellywand') {
  const save = newState();
  save.equip.weapon = weapon;
  save.mastery.wand.lv = lv;
  const presses = new Set<string>(), held = new Set<string>(), sounds: Sfx[] = [];
  let axis = { x: 0, y: 0 };
  const input = { axis: () => axis, consume: (k: string) => presses.delete(k), isHeld: (k: string) => held.has(k) } as unknown as Input;
  const b = new Battle({ zone: zoneById('meadow'), foes: [{ kind: 'slime', lv: 1, golden: false }], boss: false }, save, input, { play: (s: Sfx) => sounds.push(s) } as unknown as Audio, () => {});
  b.intro = 0;
  b.p.x = b.p.y = 0;
  b.p.face = 0;
  Object.assign(b.enemies[0], { x: -180, y: -150, hp: 1e9, maxHp: 1e9, stun: 1e9 });
  const tick = (secs: number) => { for (let t = 0; t < secs - 1e-9; t += STEP) b.update(STEP); };
  /** Every bolt you've cast so far (they're taken off the field as they fly, so none hits or fades). */
  const bolts: { mult: number; r: number }[] = [];
  const watch = () => { for (const pr of b.projs.splice(0)) if (pr.owner === 'p') bolts.push({ mult: pr.mult, r: pr.r }); };
  const run = (secs: number) => { for (let t = 0; t < secs - 1e-9; t += STEP) { b.update(STEP); watch(); } };
  /** Holds Attack for `secs`, then lets go and waits for the bolt. */
  const holdCast = (secs: number) => {
    held.add('attack');
    run(secs);
    held.delete('attack');
    const n = bolts.length;
    for (let i = 0; bolts.length === n && i < 100; i++) run(STEP);
    return bolts[bolts.length - 1];
  };
  return { b, presses, held, sounds, bolts, tick, run, holdCast, steer: (x: number, y: number) => { axis = { x, y }; } };
}

describe('charged wand casts', () => {
  test('a full charge takes 1.5s at handling Lv 1, and handling shortens it to 0.7s', () => {
    expect(chargeTime(1)).toBeCloseTo(CHARGE.secs, 6);
    expect(chargeTime(10)).toBeCloseTo(CHARGE.mastered, 6);
    for (let lv = 2; lv <= 10; lv++) expect(chargeTime(lv)).toBeLessThanOrEqual(chargeTime(lv - 1));
    for (const lv of [1, 5, 10]) {
      const f = fight(lv);
      f.held.add('attack');
      f.tick(chargeTime(lv) - 0.05);
      expect(f.b.p.charging).toBe(true);
      expect(f.sounds).not.toContain('charged');
      f.tick(0.07);
      // The "ready" tell: a chime, once, and it stays full while you keep holding.
      expect(f.b.p.charge).toBeCloseTo(f.b.chargeFull, 6);
      f.tick(1);
      expect(f.sounds.filter((s) => s === 'charged')).toHaveLength(1);
      expect(f.b.log.swings).toBe(0);
    }
  });

  test('a tap casts at once, weak and small; the bolt grows with the charge, to 1.75× a normal cast fully charged', () => {
    const f = fight(1, 'batwand'), size = CAST.size * (1 + 3 * 0.06);
    f.presses.add('attack');
    f.run(0.2);
    expect(f.bolts).toHaveLength(1);
    expect(f.bolts[0].mult).toBeCloseTo(CAST.mult * CHARGE.tap, 6);
    expect(f.bolts[0].r).toBeCloseTo(size * CHARGE.small, 6);
    f.run(1);
    const half = f.holdCast(chargeTime(1) / 2);
    expect(half.mult).toBeGreaterThan(CAST.mult * CHARGE.tap);
    expect(half.mult).toBeLessThan(CAST.mult * CHARGE.full);
    f.run(1);
    const full = f.holdCast(chargeTime(1) + 0.2);
    expect(full.mult).toBeCloseTo(CAST.mult * CHARGE.full, 6);
    expect(full.r).toBeCloseTo(size * CHARGE.big, 6);
    expect(CHARGE.full).toBeGreaterThanOrEqual(1.6);
  });

  test('rapid taps cast with no long wait, but charging fully deals more over the same time', () => {
    for (const lv of [1, 10]) {
      const taps = fight(lv);
      for (let t = 0; t < 6; t += 0.05) { taps.presses.add('attack'); taps.run(0.05); }
      const charged = fight(lv);
      while (charged.b.t < 6) charged.holdCast(chargeTime(lv));
      const total = (f: ReturnType<typeof fight>) => f.bolts.reduce((a, x) => a + x.mult, 0) / f.b.t;
      // Taps come quickly: well over one a second even at Lv 1 (the old wait was 1.2s).
      expect(taps.bolts.length / taps.b.t).toBeGreaterThan(1.8);
      expect(total(taps)).toBeLessThan(total(charged) * 0.75);
      // The balance model judges magic fully charged: what you'd really do over a fight.
      expect(total(charged)).toBeCloseTo(comboDps(MOVESETS.wand, lv), 0);
    }
  });

  test('charging slows your walk but does not root you, and keeps your aim while you step away', () => {
    const walk = fight(), charge = fight();
    walk.steer(1, 0);
    walk.tick(0.5);
    charge.held.add('attack');
    charge.tick(0.05);
    charge.steer(-1, 0);
    const x0 = charge.b.p.x;
    charge.tick(0.5);
    const ratio = Math.abs(charge.b.p.x - x0) / Math.abs(walk.b.p.x);
    expect(ratio).toBeCloseTo(CHARGE.slow, 1);
    expect(ratio).toBeGreaterThan(0.5);
    expect(charge.b.p.face).toBe(0);
    // Let go: full speed, and you turn to walk again.
    charge.held.delete('attack');
    charge.tick(0.6);
    expect(charge.b.p.charging).toBe(false);
    expect(Math.cos(charge.b.p.face)).toBeLessThan(-0.99);
  });

  test('dodging drops the charge: letting go afterwards casts nothing', () => {
    const f = fight();
    f.held.add('attack');
    f.run(1);
    expect(f.b.p.charge).toBeGreaterThan(0.9);
    f.presses.add('dodge');
    f.run(STEP);
    expect(f.b.p.charging).toBe(false);
    expect(f.b.p.charge).toBe(0);
    f.held.delete('attack');
    f.run(1);
    expect(f.bolts).toHaveLength(0);
    // Held through the dodge, it starts charging again from nothing once you're back on your feet.
    f.held.add('attack');
    f.run(0.5);
    expect(f.b.p.charging).toBe(true);
    expect(f.b.p.charge).toBeLessThan(0.5);
  });
});
