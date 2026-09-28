// DOM-based HUD, menus and dialogs layered over the canvas.
import { iconUrl } from './assets';
import {
  GEAR, GEAR_ORDER, MATS, MAT_ORDER, MAX_POTIONS, MONSTERS, POTION_HEAL, POTION_RECIPES, PROJECTS, PROJECT_ORDER, QUESTS, SKILL_MAX, SKILL_NAMES,
  STYLE_NAMES, TOOLS, ZONES, type SkillId, type Style, type Gear, type MatId, type MonsterKind, type ProjectId, type Quest, type Recipe, type Slot, type ZoneId,
} from './data';
import { currentQuest, progress, questNeeds } from './quests';
import { MASTERY_MAX, PLOT_UNLOCK, canBuild, hasMats, levelLock, masteryXpToNext, playerStats, plotOpen, revealed, skillXpToNext, xpToNext, type Lock } from './rules';
import type { SaveState } from './state';
import type { Unlock, UnlockId } from './unlocks';
import { MOVESETS, comboTime } from './weapons';
import { MEALS, knownMeals, mealLeft, type MealId } from './kitchen';
import { LOGS_PER_PLANK, canOrder, nextPlankIn, sawLogs, sawSeconds, sawUpdate } from './sawmill';
import { usingKeyboard } from './input';
import { canShareFiles } from './share';
import { reportInfo } from './stats';
import { newerThan } from './semver';
import { PATCH_NOTES, VERSION } from './version';

/** Which unlock reveals each menu tab (settings is always there). */
const TAB_UNLOCK: Partial<Record<Tab, UnlockId>> = { journey: 'journal', items: 'bag', forge: 'forge', village: 'village' };

export type Tab = 'journey' | 'items' | 'forge' | 'village' | 'settings';

export interface MenuCtx {
  atForge: boolean;
  inVillage: boolean;
}

export interface UIHooks {
  save(): SaveState;
  /** Opens a menu tab from the map (an unlock card's "tap to open"). */
  openTab(tab: Tab): void;
  /** Sounds for reward moments: a named effect, or the XP bar's rising tone (seconds, from and to 0–1 up the bar). */
  sound(s: 'ding' | 'tick' | 'treasure' | 'levelup'): void;
  sweep(dur: number, from: number, to: number): void;
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
  /** Play report: share or download the full file, or copy the summary to paste. */
  exportReport(how: 'file' | 'copy'): void;
  /** Shows the patch notes (and marks them read). */
  patchNotes(): void;
  /** The side story you're in the middle of (the tracker shows it over the main quest), and every one you've started. */
  story(): { icon: string; title: string; label: string } | null;
  stories(): { icon: string; title: string; label: string; done: boolean }[];
  menuClosed(): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** Are there patch notes you haven't read? */
export const hasNews = (s: SaveState) => newerThan(VERSION, s.seenVersion);
const ZONE_EMOJI: Record<ZoneId, string> = { glade: '🌳', village: '🏡', meadow: '🌼', woods: '🌲', cave: '🪨', hollow: '💎', peak: '🌋' };

/** Blender-rendered icon with the emoji as a fallback if the image is missing. */
export function icon(id: string, emoji: string, cls = 'icon') {
  // decoding="sync": paint the (already downloaded and decoded) icon with the menu, not a moment after.
  return `<img class="${cls}" src="${iconUrl(id)}" alt="" decoding="sync" onerror="this.outerHTML='${emoji}'">`;
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

/** What a lock asks of you, in a few words. */
function lockLabel(l: Lock): string {
  switch (l.kind) {
    case 'forge': return PROJECTS.forge.levels[l.level - 1].name;
    case 'skill': return `${SKILL_NAMES[l.skill]} ${l.level}`;
    case 'handling': return `${STYLE_NAMES[l.style]} handling ${l.level}`;
  }
}

/** How to reveal a Forge item you haven't reached the level for. */
const lockHow = (l: Lock) => (l.kind === 'forge' ? `Upgrade the Forge to the ${lockLabel(l)} to reveal it.` : `Reach ${lockLabel(l)} to reveal it.`);

/**
 * An inventory slot: an icon you tap to look at more closely (the details show on a tag under the grid). `key` names
 * the grid, so each grid remembers what you picked.
 */
function slotTile(key: string, id: string, art: string, label: string, o: { sel?: boolean; worn?: boolean; count?: number; cls?: string } = {}): string {
  return `<button class="tile ${o.cls ?? ''}${o.sel ? ' sel' : ''}" data-pick="${key}:${id}" aria-label="${esc(label)}">${art}${
    o.worn ? '<i class="eq">✓</i>' : ''}${o.count !== undefined ? `<b class="n">${o.count}</b>` : ''}</button>`;
}

/** Empty slots to round a grid out to whole rows (and at least two), so it reads as a bag with room to spare. */
function emptySlots(filled: number, cols = 4): string {
  const total = Math.max(cols * 2, Math.ceil(filled / cols) * cols);
  return '<div class="tile empty" aria-hidden="true"></div>'.repeat(total - filled);
}

/** The label tag for whatever's picked: its picture, a title, a few lines, and what you can do with it. */
function tagCard(art: string, title: string, lines: string, action = ''): string {
  return `<div class="tagcard"><div class="tart">${art}</div><div class="tinfo"><div class="name">${title}</div>${lines}</div>${action ? `<div class="tact">${action}</div>` : ''}</div>`;
}

/**
 * The pieces of every celebration: a ribbon banner for the heading, and the thing itself popping in over rays of
 * light that turn slowly behind it.
 */
const ribbon = (text: string) => `<div class="ribbon"><span>${esc(text)}</span></div>`;
const stage = (art: string, cls = '') => `<div class="stage ${cls}"><div class="rays"></div><div class="stage-art">${art}</div><div class="sparkles"><i></i><i></i><i></i><i></i></div></div>`;

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
  if (g.type === 'build') return icon(`b_${g.project === 'forge' ? forgeArt(g.level) : g.project + g.level}`, PROJECTS[g.project].icon, 'icon xl');
  if (g.type === 'kills') return icon('goo', '⚔️', 'icon xl');
  if (g.type === 'craft') return icon('jelly', '⚒', 'icon xl');
  if (g.type === 'mend') return icon('axe1', '🪓', 'icon xl');
  return icon('npc_elder', '🌿', 'icon xl');
}

/** Every icon the menus can show (materials, gear, tools, guardians, buildings, the Elder), for preloading. */
export function allIconIds(): string[] {
  const buildings = ['plot', 'warp0', 'warp1', 'forge0', 'forge', 'forge2', 'forge3', 'forge4', 'forge5', 'campfire', 'sawmill0', 'sawmill1', 'bramhut',
    ...['home', 'garden', 'training'].flatMap((p) => [1, 2, 3].map((l) => `${p}${l}`))];
  return [
    ...Object.keys(MATS), ...Object.keys(GEAR), ...TOOLS.map((t) => t.id),
    ...Object.entries(MONSTERS).filter(([, m]) => m.boss).map(([k]) => `boss_${k}`),
    ...buildings.map((b) => `b_${b}`), 'npc_elder',
    // Story portraits and keepsakes.
    'npc_poppy', 'npc_poppy_hug', 'npc_poppy_sad', 'npc_poppy_scared', 'npc_granny', 'npc_granny_worried', 'floppers', 'trailboots',
    'npc_bram', 'npc_bram_happy', 'npc_bram_hurt', 'pie', ...Object.keys(MEALS).map((m) => `meal_${m}`),
  ];
}

/** The forge's art for a level (the repaired one is plain "forge"). */
export const forgeArt = (level: number) => (level <= 0 ? 'forge0' : level === 1 ? 'forge' : `forge${level}`);

/** How much quicker (in %) a weapon class attacks at a handling level than at Lv 1: its full combo, rest included. */
export function paceGain(style: Style, lv: number): number {
  const m = MOVESETS[style];
  return Math.round((comboTime(m, 1) / comboTime(m, lv) - 1) * 100);
}

function handlingPace(style: Style, lv: number): string {
  const gain = paceGain(style, lv);
  return gain > 0 ? `⚡ Attacks ${gain}% faster` : '⚡ Steady pace: training makes you faster';
}

/** What opens a locked building plot. */
const PLOT_OPENS: Partial<Record<UnlockId, string>> = {
  plots: 'The plot opens once you beat the Slime King', warpplot: 'The ruins open up once you beat the Alpha Woolf',
  sawmill: 'Someone who knows timber could build one. Granny might know who.',
};

function buildingIcon(id: ProjectId, level: number): string {
  // Before it's built: the old forge's ruins, the Waystone's broken stones, or an empty plot.
  if (level === 0) return icon(id === 'warp' ? 'b_warp0' : id === 'forge' ? 'b_forge0' : id === 'sawmill' ? 'b_sawmill0' : 'b_plot', PROJECTS[id].icon, 'icon lg');
  const name = id === 'forge' ? forgeArt(level) : `${id}${level}`;
  return icon(`b_${name}`, PROJECTS[id].icon, 'icon lg');
}

export class UI {
  private modal = $('modal');
  private sheet = this.modal.querySelector('.sheet') as HTMLElement;
  private toastTimer = 0;
  private bannerTimer = 0;
  private tab: Tab = 'journey';
  private sub: Record<string, string> = { forge: 'weapon', items: 'gear' };
  /** What's picked in each slot grid (by grid), shown on its tag. */
  private pick: Record<string, string> = {};
  /** The Forge shows only what you've discovered, unless you ask to see the undiscovered outlines too. */
  private showLocked = false;
  /** Recipes revealed since your last visit to the Forge (they get a "New" badge while you're there). */
  private forgeNew = new Set<string>();
  private lastTab: Tab | null = null;
  /** Where the game is (unlock cards wait until you're back on the map). */
  private mode: 'title' | 'world' | 'battle' | 'none' = 'title';
  private unlockQueue: Unlock[] = [];
  private unlockShowing = false;
  private unlockTimer = 0;
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

