import { describe, expect, test } from 'bun:test';
import type { Audio } from '../src/audio';
import { Battle } from '../src/battle/battle';
import type { Enemy } from '../src/battle/types';
import { zoneById } from '../src/data';
import type { Input } from '../src/input';
import { newState } from '../src/state';

function fight(enraged = false) {
  const input = { axis: () => ({ x: 0, y: 0 }), consume: () => false, isHeld: () => false, peek: () => false, flush: () => {} } as unknown as Input;
  const b = new Battle({ zone: zoneById('woods'), foes: [{ kind: 'kingslime', lv: 4, golden: false }], boss: true }, newState(), input, { play: () => {} } as unknown as Audio, () => {});
  const e = b.enemies[0];
  e.hp = enraged ? e.maxHp * 0.4 : e.maxHp;
  e.x = -140; e.y = -60; e.t = 0;
  b.p.x = 80; b.p.y = 50;
  b.intro = 0;
  const sim = b as unknown as {
    hitEnemy(e: Enemy, mult: number, ang: number, kb: number, stun?: number): void;
    updateEnemy(e: Enemy, dt: number): void;
    updateHazards(dt: number): void;
    updateProjs(dt: number): void;
  };
  const step = (dt: number) => { sim.updateEnemy(e, dt); sim.updateHazards(dt); };
  const jump = () => { e.t = 0; step(1 / 60); expect(e.state).toBe('hop'); };
  const land = (dt = 1 / 60) => {
    for (let i = 0; i < 300 && e.state === 'hop'; i++) step(dt);
    expect(e.state).toBe('idle');
  };
  return { b, e, sim, step, jump, land };
}

describe('Slime King jump interruption', () => {
  test('airborne hits cancel only this splash, preserve knockback, and reset on the next jump', () => {
    for (const enraged of [false, true]) for (const fps of [20, 60, 120]) {
      const { b, e, sim, step, jump, land } = fight(enraged);
      jump(); step(0.2);
      expect(e.z).toBeGreaterThan(10);
      b.hazard({ x: -100, y: 100, r: 20, delay: 3, atk: 1, mult: 1, from: 'kingslime', jumper: { ...e } });
      const hp = e.hp;
      sim.hitEnemy(e, 1, Math.PI / 3, 100, 0.2);
      expect(e.hp).toBeLessThan(hp);
      expect(e.kx).toBeCloseTo(6);
      expect(e.ky).toBeCloseTo(6 * Math.sqrt(3));
      expect(e.state).toBe('hop');
      expect(b.hazards).toHaveLength(1);
      expect(b.hazards[0].jumper).not.toBe(e);
      expect(b.fx.texts.filter((t) => t.text === 'Interrupted!')).toHaveLength(1);
      sim.hitEnemy(e, 1, 0, 0);
      expect(b.fx.texts.filter((t) => t.text === 'Interrupted!')).toHaveLength(1);
      b.p.x = 230; b.p.y = 160;
      land(1 / fps);
      expect(b.projs).toHaveLength(0);
      expect(b.log.taken).toBe(0);
      jump();
      expect(e.flag).toBe(false);
      expect(b.hazards.some((h) => h.jumper === e)).toBe(true);
      land(1 / fps);
      expect(b.projs).toHaveLength(enraged ? 10 : 6);
    }
  });

  test('a player projectile also interrupts the airborne splash', () => {
    const { b, e, sim, step, jump, land } = fight();
    jump(); step(0.2);
    b.projs.push({ x: e.x, y: e.y - e.r * 0.7 - e.z, vx: 0, vy: 0, r: 5, atk: 0, mult: 1, owner: 'p', life: 1, color: '#fff' });
    sim.updateProjs(1 / 60);
    expect(e.flag).toBe(true);
    expect(b.hazards).toHaveLength(0);
    b.p.x = 230; b.p.y = 160;
    land();
    expect(b.projs).toHaveLength(0);
  });

  test('grounded hits do not cancel a future jump; its blast waits for landing and uses the actual position', () => {
    const { b, e, sim, jump } = fight();
    sim.hitEnemy(e, 1, 0, 0);
    jump();
    const h = b.hazards[0];
    // A pause/displacement must not leave a timer-based blast at the old target.
    sim.updateHazards(2);
    expect(h.done).toBe(false);
    expect(b.log.taken).toBe(0);
    e.x = -120; e.y = -80; e.vx = e.vy = 0; e.t = 0;
    b.p.x = -120; b.p.y = -80;
    b.p.iframes = 1; // Isolate the hazard from contact damage on landing.
    sim.updateEnemy(e, 1 / 60);
    expect(e.state).toBe('idle');
    b.p.iframes = 0;
    sim.updateHazards(1 / 60);
    expect(h.done).toBe(true);
    expect([h.x, h.y]).toEqual([-120, -80]);
    expect(b.projs).toHaveLength(6);
    expect(b.log.lastHitBy).toBe('kingslime:hazard');
    expect(b.log.taken).toBeGreaterThan(0);
  });

  test('a defeated jumper leaves no delayed blast', () => {
    const { b, e, sim, jump } = fight();
    jump(); e.dead = true;
    sim.updateHazards(2);
    expect(b.hazards).toHaveLength(0);
    expect(b.log.taken).toBe(0);
    expect(b.rings).toHaveLength(0);
  });
});
