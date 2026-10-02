import { describe, expect, test } from 'bun:test';
import { HUNTS, acceptHunt, claimHunt, claimSpecies, huntLock, hunting, recordHuntWin } from '../src/hunts';
import { newState, saveState, loadState } from '../src/state';
import { World } from '../src/world';
import { knownMeals, mealSeconds } from '../src/kitchen';
import { Battle } from '../src/battle/battle';
import { zoneById } from '../src/data';
import type { Input } from '../src/input';
import type { Audio } from '../src/audio';
const ready = () => { const s = newState(); s.homes.rook = 3; s.flags.push('rook:lodge'); s.bosses.push('kingslime', 'alphawolf', 'echoqueen', 'crystalking', 'dragon'); s.lv = 14; return s; };
describe('Rook’s field commissions', () => {
  test('marked variants keep the species behaviour but change its combat pressure', () => {
    const s=ready(), input={} as Input, audio={play:()=>{}} as unknown as Audio;
    const enemy=(variant?:'swift'|'armoured'|'fierce')=>new Battle({zone:zoneById('cave'),boss:false,foes:[{kind:'golem',lv:14,golden:false,variant}]},s,input,audio,()=>{}).enemies[0];
    const normal=enemy(), swift=enemy('swift'), armoured=enemy('armoured'), fierce=enemy('fierce');
    expect(swift.spd).toBeGreaterThan(normal.spd);expect(armoured.spd).toBeLessThan(normal.spd);
    expect(armoured.maxHp).toBeGreaterThan(fierce.maxHp);expect(armoured.dfn).toBeGreaterThan(normal.dfn);
    expect(fierce.atk).toBeGreaterThan(armoured.atk);expect(swift.state).toBe(normal.state);
  });
  test('acceptance freezes level across retries and allows only one target', () => {
    const s = ready();
    expect(acceptHunt(s, 'slime:1')).toBe(true);
    const contract = { ...hunting(s).active! };
    s.lv = 25;
    expect(acceptHunt(s, 'bunny:1')).toBe(false);
    expect(hunting(s).active).toEqual(contract);
    recordHuntWin(s, ['slime']);
    expect(hunting(s).active?.status).toBe('tracking');
    expect(claimHunt(s)).toBeNull();
    recordHuntWin(s, ['bunny'], 'slime:1');
    expect(hunting(s).active?.status).toBe('tracking');
    recordHuntWin(s, ['slime'], 'slime:1');
    expect(hunting(s).active?.status).toBe('defeated');
    expect(claimHunt(s)).toEqual({ xp: 14 * 24, trophy: 'slime:silver' });
    expect(claimHunt(s)).toBeNull();
    expect(acceptHunt(s, 'slime:1')).toBe(false);
    expect(acceptHunt(s, 'slime:2')).toBe(true);
    expect(hunting(s).active?.lv).toBe(27);
  });
  test('regional guardians, lodge tiers and first commissions gate master targets', () => {
    const s = ready();
    s.homes.rook = 1;
    s.bosses = [];
    expect(acceptHunt(s, 'wolf:1')).toBe(false);
    s.bosses.push('kingslime');
    expect(acceptHunt(s, 'wolf:1')).toBe(true);
    delete hunting(s).active;
    expect(huntLock(s, HUNTS.find(d => d.kind === 'golem')!, 1)).toContain('level 2');
    expect(acceptHunt(s, 'slime:2')).toBe(false);
    s.homes.rook = 3;
    expect(acceptHunt(s, 'slime:2')).toBe(false);
    hunting(s).claimed.push('slime:1');
    expect(acceptHunt(s, 'slime:2')).toBe(true);
  });
  test('five field victories grant bronze once; guardian species have no collection trophy', () => {
    const s = ready();
    recordHuntWin(s, ['slime', 'slime', 'slime', 'slime']);
    expect(claimSpecies(s, 'slime')).toBe(false);
    recordHuntWin(s, ['slime', 'dragon']);
    expect(claimSpecies(s, 'slime')).toBe(true);
    expect(claimSpecies(s, 'slime')).toBe(false);
    expect(claimSpecies(s, 'dragon')).toBe(false);
    expect(hunting(s).kills.dragon).toBeUndefined();
  });
  test('every marked target has a reachable approach without opening map walls', () => {
    const w = new World(), r = w.reachable();
    for (const d of HUNTS) {
      expect(w.blocked(d.at.x, d.at.y + .8, .28), d.name).toBe(false);
      expect(r[Math.floor(d.at.y + .8) * w.w + Math.floor(d.at.x)]).toBe(1);
    }
  });
  test('older Hazel homes, paid jobs, recipes and unfinished escorts migrate without material loss', () => {
    const store: Record<string, string> = {};
    globalThis.localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } } as Storage;
    const s = ready();
    const old = { ...s, homes: { pip: 1, hazel: 2, moss: 1 }, buildingJob: 'hazel3', flags: ['hazel:recipe', 'hazel:returned', 'hazel:journey:met'], stories: { 'journey-hazel': 2 } };
    store['sprout-quest-save'] = JSON.stringify(old);
    const migrated = loadState()!;
    expect(migrated.homes).toEqual({ pip: 1, rook: 2, moss: 1 });
    expect(migrated.mats).toEqual(s.mats);
    expect(migrated.buildingJob).toBe('rook3');
    expect(migrated.flags).toContain('rook:lodge');
    expect(migrated.stories['journey-rook']).toBe(2);
    expect(knownMeals(migrated)).toContain('meadowtea');
    expect(mealSeconds(migrated, 'meadowtea')).toBe(300);
    acceptHunt(migrated, 'slime:1');
    saveState(migrated);
    expect(loadState()?.hunting).toEqual(migrated.hunting);
  });
});
