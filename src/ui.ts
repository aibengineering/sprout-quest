// DOM-based HUD, menus and dialogs layered over the canvas.
import {
  GEAR, GEAR_ORDER, MATS, MAT_ORDER, MAX_POTIONS, POTION_HEAL, POTION_RECIPES, ZONES,
  type Gear, type MatId, type Recipe, type Slot, type ZoneId,
} from './data';
import { hasMats, playerStats, xpToNext } from './rules';
import type { SaveState } from './state';

export type Tab = 'bag' | 'gear' | 'forge' | 'map' | 'settings';

export interface MenuCtx {
  atForge: boolean;
  inVillage: boolean;
}

export interface UIHooks {
  save(): SaveState;
  craftGear(id: string): void;
  craftPotion(id: string): void;
  equip(id: string): void;
  drink(): void;
  travel(id: ZoneId): void;
  warpHome(): void;
  toggleMute(): void;
  resetSave(): void;
  menuClosed(): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function gearStats(g: Gear): string {
  const parts: string[] = [];
  if (g.atk) parts.push(`ATK +${g.atk}`);
  if (g.def) parts.push(`DEF +${g.def}`);
  if (g.hp) parts.push(`HP +${g.hp}`);
  if (g.spd) parts.push(`SPD +${g.spd}%`);
  if (g.luck) parts.push(`Luck +${Math.round(g.luck * 100)}%`);
  if (g.regen) parts.push('Regen');
  if (g.style) parts.push(g.style[0].toUpperCase() + g.style.slice(1));
  return parts.join(' · ');
}

function recipeChips(s: SaveState, r: Recipe): string {
  return Object.entries(r)
    .map(([m, n]) => {
      const have = s.mats[m as MatId];
      return `<span class="chip ${have >= (n ?? 0) ? '' : 'miss'}">${MATS[m as MatId].icon} ${have}/${n}</span>`;
    })
    .join('');
}

export class UI {
  private modal = $('modal');
  private sheet = this.modal.querySelector('.sheet') as HTMLElement;
  private toastTimer = 0;
  private bannerTimer = 0;
  private tab: Tab = 'bag';
  private ctx: MenuCtx = { atForge: false, inVillage: false };
  private menuOpen = false;
  private resolveDialog: ((v: string) => void) | null = null;
  private last: Record<string, string> = {};

  constructor(private hooks: UIHooks) {
    this.sheet.addEventListener('click', (e) => this.onClick(e));
    this.modal.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  get isOpen() {
    return !this.modal.hidden;
  }

  // ------------------------------------------------------------ HUD

  /** Cheap per-frame setter: only touches the DOM when a value actually changes. */
  private set(key: string, value: string, apply: () => void) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    apply();
  }

  hud(hp: number, zoneName: string) {
    const s = this.hooks.save();
    const st = playerStats(s);
    const hpText = `${Math.ceil(hp)}/${st.maxHp}`;
    this.set('lv', String(s.lv), () => ($('hud-lv').textContent = String(s.lv)));
    this.set('hp', hpText, () => {
      $('hud-hptext').textContent = hpText;
      $('hud-hp').style.width = `${(100 * hp) / st.maxHp}%`;
      $('hud-hp').parentElement!.classList.toggle('low', hp / st.maxHp < 0.3);
    });
    const xpPct = `${Math.min(100, (100 * s.xp) / xpToNext(s.lv))}%`;
    this.set('xp', xpPct, () => ($('hud-xp').style.width = xpPct));
    this.set('zone', zoneName, () => ($('hud-zone').textContent = zoneName));
  }

  battleHud(potions: number, skillFrac: number, dodgeFrac: number, skillName: string, canRun: boolean) {
    this.set('pot', String(potions), () => {
      $('potion-n').textContent = String(potions);
      $('btn-potion').style.opacity = potions > 0 ? '1' : '0.5';
    });
    const sk = skillFrac.toFixed(2), dg = dodgeFrac.toFixed(2);
    this.set('skill', sk, () => ($('btn-skill').querySelector<HTMLElement>('.cd')!.style.setProperty('--p', sk)));
    this.set('dodge', dg, () => ($('btn-dodge').querySelector<HTMLElement>('.cd')!.style.setProperty('--p', dg)));
    this.set('skname', skillName, () => ($('skill-name').textContent = skillName));
    this.set('run', String(canRun), () => ($('btn-run').hidden = !canRun));
  }

