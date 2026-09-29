// What the menu's buttons do: crafting, building, equipping, travel, settings and the play report.
import { GEAR, PROJECTS, POTION_HEAL, TOOLS, zoneById, type ZoneId } from '../data';
import { build, craftGear, craftPotion, craftTool, equip, playerStats, revealed } from '../rules';
import { copyText, shareOrDownload } from '../share';
import { logEvent, reportText, summaryText } from '../stats';
import { clearState, newState } from '../state';
import type { UIHooks } from '../ui';
import { G, menuCtx, paused, persist, showZoneBanner, syncWorld, transition } from './context';
import { VERSION } from '../version';
import { newlyRevealed } from './rewards';
import { activeStory, storyLog } from './stories';
import { progressQuests } from './story';

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
    const s = G.save, g = GEAR[id];
    const current = g.slot === 'charm' ? (s.equip.charm ? GEAR[s.equip.charm] : null) : GEAR[s.equip[g.slot]];
    if (craftGear(s, id) !== 'ok') return;
    logEvent(s, { kind: 'craft', id });
    G.audio.play('craft');
    persist();
    const choice = await G.ui.newGear(g, current);
    if (choice === 'equip' && equip(s, id)) G.audio.play('levelup');
    persist();
    const advanced = await progressQuests();
    if (!advanced) G.ui.openMenu(menuCtx(true), 'forge');
  },

  build(id) {
    const s = G.save, shown = revealed(s);
    if (build(s, id) !== 'ok') return;
    logEvent(s, { kind: 'build', id, lv: s.build[id] });
    G.audio.play('levelup');
    const lvl = PROJECTS[id].levels[s.build[id] - 1];
    const fresh = newlyRevealed(shown).length;
    G.ui.toast(`🏗 Built the ${lvl.name}! ${lvl.perk}${fresh ? ` · ${fresh} new recipe${fresh > 1 ? 's' : ''} in the Forge!` : ''}`, 3600);
    // Upgrades that raise max HP also top you up.
    s.hp = Math.min(playerStats(s).maxHp, s.hp + 10);
    persist();
    syncWorld();
    void progressQuests();
  },

  async craftTool(id) {
    if (craftTool(G.save, id) !== 'ok') return;
    logEvent(G.save, { kind: 'craft', id });
    const t = TOOLS.find((t) => t.id === id)!;
    G.audio.play('craft');
    persist();
    G.ui.closeMenu(true);
    const what = t.skill === 'wood' ? 'Walk up to a tree with a ribbon on it and chop!' : 'Walk up to a rock with a ribbon on it and break it!';
    await paused(() => G.ui.itemFound(t.id, t.name, `${t.desc} ${what}`, t.icon, t.tier === 1 ? 'Good as new' : 'You crafted'));
    void progressQuests();
  },

  craftPotion(id) {
    if (craftPotion(G.save, id) !== 'ok') return;
    G.audio.play('craft');
    persist();
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
    G.save.muted = !G.save.muted;
    G.audio.muted = G.save.muted;
    persist();
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
