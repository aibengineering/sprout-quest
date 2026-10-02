// What the menu's buttons do: crafting, building, equipping, travel, settings and the play report.
import { GEAR, PROJECTS, POTION_HEAL, POTION_RECIPES, TOOLS, zoneById, type Style, type ZoneId } from '../data';
import { build, craftGear, craftPotion, craftTool, equip, playerStats, revealed } from '../rules';
import { copyText, shareOrDownload } from '../share';
import { logEvent, reportText, summaryText } from '../stats';
import { clearState, newState } from '../state';
import type { UIHooks } from '../ui';
import { G, applySound, menuCtx, paused, persist, showZoneBanner, syncWorld, transition } from './context';
import { buildPresentation, craftPresentation } from '../crafting';
import { VERSION } from '../version';
import { newlyRevealed } from './rewards';
import { activeStory, storyLog } from './stories';
import { progressQuests } from './story';
import { moveAt } from '../battle/demo';
import { showPreview } from './preview';
import { askBramForHome } from './housing';

/** One transaction/reveal at a time, including taps queued while the Forge is being replaced. */
let craftingItem = false;

/** Travel (by warp or fast travel) with an iris transition, landing somewhere safe in the area. */
/** Off to an area in a flash: its campfire, or Sowerby's entrance. */
export function travelTo(id: ZoneId) {
  G.ui.closeMenu();
  transition(() => {
    const w = G.world;
    const p = id !== 'village' && zoneById(id).guardian ? w.campPoint(id) : w.entryPoint(id);
    G.over.teleport(p.x, p.y);
    persist();
    showZoneBanner(G.over.currentZone);
  });
}

