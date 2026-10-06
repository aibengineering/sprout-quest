import { offerVillageUpgrade } from './housing';
import { DOJO_CHALLENGES, claimDojo, dojoChallenge, dojoCleared, dojoLock, dojoMisses, dojoSetup } from '../dojo';
import { GEAR, zoneById } from '../data';
import { playerStats } from '../rules';
import type { Battle } from '../battle/battle';
import type { BattleOutcome } from '../battle/types';
import { G, backToWorld, paused, persist, transition } from './context';
import { celebrate, handlingGain, leveledUp, markLevels } from './rewards';
import { say, type Speaker } from './scenes';
import { startBattle } from './fights';

export const ALDER: Speaker = { name: 'Masked Fox', emoji: '🦊', portrait: () => 'npc_fox' };
let choosing = false;
export async function visitDojo() {
  if (choosing || !G.save.build.training || G.over.room || G.over.underground) return;
  choosing = true;
  let chosen: string | null = null;
  try {
    chosen = await paused(async () => {
      if (!G.save.flags.includes('fox:met')) {
        await say(ALDER, 'Bram’s posts are wonderfully crooked. I like them. Ready to work on those feet?');
        await say(ALDER, 'I teach here. Bram only brings the timber. No waving swords at the sleepers behind my den.');
        await say(ALDER, 'Soft targets, real tells. Watch first, move second. We stop before anyone gets hurt.');
        G.save.flags.push('fox:met'); persist();
      }
      const cards = DOJO_CHALLENGES.map((c) => {
        const lock = dojoLock(G.save, c), done = dojoCleared(G.save, c.id);
        return `<article class="mcard"><h3>${c.name}</h3><p>${c.hint}</p><p>${done ? '✓ Cleared · free practice' : `⭐ First clear: ${c.reward} combat and handling XP`}</p>${lock ? `<p>${lock}</p>` : ''}<button class="go wide" data-dialog="dojo:${c.id}" ${lock ? 'disabled' : ''}>${done ? 'Practise again' : 'Try the challenge'}</button></article>`;
      }).join('');
      const r = await G.ui.dialog(`<h2>🦊 The Hidden Clearing</h2><p>Fresh practice HP. Your health and potions stay safe. Each lesson’s XP reward is earned once.</p><div class="dojo-lessons">${cards}</div>`, [...(G.save.build.training<3 ? [['upgrade','Discuss better practice gear'] as [string,string]] : []), ['close', 'Back']], 'dojo');
      if(r==='upgrade') await offerVillageUpgrade('Masked Fox');
      return r.startsWith('dojo:') ? r.slice(5) : null;
    });
  } finally { choosing = false; }
  const c = chosen && dojoChallenge(chosen);
  if (!c || dojoLock(G.save, c)) return;
  startBattle(zoneById('hollow'), dojoSetup(c).foes, false, undefined, dojoSetup(c));
}
export async function finishDojo(o: BattleOutcome, b: Battle) {
  const c = dojoChallenge(b.setup.dojo!);
  if (!c) { transition(backToWorld); return; }
  const s = G.save, mark = markLevels(GEAR[s.equip.weapon]?.style ?? 'sword');
  const performance = { evades: b.evades, skillHits: b.skillHits, maxHp: b.stats.maxHp };
  const misses = dojoMisses(c, o, performance), reward = claimDojo(s, c.id, o, performance);
  // Claim is persisted before any reveal: reloading cannot repeat the XP hand-in.
  persist();
  await G.ui.dialog(`<h2>${misses.length ? 'Let’s try that again' : '✓ '+c.name}</h2><p>${misses.length ? misses.join('<br>') : reward ? `⭐ +${reward} combat XP · weapon handling trained` : 'A clean run. You’ve already earned this lesson’s reward.'}</p><p>${c.hint}</p>`, [['ok', 'Back to the dojo']], 'dojo-result');
  if (reward) {
    await G.ui.xpGain({ lv: mark.fromLv, xp: mark.fromXp }, { lv: s.lv, xp: s.xp }, reward, handlingGain(mark));
    if (leveledUp(mark)) await celebrate(mark);
  }
  transition(backToWorld);
}
export function dojoCoach(b: Battle) {
  const c = dojoChallenge(b.setup.dojo!);
  if (!c || b.intro > 0 || b.endT >= 0) return null;
  return [c.name, c.evades ? `clean dodges ${b.evades}/${c.evades}` : '', c.skills ? `specials ${Math.min(b.log.skills, b.skillHits)}/${c.skills}` : '', c.seconds ? `${Math.max(0, Math.ceil(c.seconds-b.t))}s` : ''].filter(Boolean).join(' · ');
}
