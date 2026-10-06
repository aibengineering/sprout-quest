import { describe, expect, test } from 'bun:test';
import { FoxTrial, claimFoxScarf, FOX_DEN, FOX_SIGHT, FOX_TRAIL, FOX_TRAINING, foxTrusted } from '../src/fox';
import { newState, loadState, saveState } from '../src/state';
import { dodgeCharges, dodgeMotion } from '../src/rules';
import { neighbourAvailable, neighbourReturned } from '../src/neighbours';
import { DOJO_CHALLENGES } from '../src/dojo';
import { VILLAGE_JOBS, jobLock } from '../src/villageJobs';
import { World } from '../src/world';
function finish(trial:FoxTrial, dodge:boolean) {
 for(let i=0;i<800&&!trial.done;i++) {
  if(dodge&&trial.phase==='tell'&&trial.time>.3&&trial.lane===trial.marked)trial.dodge(trial.lane===2?-1:1);
  trial.update(1/60);
 }
 return trial;
}
describe('the masked fox’s private friendship',()=>{
 test('marked shards stay put while the hero dodges; all six waves require leaving the danger lane',()=>{
  const t=new FoxTrial();t.dodge(-1);expect(t.marked).toBe(1);expect(t.lane).toBe(0);
  expect(finish(new FoxTrial(),false).passed).toBe(false);
  const win=finish(new FoxTrial(),true);expect(win.passed).toBe(true);expect(win.dodges).toBe(6);expect(win.hits).toBe(0);
 });
 test('scarf is once-only, free of construction and health costs, and stacks with the Anklet',()=>{
  const s=newState(), hp=s.hp,mats={...s.mats};s.perks.push('echoanklet');
  expect(claimFoxScarf(s)).toBe(true);expect(claimFoxScarf(s)).toBe(false);
  expect(dodgeCharges(s)).toBe(2);expect(dodgeMotion(s)).toBe(1.35);
  expect(s.hp).toBe(hp);expect(s.mats).toEqual(mats);expect(s.build.training).toBe(0);expect(foxTrusted(s)).toBe(true);
 });
 test('the den and all chase stops have a reachable approach and are outside Sowerby',()=>{
  const w=new World(), reach=w.reachable();
  for(const p of [FOX_SIGHT,...FOX_TRAIL,FOX_DEN]){
   expect(w.blocked(p.x,p.y,.28),JSON.stringify(p)).toBe(false);
   expect(reach[Math.floor(p.y)*w.w+Math.floor(p.x)]).toBe(1);
   expect(w.zoneAt(p.x).id).toBe('hollow');
  }
  expect(w.obj('plot','training')!.x).toBe(FOX_TRAINING.x);
  expect(w.objs.filter(o=>o.project==='training'&&w.zoneAt(o.x).id==='village')).toHaveLength(0);
 });
 test('Bram builds only after trust; existing practice tiers remain valid without granting the new field reward',()=>{
  const s=newState();s.flags.push('bram:hut','granny:extension','pip:returned');s.build.sawmill=4;s.build.garden=1;s.build.cottage=1;
  const job=VILLAGE_JOBS.find(j=>j.id==='training1')!;
  expect(jobLock(s,job)).toContain('trust');claimFoxScarf(s);expect(jobLock(s,job)).toBeNull();
  const old=newState();old.build.training=3;old.flags.push('dojo:clear:footwork');
  expect(foxTrusted(old)).toBe(true);expect(neighbourReturned(old,'alder')).toBe(true);expect(old.perks).not.toContain('shadowscarf');
  expect(DOJO_CHALLENGES.map(c=>c.id)).toEqual(['footwork','charge','pack','special','stone','crowd']);
 });
 test('Rook’s new recruitment needs the dragon, and his arrival cannot expose or remove the fox',()=>{
  const s=newState();s.flags.push('bram:hut');s.build.sawmill=1;s.build.cottage=1;s.bosses.push('echoqueen');
  expect(neighbourAvailable(s,'rook')).toBe(false);s.bosses.push('dragon');expect(neighbourAvailable(s,'rook')).toBe(true);
  claimFoxScarf(s);s.flags.push('rook:returned');s.homes.rook=3;expect(foxTrusted(s)).toBe(true);
  const store:Record<string,string>={};globalThis.localStorage={getItem:(k:string)=>store[k]??null,setItem:(k:string,v:string)=>{store[k]=v;},removeItem:(k:string)=>{delete store[k];}} as Storage;
  saveState(s);const loaded=loadState()!;expect(loaded.perks).toContain('shadowscarf');expect(loaded.flags).toContain('fox:trusted');expect(loaded.homes.rook).toBe(3);
 });
});