/** The full report goes out as a file (the share sheet on phones); the summary alone is small enough to paste. */
async function exportReport(how: 'file' | 'copy') {
  if (how === 'copy') {
    const ok = await copyText(summaryText(G.save));
    G.ui.toast(ok ? '📋 Report summary copied: paste it into a chat' : 'Could not copy here: try Share file');
    return;
  }
  const name = `sprout-quest-report-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
  const r = await shareOrDownload(reportText(G.save), name);
  if (r === 'downloaded') G.ui.toast('📊 Play report downloaded');
}

export const menuHooks: UIHooks = {
  sound: (s) => G.audio.play(s),
  sweep: (dur, from, to, voice) => G.audio.sweep(dur, from, to, voice),
  /** From an unlock card: open that tab, if you're free on the map. */
  openTab(tab) {
    if (G.mode !== 'world' || G.trans) return;
    G.audio.play('ui');
    G.mode = 'dialog';
    G.ui.openMenu(menuCtx(), tab);
  },
  save: () => G.save,
  busy: () => G.mode !== 'world' || !!G.trans || !!G.swoop,

  async craftGear(id) {
    if (craftingItem || !GEAR[id]) return;
    const s = G.save, g = GEAR[id];
    const current = g.slot === 'charm' ? (s.equip.charm ? GEAR[s.equip.charm] : null) : GEAR[s.equip[g.slot]];
    const before = { ...s.mats };
    if (craftGear(s, id) !== 'ok') return;
    craftingItem = true;
    try {
      logEvent(s, { kind: 'craft', id });
      if (!craftPresentation(g)) G.audio.play('craft');
      // Ownership and the cost survive a reload, skipped animation or backgrounded phone.
      persist();
      const choice = await G.ui.newGear(g, current, before);
      if (choice === 'equip' && equip(s, id)) G.audio.play('levelup');
      persist();
      const advanced = await progressQuests();
      if (!advanced) G.ui.openMenu(menuCtx(true), 'forge');
    } finally {
      craftingItem = false;
    }
  },

  async build(id) {
    if (id === 'cottage') return askBramForHome();
    if (craftingItem) return;
    const s = G.save, shown = revealed(s), before = { ...s.mats };
    if (build(s, id) !== 'ok') return;
    craftingItem = true;
    try {
      const lv = s.build[id], lvl = PROJECTS[id].levels[lv - 1];
      logEvent(s, { kind: 'build', id, lv });
      const fresh = newlyRevealed(shown).length;
      const perk = `${lvl.perk}${fresh ? ` · ${fresh} new recipe${fresh > 1 ? 's' : ''} in the Forge!` : ''}`;
      // Upgrades that raise max HP also top you up.
      s.hp = Math.min(playerStats(s).maxHp, s.hp + 10);
      // Built and saved before the scene plays, and the map already shows it behind the scene.
      persist();
      syncWorld();
      if (!buildPresentation(id, lv)) {
        G.audio.play('levelup');
        G.ui.toast(`🏗 Built the ${lvl.name}! ${perk}`, 3600);
        void progressQuests();
        return;
      }
      await G.ui.built(id, lv, before, perk);
      const advanced = await progressQuests();
      if (!advanced) G.ui.openMenu(menuCtx(), 'village', id);
    } finally {
      craftingItem = false;
    }
  },

  async craftTool(id) {
    if (craftingItem) return;
    const before = { ...G.save.mats };
    if (craftTool(G.save, id) !== 'ok') return;
    craftingItem = true;
    try {
      logEvent(G.save, { kind: 'craft', id });
      const t = TOOLS.find((t) => t.id === id)!;
      if (!craftPresentation(t)) G.audio.play('craft');
      persist();
      G.ui.closeMenu(true);
      const what = t.skill === 'wood' ? 'Walk up to a tree with a ribbon on it and chop!' : 'Walk up to a rock with a ribbon on it and break it!';
      await paused(() => G.ui.madeItem(t, before, `${t.desc} ${what}`, t.icon, t.tier === 1 ? 'Good as new' : 'You crafted'));
      void progressQuests();
    } finally {
      craftingItem = false;
    }
  },

  async craftPotion(id) {
    if (craftingItem) return;
    const before = { ...G.save.mats };
    if (craftPotion(G.save, id) !== 'ok') return;
    craftingItem = true;
    try {
      const p = POTION_RECIPES.find((r) => r.id === id)!;
      if (!craftPresentation(p)) G.audio.play('craft');
      persist();
      if (craftPresentation(p)) {
        await G.ui.madeItem(p, before, `One more potion in your bag. Restores ${Math.round(POTION_HEAL * 100)}% of max HP when you drink it.`, '🧪', 'You brewed', 'Keep in bag');
        G.ui.openMenu(menuCtx(true), 'forge');
      }
    } finally {
      craftingItem = false;
    }
  },

  equip(id) {
    if (!equip(G.save, id)) return;
    G.audio.play('ui');
    persist();
  },

  drink() {
    const s = G.save, st = playerStats(s);
    if (s.potions <= 0 || s.hp >= st.maxHp) return;
    s.potions--;
    s.hp = Math.min(st.maxHp, s.hp + Math.round(st.maxHp * POTION_HEAL));
    G.audio.play('heal');
    persist();
  },


  toggleMute() {
    G.sound.muted = !G.sound.muted;
    applySound();
  },

  setVolume(kind: 'music' | 'effects', v: number, done: boolean) {
    G.sound[kind] = v;
    applySound(done);
    // A blip at the new level when you let go, so you can hear where the effects sit.
    if (kind === 'effects' && done) G.audio.play('ui');
  },

  soundSettings: () => G.sound,

  async preview(key: string) {
    const [style, lv] = key.split(':');
    const m = moveAt(style as Style, Number(lv));
    if (!m) return;
    const tab = G.ui.openTab ?? 'items';
    await showPreview(m);
    // Back to the path you were looking at.
    G.ui.openMenu(menuCtx(), tab);
    G.ui.showPath(style as Style);
  },

  async resetSave() {
    G.mode = 'dialog';
    const r = await G.ui.dialog('<div class="big" style="font-size:24px">Start over?</div><p>All progress will be lost.</p>', [
      ['no', 'Keep playing'],
      ['yes', 'Reset', 'alt'],
    ]);
    if (r !== 'yes') {
      G.mode = 'world';
      return;
    }
    clearState();
    G.restart(newState());
    G.ui.setMode('title');
    G.mode = 'title';
    document.getElementById('btn-continue')!.hidden = true;
  },

  exportReport: (how) => void exportReport(how),

  story() {
    const a = activeStory();
    return a && { icon: a.story.icon, title: a.story.title, label: a.step.label };
  },
  stories: storyLog,

  async patchNotes() {
    const seen = G.save.seenVersion;
    G.save.seenVersion = VERSION;
    persist();
    await G.ui.patchNotes(seen);
    G.ui.openMenu(menuCtx(), 'settings');
  },

  menuClosed() {
    if (G.mode === 'dialog') G.mode = 'world';
    G.input.flush();
    const then = G.afterMenu;
    G.afterMenu = null;
    then?.();
  },
};
