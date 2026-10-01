import { describe, expect, test } from 'bun:test';
import type { Audio } from '../src/audio';
import { Battle } from '../src/battle/battle';
import { DODGE_CD } from '../src/battle/types';
import { zoneById } from '../src/data';
import type { Input } from '../src/input';
import {
  CLIMB, FORMATION, LANDING, LOOKS, MOUTH, NEW_TOTEM, POPPY_AT, Procession, REAR, RING, ROUTE, ROUTE_LEN, TOTEMS,
  along, drumsOpen, inChamber, inPocket, inSideArea, inTunnels, poppyAway, rejoinAt, sees,
} from '../src/procession';
import { dodgeCharges } from '../src/rules';
import { newState } from '../src/state';
import { T, World } from '../src/world';

const world = new World();
const C = zoneById('cave').x0;
const at = (x: number, y: number) => ({ x: C + x, y });
const walkable = (p: { x: number; y: number }) => ![T.OBST, T.POOL].includes(world.tile(Math.floor(p.x), Math.floor(p.y)) as 2 | 3);

/** Every tile you can walk to from a spot, on foot. */
function flood(from: { x: number; y: number }) {
  const seen = new Set<string>(), q = [[Math.floor(from.x), Math.floor(from.y)]];
  seen.add(q[0].join());
  while (q.length) {
    const [x, y] = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (seen.has(k) || !walkable({ x: x + dx, y: y + dy })) continue;
      seen.add(k);
      q.push([x + dx, y + dy]);
    }
  }
  return seen;
}
const tileOf = (p: { x: number; y: number }) => `${Math.floor(p.x)},${Math.floor(p.y)}`;

describe('the drums in the dark: when it can start', () => {
  test("once the Cavern's open and Poppy's own story is done; she's away from Sowerby until she runs home", () => {
    const s = newState();
    expect(drumsOpen(s)).toBe(false);
    s.bosses.push('alphawolf');
    expect(drumsOpen(s)).toBe(false);
    s.stories.poppy = 5;
    expect(drumsOpen(s)).toBe(false);
    s.stories.poppy = 6;
    expect(drumsOpen(s)).toBe(true);
    expect(poppyAway(s)).toBe(true);
    for (const [step, away] of [[1, true], [2, true], [3, false], [4, false]] as const) {
      s.stories.drums = step;
      expect({ step, away: poppyAway(s) }).toEqual({ step, away });
    }
    // Poppy's own story not done: she's home (or not met yet), whatever the Cavern.
    const t = newState();
    t.bosses.push('alphawolf');
    expect(poppyAway(t)).toBe(false);
  });
});

describe('the side tunnels, the chamber and the pocket below', () => {
  const fromEntry = flood(world.entryPoint('cave'));

  test('the procession walks only open ground, the lead pair side by side', () => {
    const p = new Procession();
    for (p.s = 0; p.s <= ROUTE_LEN; p.s += 0.1) {
      for (const m of p.members()) expect({ s: p.s.toFixed(1), m, ok: walkable(m) }).toEqual({ s: p.s.toFixed(1), m, ok: true });
    }
    for (const q of [...ROUTE, ...RING, ...TOTEMS, NEW_TOTEM, POPPY_AT, LANDING, CLIMB, MOUTH]) expect({ q, ok: walkable(q) }).toEqual({ q, ok: true });
  });

  test("you can walk from the Cavern's entrance up into the tunnels and the chamber, but never into the pocket", () => {
    for (const q of [MOUTH, ...ROUTE, POPPY_AT, ...RING]) expect({ q, ok: fromEntry.has(tileOf(q)) }).toEqual({ q, ok: true });
    expect(fromEntry.has(tileOf(LANDING))).toBe(false);
    expect(fromEntry.has(tileOf(CLIMB))).toBe(false);
    // The pocket itself is one winding tunnel from where you land to the slope back up.
    expect(flood(LANDING).has(tileOf(CLIMB))).toBe(true);
    expect(flood(LANDING).size).toBeLessThan(20);
  });

  test('the areas are where they should be (and the main path is in none of them)', () => {
    expect(inTunnels(at(26.5, 7.5)) && inTunnels(at(28.5, 6.5)) && inTunnels(at(28.5, 3.5))).toBe(true);
    expect(inChamber(POPPY_AT) && inChamber(RING[0])).toBe(true);
    expect(inPocket(LANDING) && inPocket(CLIMB)).toBe(true);
    for (const q of [MOUTH, world.entryPoint('cave'), world.campPoint('cave'), at(14.5, 20), at(25, 12)]) expect({ q, side: inSideArea(q) }).toEqual({ q, side: false });
  });

  test('a fall puts you back at the last bend behind the procession', () => {
    expect(rejoinAt(0)).toEqual(expect.objectContaining({ x: ROUTE[1].x, y: ROUTE[1].y }));
    const p = new Procession(LOOKS[2]);
    const r = rejoinAt(p.s - FORMATION[REAR].back);
    expect(Math.hypot(r.x - ROUTE[3].x, r.y - ROUTE[3].y)).toBeLessThan(0.01);
  });
});

