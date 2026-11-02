// Friendly spars (src/spar.ts): Elder Oswin offers one when you talk to him, at the practice ring beside him in
// Sowerby, and the fox's clearing has a Free spar with anyone who'll have you. You fight as a copy of yourself (see fights.ts begin), so nothing sticks.
import { PARTNERS, sparPartners, type PartnerId } from '../spar';
import { zoneById } from '../data';
import type { BattleOutcome } from '../battle/types';
import { esc, icon } from '../ui';
import { G, backToWorld, paused, transition } from './context';
import { startBattle } from './fights';

const portrait = (who: PartnerId) => icon(`npc_${PARTNERS[who].look}`, PARTNERS[who].emoji, 'icon lg');

/** A spar at Oswin's practice ring in Sowerby, or at the fox's clearing: either way on a timber practice floor. */
export function startSpar(who: PartnerId, at: 'village' | 'hollow' = 'village') {
  if (!sparPartners(G.save).includes(who)) return;
  startBattle(zoneById(at), [], false, undefined, { spar: who });
}

/** The clearing's Free spar: pick anyone you've made friends with. */
export async function pickSpar() {
  const cards = sparPartners(G.save).map((who) => {
    const p = PARTNERS[who];
    return `<article class="mcard"><h3>${portrait(who)} ${esc(p.name)}</h3><p>${esc(p.blurb)}</p><button class="go wide" data-dialog="spar:${who}">Spar</button></article>`;
  }).join('');
  const r = await paused(() => G.ui.dialog(
    `<h2>🤺 Free spar</h2><p>Practice with a friend. Fresh HP, no potions, nothing won or lost. Whoever drops to a fifth of their health calls it.</p><div class="dojo-lessons">${cards}</div>`,
    [['close', 'Back']], 'dojo spar-pick',
  ));
  if (r.startsWith('spar:')) startSpar(r.slice(5) as PartnerId, 'hollow');
}

/** How it went: who won and their last word, then back where you were. */
export async function finishSpar(o: BattleOutcome, who: PartnerId) {
  if (o.result === 'run') { transition(backToWorld); return; }
  const p = PARTNERS[who], won = o.result === 'win';
  await G.ui.dialog(
    `<div class="big">${won ? 'You won the spar!' : esc(p.wins)}</div>
     <div class="talk">${portrait(who)}<div><b class="talk-name">${esc(p.name)}</b><div class="caption-text">${esc(won ? p.yields : p.helps)}</div></div></div>
     <p>Just practice: your health, potions and bag are as you left them.</p>`,
    [['close', 'Back']], 'spar-result',
  );
  transition(backToWorld);
}
