// DOM-based HUD, menus and dialogs layered over the canvas.
import { iconUrl } from './assets';
import {
  GEAR, GEAR_ORDER, MATS, MAT_ORDER, MAX_POTIONS, MONSTERS, POTION_HEAL, POTION_RECIPES, PROJECTS, PROJECT_ORDER, QUESTS, SKILL_MAX, SKILL_NAMES,
  TOOLS, ZONES, forgeLevelFor, type SkillId, type Gear, type MatId, type MonsterKind, type ProjectId, type Quest, type Recipe, type Slot, type ZoneId,
} from './data';
import { currentQuest, progress } from './quests';
import { canBuild, hasMats, missingSkill, playerStats, skillXpToNext, xpToNext } from './rules';
import type { SaveState } from './state';
import type { Unlock, UnlockId } from './unlocks';
import { usingKeyboard } from './input';

/** Which unlock reveals each menu tab (settings is always there). */
const TAB_UNLOCK: Partial<Record<Tab, UnlockId>> = { journey: 'journal', items: 'bag', forge: 'forge', village: 'village' };

export type Tab = 'journey' | 'items' | 'forge' | 'village' | 'settings';

export interface MenuCtx {
  atForge: boolean;
  inVillage: boolean;
}

export interface UIHooks {
  save(): SaveState;
  craftGear(id: string): void;
  craftTool(id: string): void;
  craftPotion(id: string): void;
  equip(id: string): void;
  build(id: ProjectId): void;
  drink(): void;
  travel(id: ZoneId): void;
  warpHome(): void;
  toggleMute(): void;
  resetSave(): void;
  menuClosed(): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ZONE_EMOJI: Record<ZoneId, string> = { glade: '🌳', village: '🏡', meadow: '🌼', woods: '🌲', cave: '💎', peak: '🌋' };
const STYLE_NAMES: Record<string, string> = { sword: 'Sword', spear: 'Spear', axe: 'Axe', hammer: 'Hammer', wand: 'Wand' };

/** Blender-rendered icon with the emoji as a fallback if the image is missing. */
export function icon(id: string, emoji: string, cls = 'icon') {
  return `<img class="${cls}" src="${iconUrl(id)}" alt="" onerror="this.outerHTML='${emoji}'">`;
}

export function gearStats(g: Gear): string {
  const parts: string[] = [];
  if (g.atk) parts.push(`ATK +${g.atk}`);
  if (g.def) parts.push(`DEF +${g.def}`);
  if (g.hp) parts.push(`HP +${g.hp}`);
  if (g.spd) parts.push(`SPD +${g.spd}%`);
  if (g.luck) parts.push(`Luck +${Math.round(g.luck * 100)}%`);
  if (g.regen) parts.push('Regen');
  return parts.join(' · ');
}

const stars = (g: Gear) => (g.slot === 'weapon' ? `<span class="stars">${STYLE_NAMES[g.style!]} ${'★'.repeat(g.tier ?? 0) || '☆'}</span>` : '');

function costChips(s: SaveState, r: Recipe): string {
  return Object.entries(r)
    .map(([m, n]) => {
      const have = s.mats[m as MatId];
      return `<span class="chip ${have >= (n ?? 0) ? 'ok' : 'miss'}">${icon(m, MATS[m as MatId].icon, 'icon sm')}<b>${have}</b>/${n}</span>`;
    })
    .join('');
}

const bossIcon = (k: MonsterKind, cls = 'icon') => icon(`boss_${k}`, MONSTERS[k].boss ? '👑' : '👾', cls);

function goalIcon(q: Quest): string {
  const g = q.goal;
  if (g.type === 'boss') return bossIcon(g.kind, 'icon xl');
  if (g.type === 'build') return icon(`b_${g.project === 'forge' ? ['forge', 'forge2', 'forge3'][g.level - 1] : g.project + g.level}`, PROJECTS[g.project].icon, 'icon xl');
  if (g.type === 'kills') return icon('goo', '⚔️', 'icon xl');
  if (g.type === 'craft') return icon('jelly', '⚒', 'icon xl');
  return icon('npc_elder', '🌿', 'icon xl');
}

function buildingIcon(id: ProjectId, level: number): string {
  if (level === 0) return icon(id === 'warp' ? 'b_warp0' : 'b_plot', PROJECTS[id].icon, 'icon lg');
  const name = id === 'forge' ? ['forge', 'forge2', 'forge3'][level - 1] : `${id}${level}`;
  return icon(`b_${name}`, PROJECTS[id].icon, 'icon lg');
}

export class UI {
  private modal = $('modal');
  private sheet = this.modal.querySelector('.sheet') as HTMLElement;
  private toastTimer = 0;
  private bannerTimer = 0;
  private tab: Tab = 'journey';
  private sub: Record<string, string> = { forge: 'weapon' };
  private unlockQueue: Unlock[] = [];
  private unlockShowing = false;
  private focus: string | undefined;
  private ctx: MenuCtx = { atForge: false, inVillage: false };
  private menuOpen = false;
  private resolveDialog: ((v: string) => void) | null = null;
  private last: Record<string, string> = {};
  /**
   * Whether a touch has started inside the current sheet. A tap on a HUD button opens the menu while the finger is
   * still down; when it lifts, the browser fires a "click" at that spot, which would hit whatever tab or button just
   * appeared under it (e.g. "More" under the bottom-right action button). Only clicks that began on the sheet count.
   */
  private armed = false;

