// The title screen: loading with real progress, then Continue / New Game.
import { loadAssets, preloadIcons } from '../assets';
import { GEAR, MONSTERS, QUESTS } from '../data';
import { loadModels, webglAvailable } from '../models';
import { playerStats } from '../rules';
import { clearLog, logEvent } from '../stats';
import { clearState, loadState, newState, saveState } from '../state';
import { allIconIds, hasNews } from '../ui';
import { VERSION } from '../version';
import { G, persist, showZoneBanner } from './context';
import { setUpStories } from './stories';
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
  // Every character is a 3D model, so without WebGL there's no game to play: say so plainly and stop here. (Automated
  // test browsers run the game's logic without 3D to stay fast; one e2e scenario checks the 3D drawing.)
  if (!webglAvailable() && !navigator.webdriver) {
    show(0, "Sprout Quest needs 3D graphics (WebGL), which this browser has turned off. Try another browser, or switch on hardware acceleration.");
    fill.parentElement!.classList.add('failed');
    return;
  }
  // The page's own loader filled the first fifth downloading this code.
  show(0.2, 'Fetching monsters and scenery…');
  const mb = (n: number) => (n / 1048576).toFixed(1);
  const ok = await loadAssets((p) => show(0.2 + 0.45 * (p.total ? p.done / p.total : 0), `Fetching scenery… ${mb(p.done)} / ${mb(p.total)} MB`));
  if (!ok) show(0.65, 'Sprites unavailable: using simple drawings');
  // Characters are 3D models: the hero in their armor, the villagers and every monster. The other armors follow later.
  const armor = loadState()?.equip.armor ?? 'tunic';
  const weapon = loadState()?.equip.weapon ?? 'twig';
  const characters = [`hero_${armor}`, `wpn_${weapon}`, 'npc_elder', 'npc_granny', 'npc_poppy', 'npc_poppy_hug', 'npc_bram', 'npc_bram_hurt', ...Object.keys(MONSTERS).map((k) => `mon_${k}`)];
  await loadModels(characters, (done, total) => show(0.65 + 0.22 * (done / total), `Waking everyone up… ${done} / ${total}`));
  await preloadIcons(allIconIds(), (p) => show(0.87 + 0.13 * (p.done / p.total), `Unpacking menu icons… ${p.done} / ${p.total}`));
  show(1, 'Ready!');
  const saved = !!loadState();
  document.getElementById('btn-continue')!.hidden = !saved;
  document.getElementById('new-key')!.textContent = saved ? 'N' : 'Enter';
  showVersion();
  const btns = document.querySelector('.title-btns') as HTMLElement;
  btns.hidden = false;
  btns.classList.add('appear');
  const loading = document.getElementById('loading')!;
  loading.classList.add('done');
  setTimeout(() => (loading.hidden = true), 300);
  booted = true;
  // Every other armor, quietly, so changing gear shows the new look straight away.
  void loadModels(Object.values(GEAR).filter((g) => g.slot === 'armor' && g.id !== armor).map((g) => `hero_${g.id}`));
  // …and every weapon you own, so switching shows it in your hand straight away (others load when first held).
  void loadModels((loadState()?.owned ?? []).filter((id) => GEAR[id]?.slot === 'weapon' && id !== weapon).map((id) => `wpn_${id}`));
}

/** The version under the title, with a dot if a saved game hasn't read the newest patch notes. */
function showVersion() {
  const btn = document.getElementById('btn-notes')!;
  const saved = loadState();
  btn.innerHTML = `v${VERSION} · What's new${saved && hasNews(saved) ? '<i class="dot on"></i>' : ''}`;
  btn.hidden = false;
}

/** Patch notes from the title screen; a saved game counts them as read. */
async function showNotes() {
  const saved = loadState();
  await G.ui.patchNotes(saved?.seenVersion ?? VERSION);
  if (saved) {
    G.save.seenVersion = VERSION;
    saveState(G.save);
  }
  showVersion();
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
  setUpStories();
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
  document.getElementById('btn-notes')!.addEventListener('click', () => {
    if (G.mode === 'title' && !G.ui.isOpen) void showNotes();
  });
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
