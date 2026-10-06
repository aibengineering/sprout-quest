import { HUNTS, VARIANTS, acceptHunt, claimHunt, claimSpecies, hunting, huntDef, huntId, huntLock } from '../hunts';
import { GEAR, MONSTERS, zoneById } from '../data';
import { gainXp } from '../rules';
import { offerVillageUpgrade } from './housing';
import { G, paused, persist, syncWorld } from './context';
import { celebrate, markLevels } from './rewards';
import { say, type Speaker } from './scenes';
export const ROOK: Speaker = { name: 'Rook', emoji: '🏹', portrait: () => 'npc_rook' };
let choosing = false, chat = 0;
const CHATS = [
  'Splendid work. Those markings! A collector back home would pay twice for a specimen like that.',
  'Clover insists I eat before counting the specimens. A formidable negotiator, that woman.',
  'Alder calls it practice. I call it a living. Both require a steady hand, don’t they?',
  'Poppy knows all their nicknames. Splendid memory. I’ll need tidy labels before showing anything to the buyers.',
  'Bram says these shelves will hold anything I bring back. Splendid! He meant the timber. I meant the possibilities.',
];
export async function visitHunter() {
  if (choosing || !G.save.homes.rook)
    return;
  choosing = true;
  try {
    await paused(async () => {
      const s = G.save, h = hunting(s), mark = markLevels(GEAR[s.equip.weapon]?.style ?? 'sword');
      if (!s.flags.includes('rook:lodge')) {
        s.flags.push('rook:lodge');
        persist();
        await say(ROOK, 'My own lodge! Board by the door, specimens along the walls. You find them; I know the buyers.');
        await say(ROOK, 'Bigger, stronger specimens fetch better prices. I’ll mark where to look. Your share’s fair, naturally.');
      }
      else
        await say(ROOK, CHATS[chat++ % CHATS.length]);
      let xp = 0;
      const earned = claimHunt(s);
      if (earned)
        xp += earned.xp;
      for (const d of HUNTS)
        if (claimSpecies(s, d.kind))
          xp += 80;
      if (xp) {
        gainXp(s, xp);
        persist();
        if (earned)
          await say(ROOK, 'Just look at it! Splendid. I’ll keep a trophy here. The original will travel very nicely.');
        G.audio.play('levelup');
        await G.ui.message('🏆 A place on the shelf', `Trophies mounted in the lodge · ${xp} XP. Your collection is saved.`);
        await celebrate(mark);
      }
      syncWorld();
      persist();
      const choice = await G.ui.dialog('<h2>🏹 Rook’s Lodge</h2><p>“Have a look at the board. There’s always a market for something exceptional.”</p>', [['board', 'Hunt board'], ['upgrade', 'Ask about the lodge'], ['close', 'Leave']], 'hunter-visit');
      if (choice === 'upgrade')
        return offerVillageUpgrade('Rook');
      if (choice === 'board')
        await huntBoard();
    });
  }
  finally {
    choosing = false;
  }
}
export async function huntBoard() {
  const s = G.save, h = hunting(s), a = h.active;
  const active = a ? `<div class="hunt-active"><b>${huntDef(a.id)!.name} · Lv ${a.lv}</b><p>${a.status === 'defeated' ? 'Bring the commission back to Rook.' : `${zoneById(huntDef(a.id)!.zone).name}: ${huntDef(a.id)!.place}`}</p></div>` : '';
  const rows = HUNTS.flatMap(d => ([1, 2] as const).map(rank => {
    const id = huntId(d, rank), lock = huntLock(s, d, rank), claimed = h.claimed.includes(id);
    return `<button class="hunt-card" data-dialog="hunt:${id}" ${lock || a ? 'disabled' : ''}><b>${rank === 2 ? 'Master ' : ''}${d.name}</b><span>${zoneById(d.zone).name} · ${d.place}</span><small>${claimed ? '✓ Commission completed' : lock ?? `${VARIANTS[d.variant].label} · Lv ${Math.max(s.lv, MONSTERS[d.kind].lv) + (rank === 2 ? 2 : 0)}`}</small></button>`;
  })).join('');
  const choice = await G.ui.dialog(`<h2>🏹 The Hunt Board</h2><p>One commission at a time. Its level stays fixed when accepted. Five field victories earn each species’ bronze trophy; commissions earn silver, then gold.</p>${active}<div class="hunt-list">${rows}</div>`, [['close', 'Close'], ...(a?.status === 'tracking' ? [['cancel', 'Withdraw commission'] as [
        string,
        string
      ]] : [])], 'hunt-board');
  if (choice === 'cancel') {
    const yes = await G.ui.dialog('<h2>Withdraw this commission?</h2><p>Your records and trophies stay. This target leaves until you take its commission again.</p>', [['no', 'Keep it'], ['yes', 'Withdraw']], 'hunt-cancel');
    if (yes === 'yes') {
      delete h.active;
      syncWorld();
      persist();
    }
    return;
  }
  if (choice.startsWith('hunt:') && acceptHunt(s, choice.slice(5))) {
    syncWorld();
    persist();
    G.ui.toast(`🏹 ${huntDef(choice.slice(5))!.name} sighted. Follow the hunt marker.`, 4000);
  }
}
export async function inspectTrophy(kind: string) {
  const d = HUNTS.find(d => d.kind === kind);
  if (!d)
    return;
  const h = hunting(G.save), ranks = ['bronze', 'silver', 'gold'].filter(r => h.trophies.includes(`${kind}:${r}`));
  return paused(() => G.ui.message(`🏆 ${MONSTERS[d.kind].name}`, `${h.kills[d.kind] ?? 0} field victories. ${ranks.length ? `Mounted: ${ranks.join(', ')}.` : 'Five victories earn bronze. Complete Rook’s commissions for silver and gold.'}`));
}
