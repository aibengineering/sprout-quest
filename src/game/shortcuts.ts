// Construct at a visible crossing; saving precedes the short, physical assembly on the map.
import { costChips } from '../ui';
import { buildShortcut, canBuildShortcut, shortcutById, shortcutLock, shortcutWorldPoint } from '../shortcuts';
import { logEvent } from '../stats';
import { G, paused, persist, syncWorld } from './context';
import { wait } from './scenes';

let constructing = false;
export async function constructShortcut(id: string) {
  const p = shortcutById(id);
  if (!p || constructing) return;
  constructing = true;
  try {
    await paused(async () => {
      const lock = shortcutLock(G.save, p);
      if (lock) { await G.ui.message(`🌉 ${p.name}`, `${p.benefit} ${lock}`); return; }
      if (canBuildShortcut(G.save, p) === 'built') return;
      const can = canBuildShortcut(G.save, p) === 'ok';
      const choice = await G.ui.dialog(`<div class="big" style="font-size:24px">🌉 ${p.name}</div><p>${p.benefit}</p><div class="chips">${costChips(G.save, p.cost)}</div>${can ? '' : '<p>Bring the listed planks from Bram’s Sawmill to finish this crossing.</p>'}`,
        [['no', 'Not yet'], ...(can ? [['yes', 'Build crossing', 'alt'] as [string, string, string?]] : [])], 'shortcut-plan');
      if (choice !== 'yes' || buildShortcut(G.save, p) !== 'ok') return;
      logEvent(G.save, { kind: 'build', id: `shortcut:${p.id}`, lv: 1 });
      syncWorld(); persist();
      const previous = G.over.camTarget;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      try {
        G.over.camTarget = shortcutWorldPoint(p, { x: p.deck.x + p.deck.w / 2, y: p.deck.y + p.deck.h });
        G.over.raiseShortcut(p.id, reduced);
        G.audio.play('craft');
        if (!reduced) await wait(1600);
      } finally { G.over.camTarget = previous; }
      G.ui.toast(`🌉 ${p.name} is open. Walk across whenever you like.`, 3600);
    });
  } finally { constructing = false; }
}
