// Bram's outdoor house plans. The shared building animation follows one durable transaction.
import { icon } from '../ui';
import { MATS, type MatId } from '../data';
import { HOMES, HOME_ORDER, buildHome, canBuildHome, homeLevel, houseLock, nextHouse, type HomeId } from '../housing';
import { RESIDENT_PLOTS } from '../villageLayout';
import { G, paused, persist, syncWorld } from './context';
import { logEvent } from '../stats';
import { say } from './scenes';
import { BRAM } from './stories/bram';

let planning = false;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export async function bramHousePlans() {
  if (planning || G.over.room || G.over.underground || (G.save.stories.bram ?? 0) < 9) return;
  planning = true;
  try {
    await paused(async () => {
      while (true) {
        const s = G.save;
        const cards = HOME_ORDER.map((id) => {
          const who = HOMES[id], lv = homeLevel(s, id), plan = nextHouse(s, id), lock = houseLock(s, id);
          const now = lv ? who.plans[lv - 1].name : 'A place for a new neighbour';
          const cost = plan ? Object.entries(plan.cost).map(([m, n]) => `<span class="bp-cost ${s.mats[m as MatId] >= n! ? 'ok' : 'miss'}">${icon(m, MATS[m as MatId].icon, 'icon sm')}<b>${Math.min(s.mats[m as MatId], n!)}</b>/${n}</span>`).join('') : '';
          return `<article class="mcard bcard" data-home="${id}"><div class="bp-head"><b>${who.icon} ${who.name} · ${who.trade}</b><small>${lv}/2</small></div>
            <p>${esc(now)}</p>${plan ? `<div class="name">${esc(plan.name)}</div><p>${esc(plan.perk)}</p><div class="bp-costs">${cost}</div>
            ${lock ? `<p class="note">${esc(lock)}</p>` : ''}<button class="go wide" data-dialog="home:${id}:${lv}" ${canBuildHome(s, id) === 'ok' ? '' : 'disabled'}>${lv ? 'Add' : 'Build'} ${esc(plan.name)}</button>` : '<p>✨ Home complete. Drop by and say hello.</p>'}</article>`;
        }).join('');
        const choice = await G.ui.dialog(`<div class="house-plans-head"><h2>🧔 Bram’s House Plans</h2><p>You bring the planks; I’ll build a home. Better timber makes room for our neighbours’ recipes.</p></div><div class="house-plans-list">${cards}</div>`,
          [['chat', 'Chat', 'ghost'], ['mill', 'About the sawmill', 'ghost'], ['close', 'Back']], 'house-plans');
        if (choice === 'close') return;
        if (choice === 'chat') { await say(BRAM, homeLevel(s, 'moss') ? 'A miner, a herbalist, a baker… there’s a good smell coming from every chimney now. Go say hello. Good timber’s only the beginning of a home.' : 'A village grows one doorstep at a time. Pip needs a cottage first; then Hazel and Moss can join us. Don’t forget to drop by when the roof is on.', 'happy'); continue; }
        if (choice === 'mill') { await say(BRAM, 'Inside the mill: pick up logs, put them on the bench, pull the lever, then take your planks. Bring them out here and we’ll put them to work.', 'happy'); continue; }
        const [, name, rawLevel] = choice.split(':');
        if (!HOME_ORDER.includes(name as HomeId)) continue;
        const id = name as HomeId, level = Number(rawLevel), before = { ...s.mats };
        if (buildHome(s, id, level) !== 'ok') continue;
        logEvent(s, { kind: 'build', id: `house:${id}`, lv: level + 1 });
        persist(); syncWorld();
        const target = G.over.camTarget, p = RESIDENT_PLOTS[id];
        G.over.camTarget = { x: p.x + p.w / 2, y: p.y + p.h };
        try { await G.ui.builtHome(id, level + 1, before); }
        finally { G.over.camTarget = target; }
        persist();
      }
    });
  } finally { planning = false; }
}

export const askBramForHome = () => G.ui.toast('🧔 Bring your planks to Bram, outside the Sawmill. His house plans are separate from the village workshops.', 3600);
