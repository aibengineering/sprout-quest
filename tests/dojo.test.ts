import { describe, expect, test } from 'bun:test';
import { DOJO_CHALLENGES, claimDojo, dojoLock, dojoMisses, dojoSetup } from '../src/dojo';
import { newState, loadState, saveState } from '../src/state';
import { Battle } from '../src/battle/battle';
import type { BattleOutcome, BattleLog } from '../src/battle/types';
import { zoneById } from '../src/data';
import type { Input } from '../src/input';
import type { Audio } from '../src/audio';

const log = (): BattleLog => ({ time: 20, swings: 10, hits: 10, crits: 0, skills: 2, dodges: 8, potions: 0, dealt: 1000, taken: 0, critDealt: 0, cooling: 0, rested: 0, lastHitBy: '' });
const win = (): BattleOutcome => ({ result: 'win', hp: 30, xp: 99999, drops: { core: 99 }, defeated: ['Pebblor'], log: log() });
const performance = { evades: 2, skillHits: 2, maxHp: 100 };
function practice(weapon = 'stonesword') {
  const s = newState(); s.lv = 10; s.equip.weapon = weapon;
  for (const m of Object.values(s.mastery)) m.lv = 5;
  const pressed = new Set<string>();
  const input = { axis: () => ({x:0,y:0}), consume: (k: string) => pressed.delete(k), isHeld: () => false, peek: () => false, flush: () => {}, reset: () => {} } as unknown as Input;
  let finished: BattleOutcome | undefined;
  const b = new Battle({ zone: zoneById('village'), ...dojoSetup(DOJO_CHALLENGES[0]) }, s, input, { play: () => {} } as unknown as Audio, (o) => { finished = o; });
  b.intro = 0; b.p.x = b.p.y = 0; b.p.face = 0; b.p.skillCd = 0;
  return { b,s,pressed,outcome:()=>finished };
}
describe('the hidden fox clearing’s challenges', () => {
  test('successful first clears grant fixed combat and handling XP once, while repeats, exits, failed objectives and locked lessons grant nothing', () => {
    const s = newState(); s.build.training = 3;
    expect(dojoLock(s, DOJO_CHALLENGES[1])).toBeTruthy();
    expect(claimDojo(s, 'charge', win(), performance)).toBe(0);
    const snapshot = structuredClone(s);
    expect(claimDojo(s, 'footwork', {...win(), result:'run'}, performance)).toBe(0);
    expect(claimDojo(s, 'footwork', win(), {...performance,evades:0})).toBe(0);
    expect(s).toEqual(snapshot);
    expect(claimDojo(s, 'footwork', win(), performance)).toBe(180);
    const earned = structuredClone(s);
    expect(claimDojo(s, 'footwork', win(), performance)).toBe(0); expect(s).toEqual(earned);
    expect(s.mats.core).toBe(0); expect(s.wins).toBe(0); expect(s.questKills).toBe(0); expect(s.bosses).toEqual([]);
    expect(s.mastery.sword.lv).toBeGreaterThan(1);
  });
  test('damage, time and successful specials are required; pressing buttons or firing empty specials is insufficient', () => {
    expect(dojoMisses(DOJO_CHALLENGES[0], win(), {...performance,evades:0})).toHaveLength(1);
    expect(dojoMisses(DOJO_CHALLENGES[3], win(), {...performance,skillHits:0})).toHaveLength(1);
    expect(dojoMisses(DOJO_CHALLENGES[2], {...win(),log:{...log(),time:91}},performance)).toHaveLength(1);
    expect(dojoMisses(DOJO_CHALLENGES[5], {...win(),log:{...log(),taken:51}},performance)).toHaveLength(1);
  });
  test('native target kills drop no materials, award no normal XP and leave clover pity unchanged', () => {
    const {b,s,outcome} = practice(); s.cloverDry = 3;
    b.kill(b.enemies[0]);
    for (let i=0;i<180;i++) b.update(1/60);
    expect(outcome()?.xp).toBe(0); expect(outcome()?.drops).toEqual({}); expect(b.dropped).toEqual([]); expect(outcome()?.defeated).toEqual([]); expect(s.cloverDry).toBe(3);
  });
  test('native collisions count one clean evade per dodge, never empty dodges or ordinary hit protection', () => {
    const {b,pressed} = practice();
    b.enemies[0].stun=99;
    const shot = () => b.projs.push({ x:b.p.x, y:b.p.y-10, vx:0,vy:0,r:20,atk:10,mult:1,owner:'e',life:1,color:'#fff' });
    pressed.add('dodge'); b.update(1/60); expect(b.evades).toBe(0);
    shot(); b.update(1/60); expect(b.evades).toBe(1);
    b.update(1/60); expect(b.evades).toBe(1);
    b.projs=[]; b.p.dodging=0; b.p.dodgeT=0; b.p.iframes=1;
    shot(); b.update(1/60); expect(b.evades).toBe(1);
  });
  test('all four weapon classes register one connected special per cast, despite multiple hits', () => {
    for (const weapon of ['stonesword','stonehammer','thornwhip','jellywand']) {
      const {b,pressed}=practice(weapon),e=b.enemies[0];
      const pin=()=>{e.hp=e.maxHp=1e9;e.stun=99;e.kx=e.ky=0;e.x=b.p.x+70;e.y=b.p.y;};
      pin();pressed.add('skill');
      for(let i=0;i<180;i++){pin();b.update(1/60);}
      expect({weapon,contacts:b.skillHits}).toEqual({weapon,contacts:1});
    }
  });
  test('cleared rewards remain claimed after a reload', () => {
    const store: Record<string,string> = {};
    globalThis.localStorage = { getItem:(k:string)=>store[k]??null,setItem:(k:string,v:string)=>{store[k]=v;},removeItem:(k:string)=>{delete store[k];} } as Storage;
    const s=newState();s.build.training=1;claimDojo(s,'footwork',win(),performance);saveState(s);
    const loaded=loadState()!;
    expect(claimDojo(loaded,'footwork',win(),performance)).toBe(0);expect(loaded.xp).toBe(s.xp);expect(loaded.mastery).toEqual(s.mastery);
  });
});
