// What the menu's buttons do: crafting, building, equipping, travel, settings and the play report.
import { GEAR, PROJECTS, POTION_HEAL, TOOLS, zoneById, type ZoneId } from '../data';
import { build, craftGear, craftPotion, craftTool, equip, playerStats, revealed } from '../rules';
import { buildReport, logEvent } from '../stats';
import { clearState, newState } from '../state';
import type { UIHooks } from '../ui';
import { G, menuCtx, paused, persist, showZoneBanner, syncWorld, transition } from './context';
import { newlyRevealed } from './rewards';
import { progressQuests } from './story';

/** Travel (by warp or fast travel) with an iris transition, landing somewhere safe in the area. */
function travelTo(id: ZoneId) {
  G.ui.closeMenu();
  transition(() => {
    const w = G.world;
    const p = id !== 'village' && zoneById(id).guardian ? w.campPoint(id) : w.entryPoint(id);
    G.over.teleport(p.x, p.y);
    persist();
    showZoneBanner(G.over.currentZone);
  });
}

function exportReport(how: 'download' | 'copy') {
  const json = JSON.stringify(buildReport(G.save), null, 1);
  if (how === 'copy') {
    void navigator.clipboard?.writeText(json).then(() => G.ui.toast('📋 Play report copied'), () => G.ui.toast('Could not copy: try Download'));
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = `sprout-quest-report-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
  a.click();
  G.ui.toast('📊 Play report downloaded');
}

export const menuHooks: UIHooks = {
  save: () => G.save,

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
    await paused(() => G.ui.itemFound(t.id, t.name, `${t.desc} Walk up to a tree with a ribbon on it and chop!`, t.icon, 'You crafted'));
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

  travel: travelTo,
  warpHome: () => travelTo('village'),

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

  exportReport,

  menuClosed() {
    if (G.mode === 'dialog') G.mode = 'world';
    G.input.flush();
  },
};