  setMode(mode: 'title' | 'world' | 'battle' | 'none') {
    $('title').hidden = mode !== 'title';
    $('hud').hidden = mode === 'title' || mode === 'none';
    $('ctl-world').hidden = mode !== 'world';
    $('ctl-battle').hidden = mode !== 'battle';
    $('hud-zone').style.visibility = mode === 'battle' ? 'hidden' : 'visible';
  }

  setAction(label: string | null) {
    this.set('act', label ?? '', () => {
      const b = $('btn-act');
      b.hidden = !label;
      if (label) b.textContent = label;
    });
  }

  toast(msg: string, ms = 2200) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.remove('show'), ms);
  }

  banner(title: string, sub: string) {
    const b = $('banner');
    b.querySelector('b')!.textContent = title;
    b.querySelector('small')!.textContent = sub;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => b.classList.remove('show'), 2000);
  }

  // ------------------------------------------------------------ Menu

  openMenu(ctx: MenuCtx, tab?: Tab) {
    this.ctx = ctx;
    if (tab) this.tab = tab;
    this.menuOpen = true;
    this.modal.hidden = false;
    this.renderMenu();
  }

  closeMenu() {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.modal.hidden = true;
    this.hooks.menuClosed();
  }

  refresh() {
    if (this.menuOpen) this.renderMenu();
  }

  private renderMenu() {
    const s = this.hooks.save();
    const st = playerStats(s);
    const tabs: [Tab, string][] = [['bag', '🎒 Bag'], ['gear', '🗡️ Gear'], ['forge', '⚒ Forge'], ['map', '🗺️ Map'], ['settings', '⚙️']];
    const scroll = this.sheet.querySelector('.body')?.scrollTop ?? 0;
    this.sheet.innerHTML = `
      <header><h2>Adventurer</h2><button class="x" data-do="close" aria-label="Close">✕</button></header>
      <div class="statline">
        <span>Lv ${s.lv}</span><span>❤️ ${Math.ceil(s.hp)}/${st.maxHp}</span><span>⚔️ ${st.atk}</span>
        <span>🛡️ ${st.def}</span>${st.spd ? `<span>💨 +${st.spd}%</span>` : ''}${st.luck ? `<span>🍀 +${Math.round(st.luck * 100)}%</span>` : ''}
      </div>
      <nav class="tabs">${tabs.map(([id, label]) => `<button data-tab="${id}" class="${this.tab === id ? 'on' : ''}">${label}</button>`).join('')}</nav>
      <div class="body">${this.renderTab(s)}</div>`;
    const body = this.sheet.querySelector('.body');
    if (body) body.scrollTop = scroll;
  }

  private renderTab(s: SaveState): string {
    switch (this.tab) {
      case 'bag': {
        const mats = MAT_ORDER.map((m) => {
          const n = s.mats[m];
          const info = MATS[m];
          return `<div class="mat ${n ? '' : 'empty'}"><div class="ico">${info.icon}</div><b>${n}</b>${esc(info.name)}<small>${esc(info.where)}</small></div>`;
        }).join('');
        const st = playerStats(s);
        return `
          <div class="row"><div class="ico">🧪</div><div class="info"><div class="name">Potions ${s.potions}/${MAX_POTIONS}</div>
            <div class="desc">Heals ${Math.round(POTION_HEAL * 100)}% HP. Brew more at the Forge.</div></div>
            <button class="go" data-do="drink" ${s.potions > 0 && s.hp < st.maxHp ? '' : 'disabled'}>Drink</button></div>
          <h3>Materials</h3><div class="grid">${mats}</div>`;
      }
      case 'gear': {
        const slots: [Slot, string][] = [['weapon', 'Weapon'], ['armor', 'Armor'], ['charm', 'Charm']];
        const cur = slots.map(([slot, label]) => {
          const id = s.equip[slot];
          const g = id ? GEAR[id] : null;
          return `<div class="slot"><span class="ico">${g ? g.icon : '➖'}</span>${g ? esc(g.name) : `No ${label}`}</div>`;
        }).join('');
        const list = slots.map(([slot, label]) => {
          const owned = GEAR_ORDER.filter((id) => GEAR[id].slot === slot && s.owned.includes(id));
          if (!owned.length) return '';
          return `<h3>${label}s</h3>` + owned.map((id) => {
            const g = GEAR[id];
            const on = s.equip[slot] === id;
            const btn = slot === 'charm' && on
              ? `<button class="go alt" data-equip="${id}">Remove</button>`
              : `<button class="go" data-equip="${id}" ${on ? 'disabled' : ''}>${on ? 'Worn' : 'Equip'}</button>`;
            return `<div class="row ${on ? 'on' : ''}"><div class="ico">${g.icon}</div><div class="info"><div class="name">${esc(g.name)}</div>
              <div class="stats">${gearStats(g)}</div><div class="desc">${esc(g.desc)}</div></div>${btn}</div>`;
          }).join('');
        }).join('');
        return `<div class="slots">${cur}</div>${list}`;
      }
      case 'forge': {
        const at = this.ctx.atForge;
        const note = at
          ? `<div class="note">⚒ Welcome to the Forge! Turn monster materials into gear.</div>`
          : `<div class="note">Visit the ⚒ Forge in Sprout Village to craft. Here's what you can make:</div>`;
        const potions = POTION_RECIPES.map((p) => {
          const ok = at && hasMats(s, p.recipe) && s.potions < MAX_POTIONS;
          return `<div class="row"><div class="ico">🧪</div><div class="info"><div class="name">${esc(p.name)}</div>
            <div class="chips">${recipeChips(s, p.recipe)}</div></div>
            <button class="go" data-potion="${p.id}" ${ok ? '' : 'disabled'}>${s.potions >= MAX_POTIONS ? 'Full' : 'Brew'}</button></div>`;
        }).join('');
        const section = (slot: Slot, title: string) => `<h3>${title}</h3>` + GEAR_ORDER
          .filter((id) => GEAR[id].slot === slot && GEAR[id].recipe)
          .map((id) => {
            const g = GEAR[id];
            const owned = s.owned.includes(id);
            const ok = at && !owned && hasMats(s, g.recipe!);
            return `<div class="row"><div class="ico">${g.icon}</div><div class="info"><div class="name">${esc(g.name)}</div>
              <div class="stats">${gearStats(g)}</div><div class="chips">${owned ? '<span class="chip">Owned ✓</span>' : recipeChips(s, g.recipe!)}</div></div>
              ${owned ? '' : `<button class="go" data-craft="${id}" ${ok ? '' : 'disabled'}>Craft</button>`}</div>`;
          }).join('');
        return `${note}<h3>Potions (${s.potions}/${MAX_POTIONS})</h3>${potions}${section('weapon', 'Weapons')}${section('armor', 'Armor')}${section('charm', 'Charms')}`;
      }
      case 'map': {
        const home = this.ctx.inVillage
          ? `<div class="note">🏠 You're in the village. Hop to any area you've already discovered!</div>`
          : `<div class="row"><div class="ico">🏠</div><div class="info"><div class="name">Warp Home</div>
             <div class="desc">Teleport back to Sprout Village to heal and craft.</div></div>
             <button class="go alt" data-do="home">Warp</button></div>`;
        const zones = ZONES.slice(1).map((z) => {
          const seen = s.visited.includes(z.id);
          const canGo = this.ctx.inVillage && seen;
          return `<div class="row"><div class="ico">${seen ? ['🌼', '🌲', '💎', '🌋'][ZONES.indexOf(z) - 1] : '❓'}</div>
            <div class="info"><div class="name">${seen ? esc(z.name) : '???'}</div>
            <div class="desc">Recommended Lv ${z.rec}+ · Monsters Lv ${z.lv[0]}–${z.lv[1]}</div></div>
            ${this.ctx.inVillage ? `<button class="go" data-travel="${z.id}" ${canGo ? '' : 'disabled'}>Go</button>` : ''}</div>`;
        }).join('');
        const boss = s.bossWins
          ? `<div class="note">🐉 Emberwyrm defeated ×${s.bossWins}! You're a hero. Rematch for more scales.</div>`
          : `<div class="note">🐉 Legend says a dragon sleeps at the far end of Ember Peak…</div>`;
        return `${home}<h3>Areas (walk east to discover)</h3>${zones}${boss}`;
      }
      case 'settings':
        return `
          <div class="row"><div class="ico">${s.muted ? '🔇' : '🔊'}</div><div class="info"><div class="name">Sound</div></div>
            <button class="go" data-do="mute">${s.muted ? 'Off' : 'On'}</button></div>
          <h3>How to play</h3>
          <div class="note" style="font-weight:600">
            • Drag anywhere to move.<br>
            • Walk through <b>tall grass</b> to meet monsters.<br>
            • In battle: ⚔️ attack (hold to keep swinging, it auto-aims), 💨 dodge through attacks, ✨ weapon skill, 🧪 potion.<br>
            • Watch for red circles and shaking monsters — that means an attack is coming!<br>
            • Bring materials to the ⚒ Forge to craft better gear, then explore further east.<br>
            • Keyboard: WASD/arrows, J/Space attack, K dodge, L skill, H potion, E interact, M menu.
          </div>
          <div class="row"><div class="ico">🗑️</div><div class="info"><div class="name">Reset save</div><div class="desc">Start over from scratch.</div></div>
            <button class="go alt" data-do="reset">Reset</button></div>`;
    }
  }

  private onClick(e: Event) {
    const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!el || el.disabled) return;
    const d = el.dataset;
    if (d.dialog !== undefined) {
      const r = this.resolveDialog;
      this.resolveDialog = null;
      this.modal.hidden = true;
      r?.(d.dialog);
      return;
    }
    if (d.tab) {
      this.tab = d.tab as Tab;
      this.renderMenu();
      this.sheet.querySelector('.body')!.scrollTop = 0;
    } else if (d.craft) this.hooks.craftGear(d.craft);
    else if (d.potion) this.hooks.craftPotion(d.potion);
    else if (d.equip) this.hooks.equip(d.equip);
    else if (d.travel) this.hooks.travel(d.travel as ZoneId);
    else if (d.do === 'close') this.closeMenu();
    else if (d.do === 'drink') this.hooks.drink();
    else if (d.do === 'home') this.hooks.warpHome();
    else if (d.do === 'mute') this.hooks.toggleMute();
    else if (d.do === 'reset') this.hooks.resetSave();
    this.refresh();
  }

  // ------------------------------------------------------------ Dialogs

  /** Shows a centered dialog; resolves with the chosen button's value. */
  dialog(html: string, buttons: [string, string, string?][]): Promise<string> {
    this.menuOpen = false;
    this.modal.hidden = false;
    const btns = buttons.map(([value, label, cls]) => `<button class="go ${cls ?? ''}" data-dialog="${value}">${label}</button>`).join('');
    this.sheet.innerHTML = `<div class="result">${html}<div class="btns">${btns}</div></div>`;
    return new Promise((res) => (this.resolveDialog = res));
  }

  message(title: string, text: string) {
    return this.dialog(`<div class="big" style="font-size:24px">${esc(title)}</div><p>${esc(text)}</p>`, [['ok', 'OK']]);
  }

  result(o: { win: boolean; xp: number; levels: number; newLv: number; drops: Partial<Record<MatId, number>>; boss: boolean }) {
    let html: string;
    if (o.win) {
      const drops = Object.entries(o.drops).map(([m, n]) => `<span class="chip">${MATS[m as MatId].icon} ${esc(MATS[m as MatId].name)} ×${n}</span>`).join('');
      html = `<div class="big">${o.boss ? '🐉 Dragon defeated!' : 'Victory! ✨'}</div>
        <div class="sub">+${o.xp} XP</div>
        ${o.levels ? `<div class="lvup">⬆ Level up! Now Lv ${o.newLv}</div>` : ''}
        ${drops ? `<div class="chips">${drops}</div>` : '<p>No materials this time.</p>'}
        ${o.boss ? '<p>You are the hero of Sprout Village! Craft Wyrmfang and Dragon Mail from its scales.</p>' : ''}`;
    } else {
      html = `<div class="big">Oops! 💫</div><p>You fainted… a kind villager carried you home.<br>You're rested and ready to go again!</p>`;
    }
    return this.dialog(html, [['ok', 'Continue']]);
  }
}