  /** While the XP bar is animating a gain, the HUD leaves the level and XP alone. */
  private xpAnim = false;

  /**
   * The XP you just earned, the way Pokémon does it: "+N XP" floats up, the bar fills with a rising tone, and if it
   * tops out it rings, the level number pops, and it carries on filling from empty. Resolves once it has settled.
   */
  async xpGain(from: { lv: number; xp: number }, to: { lv: number; xp: number }, gained: number) {
    const card = $('hud').querySelector('.stat') as HTMLElement | null, bar = $('hud-xp');
    if (!card || $('hud').hidden || gained <= 0) return;
    this.xpAnim = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    card.classList.add('gain');
    const tag = document.createElement('div');
    tag.className = 'xp-float';
    tag.textContent = `+${gained} XP`;
    card.append(tag);
    await wait(250);
    let lv = from.lv, frac = Math.min(1, from.xp / xpToNext(lv));
    const fill = async (target: number) => {
      const dur = 0.25 + 0.75 * (target - frac);
      bar.style.transition = `width ${dur}s linear`;
      bar.style.width = `${target * 100}%`;
      this.hooks.sweep(dur, frac, target);
      await wait(dur * 1000);
      frac = target;
    };
    for (; lv < to.lv; lv++) {
      await fill(1);
      // Topped out: a bell, the level ticks over, and the bar starts again from empty.
      this.hooks.sound('ding');
      card.classList.add('ding');
      $('hud-lv').textContent = String(lv + 1);
      await wait(420);
      card.classList.remove('ding');
      bar.style.transition = 'none';
      bar.style.width = '0%';
      frac = 0;
      await wait(60);
    }
    await fill(Math.min(1, to.xp / xpToNext(to.lv)));
    await wait(350);
    tag.remove();
    card.classList.remove('gain');
    bar.style.transition = '';
    this.xpAnim = false;
    delete this.last.xp;
    delete this.last.lv;
  }

  hud(hp: number, zoneName: string) {
    const s = this.hooks.save();
    const st = playerStats(s);
    const hpText = `${Math.ceil(hp)}/${st.maxHp}`;
    if (!this.xpAnim) this.set('lv', String(s.lv), () => ($('hud-lv').textContent = String(s.lv)));
    this.set('hp', hpText, () => {
      $('hud-hptext').textContent = hpText;
      $('hud-hp').style.width = `${(100 * hp) / st.maxHp}%`;
      $('hud-hp').parentElement!.classList.toggle('low', hp / st.maxHp < 0.3);
    });
    const xpPct = `${Math.min(100, (100 * s.xp) / xpToNext(s.lv))}%`;
    if (!this.xpAnim) this.set('xp', xpPct, () => ($('hud-xp').style.width = xpPct));
    this.set('zone', zoneName, () => ($('hud-zone').textContent = zoneName));
    // Whatever you last ate at Granny's, and how much is left.
    const meal = mealLeft(s), mealKey = meal ? `${meal.icon}${meal.left}` : '';
    this.set('meal', mealKey, () => {
      const el = $('hud-meal');
      el.hidden = !meal;
      if (meal) {
        el.textContent = `${meal.icon} ${meal.left}`;
        el.title = `${meal.name}: ${meal.left} left`;
      }
    });
  }

