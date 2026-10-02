// Bram offers the next construction quest in conversation, rather than a catalogue of buildings.
import { icon } from '../ui';
import { MATS, type MatId } from '../data';
import { completeVillageJob, jobLock, nextVillageJob, villageDue, VILLAGE_JOBS, jobDone, requestVillageUpgrade } from '../villageJobs';
import { hasMats } from '../rules';
import { RESIDENT_PLOTS } from '../villageLayout';
import { NEIGHBOURS, neighbourReturned } from '../neighbours';
import { kitchenPresentation } from '../crafting/kitchen-extension';
import { G, paused, persist, syncWorld } from './context';
import { logEvent } from '../stats';
import { say } from './scenes';
import { BRAM } from './stories/bram';

let planning = false;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export async function bramHousePlans() {
  if (planning || G.over.room || G.over.underground || !villageDue(G.save)) return;
  planning = true;
  try {
    await paused(async () => {
      const s = G.save, job = nextVillageJob(s);
      if (!job) return say(BRAM, 'Everyone’s got a roof. For now. Inside the mill if you need planks; Alder’s at the dojo if you need practice.', 'happy');
      if (job.recruit && !neighbourReturned(s,job.recruit)) return say(BRAM,NEIGHBOURS[job.recruit].lead,'happy');
      if (!s.flags.includes(`building:asked:${job.id}`)) {
        await say(BRAM, job.request, 'happy');
        s.flags.push(`building:asked:${job.id}`); persist();
      }
      const lock = jobLock(s, job), ready = !lock && hasMats(s, job.cost);
      const costs = Object.entries(job.cost).map(([m,n]) => `<span class="bp-cost ${s.mats[m as MatId] >= n! ? 'ok' : 'miss'}">${icon(m, MATS[m as MatId].icon, 'icon sm')}<b>${s.mats[m as MatId]}</b>/${n} ${esc(MATS[m as MatId].name)}</span>`).join('');
      const choice = await G.ui.dialog(`<h2>🧔 ${esc(job.name)}</h2><p>${esc(job.request)}</p><div class="bp-costs">${costs}</div><p>${esc(job.perk)}</p>${lock ? `<p class="note">${esc(lock)}</p>` : ''}${ready ? `<button class="go wide" data-dialog="job:${job.id}">Here’s everything. Let’s build.</button>` : '<p>Bring these back to Bram when you’re ready.</p>'}`,
        [['close', ready ? 'Later' : 'I’ll get those']], 'building-job');
      if (choice !== `job:${job.id}`) return;
      const before = { ...s.mats };
      if (completeVillageJob(s, job.id) !== 'ok') return;
      logEvent(s, { kind: 'build', id: job.home ? `house:${job.home}` : job.project ?? 'granny:extension', lv: job.level });
      persist(); syncWorld();
      const target = G.over.camTarget;
      const p = job.home ? RESIDENT_PLOTS[job.home] : job.project ? G.world.obj('plot', job.project)! : G.world.objs.find((o) => o.kind === 'house')!;
      G.over.camTarget = { x: p.x + p.w / 2, y: p.y + p.h };
      try {
        if (job.home) await G.ui.builtHome(job.home, job.level, before);
        else if (job.project) await G.ui.built(job.project, job.level, before, job.perk);
        else await G.ui.builtKitchen(before, kitchenPresentation(job.level), job.level);
      } finally { G.over.camTarget = target; }
      persist();
      await say(BRAM, job.id === 'kitchen' ? 'Clover’s got her benches. Go on in; she’s waiting by the book.' : job.id === 'training1' ? 'Alder’s waiting at the dojo. His targets bite softer than the Woods.' : `${job.owner} can take it from here. Come back when you’re ready for the next job.`, 'happy');
    });
  } finally { planning = false; }
}
export const askBramForHome = () => G.ui.toast('🧔 Bram is outside the Sawmill. Bring him the materials for his next building job.', 3600);

/** A resident proposes their own next addition. Bram remains the only material hand-in. */
export async function offerVillageUpgrade(owner: string) {
  if (!villageDue(G.save)) return;
  const j=VILLAGE_JOBS.find((j)=>j.owner===owner&&j.level>1&&!jobDone(G.save,j));
  if (!j || !jobDone(G.save,VILLAGE_JOBS.find((p)=>p.owner===owner&&p.level===j.level-1)!)) return;
  const wishes: Record<string,string> = {
    Poppy: 'The beds are full again! Could we ask Bram for more? Mr. Floppers wants to help with the measuring.',
    'Granny Clover': j.level===2 ? 'Every jar ends up on my bench, dear. Could you ask Bram about proper pantry shelves?' : 'A warm shelf for supper, and a little more light over the benches. Could you ask Bram, dear?',
    Pip: j.level===2 ? 'Stones under the chair, stones on the chair. I could do with a study. Reckon Bram would help?' : 'I’d like to keep every find and still see the floor. Could you ask Bram about an archive?',
    Hazel: j.level===2 ? 'These cuttings need shelter through winter. Will you ask Bram about a glasshouse?' : 'The delicate ones need more shelter. Could we ask Bram to extend the conservatory?',
    Moss: j.level===2 ? 'Nowhere cool to put the dough. Could you ask Bram about a larder?' : 'Clover’s oven is getting crowded. Could Bram add one beside my larder?',
    Alder: 'The moving targets need more room. Ask Bram about the next dojo, and I’ll put the space to use.',
  };
  const answer=await G.ui.dialog(`<h2>${esc(j.name)}</h2><p>${esc(wishes[owner])}</p><p>${esc(j.perk)}</p><p>Bram can take this on next. You’ll bring the materials to him.</p>`,[['ask','Ask Bram about it'],['close','Later']],'upgrade-request');
  if(answer!=='ask') return;
  requestVillageUpgrade(G.save,owner);persist();
  G.ui.toast(`🧔 Talk to Bram about ${j.name}.`,3600);
}
