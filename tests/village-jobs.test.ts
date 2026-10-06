import { describe, expect, test } from 'bun:test';
import { KITCHEN_EXTENSION, VILLAGE_JOBS, completeVillageJob, jobDone, nextVillageJob, jobLock, requestVillageUpgrade } from '../src/villageJobs';
import { newState, saveState, loadState } from '../src/state';
import { kitchenOpen } from '../src/kitchen';
import { craftFlights, buildPresentation } from '../src/crafting';
import { housePresentation } from '../src/crafting/houses';
import { kitchenPresentation, KITCHEN_EXTENSION_PRESENTATION } from '../src/crafting/kitchen-extension';
import { sceneModel } from './sceneModel';

function settled() {
  const s = newState(); s.stories.poppy = 6; s.stories.bram = 9; s.flags.push('bram:hut','pip:returned','fox:trusted','rook:returned','moss:returned'); s.unlocked.push('plots'); s.build.sawmill = 4;
  for (const m in s.mats) s.mats[m as keyof typeof s.mats] = 500;
  return s;
}
describe('Bram’s incremental building quests', () => {
  test('garden → Clover’s kitchen → Pip → masked fox, with a single material hand-in and no skipped or repeated job', () => {
    const s = settled();
    expect(kitchenOpen(s)).toBe(false);
    expect(completeVillageJob(s, 'kitchen')).toBe('stale');
    const before = { ...s.mats };
    expect(completeVillageJob(s, 'garden1')).toBe('ok');
    expect(s.mats.plank).toBe(before.plank - 32);
    const paid = { ...s.mats };
    expect(completeVillageJob(s, 'garden1')).toBe('stale'); expect(s.mats).toEqual(paid);
    s.mats.flower = KITCHEN_EXTENSION.cost.flower! - 1;
    expect(completeVillageJob(s, 'kitchen')).toBe('missing'); expect(kitchenOpen(s)).toBe(false);
    s.mats.flower++;
    expect(completeVillageJob(s, 'kitchen')).toBe('ok'); expect(kitchenOpen(s)).toBe(true); s.mats.flower = 500;
    expect(completeVillageJob(s, 'pip1')).toBe('ok');
    expect(completeVillageJob(s, 'training1')).toBe('ok');
    expect(nextVillageJob(s)?.owner).toBe('Rook');
    expect(s.homes.pip).toBe(1); expect(s.build.training).toBe(1);
  });
  test('mill capability and meeting a resident gate their additions; the complete chain has real costs and no circular crop dependency', () => {
    const s = settled();
    for (const job of VILLAGE_JOBS) {
      s.buildingJob=job.id;
      if (job.mill > 1) {
        s.build.sawmill = job.mill - 1;
        expect(completeVillageJob(s, job.id)).toBe('locked');
        s.build.sawmill = 4;
      }
      if (job.home && job.level > 1 && !s.flags.includes(job.home === 'pip' ? 'pip:candy' : job.home === 'rook' ? 'rook:lodge' : `${job.home}:recipe`)) {
        expect(completeVillageJob(s, job.id)).toBe('locked');
        s.flags.push(job.home === 'pip' ? 'pip:candy' : job.home === 'rook' ? 'rook:lodge' : `${job.home}:recipe`);
      }
      if(job.project==='training' && job.level>1) s.flags.push('fox:met');
      if (job.cost.flower) expect(s.build.garden).toBeGreaterThan(0);
      const before = { ...s.mats };
      expect(completeVillageJob(s, job.id)).toBe('ok');
      for (const [m,n] of Object.entries(job.cost)) expect(s.mats[m as keyof typeof s.mats]).toBe(before[m as keyof typeof s.mats] - n!);
      expect(jobDone(s, job)).toBe(true);
    }
    expect(nextVillageJob(s)).toBeUndefined(); expect(s.build.forge).toBe(0); expect(s.build.home).toBe(1);
  });
  test('older open Kitchens and built homes survive migration and reload without repayment', () => {
    const store: Record<string,string> = {};
    globalThis.localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string,v: string) => {store[k]=v;}, removeItem: (k: string) => {delete store[k];} } as Storage;
    const old = settled(); delete old.villageJobs; old.build.garden = 2; old.build.training = 3; old.build.cottage = 1; old.homes.pip = 2; old.homes.rook = 1;
    saveState(old); const s = loadState()!;
    expect(kitchenOpen(s)).toBe(true); expect(s.flags.filter((f) => f === 'granny:extension')).toHaveLength(1);
    expect(s.build).toEqual(old.build); expect(s.homes).toEqual(old.homes); expect(s.mats).toEqual(old.mats);
    expect(nextVillageJob(s)?.id).toBe('moss1');
    saveState(s); expect(loadState()).toEqual(s);
  });
  test('every hand-in material flies to visible native geometry, including Poppy’s flowers and Clover’s extension', () => {
    for (const job of VILLAGE_JOBS) {
      const p = job.home ? housePresentation(job.home, job.level) : job.project ? buildPresentation(job.project, job.level)! : kitchenPresentation(job.level);
      const model = sceneModel(p.model);
      expect(Object.keys(model.layers).sort()).toEqual(p.layers.map((l) => l.id).sort());
      expect(model.compressed && model.toon).toBe(true);
      for (const [m,n] of Object.entries(job.cost)) {
        expect(p.roles[m as keyof typeof p.roles]).toBeTruthy();
        expect(craftFlights(p, job.cost).filter((f) => f.material === m).reduce((sum,f) => sum+f.count,0)).toBe(n!);
      }
    }
  });
});
