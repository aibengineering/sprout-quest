import { describe, expect, test } from 'bun:test';
import { newState, saveState, loadState } from '../src/state';
import { NEIGHBOUR_ORDER, NEIGHBOURS, neighbourAvailable, neighbourReturned } from '../src/neighbours';
import { VILLAGE_JOBS, completeVillageJob, jobLock, nextVillageJob, requestVillageUpgrade } from '../src/villageJobs';
import { mealSeconds } from '../src/kitchen';
import { World } from '../src/world';
function ready() {
  const s=newState();s.flags.push('bram:hut','granny:extension');s.stories.poppy=6;s.build.sawmill=4;s.build.garden=1;s.unlocked.push('plots');
  for(const m in s.mats)s.mats[m as keyof typeof s.mats]=1000;
  return s;
}
describe('meeting neighbours before building',()=>{
  test('a conversation or an invitation cannot buy a home before the return; existing homes stay settled',()=>{
    const s=ready();
    for(const id of NEIGHBOUR_ORDER){
      const j=VILLAGE_JOBS.find((j)=>j.recruit===id)!;
      s.homes.pip=1;s.build.cottage=1;s.homes.hazel=1;
      if(id==='pip'){s.homes.pip=0;s.build.cottage=0;}
      if(id==='hazel')s.homes.hazel=0;
      s.flags.push(`${id}:journey:met`);
      expect(neighbourReturned(s,id)).toBe(false);expect(jobLock(s,j)).toContain('bring');
      s.flags.push(`${id}:returned`);expect(neighbourReturned(s,id)).toBe(true);expect(jobLock(s,j)).toBeNull();
    }
    const old=ready();old.homes.pip=2;old.homes.hazel=1;old.build.training=3;
    expect(neighbourReturned(old,'pip')).toBe(true);expect(neighbourAvailable(old,'pip')).toBe(false);
    expect(neighbourAvailable(old,'alder')).toBe(false);expect(neighbourAvailable(old,'hazel')).toBe(false);
  });
  test('an arrival persisted by the story engine remains valid if reloaded before its greeting',()=>{
    const s=ready();s.stories['journey-pip']=2;
    expect(neighbourReturned(s,'pip')).toBe(true);
    expect(jobLock(s,VILLAGE_JOBS.find((j)=>j.id==='pip1')!)).toBeNull();
  });
  test('one resident can request an upgrade while another is away; no payment until Bram receives it',()=>{
    const s=ready(), before={...s.mats};
    expect(requestVillageUpgrade(s,'Poppy')?.id).toBe('garden2');expect(s.mats).toEqual(before);
    expect(nextVillageJob(s)?.id).toBe('garden2');expect(completeVillageJob(s,'garden2')).toBe('ok');
    expect(s.build.garden).toBe(2);expect(s.buildingJob).toBeUndefined();
    expect(completeVillageJob(s,'garden2')).toBe('stale');
    s.flags.push('pip:returned');expect(nextVillageJob(s)?.id).toBe('pip1');
    expect(requestVillageUpgrade(s,'Hazel')).toBeNull();
  });
  test('kitchen and home additions improve only their own recipes and retain all tiers on reload',()=>{
    const s=ready();s.kitchenLevel=3;s.homes={pip:3,hazel:3,moss:3};
    expect(mealSeconds(s,'tea')).toBe(360);expect(mealSeconds(s,'goojelly')).toBe(240);
    expect(mealSeconds(s,'rockcandy')).toBe(360);expect(mealSeconds(s,'meadowtea')).toBe(360);
    const store:Record<string,string>={};globalThis.localStorage={getItem:(k:string)=>store[k]??null,setItem:(k:string,v:string)=>{store[k]=v;},removeItem:(k:string)=>{delete store[k];}} as Storage;
    requestVillageUpgrade(s,'Poppy');saveState(s);const loaded=loadState()!;
    expect(loaded.homes).toEqual(s.homes);expect(loaded.kitchenLevel).toBe(3);expect(loaded.buildingJob).toBe('garden2');
  });
  test('each roadside meeting and temporary village spot is reachable with player collision',()=>{
    const w=new World(), reachable=w.reachable();
    for(const p of Object.values(NEIGHBOURS))for(const point of [p.at,p.town]){
      expect(w.blocked(point.x,point.y,.28)).toBe(false);
      expect(reachable[Math.floor(point.y)*w.w+Math.floor(point.x)]).toBe(1);
    }
  });
});
