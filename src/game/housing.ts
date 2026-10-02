// Bram offers the next construction quest in conversation, rather than a catalogue of buildings.
import { icon } from '../ui';
import { MATS, type MatId } from '../data';
import { completeVillageJob, jobLock, nextVillageJob, villageDue } from '../villageJobs';
import { hasMats } from '../rules';
import { RESIDENT_PLOTS } from '../villageLayout';
import { KITCHEN_EXTENSION_PRESENTATION } from '../crafting/kitchen-extension';
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
        else await G.ui.builtKitchen(before, KITCHEN_EXTENSION_PRESENTATION);
      } finally { G.over.camTarget = target; }
      persist();
      await say(BRAM, job.id === 'kitchen' ? 'Clover’s got her benches. Go on in; she’s waiting by the book.' : job.id === 'training1' ? 'Alder’s waiting at the dojo. His targets bite softer than the Woods.' : `${job.owner} can take it from here. Come back when you’re ready for the next job.`, 'happy');
    });
  } finally { planning = false; }
}
export const askBramForHome = () => G.ui.toast('🧔 Bram is outside the Sawmill. Bring him the materials for his next building job.', 3600);
