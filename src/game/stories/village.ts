// The tracker follows the current request rather than an index into a changing upgrade catalogue.
import { VILLAGE_JOBS, jobDone, jobGoal, nextVillageJob, villageDue } from '../../villageJobs';
import { NEIGHBOURS, neighbourReturned } from '../../neighbours';
import { G } from '../context';
import { BRAM_AT } from './bram';
import { nameOf } from '../../known';
import type { Story } from '../stories';
export const VILLAGE_STORY: Story = {
  id: 'construction', title: 'A Place for Everyone', icon: '🏘️', available: () => villageDue(G.save), objs: [], cast: () => [],
  started:()=>{const j=nextVillageJob(G.save);return !!G.save.buildingJob || !!j && G.save.flags.includes(`building:asked:${j.id}`);},
  steps: [{ id: 'requests', get label() {
    const j = nextVillageJob(G.save), r = j?.recruit;
    // The fox never moves to town: her place is built once she trusts you, up where her trail begins.
    if (r && !neighbourReturned(G.save, r)) return r === 'alder' ? 'Follow the glimmer dust above Glimmer Hollow' : `Bring ${nameOf(G.save, r)} back to Sowerby`;
    return j ? jobGoal(j) : 'Everyone has a place';
  }, cost: () => {
    const j = nextVillageJob(G.save);
    return j && VILLAGE_STORY.started?.() && (!j.recruit || neighbourReturned(G.save, j.recruit)) ? j.cost : {};
  }, target: () => {
    const j = nextVillageJob(G.save);
    return j?.recruit && !neighbourReturned(G.save,j.recruit) ? NEIGHBOURS[j.recruit].at : BRAM_AT;
  }, done: () => VILLAGE_JOBS.every((j) => jobDone(G.save,j)) }],
};
