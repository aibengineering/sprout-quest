// Friendly spars (src/spar.ts), at the practice ring in the Hidden Training Clearing: pick a friend at the sign by its
// gate (src/game/dojo.ts practiceSign) and Oswin or Bram walks over from the village; the fox is already there. You fight
// as a copy of yourself (see fights.ts begin), so nothing sticks.
import { PARTNERS, sparPartners, type PartnerId } from '../spar';
import { zoneById } from '../data';
import type { BattleOutcome } from '../battle/types';
import { esc, icon } from '../ui';
import { G, backToWorld, paused, transition } from './context';
import { startBattle } from './fights';
import { narrate } from './scenes';

const portrait = (who: PartnerId) => icon(`npc_${PARTNERS[who].look}`, PARTNERS[who].emoji, 'icon lg');

/** How your partner turns up at the ring. */
const COMES: Record<PartnerId, string> = {
  oswin: 'Oswin hobbles over from the village, staff in hand.',
  bram: 'Bram’s on his way. Grumbling.',
  fox: 'The fox is already in the ring. Of course she is.',
};

/** A spar on the ring's timber practice floor. */
export function startSpar(who: PartnerId) {
  if (!sparPartners(G.save).includes(who)) return;
  startBattle(zoneById('village'), [], false, undefined, { spar: who });
}

/** Free spar: pick anyone you've made friends with, and they come to the ring. Returns the button pressed. */
export async function pickSpar(extra: [string, string][] = []): Promise<string> {
  const cards = sparPartners(G.save).map((who) => {
    const p = PARTNERS[who];
    return `<article class="mcard"><h3>${portrait(who)} ${esc(p.name)}</h3><p>${esc(p.blurb)}</p><button class="go wide" data-dialog="spar:${who}">Spar</button></article>`;
  }).join('');
  const r = await paused(() => G.ui.dialog(
    `<h2>🤺 Practice</h2><p>Spar with a friend. Fresh HP, no potions, nothing won or lost. Whoever drops to a fifth of their health calls it.</p><div class="dojo-lessons">${cards}</div>`,
    [...extra, ['close', 'Back']], 'dojo spar-pick',
  ));
  if (r.startsWith('spar:')) {
    const who = r.slice(5) as PartnerId;
    await paused(() => narrate(COMES[who]));
    startSpar(who);
  }
  return r;
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