describe('the rear Pebblor looking back', () => {
  /** At each look-back: where it can see you (the open way behind), and where you're hidden (behind a pillar, round a corner). */
  const LOOKOUT = [
    { seen: [at(27.5, 6.6), at(29, 6.5)], hidden: [at(27.2, 5.6), at(26.5, 7.6)] },
    { seen: [at(30.6, 5.6), at(31.4, 6.4)], hidden: [at(27.5, 6.6), at(26.5, 7.6)] },
    { seen: [at(28.6, 3.6), at(30.4, 3.4)], hidden: [at(29.6, 2.5), at(30.6, 5.4)] },
  ];

  test('each look-back has somewhere to hide, and catches you out in the open', () => {
    LOOKS.forEach((s, i) => {
      const p = new Procession(s - 0.01);
      p.update(0.05, along(s - 4), world);
      expect(p.phase).toBe('warn');
      const r = p.rear;
      for (const q of LOOKOUT[i].seen) expect({ i, q, seen: sees(world, r, p.gaze, q) }).toEqual({ i, q, seen: true });
      for (const q of LOOKOUT[i].hidden) expect({ i, q, seen: sees(world, r, p.gaze, q) }).toEqual({ i, q, seen: false });
      // Right up close, it notices you whatever's in the way.
      expect(sees(world, r, p.gaze, { x: r.x + 0.5, y: r.y + 0.4 })).toBe(true);
    });
  });

  test('tailing them unseen gets you to the chamber; standing in the open during a look gets you spotted', () => {
    const hideAt = (i: number) => [at(27.2, 5.6), at(27.5, 6.6), at(29.6, 2.5)][i];
    const p = new Procession();
    let you = MOUTH, spotted = 0;
    for (let t = 0; t < 120 && p.phase !== 'arrived'; t += 1 / 30) {
      // Three tiles behind the rear one, ducking into cover whenever it turns round.
      const looking = p.phase === 'warn' || p.phase === 'look';
      you = looking ? hideAt(p.looks - 1) : along(p.s - FORMATION[REAR].back - 3);
      if (p.update(1 / 30, you, world).includes('spotted')) spotted++;
    }
    expect(p.phase).toBe('arrived');
    expect(spotted).toBe(0);
    expect(p.looks).toBe(LOOKS.length);

    const q = new Procession(LOOKS[0] - 0.5);
    const open = at(27.5, 6.6);
    let caught = false;
    for (let t = 0; t < 5 && !caught; t += 1 / 30) caught = q.update(1 / 30, open, world).includes('spotted');
    expect(caught).toBe(true);
  });

  test("they wait for you if you fall behind (or wander off), and never wait for you when you're ahead", () => {
    const p = new Procession(5);
    p.update(0.1, world.entryPoint('cave'), world);
    const s = p.s;
    for (let i = 0; i < 30; i++) p.update(0.1, world.entryPoint('cave'), world);
    expect(p.phase).toBe('wait');
    expect(p.s).toBe(s);
    for (let i = 0; i < 10; i++) p.update(0.1, POPPY_AT, world);
    expect(p.s).toBeGreaterThan(s);
  });
});

