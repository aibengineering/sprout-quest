// The title screen: loading with real progress, then Continue / New Game.
import { loadAssets, preloadIcons } from '../assets';
import { QUESTS } from '../data';
import { playerStats } from '../rules';
import { clearLog, logEvent } from '../stats';
import { clearState, loadState, newState } from '../state';
import { allIconIds } from '../ui';
import { G, persist, showZoneBanner, syncWorld } from './context';
import { progressQuests, unlocks } from './story';

/** Set once the sprites and icons are in; the title's buttons only exist from then on. */
let booted = false;

/**
 * Title screen loading: the HTML shows an animated bar from the first paint; here it becomes real progress
 * (sprite bytes, then menu icons), and only then do Continue / New Game appear, so nothing starts half-drawn.
 */
export async function boot() {
  const fill = document.getElementById('load-fill')!, text = document.getElementById('load-text')!;
  const show = (frac: number, msg: string) => {
    fill.style.width = `${Math.round(Math.min(1, frac) * 100)}%`;
    text.textContent = msg;
  };
  fill.parentElement!.classList.remove('waiting');
  show(0.03, 'Fetching monsters and scenery…');
  const mb = (n: number) => (n / 1048576).toFixed(1);
  const ok = await loadAssets((p) => show(0.05 + 0.8 * (p.total ? p.done / p.total : 0), `Fetching monsters and scenery… ${mb(p.done)} / ${mb(p.total)} MB`));
  if (!ok) show(0.85, 'Sprites unavailable: using simple drawings');
  await preloadIcons(allIconIds(), (p) => show(0.85 + 0.15 * (p.done / p.total), `Unpacking menu icons… ${p.done} / ${p.total}`));
  show(1, 'Ready!');
  const saved = !!loadState();
  document.getElementById('btn-continue')!.hidden = !saved;
  document.getElementById('new-key')!.textContent = saved ? 'N' : 'Enter';
  const btns = document.querySelector('.title-btns') as HTMLElement;
  btns.hidden = false;
  btns.classList.add('appear');
  const loading = document.getElementById('loading')!;
  loading.classList.add('done');
  setTimeout(() => (loading.hidden = true), 300);
  booted = true;
}

function startGame(fresh: boolean) {
  G.audio.unlock();
  if (fresh) {
    clearState();
    clearLog();
    const s = newState();
    s.hp = playerStats(s).maxHp;
    G.restart(s);
  }
  const s = G.save;
  G.audio.muted = s.muted;
  logEvent(s, { kind: 'session', action: fresh ? 'new' : 'start' });
  G.mode = 'world';
  G.ui.setMode('world');
  G.input.reset();
  if (fresh) {
    // Waking up in the glade.
    G.mode = 'dialog';
    void G.ui.caption(QUESTS[0].text, 'narrator').then(() => {
      G.mode = 'world';
      G.input.reset();
    });
  }
  // Old saves catch up on unlocks quietly; new players get them one at a time.
  const catchUp = s.unlocked.length === 0 && (s.lv > 1 || s.quest > 0);
  unlocks(catchUp);
  syncWorld();
  showZoneBanner(G.over.currentZone);
  persist();
  void progressQuests();
}

/** Wires up the title's buttons and keys (Enter continues or starts; N starts a new game). */
export function setUpTitle() {
  const cont = document.getElementById('btn-continue')!, fresh = document.getElementById('btn-new')!;
  window.addEventListener('keydown', (e) => {
    if (G.mode !== 'title' || G.ui.isOpen || e.repeat || !booted) return;
    if (e.code === 'Enter' || e.code === 'Space') (cont.hidden ? fresh : cont).click();
    else if (e.code === 'KeyN') fresh.click();
  });
  cont.addEventListener('click', () => startGame(false));
  fresh.addEventListener('click', async () => {
    if (loadState()) {
      const r = await G.ui.dialog('<div class="big" style="font-size:24px">New game?</div><p>This replaces your current save.</p>', [
        ['no', 'Cancel'],
        ['yes', 'New Game', 'alt'],
      ]);
      if (r !== 'yes') return;
    }
    startGame(true);
  });
}
