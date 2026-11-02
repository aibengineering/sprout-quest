import { describe, expect, test } from 'bun:test';
import { PARTNERS, SPAR_YIELD, oswinSpars, practiceCopy, sparPartners, sparStats, type PartnerId } from '../src/spar';
import { knows } from '../src/known';
import { newState } from '../src/state';
import { calcDamage, playerStats } from '../src/rules';
import { Battle } from '../src/battle/battle';
import type { BattleOutcome } from '../src/battle/types';
import { zoneById } from '../src/data';
import type { Input } from '../src/input';
import type { Audio } from '../src/audio';
import { World } from '../src/world';

const input = { axis: () => ({ x: 0, y: 0 }), consume: () => false, isHeld: () => false, peek: () => false, flush: () => {}, reset: () => {} } as unknown as Input;
const audio = { play: () => {} } as unknown as Audio;

function spar(who: PartnerId, lv = 8) {
  const real = newState();
  real.lv = lv; real.hp = 5; real.potions = 3; real.flags.push('village', 'bram:hut', 'fox:trusted');
  real.equip.weapon = 'stonesword';
  const before = structuredClone(real);
  let out: BattleOutcome | undefined;
  const b = new Battle({ zone: zoneById('village'), foes: [], boss: false, spar: who }, practiceCopy(real), input, audio, (o) => { out = o; });
  b.intro = 0;
  const run = (secs: number) => { for (let i = 0; i < secs * 60 && !out; i++) b.update(1 / 60); };
  return { b, real, before, run, outcome: () => out };
}

describe('sparring partners', () => {
  test('who will spar: Oswin once you reach Sowerby, Bram once he has his cabin, the fox once she trusts you', () => {
    const s = newState();
    expect(sparPartners(s)).toEqual([]);
    s.flags.push('village');
    expect(sparPartners(s)).toEqual(['oswin']);
    s.flags.push('bram:pie', 'bram:home');
    expect(sparPartners(s)).toEqual(['oswin']);
    s.flags.push('bram:hut');
    expect(sparPartners(s)).toEqual(['oswin', 'bram']);
    s.flags.push('fox:trusted');
    expect(sparPartners(s)).toEqual(['oswin', 'bram', 'fox']);
    // Nobody you haven't met: every partner on offer is someone you know by name (the fox has none to give).
    for (const who of sparPartners(s)) if (who !== 'fox') expect(knows(s, who)).toBe(true);
    expect(oswinSpars(s)).toBe(true);
    expect(oswinSpars(newState())).toBe(false);
  });

  test('a practice copy fights at full health with no potions; your own save is never touched', () => {
    const s = newState(); s.lv = 6; s.hp = 3; s.potions = 4;
    const copy = practiceCopy(s);
    expect(copy.hp).toBe(playerStats(s).maxHp);
    expect(copy.potions).toBe(0);
    expect(s.hp).toBe(3); expect(s.potions).toBe(4);
  });

  test('they scale to you, gear and all: about the same number of hits to the yield at any level', () => {
    for (const who of Object.keys(PARTNERS) as PartnerId[]) {
      const p = PARTNERS[who];
      let last = 0;
      for (const [lv, weapon] of [[1, 'twig'], [8, 'stonesword'], [20, 'crystalhammer']] as const) {
        const s = newState(); s.lv = lv; s.equip.weapon = weapon;
        const st = playerStats(s), foe = sparStats(st, who);
        expect(foe.hp).toBeGreaterThan(last);
        last = foe.hp;
        const yours = calcDamage(st.atk, foe.def, 1, 0, () => 0.5).dmg, theirs = calcDamage(foe.atk, st.def, 1, 0, () => 0.5).dmg;
        expect(Math.abs((foe.hp * (1 - SPAR_YIELD)) / yours - p.hits)).toBeLessThan(1);
        expect(Math.abs((st.maxHp * (1 - SPAR_YIELD)) / theirs - p.lands)).toBeLessThan(1);
      }
    }
  });

  test('they yield at a fifth of their health: no loot, no XP, nobody defeated, and your save untouched', () => {
    for (const who of Object.keys(PARTNERS) as PartnerId[]) {
      const { b, real, before, run, outcome } = spar(who);
      const e = b.enemies[0];
      expect(e.kind).toBe(who);
      e.hp = Math.ceil(e.maxHp * SPAR_YIELD) + 1;
      run(0.2);
      expect(outcome()).toBeUndefined();
      // Even a blow that would knock them out only brings them to the yield.
      e.hp = -50;
      b.kill(e);
      expect(e.dead).toBe(false);
      run(4);
      const o = outcome()!;
      expect(o.result).toBe('win');
      expect(o).toMatchObject({ xp: 0, drops: {}, defeated: [] });
      expect(b.quip?.text).toBe(PARTNERS[who].yields);
      expect(real).toEqual(before);
    }
  });

  test('beaten, you are helped up at a fifth of your health: never fainting, nothing lost', () => {
    const { b, real, before, run, outcome } = spar('oswin');
    b.p.hp = Math.floor(b.stats.maxHp * SPAR_YIELD);
    run(4);
    const o = outcome()!;
    expect(o.result).toBe('lose');
    expect(o.hp).toBeGreaterThan(0);
    expect(b.quip?.text).toBe(PARTNERS.oswin.helps);
    expect(real).toEqual(before);
  });

  test('each partner fights by itself without errors, and lands its telegraphed blows', () => {
    for (const who of Object.keys(PARTNERS) as PartnerId[]) {
      const { b, run } = spar(who, 12);
      b.p.hp = 1e6;
      run(30);
      expect(b.log.taken).toBeGreaterThan(0);
    }
  });

  test("Oswin's practice ring is roped off beside him in Sowerby once you arrive, and you can walk across it", () => {
    const w = new World(), ring = w.objs.find((o) => o.id === 'ring')!, elder = w.obj('elder')!;
    expect(ring.shown!(newState())).toBe(false);
    const s = newState();
    s.flags.push('village');
    expect(ring.shown!(s)).toBe(true);
    expect(Math.hypot(ring.x - (elder.x + elder.w), ring.y + ring.h / 2 - (elder.y + elder.h / 2))).toBeLessThan(1);
    expect(ring.label).toBe('');
    expect(w.blocked(ring.x + ring.w / 2, ring.y + ring.h / 2, 0.28)).toBe(false);
  });
});
