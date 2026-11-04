import { describe, expect, test } from 'bun:test';
import { FoxTrial, claimFoxScarf, FOX_CLEARING, FOX_DEN, FOX_SIGHT, FOX_TRAIL, PRACTICE_SIGN, TRAINING_PLOT, foxAtClearing, foxTrusted } from '../src/fox';
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
  // The Hollow has no practice plot any more: her den is just for her own story.
  expect(w.objs.filter(o=>o.project==='training'&&w.zoneAt(o.x).id==='hollow')).toHaveLength(0);
 });
 test('the Hidden Training Clearing is just outside Sowerby: reached through the hedge from the village, sealed off from the glade, never in the village',()=>{
  const w=new World(), reach=w.reachable(), at=(p:{x:number;y:number})=>reach[Math.floor(p.y)*w.w+Math.floor(p.x)];
  const plot=w.obj('plot','training')!;
  expect(plot.x).toBe(TRAINING_PLOT.x);
  for(const p of [FOX_CLEARING,{x:PRACTICE_SIGN.x+PRACTICE_SIGN.w/2,y:PRACTICE_SIGN.y+PRACTICE_SIGN.h+.5},{x:plot.x+plot.w/2,y:plot.y+plot.h/2}]){
   expect(w.blocked(p.x,p.y,.28),JSON.stringify(p)).toBe(false);
   expect(at(p),JSON.stringify(p)).toBe(1);
  }
  // The only way in is from the village: the prologue's glade (behind its two monsters) stays out of reach.
  expect(at({x:3.5,y:13.9})).toBe(0);
  // Wherever she is, the fox is never inside Sowerby (Rook must never see her).
  for(const p of [FOX_SIGHT,...FOX_TRAIL,FOX_DEN,FOX_CLEARING,plot,PRACTICE_SIGN]) expect(w.zoneAt(p.x).id).not.toBe('village');
  for(const o of w.objs.filter(o=>o.project==='training'||o.id==='practice'||o.id==='fox:den')) expect(w.zoneAt(o.x+o.w).id).not.toBe('village');
 });
 test('old saves keep their practice level at the new clearing; she waits there once she has given you her scarf',()=>{
  const store:Record<string,string>={};globalThis.localStorage={getItem:(k:string)=>store[k]??null,setItem:(k:string,v:string)=>{store[k]=v;},removeItem:(k:string)=>{delete store[k];}} as Storage;
  const old=newState();old.build.training=2;old.flags.push('village','fox:met','dojo:clear:footwork');
  saveState(old);const s=loadState()!;
  expect(s.build.training).toBe(2);expect(foxTrusted(s)).toBe(true);
  const plot=new World().obj('plot','training')!;
  expect(plot.shown!(s)).toBe(true);expect(plot.x).toBe(TRAINING_PLOT.x);
  // Trusted from an old save but no scarf yet: she's still on her trail, so her lessons wait until she's at the clearing.
  expect(foxAtClearing(s)).toBe(false);claimFoxScarf(s);expect(foxAtClearing(s)).toBe(true);
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