  constructor(private hooks: UIHooks) {
    this.sheet.addEventListener('click', (e) => this.onClick(e));
    this.modal.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.armed = true;
    });
    window.addEventListener('keydown', (e) => this.onKey(e), true);
    // Tapping outside the menu sheet closes it (dialogs still need an explicit choice).
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal && this.menuOpen && this.armed) this.closeMenu();
    });
    // Swipe the menu down from its header to dismiss it.
    let startY: number | null = null;
    this.sheet.addEventListener('pointerdown', (e) => {
      const onHead = (e.target as HTMLElement).closest('.mhead, .grab, .statrow');
      startY = this.menuOpen && onHead ? e.clientY : null;
    });
    this.sheet.addEventListener('pointermove', (e) => {
      if (startY === null) return;
      const dy = Math.max(0, e.clientY - startY);
      this.sheet.style.transform = `translateY(${dy}px)`;
      if (dy > 90) {
        startY = null;
        this.sheet.style.transform = '';
        this.closeMenu();
      }
    });
    const endSwipe = () => {
      startY = null;
      this.sheet.style.transform = '';
    };
    this.sheet.addEventListener('pointerup', endSwipe);
    this.sheet.addEventListener('pointercancel', endSwipe);
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

  /** The little "current goal" tracker under the HUD. */
  questPill(show: boolean) {
    const s = this.hooks.save();
    const q = currentQuest(s);
    if (!show || !q) {
      this.set('pill', 'hidden', () => ($('quest-pill').hidden = true));
      return;
    }
    const p = progress(s, q);
    const count = p.max > 1 ? `${p.cur}/${p.max}` : '';
    const text = `${q.id}|${count}`;
    this.set('pill', text, () => {
      const el = $('quest-pill');
      el.hidden = false;
      el.innerHTML = `<span class="qi">📜</span><span class="qt"><b>${esc(q.title)}</b><small>${esc(q.hint)}</small></span>${count ? `<span class="qc">${count}</span>` : ''}`;
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    });
  }

  /** Hides battle buttons the player hasn't learned about yet. */
  battleButtons(skill: boolean, potion: boolean) {
    this.set('bb', `${skill}|${potion}`, () => {
      $('btn-skill').hidden = !skill;
      $('btn-potion').hidden = !potion;
    });
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

  /** Corner shortcut buttons (📜 journal, 🎒 bag), shown once unlocked, with a dot for anything new. */
  dock(show: boolean) {
    const s = this.hooks.save();
    const j = show && s.unlocked.includes('journal'), b = show && s.unlocked.includes('bag');
    const jDot = s.fresh.includes('journal'), bDot = s.fresh.some((f) => f === 'bag' || f === 'forge' || f === 'village');
    this.set('dock', `${j}${b}${jDot}${bDot}`, () => {
      $('btn-journal').hidden = !j;
      $('btn-bag').hidden = !b;
      $('btn-journal').classList.toggle('has-dot', jDot);
      $('btn-bag').classList.toggle('has-dot', bDot);
    });
  }

  /** A friendly non-blocking card announcing a newly unlocked system. */
  unlockCard(u: Unlock) {
    this.unlockQueue.push(u);
    if (!this.unlockShowing) this.nextUnlock();
  }

  private nextUnlock() {
    const u = this.unlockQueue.shift();
    const el = $('unlock-card');
    if (!u) {
      this.unlockShowing = false;
      el.classList.remove('show');
      window.setTimeout(() => { if (!this.unlockShowing) el.hidden = true; }, 300);
      return;
    }
    this.unlockShowing = true;
    el.hidden = false;
    const key = u.key && usingKeyboard() ? `<p class="u-key">⌨️ Shortcut: <kbd>${u.key}</kbd></p>` : '';
    el.innerHTML = `<div class="u-ico">${u.icon}</div><div><div class="u-new">✨ New unlocked</div><b>${esc(u.title)}</b><p>${esc(u.text)}</p>${key}</div>`;
    requestAnimationFrame(() => el.classList.add('show'));
    window.setTimeout(() => {
      el.classList.remove('show');
      window.setTimeout(() => this.nextUnlock(), 350);
    }, 4800);
  }

  /** Tutorial bubble pointing at a button (or centered on screen). */
  coach(text: string | null, anchorId?: string) {
    this.set('coach', `${text}|${anchorId}`, () => {
      const el = $('coach');
      document.querySelectorAll('.coached').forEach((b) => b.classList.remove('coached'));
      if (!text) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.textContent = text;
      el.className = 'coach';
      const anchor = anchorId ? document.getElementById(anchorId) : null;
      if (anchor) {
        anchor.classList.add('coached');
        const r = anchor.getBoundingClientRect();
        el.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
        el.style.bottom = `${window.innerHeight - r.top + 14}px`;
        el.style.left = 'auto';
        el.style.top = 'auto';
        el.classList.add('above');
      } else {
        el.style.left = '50%';
        el.style.right = 'auto';
        el.style.top = '38%';
        el.style.bottom = 'auto';
        el.classList.add('center');
      }
    });
  }

  dragHint(show: boolean) {
    this.set('drag', String(show), () => ($('drag-hint').hidden = !show));
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
      if (label) b.innerHTML = `${esc(label)}<kbd class="key">E</kbd>`;
    });
  }

  /**
   * Keyboard control for anything shown in the modal. Runs in the capture phase and swallows the keys it uses, so
   * e.g. the Enter that confirms a dialog doesn't also reach the game as "interact" a frame later.
   */
  private onKey(e: KeyboardEvent) {
    if (this.modal.hidden || e.repeat) return;
    const k = e.code;
    const swallow = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    if (this.resolveDialog) {
      const btns = [...this.sheet.querySelectorAll<HTMLButtonElement>('[data-dialog]')];
      const primary = btns[btns.length - 1], secondary = btns.length > 1 ? btns[0] : null;
      if (k === 'Enter' || k === 'Space' || k === 'KeyE' || k === 'NumpadEnter') {
        swallow();
        this.armed = true;
        primary?.click();
      } else if (k === 'Escape' && secondary) {
        swallow();
        this.armed = true;
        secondary.click();
      } else if (k === 'Escape') swallow();
      return;
    }
    if (!this.menuOpen) return;
    const tabs = [...this.sheet.querySelectorAll<HTMLButtonElement>('[data-tab]')];
    const idx = tabs.findIndex((t) => t.dataset.tab === this.tab);
    const go = (i: number) => {
      const t = tabs[(i + tabs.length) % tabs.length];
      if (!t) return;
      this.tab = t.dataset.tab as Tab;
      this.focus = undefined;
      this.renderMenu(true);
    };
    if (k === 'Escape' || k === 'KeyM' || (k === 'KeyB' && this.tab === 'items') || (k === 'KeyQ' && this.tab === 'journey')) {
      swallow();
      this.closeMenu();
    } else if (k === 'KeyB' && this.tabOpen('items')) {
      swallow();
      go(tabs.findIndex((t) => t.dataset.tab === 'items'));
    } else if (k === 'KeyQ' && this.tabOpen('journey')) {
      swallow();
      go(tabs.findIndex((t) => t.dataset.tab === 'journey'));
    } else if (k === 'ArrowRight' || k === 'KeyD' || k === 'Tab') {
      swallow();
      go(idx + (e.shiftKey && k === 'Tab' ? -1 : 1));
    } else if (k === 'ArrowLeft' || k === 'KeyA') {
      swallow();
      go(idx - 1);
    } else if (/^Digit[1-9]$/.test(k)) {
      swallow();
      go(Number(k.slice(5)) - 1);
    } else if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'KeyS' || k === 'KeyW') {
      swallow();
      this.sheet.querySelector('.body')?.scrollBy({ top: k === 'ArrowDown' || k === 'KeyS' ? 120 : -120, behavior: 'smooth' });
    } else if (k === 'KeyE' || k === 'KeyJ' || k === 'Space' || k === 'Enter' || k === 'KeyK' || k === 'KeyL' || k === 'KeyH' || k === 'KeyR') {
      swallow(); // don't let gameplay keys leak through while the menu is up
    }
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

  private tabOpen(t: Tab) {
    const key = TAB_UNLOCK[t];
    return !key || this.hooks.save().unlocked.includes(key);
  }

  openMenu(ctx: MenuCtx, tab?: Tab, focus?: string) {
    this.ctx = ctx;
    if (tab) this.tab = tab;
    if (!this.tabOpen(this.tab)) this.tab = (['items', 'journey', 'forge', 'village'] as Tab[]).find((t) => this.tabOpen(t)) ?? 'settings';
    this.focus = focus;
    this.menuOpen = true;
    this.armed = false;
    this.modal.hidden = false;
    this.renderMenu(true);
  }

  /** `silent` closes without notifying the game (used when a story dialog takes over). */
  closeMenu(silent = false) {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.modal.hidden = true;
    if (!silent) this.hooks.menuClosed();
  }

  refresh() {
    if (this.menuOpen) this.renderMenu(false);
  }

  private renderMenu(fresh: boolean) {
    const s = this.hooks.save();
    const st = playerStats(s);
    const tabs = ([
      ['journey', '📜', 'Journal'], ['items', '🎒', 'Bag'], ['forge', '⚒', 'Forge'], ['village', '🏡', 'Village'], ['settings', '⚙️', 'More'],
    ] as [Tab, string, string][]).filter(([t]) => this.tabOpen(t));
    // Looking at a tab clears its "new" dot.
    const seenKey = TAB_UNLOCK[this.tab];
    if (seenKey) s.fresh = s.fresh.filter((f) => f !== seenKey);
    const dot = (t: Tab) => (TAB_UNLOCK[t] && s.fresh.includes(TAB_UNLOCK[t]!) ? '<i class="dot on"></i>' : '');
    const scroll = fresh ? 0 : this.sheet.querySelector('.body')?.scrollTop ?? 0;
    this.sheet.className = 'sheet menu';
    this.sheet.innerHTML = `
      <div class="grab" aria-hidden="true"></div>
      <header class="mhead">
        <div class="portrait">${icon(s.equip.armor, '🌱')}</div>
        <div class="who">
          <div class="name">Sprout <span class="lvl">Lv ${s.lv}</span></div>
          <div class="mini hp"><i style="width:${(100 * s.hp) / st.maxHp}%"></i><span>${Math.ceil(s.hp)} / ${st.maxHp} HP</span></div>
          <div class="mini xp"><i style="width:${Math.min(100, (100 * s.xp) / xpToNext(s.lv))}%"></i></div>
        </div>
      </header>
      <div class="statrow"><span>⚔️ <b>${st.atk}</b></span><span>🛡️ <b>${st.def}</b></span><span>🧪 <b>${s.potions}/${MAX_POTIONS}</b></span>${
        st.spd ? `<span>💨 <b>+${st.spd}%</b></span>` : ''}${st.luck ? `<span>🍀 <b>+${Math.round(st.luck * 100)}%</b></span>` : ''}</div>
      <div class="body">${this.renderTab(s)}</div>
      <nav class="tabbar" style="grid-template-columns:auto repeat(${tabs.length},1fr)"><button class="tab-close" data-do="close" aria-label="Close menu"><span>✕</span>Close<kbd class="key">Esc</kbd></button>${tabs.map(([id, ico, label], i) => `<button data-tab="${id}" class="${this.tab === id ? 'on' : ''}"><span>${ico}</span>${label}${dot(id)}<kbd class="key">${i + 1}</kbd></button>`).join('')}</nav>`;
    const body = this.sheet.querySelector('.body') as HTMLElement;
    body.scrollTop = scroll;
    if (fresh && this.focus) {
      const el = body.querySelector(`[data-focus="${this.focus}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: 'center' });
      el?.classList.add('flash');
    }
  }

  private seg(tab: string, options: [string, string][]) {
    return `<div class="seg">${options.map(([id, label]) => `<button data-sub="${tab}:${id}" class="${this.sub[tab] === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
  }

  private renderTab(s: SaveState): string {
    switch (this.tab) {
      case 'journey':
        return this.journey(s);
      case 'items':
        return this.items(s);
      case 'forge':
        return this.forge(s);
      case 'village':
        return this.village(s);
      case 'settings':
        return this.settings(s);
    }
  }

  private journey(s: SaveState): string {
    const q = currentQuest(s);
    let card = '';
    if (q) {
      const p = progress(s, q);
      const rewards = [
        ...Object.entries(q.reward?.mats ?? {}).map(([m, n]) => `<span class="chip ok">${icon(m, MATS[m as MatId].icon, 'icon sm')}×${n}</span>`),
        ...(q.reward?.potions ? [`<span class="chip ok">🧪×${q.reward.potions}</span>`] : []),
      ].join('');
      card = `
        <section class="qcard">
          <div class="qtop"><div class="qart">${goalIcon(q)}</div>
            <div><div class="qchap">${esc(q.chapter)}</div><div class="qtitle">${esc(q.title)}</div></div></div>
          <p class="qtext">“${esc(q.text)}”</p>
          <div class="qgoal"><span>🎯 ${esc(p.label)}</span><b>${p.cur}/${p.max}</b></div>
          <div class="pbar"><i style="width:${(100 * p.cur) / p.max}%"></i></div>
          ${rewards ? `<div class="qrew">Reward ${rewards}</div>` : ''}
        </section>`;
    } else {
      card = `<section class="qcard done"><div class="qtitle">🌟 All chapters complete!</div><p class="qtext">Sprout Village is safe. Keep building, crafting and rematching bosses!</p></section>`;
    }
    const warp = s.build.warp > 0;
    const here = this.ctx.inVillage;
    const zones = ZONES.filter((z) => z.id !== 'glade').map((z) => {
      const g = z.guardian;
      const beaten = !g || s.bosses.includes(g.kind);
      const seen = s.visited.includes(z.id);
      const reachable = z.id === 'village' || (beaten && (seen || !g));
      let status: string;
      if (z.id === 'village') status = 'Home sweet home';
      else if (!beaten) status = `🔒 Guarded by ${MONSTERS[g!.kind].name} · Lv ${g!.lv}`;
      else if (g) status = `🔥 Campfire lit · Monsters Lv ${z.lv[0]}–${z.lv[1]}`;
      else status = `Monsters Lv ${z.lv[0]}–${z.lv[1]}`;
      const art = !beaten ? bossIcon(g!.kind) : `<span class="emo">${ZONE_EMOJI[z.id]}</span>`;
      const btn = warp && reachable && !(z.id === 'village' && here) ? `<button class="go sm" data-travel="${z.id}">Warp</button>` : '';
      return `<div class="zrow ${beaten ? '' : 'locked'}"><div class="zart">${art}</div><div class="info"><div class="name">${esc(z.name)}</div><div class="desc">${status}</div></div>${btn}</div>`;
    }).join('');
    const warpNote = warp ? '' : `<div class="note">🔮 Build the <b>Warp Stone</b> in the village to fast travel between campfires.</div>`;
    const home = here ? '' : `<button class="wide go alt" data-do="home">🏠 Warp home to Sprout Village</button>`;
    const chapters = QUESTS.map((qq, i) => {
      const st = i < s.quest ? 'done' : i === s.quest ? 'now' : 'later';
      const mark = st === 'done' ? '✓' : st === 'now' ? '▶' : '🔒';
      return `<li class="${st}"><span class="mk">${mark}</span><span class="ch">${esc(qq.chapter)}</span><span>${st === 'later' ? '???' : esc(qq.title)}</span></li>`;
    }).join('');
    return `${card}<h3>World map</h3>${warpNote}<div class="zones">${zones}</div>${home}<h3>Story</h3><ol class="chapters">${chapters}</ol>`;
  }

  private items(s: SaveState): string {
    const st = playerStats(s);
    const slots: [Slot, string][] = [['weapon', 'Weapon'], ['armor', 'Armor'], ['charm', 'Charm']];
    const cur = slots.map(([slot, label]) => {
      const id = s.equip[slot];
      const g = id ? GEAR[id] : null;
      return `<div class="slot"><small>${label}</small>${g ? icon(g.id, g.icon) : '<span class="emo">➖</span>'}<span>${g ? esc(g.name) : 'None'}</span></div>`;
    }).join('');
    const owned = GEAR_ORDER.filter((id) => s.owned.includes(id));
    const cards = owned.map((id) => {
      const g = GEAR[id];
      const on = s.equip[g.slot] === id;
      return `<button class="gcard ${on ? 'on' : ''}" data-equip="${id}" ${on && g.slot !== 'charm' ? 'disabled' : ''}>
        ${on ? '<span class="badge-on">Equipped</span>' : ''}${icon(g.id, g.icon, 'icon lg')}
        <span class="name">${esc(g.name)}</span>${stars(g)}<span class="stats">${gearStats(g)}</span></button>`;
    }).join('');
    const gearHint = owned.length <= 2 && s.unlocked.includes('forge')
      ? `<div class="note">⚒ Craft new gear at the Forge, then equip it here (or right from the Forge).</div>` : '';
    const mats = MAT_ORDER.filter((m) => s.mats[m] > 0).map((m) => {
      const n = s.mats[m];
      return `<div class="mat"><div class="ico">${icon(m, MATS[m].icon)}</div><b>${n}</b><span>${esc(MATS[m].name)}</span><small>${esc(MATS[m].where)}</small></div>`;
    }).join('');
    return `
      <h3>Wearing</h3><div class="slots">${cur}</div>
      <h3>Gear <small>tap to equip</small></h3>${gearHint}<div class="ggrid">${cards}</div>
      <h3>Potions</h3>
      <div class="mcard row"><div class="ico">🧪</div><div class="info"><div class="name">${s.potions}/${MAX_POTIONS} potions</div>
        <div class="desc">Heals ${Math.round(POTION_HEAL * 100)}% HP. Free refills at the village fountain.</div></div>
        <button class="go" data-do="drink" ${s.potions > 0 && s.hp < st.maxHp ? '' : 'disabled'}>Drink</button></div>
      ${this.skills(s)}
      <h3>Materials</h3>${mats ? `<div class="grid">${mats}</div>` : '<p class="sub">Defeat monsters to collect materials.</p>'}`;
  }

  private skills(s: SaveState): string {
    // Hidden until you own a tool, so new players aren't shown a skill they can't use yet.
    const rows = (Object.keys(SKILL_NAMES) as SkillId[]).filter((k) => s.tools[k] > 0).map((k) => {
      const sk = s.skills[k];
      const tool = TOOLS.filter((t) => t.skill === k && t.tier <= s.tools[k]).pop()!;
      const max = sk.lv >= SKILL_MAX;
      const need = skillXpToNext(sk.lv);
      return `<div class="mcard row"><div class="ico">${icon(tool.id, tool.icon)}</div><div class="info">
        <div class="name">${SKILL_NAMES[k]} <span class="lvl">Lv ${sk.lv}</span></div>
        <div class="desc">${esc(tool.name)} · ${max ? 'Mastered!' : `${sk.xp}/${need} XP`}</div>
        <div class="pbar"><i style="width:${max ? 100 : (100 * sk.xp) / need}%"></i></div></div></div>`;
    }).join('');
    return rows ? `<h3>Skills</h3>${rows}` : '';
  }

  private forge(s: SaveState): string {
    const flv = s.build.forge;
    const at = this.ctx.atForge;
    const level = PROJECTS.forge.levels[flv - 1];
    const note = at
      ? `<div class="note">⚒ <b>${esc(level.name)}</b> (Lv ${flv}): ${esc(level.perk)}. Upgrade it in the Village tab.</div>`
      : `<div class="note">📍 Visit the ⚒ Forge in Sprout Village to craft. You can plan here.</div>`;
    const seg = this.seg('forge', [['weapon', 'Weapons'], ['armor', 'Armor'], ['charm', 'Charms'], ['tool', 'Tools'], ['potion', 'Potions']]);
    if (this.sub.forge === 'tool') {
      const cards = TOOLS.map((t) => {
        const owned = s.tools[t.skill] >= t.tier;
        const locked = s.skills[t.skill].lv < t.level;
        let action: string;
        if (owned) action = '<span class="tag">✓ Owned</span>';
        else if (locked) action = `<span class="tag lock">🔒 ${SKILL_NAMES[t.skill]} ${t.level}</span>`;
        else action = `<button class="go" data-tool="${t.id}" ${at && hasMats(s, t.recipe) ? '' : 'disabled'}>Craft</button>`;
        return `<div class="mcard rcp ${locked ? 'locked' : ''} ${owned ? 'owned' : ''}"><div class="ico">${icon(t.id, t.icon, 'icon lg')}</div>
          <div class="info"><div class="name">${esc(t.name)} <span class="stars">${'★'.repeat(t.tier)}</span></div>
          <div class="desc">${esc(t.desc)}</div>${owned || locked ? '' : `<div class="chips">${costChips(s, t.recipe)}</div>`}</div>${action}</div>`;
      }).join('');
      return `${note}${seg}<p class="sub">Tools are used automatically. Walk up to a glowing tree to chop it, or a glowing rock to mine it.</p>${cards}`;
    }
    if (this.sub.forge === 'potion') {
      const cards = POTION_RECIPES.map((p) => {
        const ok = at && hasMats(s, p.recipe) && s.potions < MAX_POTIONS;
        return `<div class="mcard rcp"><div class="ico">🧪</div><div class="info"><div class="name">${esc(p.name)}</div>
          <div class="chips">${costChips(s, p.recipe)}</div></div>
          <button class="go" data-potion="${p.id}" ${ok ? '' : 'disabled'}>${s.potions >= MAX_POTIONS ? 'Full' : 'Brew'}</button></div>`;
      }).join('');
      return `${note}${seg}<p class="sub">You carry ${s.potions}/${MAX_POTIONS} potions.</p>${cards}`;
    }
    const cards = GEAR_ORDER.filter((id) => GEAR[id].slot === this.sub.forge && GEAR[id].recipe).map((id) => {
      const g = GEAR[id];
      const owned = s.owned.includes(id);
      const need = forgeLevelFor(g);
      const skillLock = missingSkill(s, g.needs);
      const skillLocked = !!skillLock;
      const locked = flv < need || skillLocked;
      let action: string;
      if (owned) action = s.equip[g.slot] === id ? '<span class="tag">✓ Equipped</span>' : `<button class="go ghost" data-equip="${id}">Equip</button>`;
      else if (flv < need) action = `<span class="tag lock">🔒 ${esc(PROJECTS.forge.levels[need - 1].name)}</span>`;
      else if (skillLock) action = `<span class="tag lock">🔒 ${SKILL_NAMES[skillLock.skill]} ${skillLock.level}</span>`;
      else action = `<button class="go" data-craft="${id}" ${at && hasMats(s, g.recipe!) ? '' : 'disabled'}>Craft</button>`;
      return `<div class="mcard rcp ${locked ? 'locked' : ''} ${owned ? 'owned' : ''}"><div class="ico">${icon(g.id, g.icon, 'icon lg')}</div>
        <div class="info"><div class="name">${esc(g.name)} ${stars(g)}</div><div class="stats">${gearStats(g)}</div>
        <div class="desc">${esc(g.desc)}</div>${owned || locked ? '' : `<div class="chips">${costChips(s, g.recipe!)}</div>`}</div>${action}</div>`;
    }).join('');
    return `${note}${seg}${cards}`;
  }

  private village(s: SaveState): string {
    const here = this.ctx.inVillage;
    const note = here
      ? `<div class="note">🏗 Build and upgrade to grow stronger. Trophies from guardians unlock the best upgrades!</div>`
      : `<div class="note">📍 Return to Sprout Village to build. You can plan here.</div>`;
    const cards = PROJECT_ORDER.map((id) => {
      const p = PROJECTS[id];
      const lv = s.build[id];
      const max = p.levels.length;
      const pips = Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      const current = lv ? `<div class="desc">Now: <b>${esc(p.levels[lv - 1].name)}</b> · ${esc(p.levels[lv - 1].perk)}</div>` : '<div class="desc">Not built yet</div>';
      let next = '<div class="tag">✨ Fully built</div>';
      if (lv < max) {
        const nl = p.levels[lv];
        const ok = here && canBuild(s, id) === 'ok';
        next = `<div class="next"><div class="desc">Next: <b>${esc(nl.name)}</b> · ${esc(nl.perk)}</div>
          <div class="chips">${costChips(s, nl.cost)}</div>
          <button class="go wide" data-build="${id}" ${ok ? '' : 'disabled'}>${lv ? 'Upgrade' : 'Build'} ${esc(nl.name)}</button></div>`;
      }
      return `<div class="mcard bcard" data-focus="${id}"><div class="btop"><div class="ico">${buildingIcon(id, lv)}</div>
        <div class="info"><div class="name">${esc(p.name)} <span class="pips">${pips}</span></div>${current}</div></div>${next}</div>`;
    }).join('');
    return `${note}${cards}`;
  }

  private settings(s: SaveState): string {
    return `
      <div class="mcard row"><div class="ico">${s.muted ? '🔇' : '🔊'}</div><div class="info"><div class="name">Sound</div></div>
        <button class="go" data-do="mute">${s.muted ? 'Off' : 'On'}</button></div>
      <h3>How to play</h3>
      <div class="note" style="font-weight:600;line-height:1.5">
        • Drag anywhere to move. Walk through <b>tall grass</b> to meet monsters.<br>
        • Follow the 📜 goal at the top of the screen. Elder Bloom has hints!<br>
        • <b>Guardians</b> block the roads. Beat them to open the way and light a 🔥 campfire checkpoint.<br>
        • In battle: ⚔️ attack the way you last moved (hold to combo), 💨 dodge, ✨ weapon skill, 🧪 potion. Red circles mean danger!<br>
        • Craft gear at the ⚒ Forge and build up the 🏡 Village for permanent boosts.<br>
        • Craft an axe (Forge → Tools) and chop ribboned trees: strike when the marker is in the green. Trees out in the grass give more.<br>
        • Keyboard: WASD/arrows, J/Space attack, K dodge, L skill, H potion, E interact, M menu.
      </div>
      <div class="mcard row"><div class="ico">🗑️</div><div class="info"><div class="name">Reset save</div><div class="desc">Start over from scratch.</div></div>
        <button class="go alt" data-do="reset">Reset</button></div>`;
  }

  private onClick(e: Event) {
    if (!this.armed) return;
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
      this.focus = undefined;
      this.renderMenu(true);
      return;
    }
    if (d.sub) {
      const [tab, id] = d.sub.split(':');
      this.sub[tab] = id;
      this.renderMenu(true);
      return;
    }
    if (d.craft) this.hooks.craftGear(d.craft);
    else if (d.tool) this.hooks.craftTool(d.tool);
    else if (d.potion) this.hooks.craftPotion(d.potion);
    else if (d.equip) this.hooks.equip(d.equip);
    else if (d.build) this.hooks.build(d.build as ProjectId);
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
  dialog(html: string, buttons: [string, string, string?][], cls = ''): Promise<string> {
    this.menuOpen = false;
    this.armed = false;
    this.modal.hidden = false;
    this.sheet.className = `sheet ${cls}`;
    const btns = buttons.map(([value, label, c], i) => {
      const cap = i === buttons.length - 1 ? 'Enter' : i === 0 ? 'Esc' : '';
      return `<button class="go ${c ?? ''}" data-dialog="${value}">${label}${cap ? `<kbd class="key">${cap}</kbd>` : ''}</button>`;
    }).join('');
    this.sheet.innerHTML = `<div class="result">${html}<div class="btns">${btns}</div></div>`;
    return new Promise((res) => (this.resolveDialog = res));
  }

  message(title: string, text: string) {
    return this.dialog(`<div class="big" style="font-size:24px">${esc(title)}</div><p>${esc(text)}</p>`, [['ok', 'OK']]);
  }

  elderSays(text: string, hint?: string) {
    return this.dialog(
      `<div class="speaker">${icon('npc_elder', '🌿', 'icon xl')}<b>Elder Bloom</b></div>
       <div class="bubble">${esc(text)}</div>${hint ? `<div class="hint">🎯 ${esc(hint)}</div>` : ''}`,
      [['ok', 'Got it!']],
    );
  }

  questComplete(q: Quest) {
    const rewards = [
      ...Object.entries(q.reward?.mats ?? {}).map(([m, n]) => `<span class="chip ok">${icon(m, MATS[m as MatId].icon, 'icon sm')} ${esc(MATS[m as MatId].name)} ×${n}</span>`),
      ...(q.reward?.potions ? [`<span class="chip ok">🧪 Potion ×${q.reward.potions}</span>`] : []),
    ].join('');
    return this.dialog(
      `<div class="confetti">${'🎉✨🌟🎊'.repeat(3)}</div>
       <div class="qchap">${esc(q.chapter)} complete!</div>
       <div class="big">${esc(q.title)}</div>
       ${rewards ? `<div class="chips">${rewards}</div>` : '<p>Great job, little sprout!</p>'}`,
      [['ok', 'Hooray!']],
      'celebrate',
    );
  }

  questIntro(q: Quest) {
    return this.dialog(
      `<div class="qchap">📜 ${esc(q.chapter)} · New goal</div>
       <div class="qart big-art">${goalIcon(q)}</div>
       <div class="big" style="font-size:26px">${esc(q.title)}</div>
       <div class="speaker small">${icon('npc_elder', '🌿', 'icon sm')}<b>Elder Bloom</b></div>
       <div class="bubble">${esc(q.text)}</div>
       <div class="hint">🎯 ${esc(q.hint)}</div>`,
      [['ok', "Let's go!"]],
    );
  }

  /** Letterbox bars for cutscenes. */
  cinema(on: boolean) {
    document.body.classList.toggle('cinema', on);
  }

  /** A story caption along the bottom of the screen; the world stays visible behind it. */
  async caption(text: string, speaker: 'elder' | 'narrator') {
    this.modal.classList.add('cine');
    const who = speaker === 'elder' ? `<div class="speaker small">${icon('npc_elder', '🌿', 'icon sm')}<b>Elder Bloom</b></div>` : '';
    const r = await this.dialog(`${who}<div class="caption-text ${speaker}">${esc(text)}</div>`, [['ok', '▶']], 'caption');
    this.modal.classList.remove('cine');
    return r;
  }

  itemFound(id: string, name: string, text: string, emoji = '🗡️', heading = 'You found') {
    return this.dialog(
      `<div class="confetti">✨🌟✨</div><div class="qchap">${esc(heading)}</div>
       <div class="qart big-art">${icon(id, emoji, 'icon xxl')}</div>
       <div class="big" style="font-size:28px">${esc(name)}!</div><p>${esc(text)}</p>`,
      [['ok', 'Take it!']],
      'celebrate',
    );
  }

  /** Shown right after crafting: celebrate the new item and offer to equip it on the spot. */
  newGear(g: Gear, current: Gear | null) {
    const cmp = (k: 'atk' | 'def' | 'hp') => {
      const a = current?.[k] ?? 0, b = g[k] ?? 0;
      if (!a && !b) return '';
      const d = b - a;
      return `<span class="chip ${d >= 0 ? 'ok' : 'miss'}">${k.toUpperCase()} ${a} → <b>${b}</b></span>`;
    };
    return this.dialog(
      `<div class="confetti">✨⚒✨</div>
       <div class="qchap">New ${g.slot}!</div>
       <div class="qart big-art">${icon(g.id, g.icon, 'icon xxl')}</div>
       <div class="big" style="font-size:26px">${esc(g.name)}</div>
       <p>${esc(g.desc)}</p>
       <div class="chips">${cmp('atk')}${cmp('def')}${cmp('hp')}</div><br>`,
      [['later', 'Keep in bag'], ['equip', 'Equip now!']],
      'celebrate',
    );
  }

  challenge(kind: MonsterKind, name: string, title: string, lv: number, playerLv: number, zoneName: string) {
    const under = playerLv < lv;
    return this.dialog(
      `<div class="qart big-art">${bossIcon(kind, 'icon xxl')}</div>
       <div class="big" style="font-size:28px">${esc(name)}</div>
       <div class="qchap">${esc(title)}</div>
       <p>It blocks the road to <b>${esc(zoneName)}</b>. Defeat it to open the way and light a campfire checkpoint.</p>
       <div class="lvcmp ${under ? 'bad' : 'good'}">Boss Lv ${lv} · You Lv ${playerLv}${under ? ' · ⚠️ Train a bit more!' : ' · 💪 Ready!'}</div>`,
      [['no', 'Not yet'], ['yes', '⚔️ Challenge!', 'alt']],
    );
  }

  roadOpened(bossName: string, zoneName: string, kind: MonsterKind) {
    return this.dialog(
      `<div class="confetti">${'🎉🔥✨'.repeat(4)}</div>
       <div class="qart big-art">${bossIcon(kind, 'icon xl')}</div>
       <div class="big" style="font-size:26px">The road is open!</div>
       <p>${esc(bossName)} steps aside. <b>${esc(zoneName)}</b> awaits, and a 🔥 campfire checkpoint has been lit just past the gate.</p>`,
      [['ok', 'Onward!']],
      'celebrate',
    );
  }

  result(o: { win: boolean; xp: number; levels: number; newLv: number; drops: Partial<Record<MatId, number>>; boss: boolean; respawn?: string }) {
    let html: string;
    if (o.win) {
      const drops = Object.entries(o.drops).map(([m, n]) => `<span class="chip ok">${icon(m, MATS[m as MatId].icon, 'icon sm')} ${esc(MATS[m as MatId].name)} ×${n}</span>`).join('');
      html = `<div class="big">${o.boss ? '👑 Boss defeated!' : 'Victory! ✨'}</div>
        <div class="sub">+${o.xp} XP</div>
        ${o.levels ? `<div class="lvup">⬆ Level up! Now Lv ${o.newLv}</div>` : ''}
        ${drops ? `<div class="chips">${drops}</div>` : '<p>No materials this time.</p>'}`;
    } else {
      const where = !o.respawn || o.respawn === 'village' ? 'the village' : `the ${ZONES.find((z) => z.id === o.respawn)?.name} campfire`;
      html = `<div class="big">Oops! 💫</div><p>You fainted… a kind friend carried you back to ${esc(where)}.<br>You're rested and ready to go again!</p>`;
    }
    return this.dialog(html, [['ok', 'Continue']]);
  }
}