describe('dodge charges', () => {
  const input = (presses: string[]) => ({
    axis: () => ({ x: 0, y: 0 }), consume: (k: string) => (presses[0] === k ? (presses.shift(), true) : false), isHeld: () => false, peek: () => false, flush: () => {}, reset: () => {},
  }) as unknown as Input;
  const fight = (weapon: string, anklet: boolean, presses: string[]) => {
    const save = newState();
    save.equip.weapon = weapon;
    save.owned.push(weapon);
    if (anklet) save.perks.push('echoanklet');
    // A Wand at handling 3 has its Blink (its dodge is a teleport).
    save.mastery.wand.lv = 3;
    const b = new Battle({ zone: zoneById('meadow'), foes: [{ kind: 'slime', lv: 1, golden: false }], boss: false }, save, input(presses), { play: () => {} } as unknown as Audio, () => {});
    // A foe that stays out of the way, so the fight goes on.
    const e = b.enemies[0];
    e.hp = e.maxHp = 1e9;
    e.stun = 1e9;
    return b;
  };
  const tick = (b: Battle, secs: number) => {
    for (let t = 0; t < secs - 1e-9; t += 1 / 60) b.update(1 / 60);
  };

  test('one dodge without the Echo Anklet, two with it', () => {
    const s = newState();
    expect(dodgeCharges(s)).toBe(1);
    s.perks.push('echoanklet');
    expect(dodgeCharges(s)).toBe(2);
  });

  test("without it: a dodge, then nothing until it's back 0.7 s later (as it always was)", () => {
    const presses: string[] = [];
    const b = fight('twig', false, presses);
    tick(b, 2);
    presses.push('dodge');
    tick(b, 1 / 60);
    expect(b.log.dodges).toBe(1);
    expect(b.dodgesReady).toBe(0);
    expect(b.dodgeFrac).toBeGreaterThan(0.9);
    // Pressed again straight away: nothing, while the one charge comes back.
    tick(b, 0.2);
    presses.push('dodge');
    tick(b, 1 / 60);
    expect(b.log.dodges).toBe(1);
    tick(b, DODGE_CD - 0.2);
    presses.push('dodge');
    tick(b, 1 / 60);
    expect(b.log.dodges).toBe(2);
  });

  test('with it: dodge, dodge again straight away, and each charge comes back on its own', () => {
    const presses: string[] = [];
    const b = fight('twig', true, presses);
    tick(b, 2);
    expect(b.dodgesReady).toBe(2);
    expect(b.dodgeFrac).toBe(0);
    presses.push('dodge');
    tick(b, 1 / 60);
    // One spent, one still ready: the button isn't cooling down.
    expect(b.dodgesReady).toBe(1);
    expect(b.dodgeFrac).toBe(0);
    tick(b, 0.2);
    presses.push('dodge');
    tick(b, 1 / 60);
    expect(b.log.dodges).toBe(2);
    expect(b.dodgesReady).toBe(0);
    // The first comes back 0.7 s after it was spent, the second 0.2 s after that.
    tick(b, DODGE_CD - 0.22);
    expect(b.dodgesReady).toBe(1);
    tick(b, 0.21);
    expect(b.dodgesReady).toBe(2);
  });

  test("the Wand's Blink teleports twice in a row with it", () => {
    const presses: string[] = [];
    const b = fight('jellywand', true, presses);
    expect(b.trick).toBe('blink');
    tick(b, 2);
    const x0 = b.p.x, y0 = b.p.y;
    presses.push('dodge');
    tick(b, 1 / 60);
    const d1 = Math.hypot(b.p.x - x0, b.p.y - y0);
    presses.push('dodge');
    tick(b, 1 / 60);
    expect(d1).toBeGreaterThan(60);
    expect(b.log.dodges).toBe(2);
  });
});