  /** The little "current goal" tracker under the HUD. */
  questPill(show: boolean) {
    const s = this.hooks.save();
    const q = currentQuest(s), side = this.hooks.story();
    if (show && side) {
      // A side story you're in the middle of takes the tracker until it's done.
      this.set('pill', `side|${side.title}|${side.label}`, () => {
        const el = $('quest-pill');
        el.hidden = false;
        el.innerHTML = `<span class="qi">${side.icon}</span><span class="qt"><b>${esc(side.title)}</b><small>${esc(side.label)}</small></span>`;
        el.classList.add('side');
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      });
      return;
    }
    $('quest-pill').classList.remove('side');
    if (!show || !q) {
      this.set('pill', 'hidden', () => ($('quest-pill').hidden = true));
      return;
    }
    const p = progress(s, q);
    const needs = questNeeds(s, q);
    const count = !needs.length && p.max > 1 ? `${p.cur}/${p.max}` : '';
    const text = `${q.id}|${count}|${needs.map((n) => n.have).join(',')}`;
    this.set('pill', text, () => {
      const el = $('quest-pill');
      el.hidden = false;
      // Material goals list what they need, with a bar filling as you collect.
      const have = needs.reduce((a, n) => a + Math.min(n.have, n.need), 0), total = needs.reduce((a, n) => a + n.need, 0);
      const chips = needs.map((n) => `<span class="qm ${n.have >= n.need ? 'ok' : ''}">${icon(n.mat, MATS[n.mat].icon, 'icon sm')}${Math.min(n.have, n.need)}/${n.need}</span>`).join('');
      el.innerHTML = `<span class="qi">📜</span><span class="qt"><b>${esc(q.title)}</b><small>${esc(q.hint)}</small>${
        needs.length ? `<span class="qms">${chips}</span><span class="qbar"><i style="width:${(100 * have) / Math.max(1, total)}%"></i></span>` : ''}</span>${count ? `<span class="qc">${count}</span>` : ''}`;
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

  battleHud(potions: number, skillFrac: number, dodgeFrac: number, skillName: string, canRun: boolean, attackFrac = 0) {
    const at = attackFrac.toFixed(2);
    this.set('atk', at, () => ($('btn-attack').querySelector<HTMLElement>('.cd')!.style.setProperty('--p', at)));
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
    const jDot = s.fresh.includes('journal'), bDot = s.fresh.some((f) => f === 'bag' || f === 'forge' || f === 'village') || hasNews(s);
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

  /** The tab each unlock opens when you tap its card (the weapon skill lives in fights, so it has none). */
  private static UNLOCK_TAB: Partial<Record<UnlockId, Tab>> = { journal: 'journey', bag: 'items', mend: 'items', sawmill: 'village', forge: 'forge', village: 'village', plots: 'village', warpplot: 'village' };
  /** The corner button that leads there, which bounces while its card is up. */
  private static UNLOCK_BUTTON: Partial<Record<UnlockId, string>> = { journal: 'btn-journal', bag: 'btn-bag', mend: 'btn-bag', forge: 'btn-bag', village: 'btn-bag', plots: 'btn-bag', warpplot: 'btn-bag', sawmill: 'btn-bag' };

  private nextUnlock() {
    const el = $('unlock-card');
    document.querySelectorAll('.dock-btn.beckon').forEach((b) => b.classList.remove('beckon'));
    // Not over a fight or a popup: wait for the map (setMode picks it back up).
    if (!this.unlockQueue.length || this.mode !== 'world') {
      this.unlockShowing = false;
      el.classList.remove('show');
      window.setTimeout(() => { if (!this.unlockShowing) el.hidden = true; }, 300);
      return;
    }
    const u = this.unlockQueue.shift()!;
    const tab = UI.UNLOCK_TAB[u.id];
    this.unlockShowing = true;
    el.hidden = false;
    const key = u.key && usingKeyboard() ? `<p class="u-key">⌨️ Shortcut: <kbd>${u.key}</kbd></p>` : '';
    el.innerHTML = `<div class="u-ico">${u.icon}</div><div><div class="u-new">✨ New unlocked</div><b>${esc(u.title)}</b><p>${esc(u.text)}</p>${key}${
      tab ? '<p class="u-go">Tap to open ›</p>' : ''}</div>`;
    el.classList.toggle('tappable', !!tab);
    el.onclick = tab ? () => {
      el.onclick = null;
      window.clearTimeout(this.unlockTimer);
      // Mending happens on the Bag's Skills page.
      if (u.id === 'mend') this.sub.items = 'skills';
      this.hooks.openTab(tab);
      this.nextUnlock();
    } : null;
    const btn = UI.UNLOCK_BUTTON[u.id];
    if (btn) $(btn).classList.add('beckon');
    requestAnimationFrame(() => el.classList.add('show'));
    this.unlockTimer = window.setTimeout(() => {
      el.classList.remove('show');
      window.setTimeout(() => this.nextUnlock(), 350);
    }, tab ? 7000 : 4800);
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
    this.mode = mode;
    // Unlock cards held back during a fight come out once you're back on the map.
    if (mode === 'world' && this.unlockQueue.length && !this.unlockShowing) window.setTimeout(() => this.nextUnlock(), 600);
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

  /** Loot and XP stacked on the right ("+2 Slime Goo", "+12 XP"), clear of the quest tracker on the left. */
  /** `name` is dropped on narrow screens, where the icon alone says what it is. */
  loot(entries: { icon: string; text: string; name?: string; suffix?: string }[]) {
    const feed = $('loot');
    entries.forEach((e, i) => {
      const row = document.createElement('div');
      row.className = 'lrow';
      row.style.animationDelay = `${i * 90}ms`;
      row.innerHTML = `${e.icon}<span>${esc(e.text)}${e.name ? `<span class="nm"> ${esc(e.name)}</span>` : ''}${e.suffix ? ` ${esc(e.suffix)}` : ''}</span>`;
      feed.appendChild(row);
      setTimeout(() => row.classList.add('out'), 2600 + i * 90);
      setTimeout(() => row.remove(), 3100 + i * 90);
    });
    while (feed.children.length > 7) feed.firstElementChild!.remove();
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
    this.lastTab = null;
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
    if (this.tab === 'forge' && this.lastTab !== 'forge') {
      const now = revealed(s);
      s.forgeSeen ??= [...now];
      // What you already own was never a discovery.
      const owns = (id: string) => s.owned.includes(id) || TOOLS.some((t) => t.id === id && s.tools[t.skill] >= t.tier);
      this.forgeNew = new Set([...now].filter((id) => !s.forgeSeen!.includes(id) && !owns(id)));
      s.forgeSeen.push(...this.forgeNew);
    }
    this.lastTab = this.tab;
    // Looking at a tab clears its "new" dot.
    const seenKey = TAB_UNLOCK[this.tab];
    if (seenKey) s.fresh = s.fresh.filter((f) => f !== seenKey);
    const dot = (t: Tab) => ((TAB_UNLOCK[t] && s.fresh.includes(TAB_UNLOCK[t]!)) || (t === 'settings' && hasNews(s)) ? '<i class="dot on"></i>' : '');
    const scroll = fresh ? 0 : this.sheet.querySelector('.body')?.scrollTop ?? 0;
    // Each tab is its own thing from the world: a notebook, the satchel, the smithy's bench, the builder's board.
    this.sheet.className = `sheet menu theme-${this.tab}`;
    const closeBtn = '<button class="tab-close" data-do="close" aria-label="Close menu"><span>✕</span>Close<kbd class="key">Esc</kbd></button>';
    const tabBtns = tabs.map(([id, ico, label], i) =>
      `<button data-tab="${id}" class="${this.tab === id ? 'on' : ''}"><span>${ico}</span>${label}${dot(id)}<kbd class="key">${i + 1}</kbd></button>`).join('');
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
      <nav class="tabbar" style="grid-template-columns:auto repeat(${tabs.length},1fr)">${closeBtn}${tabBtns}</nav>`;
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
      card = `<section class="qcard done"><div class="qtitle">🌅 The smoke has cleared</div><p class="qtext">Sowerby is safe. Keep building, crafting and rematching bosses!</p></section>`;
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
    const warpNote = warp ? '' : `<div class="note">🔮 Build the <b>Waystone</b> in the village to fast travel between campfires.</div>`;
    const home = here ? '' : `<button class="wide go alt" data-do="home">🏠 Warp home to Sowerby</button>`;
    const chapters = QUESTS.map((qq, i) => {
      const st = i < s.quest ? 'done' : i === s.quest ? 'now' : 'later';
      const mark = st === 'done' ? '✓' : st === 'now' ? '▶' : '🔒';
      return `<li class="${st}"><span class="mk">${mark}</span><span class="ch">${esc(qq.chapter)}</span><span>${st === 'later' ? '???' : esc(qq.title)}</span></li>`;
    }).join('');
    const sides = this.hooks.stories().map((st) => `<div class="zrow ${st.done ? 'done' : ''}"><div class="zart"><span class="emo">${st.icon}</span></div>
      <div class="info"><div class="name">${esc(st.title)}</div><div class="desc">${st.done ? '✓ ' : '▶ '}${esc(st.label)}</div></div></div>`).join('');
    return `<div class="notebook">${card}${sides ? `<h3>Side stories</h3><div class="zones">${sides}</div>` : ''}<h3>World map</h3>${warpNote}<div class="zones">${zones}</div>${home}<h3>Story</h3><ol class="chapters">${chapters}</ol></div>`;
  }

  private items(s: SaveState): string {
    const st = playerStats(s);
    const pocket = this.sub.items;
    const pick = this.pick.items;
    // What you're wearing, in sockets across the top of the bag, and your potions beside them.
    const sockets = ([['weapon', 'Weapon'], ['armor', 'Armor'], ['charm', 'Charm']] as [Slot, string][]).map(([slot, label]) => {
      const id = s.equip[slot], g = id ? GEAR[id] : null;
      return `<button class="sock${pick === id ? ' sel' : ''}" ${g ? `data-pick="items:${g.id}"` : 'disabled'} aria-label="${label}">${g ? icon(g.id, g.icon) : ''}<small>${label}</small></button>`;
    }).join('');
    const flask = `<button class="sock flask${pick === 'potion' ? ' sel' : ''}" data-pick="items:potion" aria-label="Potions"><span class="emo">🧪</span><b class="n">${s.potions}</b><small>Potions</small></button>`;
    const pockets = this.seg('items', [['gear', '⚔️ Gear'], ['stuff', '🪵 Stuff'], ['skills', '⭐ Skills']]);
    let body = '';
    let detail = '';
    if (pocket === 'gear') {
      const owned = GEAR_ORDER.filter((id) => s.owned.includes(id));
      const chosen = pick && (GEAR[pick] || pick === 'potion') ? pick : s.equip.weapon;
      body = `<div class="slotgrid">${owned.map((id) => slotTile('items', id, icon(id, GEAR[id].icon), GEAR[id].name, { sel: chosen === id, worn: s.equip[GEAR[id].slot] === id, cls: `tier${GEAR[id].tier ?? 0}` })).join('')}${emptySlots(owned.length)}</div>`;
      detail = chosen === 'potion' ? this.potionTag(s, st.maxHp) : this.gearTag(s, GEAR[chosen]);
      if (owned.length <= 2 && s.unlocked.includes('forge')) body += `<div class="note">⚒ Craft new gear at the Forge, then equip it here.</div>`;
    } else if (pocket === 'stuff') {
      const mats = MAT_ORDER.filter((m) => s.mats[m] > 0);
      const chosen = mats.includes(pick as MatId) ? (pick as MatId) : mats[0];
      body = mats.length
        ? `<div class="slotgrid">${mats.map((m) => slotTile('items', m, icon(m, MATS[m].icon), MATS[m].name, { sel: chosen === m, count: s.mats[m] })).join('')}${emptySlots(mats.length)}</div>`
        : '<p class="sub">Defeat monsters and gather to collect materials.</p>';
      if (chosen) detail = tagCard(icon(chosen, MATS[chosen].icon), `${esc(MATS[chosen].name)} <span class="lvl">×${s.mats[chosen]}</span>`, `<div class="desc">${esc(MATS[chosen].where)}</div>`);
      if (pick === 'potion') detail = this.potionTag(s, st.maxHp);
    } else {
      body = this.skills(s) || '<p class="sub">Craft a tool at the Forge to start woodcutting and mining.</p>';
      if (pick === 'potion') detail = this.potionTag(s, st.maxHp);
    }
    // The tag hangs under the grid; on the skills page (no grid) it sits at the top.
    const [above, below] = pocket === 'skills' ? [detail, ''] : ['', detail];
    return `<div class="satchel"><div class="worn">${sockets}${flask}</div>${pockets}${above}${body}${below}</div>`;
  }

  /** A piece of gear's tag: stats, what it's like, and wearing it. */
  private gearTag(s: SaveState, g: Gear | undefined): string {
    if (!g) return '';
    const on = s.equip[g.slot] === g.id;
    const action = on
      ? g.slot === 'charm' ? `<button class="go ghost" data-equip="${g.id}">Take off</button>` : '<span class="tag">✓ Worn</span>'
      : `<button class="go" data-equip="${g.id}">Wear</button>`;
    return tagCard(icon(g.id, g.icon), `${esc(g.name)} ${stars(g)}`, `<div class="stats">${gearStats(g)}</div><div class="desc">${esc(g.desc)}</div>`, action);
  }

  private potionTag(s: SaveState, maxHp: number): string {
    return tagCard('<span class="emo big-emo">🧪</span>', `Potions <span class="lvl">${s.potions}/${MAX_POTIONS}</span>`,
      `<div class="desc">Heals ${Math.round(POTION_HEAL * 100)}% HP. Free refills at Veyra's Spring.</div>`,
      `<button class="go" data-do="drink" ${s.potions > 0 && s.hp < maxHp ? '' : 'disabled'}>Drink</button>`);
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
    // Elder Oswin's old axe and pick, until they're mended.
    const mend = s.flags.includes('oldtools') ? TOOLS.filter((t) => t.tier === 1 && s.tools[t.skill] < 1).map((t) => {
      const can = hasMats(s, t.recipe);
      const [name, what] = t.skill === 'wood' ? ['Blunt old axe', 'Goo to glue the head back on, Fluff to wrap the grip.'] : ['Chipped old pick', 'Goo to set the loose head, Fluff to wrap the grip.'];
      return `<div class="mcard row mend"><div class="ico">${icon(t.id, t.icon)}</div><div class="info">
        <div class="name">${name}</div><div class="desc">${what}</div><div class="chips">${costChips(s, t.recipe)}</div></div>
        <button class="go" data-tool="${t.id}" ${can ? '' : 'disabled'}>Mend</button></div>`;
    }).join('') : '';
    // Weapon handling: every class you've trained, plus the one in your hand.
    const style = GEAR[s.equip.weapon]?.style;
    const handling = (Object.keys(STYLE_NAMES) as Style[]).filter((k) => k === style || s.mastery[k].lv > 1 || s.mastery[k].xp > 0).map((k) => {
      const m = s.mastery[k], max = m.lv >= MASTERY_MAX, need = masteryXpToNext(m.lv);
      const emoji = { sword: '🗡️', hammer: '🔨', whip: '〰️', wand: '🪄' }[k];
      return `<div class="mcard row"><div class="ico"><span class="emo">${emoji}</span></div><div class="info">
        <div class="name">${STYLE_NAMES[k]} handling <span class="lvl">Lv ${m.lv}</span></div>
        <div class="desc">${handlingPace(k, m.lv)} · ${max ? 'Mastered!' : `${m.xp}/${need} XP · win fights with a ${STYLE_NAMES[k].toLowerCase()} to train`}</div>
        <div class="pbar"><i style="width:${max ? 100 : (100 * m.xp) / need}%"></i></div></div></div>`;
    }).join('');
    const PERKS: Record<string, [string, string, string]> = { trailboots: ['trailboots', 'Trail Boots', 'From Granny Clover: walk 25% faster outside of fights.'] };
    const perks = s.perks.filter((p) => PERKS[p]).map((p) => {
      const [id, name, desc] = PERKS[p];
      return `<div class="mcard row"><div class="ico">${icon(id, '👢')}</div><div class="info"><div class="name">${esc(name)}</div><div class="desc">${esc(desc)}</div></div></div>`;
    }).join('');
    return `${mend ? `<h3>Old tools</h3>${mend}` : ''}${rows ? `<h3>Skills</h3>${rows}` : ''}${handling ? `<h3>Weapon handling</h3>${handling}` : ''}${perks ? `<h3>Perks</h3>${perks}` : ''}`;
  }

  private forge(s: SaveState): string {
    const flv = s.build.forge;
    const at = this.ctx.atForge;
    const level = PROJECTS.forge.levels[flv - 1];
    const plate = `<div class="plate"><b>⚒ ${esc(level?.name ?? 'The Forge')}</b><small>${at ? esc(level?.perk ?? '') : '📍 Visit the Forge in Sowerby to craft. You can plan here.'}</small></div>`;
    const sub = this.sub.forge;
    const seg = this.seg('forge', [['weapon', 'Weapons'], ['armor', 'Armor'], ['charm', 'Charms'], ['tool', 'Tools'], ['potion', 'Potions']]);
    const key = `forge-${sub}`;
    // Every recipe on the bench as a slot: made ones ticked, ones you can make now lit, ones you haven't reached yet a "?".
    type Row = { id: string; art: string; name: string; tier: number; owned: boolean; lock: Lock | null; can: boolean; tag: () => string };
    let rows: Row[];
    if (sub === 'tool') {
      rows = TOOLS.filter((t) => t.tier > 1 || s.tools[t.skill] >= t.tier).map((t) => {
        const owned = s.tools[t.skill] >= t.tier, lock = owned ? null : levelLock(s, t), can = !owned && at && hasMats(s, t.recipe);
        return {
          id: t.id, art: icon(t.id, t.icon), name: t.name, tier: t.tier, owned, lock, can,
          tag: () => tagCard(icon(t.id, t.icon), `${esc(t.name)} <span class="stars">${'★'.repeat(t.tier)}</span>`,
            `<div class="desc">${esc(t.desc)}</div>${owned ? '' : `<div class="chips">${costChips(s, t.recipe)}</div>`}`,
            owned ? '<span class="tag">✓ Owned</span>' : `<button class="go" data-tool="${t.id}" ${can ? '' : 'disabled'}>Craft</button>`),
        };
      });
    } else if (sub === 'potion') {
      rows = POTION_RECIPES.map((p) => {
        const can = at && hasMats(s, p.recipe) && s.potions < MAX_POTIONS;
        return {
          id: p.id, art: '<span class="emo">🧪</span>', name: p.name, tier: 0, owned: false, lock: null, can,
          tag: () => tagCard('<span class="emo big-emo">🧪</span>', esc(p.name), `<div class="desc">You carry ${s.potions}/${MAX_POTIONS}.</div><div class="chips">${costChips(s, p.recipe)}</div>`,
            `<button class="go" data-potion="${p.id}" ${can ? '' : 'disabled'}>${s.potions >= MAX_POTIONS ? 'Full' : 'Brew'}</button>`),
        };
      });
    } else {
      rows = GEAR_ORDER.filter((id) => GEAR[id].slot === sub && GEAR[id].recipe).map((id) => {
        const g = GEAR[id], owned = s.owned.includes(id), lock = owned ? null : levelLock(s, g), can = !owned && at && hasMats(s, g.recipe!);
        const action = owned
          ? s.equip[g.slot] === id ? '<span class="tag">✓ Worn</span>' : `<button class="go ghost" data-equip="${id}">Wear</button>`
          : `<button class="go" data-craft="${id}" ${can ? '' : 'disabled'}>Craft</button>`;
        return {
          id, art: icon(g.id, g.icon), name: g.name, tier: g.tier ?? 0, owned, lock, can,
          tag: () => tagCard(icon(g.id, g.icon), `${esc(g.name)} ${stars(g)}`,
            `<div class="stats">${gearStats(g)}</div><div class="desc">${esc(g.desc)}</div>${owned ? '' : `<div class="chips">${costChips(s, g.recipe!)}</div>`}`, action),
        };
      });
    }
    // What you've discovered, newest first, then the strongest you haven't made yet, then what you already own.
    // Undiscovered recipes stay hidden unless you ask to see their outlines (they go last, weakest first).
    const rank = (r: Row) => (this.forgeNew.has(r.id) ? 0 : !r.owned ? 1 : 2);
    const known = rows.filter((r) => !r.lock).sort((a, b) => rank(a) - rank(b) || b.tier - a.tier);
    const locked = rows.filter((r) => r.lock).sort((a, b) => a.tier - b.tier);
    const shown = this.showLocked ? [...known, ...locked] : known;
    // Default to the first thing you could make next.
    const chosen = shown.find((r) => r.id === this.pick[key]) ?? known.find((r) => !r.owned) ?? shown[0];
    const tiles = shown.map((r) => slotTile(key, r.id, r.art, r.lock ? 'Unknown' : r.name, {
      sel: r === chosen, worn: r.owned, cls: `tier${r.tier}${r.lock ? ' mystery' : ''}${r.can ? ' ready' : ''}${this.forgeNew.has(r.id) ? ' new' : ''}`,
    })).join('');
    const toggle = locked.length
      ? `<button class="go ghost wide peek" data-do="forge-locked">${this.showLocked ? 'Hide undiscovered' : `🔍 Show undiscovered (${locked.length})`}</button>` : '';
    const tag = !chosen ? '' : chosen.lock
      ? tagCard(`<span class="mystery-art">${chosen.art}</span>`, `??? <span class="stars">${'★'.repeat(chosen.tier)}</span>`, `<div class="desc">${esc(lockHow(chosen.lock))}</div>`, `<span class="tag lock">🔒 ${esc(lockLabel(chosen.lock))}</span>`)
      : chosen.tag();
    const hint = sub === 'tool' ? '<p class="sub">Tools work by themselves: walk up to a glowing tree or rock.</p>' : '';
    // The work order is nailed above the recipes, so it stays in view however many there are.
    return `<div class="bench">${plate}${seg}${tag}<div class="slotgrid">${tiles}${emptySlots(shown.length)}</div>${toggle}${hint}</div>`;
  }

  private village(s: SaveState): string {
    const here = this.ctx.inVillage;
    const note = here
      ? `<div class="note">🏗 Build and upgrade to grow stronger. Trophies from guardians unlock the best upgrades!</div>`
      : `<div class="note">📍 You can plan here. Head back to Sowerby to build.</div>`;
    // Ready to build first, then what's still missing something, then what's finished, then plots not open yet.
    const order = (id: ProjectId) => (!plotOpen(s, id) ? 3 : s.build[id] >= PROJECTS[id].levels.length ? 2 : canBuild(s, id) === 'ok' ? 0 : 1);
    const cards = [...PROJECT_ORDER].sort((a, b) => order(a) - order(b)).map((id) => {
      const p = PROJECTS[id];
      const lv = s.build[id];
      const max = p.levels.length;
      const pips = Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      const nowName = lv ? p.levels[lv - 1].name : id === 'forge' ? 'Ruins' : id === 'warp' ? 'Old ruins' : 'Empty plot';
      const head = `<div class="bp-head"><div class="name">${esc(p.name)}</div><span class="pips">${pips}</span></div>`;
      if (!plotOpen(s, id)) {
        return `<div class="mcard bcard locked" data-focus="${id}">${head}
          <div class="bp-preview solo"><div class="bp-art">${buildingIcon(id, 0)}<small>${esc(nowName)}</small></div></div>
          <div class="bp-locked">🔒 ${esc(PLOT_OPENS[PLOT_UNLOCK[id]!] ?? 'Not open yet')}</div></div>`;
      }
      if (lv >= max) {
        return `<div class="mcard bcard done" data-focus="${id}">${head}
          <div class="bp-preview solo"><div class="bp-art">${buildingIcon(id, lv)}<small>${esc(nowName)}</small></div></div>
          <div class="bp-perk">${esc(p.levels[lv - 1].perk)}</div><div class="bp-done">✨ Fully built</div></div>`;
      }
      const nl = p.levels[lv];
      const ok = canBuild(s, id) === 'ok';
      const missing = Object.entries(nl.cost).filter(([m, n]) => s.mats[m as MatId] < (n ?? 0));
      const costs = Object.entries(nl.cost).map(([m, n]) => {
        const have = s.mats[m as MatId], enough = have >= (n ?? 0);
        return `<span class="bp-cost ${enough ? 'ok' : 'miss'}">${icon(m, MATS[m as MatId].icon, 'icon sm')}<b>${Math.min(have, n ?? 0)}</b>/${n}${enough ? '<i>✓</i>' : ''}</span>`;
      }).join('');
      // A disabled button says why.
      const label = ok
        ? here ? `${lv ? 'Upgrade to' : 'Build'} ${esc(nl.name)}` : '📍 Build it in Sowerby'
        : `Still need ${missing.map(([m, n]) => `${esc(MATS[m as MatId].name)} ×${(n ?? 0) - s.mats[m as MatId]}`).join(' · ')}`;
      return `<div class="mcard bcard${ok ? ' ready' : ''}" data-focus="${id}">${head}
        <div class="bp-preview">
          <div class="bp-art now">${buildingIcon(id, lv)}<small>${esc(nowName)}</small></div>
          <div class="bp-arrow">➜</div>
          <div class="bp-art next">${buildingIcon(id, lv + 1)}<small>${esc(nl.name)}</small></div>
        </div>
        <div class="bp-perk">⬆ ${esc(nl.perk)}</div>
        ${costs ? `<div class="bp-costs">${costs}</div>` : ''}
        <button class="go wide bp-go" data-build="${id}" ${ok && here ? '' : 'disabled'}>${label}</button></div>`;
    }).join('');
    return `<div class="board">${note}<div class="blueprints">${cards}</div></div>`;
  }

  /** Dev builds add their own row to the More tab (save slots and presets; see src/dev/devtools.ts). */
  devRow: { html: string; open: () => void } | null = null;

  private settings(s: SaveState): string {
    const rep = reportInfo();
    return `<div class="notebook">${this.devRow?.html ?? ''}
      <div class="mcard row news"><div class="ico">📰</div><div class="info"><div class="name">What's new${hasNews(s) ? ' <span class="tag new">New!</span>' : ''}</div>
        <div class="desc">Version ${VERSION}: ${esc(PATCH_NOTES[0].title)}</div></div>
        <button class="go" data-do="notes">Patch notes</button></div>
      <div class="mcard row"><div class="ico">${s.muted ? '🔇' : '🔊'}</div><div class="info"><div class="name">Sound</div></div>
        <button class="go" data-do="mute">${s.muted ? 'Off' : 'On'}</button></div>
      <h3>How to play</h3>
      <div class="note" style="font-weight:600;line-height:1.5">
        • Drag anywhere to move. Walk through <b>tall grass</b> to meet monsters.<br>
        • Follow the 📜 goal at the top of the screen. Elder Oswin has hints!<br>
        • <b>Guardians</b> block the roads. Beat them to open the way and light a 🔥 campfire checkpoint.<br>
        • In battle: ⚔️ attack the way you last moved (hold to combo), 💨 dodge, ✨ weapon skill, 🧪 potion. Red circles mean danger!<br>
        • Craft gear at the ⚒ Forge and build up the 🏡 Village for permanent boosts.<br>
        • Craft axes and picks (Forge → Tools) to chop glowing trees and mine glowing rocks. A tool can work the next tier up, slowly.<br>
        • You attack the way you last moved. Winning with a class of weapon trains it; better weapons of that class need it.<br>
        • Keyboard: WASD/arrows, J/Space attack, K dodge, L skill, H potion, E interact, M menu.
      </div>
      <div class="mcard row"><div class="ico">📊</div><div class="info"><div class="name">Play report</div>
        <div class="desc">${rep.fights} fights and ${rep.gathers} gathers recorded, with time, damage, stamina and more. Share the file for balancing, or copy the summary to paste.</div></div>
        <div class="stack"><button class="go" data-do="report">${canShareFiles() ? 'Share file' : 'Download'}</button><button class="go ghost" data-do="report-copy">Copy summary</button></div></div>
      <div class="mcard row"><div class="ico">🗑️</div><div class="info"><div class="name">Reset save</div><div class="desc">Start over from scratch.</div></div>
        <button class="go alt" data-do="reset">Reset</button></div></div>`;
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
    if (d.pick) {
      const k = d.pick.indexOf(':');
      this.pick[d.pick.slice(0, k)] = d.pick.slice(k + 1);
      this.renderMenu(false);
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
    else if (d.do === 'report') this.hooks.exportReport('file');
    else if (d.do === 'report-copy') this.hooks.exportReport('copy');
    else if (d.do === 'notes') return this.hooks.patchNotes();
    else if (d.do === 'forge-locked') {
      this.showLocked = !this.showLocked;
      return this.renderMenu(false);
    }
    else if (d.do === 'dev' && this.devRow) {
      this.closeMenu();
      return this.devRow.open();
    }
    this.refresh();
  }

  // ------------------------------------------------------------ Dialogs

  /** Every version's patch notes, newest first; ones newer than `seen` are marked new. */
  patchNotes(seen: string) {
    const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    const list = PATCH_NOTES.map((p) => `
      <section class="patch">
        <h3>v${p.version} · ${esc(p.title)}${newerThan(p.version, seen) ? ' <span class="tag new">New!</span>' : ''}</h3>
        <div class="when">${fmt(p.date)}</div>
        <ul>${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      </section>`).join('');
    return this.dialog(`<div class="big" style="font-size:24px">📰 Patch notes</div><div class="patches">${list}</div>`, [['ok', 'Nice!']], 'notes');
  }

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

  /**
   * Granny's Kitchen: every recipe she knows, what it does and costs, and an Eat button for the ones you can afford.
   * Resolves 'cook:<meal>' or 'close'.
   */
  kitchen(s: SaveState, greeting: string): Promise<string> {
    const now = mealLeft(s);
    const rows = knownMeals(s).map((id: MealId) => {
      const m = MEALS[id], can = hasMats(s, m.recipe);
      return `<div class="mcard row"><div class="ico">${icon(`meal_${id}`, m.icon)}</div><div class="info">
        <div class="name">${esc(m.name)}${m.from ? ` <span class="tag">from ${esc(m.from)}</span>` : ''}</div>
        <div class="desc">${esc(m.desc)}</div><div class="chips">${costChips(s, m.recipe)}</div></div>
        <button class="go" data-dialog="cook:${id}" ${can ? '' : 'disabled'}>Eat</button></div>`;
    }).join('');
    return this.dialog(
      `${ribbon("Granny's Kitchen")}
       <div class="speaker small">${icon('npc_granny', '👵', 'icon sm')}<b>Granny Clover</b></div>
       <div class="bubble">${esc(greeting)}</div>
       ${now ? `<p class="note">You're full of ${esc(now.name)} (${now.left} left). A new meal replaces it.</p>` : ''}
       <div class="kitchen">${rows}</div>`,
      [['close', 'Thanks, Granny']],
      'celebrate quest kitchen',
    );
  }

  /**
   * Bram's Sawmill: what's on the bench, what's ready, and buttons to hand him logs or take your planks.
   * Resolves 'saw:<n>:<log>', 'collect' or 'close'.
   */
  sawmill(s: SaveState, line: string): Promise<string> {
    const w = sawUpdate(s), next = nextPlankIn(s), logs = sawLogs(s);
    const logName = logs.map((l) => MATS[l].name).join(' or ');
    const bench = w.queued
      ? `🪚 Sawing <b>${w.queued}</b> plank${w.queued > 1 ? 's' : ''}: the next in ${next}s.`
      : `The saw is quiet. Bring ${logName} and Bram will get to work.`;
    // A row per kind of log it takes: what you have, and buttons to hand over enough for 1 or 5 planks.
    const rows = logs.map((l) => {
      const room = canOrder(s, l);
      return `<div class="sawrow">${icon(l, MATS[l].icon, 'icon sm')}<span><b>${s.mats[l]}</b> ${esc(MATS[l].name)}</span>
        <button class="go ghost" data-dialog="saw:1:${l}" ${room >= 1 ? '' : 'disabled'}>Saw 1</button>
        <button class="go ghost" data-dialog="saw:5:${l}" ${room >= 5 ? '' : 'disabled'}>Saw 5</button></div>`;
    }).join('');
    const btns: [string, string, string?][] = [['close', 'Bye, Bram']];
    if (w.ready) btns.push(['collect', `Take ${w.ready} plank${w.ready > 1 ? 's' : ''}`]);
    return this.dialog(
      `${ribbon("Bram's Sawmill")}
       <div class="speaker small">${icon('npc_bram_happy', '🧔', 'icon sm')}<b>Bram</b></div>
       <div class="bubble">${esc(line)}</div>
       <div class="sawbench">
         ${rows}
         <div class="chips">${icon('plank', MATS.plank.icon, 'icon sm')} You have <b>${s.mats.plank}</b> Planks</div>
         <p>${bench}</p>
         ${w.ready ? `<p class="ready">✨ ${w.ready} plank${w.ready > 1 ? 's' : ''} ready to take!</p>` : ''}
         <p class="small">${LOGS_PER_PLANK} logs make a Plank, one every ${sawSeconds(s)} seconds, even while you're away.${s.build.sawmill < 2 ? ' An iron blade would cut Pine too.' : ''}</p>
       </div>`,
      btns,
      'celebrate quest sawmill',
    );
  }

  elderSays(text: string, hint?: string) {
    return this.dialog(
      `<div class="speaker">${icon('npc_elder', '🌿', 'icon xl')}<b>Elder Oswin</b></div>
       <div class="bubble">${esc(text)}</div>${hint ? `<div class="hint">🎯 ${esc(hint)}</div>` : ''}`,
      [['ok', 'Got it!']],
    );
  }

  questComplete(q: Quest) {
    const rewards = [
      ...Object.entries(q.reward?.mats ?? {}).map(([m, n]) => `<span class="chip ok">${icon(m, MATS[m as MatId].icon, 'icon sm')} ${esc(MATS[m as MatId].name)} ×${n}</span>`),
      ...(q.reward?.potions ? [`<span class="chip ok">🧪 Potion ×${q.reward.potions}</span>`] : []),
    ].join('');
    this.hooks.sound('treasure');
    return this.dialog(
      `${ribbon(`${q.chapter} complete!`)}${stage(goalIcon(q), 'small')}
       <div class="big">${esc(q.title)}</div>
       ${rewards ? `<div class="chips">${rewards}</div>` : '<p>Wonderful work!</p>'}`,
      [['ok', 'Hooray!']],
      'celebrate',
    );
  }

  questIntro(q: Quest) {
    return this.dialog(
      `${ribbon(`📜 ${q.chapter}`)}<div class="stage calm small"><div class="stage-art">${goalIcon(q)}</div></div>
       <div class="big">${esc(q.title)}</div>
       <div class="speaker small">${icon('npc_elder', '🌿', 'icon sm')}<b>Elder Oswin</b></div>
       <div class="bubble">${esc(q.text)}</div>
       <div class="hint">🎯 ${esc(q.hint)}</div>`,
      [['ok', "Let's go!"]],
      'celebrate quest',
    );
  }

  /** Letterbox bars for cutscenes. */
  cinema(on: boolean) {
    document.body.classList.toggle('cinema', on);
  }

  /** Someone talking up close: their portrait (in the right mood) and their words along the bottom, the world behind. */
  async talk(name: string, portrait: string, emoji: string, text: string, top = false) {
    this.modal.classList.add('cine');
    this.modal.classList.toggle('top', top);
    const r = await this.dialog(
      `<div class="talk">${icon(portrait, emoji, 'icon lg')}<div><b class="talk-name">${esc(name)}</b><div class="caption-text">${esc(text)}</div></div></div>`,
      [['ok', '▶']],
      'caption',
    );
    this.modal.classList.remove('cine', 'top');
    return r;
  }

  /** A story caption along the bottom of the screen; the world stays visible behind it. */
  async caption(text: string, speaker: 'elder' | 'narrator') {
    this.modal.classList.add('cine');
    const who = speaker === 'elder' ? `<div class="speaker small">${icon('npc_elder', '🌿', 'icon sm')}<b>Elder Oswin</b></div>` : '';
    const r = await this.dialog(`${who}<div class="caption-text ${speaker}">${esc(text)}</div>`, [['ok', '▶']], 'caption');
    this.modal.classList.remove('cine');
    return r;
  }

  itemFound(id: string, name: string, text: string, emoji = '🗡️', heading = 'You found') {
    this.hooks.sound('treasure');
    return this.dialog(
      `${ribbon(heading)}${stage(icon(id, emoji, 'icon xxl'))}
       <div class="big">${esc(name)}!</div><p>${esc(text)}</p>`,
      [['ok', 'Take it!']],
      'celebrate',
    );
  }

  /**
   * A new level: the game waits behind this while it shows how your stats grew and what you're now ready for
   * (a guardian at your level, an area that matches it, the dragon). The level number rings over from the old one,
   * then each stat ticks up in turn.
   */
  levelUp(lv: number, before: { maxHp: number; atk: number; def: number }, after: { maxHp: number; atk: number; def: number }, ready: string[]) {
    const rows = [['❤️', 'Max HP', before.maxHp, after.maxHp], ['⚔️', 'Attack', before.atk, after.atk], ['🛡️', 'Defense', before.def, after.def]] as const;
    const stats = rows.map(([e, label, a, b], i) =>
      `<div class="srow" style="--d:${0.75 + i * 0.28}s"><span class="sl">${e} ${label}</span><span class="sa">${a}</span><span class="sar">➜</span><b class="sb">${b}</b>${
        b > a ? `<span class="sd">+${b - a}</span>` : ''}</div>`).join('');
    const p = this.dialog(
      `${ribbon('Level up!')}${stage(`<div class="lvbadge"><small>LEVEL</small><b class="old">${lv - 1}</b><b class="new">${lv}</b></div>`)}
       <div class="lvsheet"><div class="stats2">${stats}</div>
       ${ready.length ? `<div class="ready">${ready.map((r) => `<div>🎯 ${esc(r)}</div>`).join('')}</div>` : ''}</div>`,
      [['ok', 'Onward!']],
      'celebrate levelup',
    );
    this.hooks.sound('levelup');
    window.setTimeout(() => this.hooks.sound('ding'), 450);
    rows.forEach((_, i) => window.setTimeout(() => this.hooks.sound('tick'), (0.75 + i * 0.28) * 1000));
    return p;
  }

  /** A gathering skill or weapon handling level: what it improves, and what you can craft now. */
  skillUp(title: string, lv: number, emoji: string, note: string, unlocks: { id: string; name: string; emoji: string }[]) {
    const list = unlocks.map((u, i) => `<div class="u" style="--d:${0.7 + i * 0.15}s">${icon(u.id, u.emoji, 'icon lg')}<span>${esc(u.name)}</span></div>`).join('');
    const p = this.dialog(
      `${ribbon(`${title} up!`)}${stage(`<div class="lvbadge skill"><span class="emo">${emoji}</span><b class="old">${lv - 1}</b><b class="new">${lv}</b></div>`)}
       <div class="lvsheet"><p>${esc(note)}</p>
       ${list ? `<div class="unlock-h">✨ New in the Forge</div><div class="unlocks">${list}</div>` : ''}</div>`,
      [['ok', 'Nice!']],
      'celebrate levelup',
    );
    this.hooks.sound('levelup');
    window.setTimeout(() => this.hooks.sound('ding'), 450);
    return p;
  }

  /** Shown right after crafting: celebrate the new item and offer to equip it on the spot. */
  newGear(g: Gear, current: Gear | null) {
    const cmp = (k: 'atk' | 'def' | 'hp') => {
      const a = current?.[k] ?? 0, b = g[k] ?? 0;
      if (!a && !b) return '';
      const d = b - a;
      return `<span class="chip ${d >= 0 ? 'ok' : 'miss'}">${k.toUpperCase()} ${a} → <b>${b}</b></span>`;
    };
    this.hooks.sound('treasure');
    return this.dialog(
      `${ribbon(`New ${g.slot}!`)}${stage(icon(g.id, g.icon, 'icon xxl'))}
       <div class="big">${esc(g.name)}</div>
       <p>${esc(g.desc)}</p>
       <div class="chips">${cmp('atk')}${cmp('def')}${cmp('hp')}</div><br>`,
      [['later', 'Keep in bag'], ['equip', 'Equip now!']],
      'celebrate',
    );
  }

  challenge(kind: MonsterKind, name: string, title: string, lv: number, playerLv: number, zoneName: string) {
    const under = playerLv < lv;
    return this.dialog(
      `${ribbon(title || 'Guardian')}<div class="stage calm"><div class="stage-art">${bossIcon(kind, 'icon xxl')}</div></div>
       <div class="big">${esc(name)}</div>
       <p>It blocks the road to <b>${esc(zoneName)}</b>. Defeat it to open the way and light a campfire checkpoint.</p>
       <div class="lvcmp ${under ? 'bad' : 'good'}">Boss Lv ${lv} · You Lv ${playerLv}${under ? ' · ⚠️ Train a bit more!' : ' · 💪 Ready!'}</div>`,
      [['no', 'Not yet'], ['yes', '⚔️ Challenge!', 'alt']],
      'celebrate guardian',
    );
  }

  roadOpened(bossName: string, zoneName: string, kind: MonsterKind) {
    this.hooks.sound('treasure');
    return this.dialog(
      `${ribbon('The road is open!')}${stage(bossIcon(kind, 'icon xl'), 'small')}
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
