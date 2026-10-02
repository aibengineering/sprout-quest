// Dev tools, only in dev builds (`bun run dev`, or `bun run build --dev`): save slots and preset saves, from a button
// on the title screen or straight from the URL:
//
//   ?preset=poppy-chase   start that preset (in its own slot, reset to the preset each time)
//   ?slot=copy-1          switch to a slot (?slot=main for your real save)
//   ?tower&floor=8&…      a Battle Tower run at that point, in the tower slot (see towerLink.ts for the settings)
//
// Switching reloads the page into the slot and continues straight into the game.
import { QUESTS, zoneAtX } from '../data';
import { G, persist } from '../game/context';
import { activeSlot, freezeStorage, setActiveSlot, slotKey } from '../slots';
import { SAVE_KEY, type SaveState } from '../state';
import { LOG_KEY, TIME_KEY } from '../stats';
import { TOWER_SLOT, XP_RATES, XP_RATE_KEY, loadXpRate, openCamp } from '../game/tower';
import { LAB_CSS, lab } from './lab';
import { PRESETS, towerRun } from './presets';
import { towerSaveFromLink } from './towerLink';
import { installPlaytest } from './playtest';
export { tickPlaytest } from './playtest';

/** Set across the reload so the game continues without a stop at the title screen. */
const AUTOPLAY = 'sprout-quest-autoplay';
/** Set across the reload into the tower's slot, to open its camp once the game is up. */
const CAMP = 'sprout-quest-camp';
/** Whether the performance readout is showing, per device (off unless you turn it on in the panel). */
const PERF = 'sprout-quest-dev-perf';
const perfOn = () => localStorage.getItem(PERF) === '1';
const MAIN = 'main';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
const name = (slot: string | null) => slot ?? MAIN;
const slotOf = (name: string) => (name === MAIN ? null : name);

export function install() {
  installPlaytest();
  const url = new URL(location.href);
  const preset = url.searchParams.get('preset'), slot = url.searchParams.get('slot');
  if (url.searchParams.has('tower')) {
    // A link into the tower at a set point: a fresh run built from it, opening on its camp.
    const save = towerSaveFromLink(url.searchParams);
    const xp = Number(url.searchParams.get('xp'));
    history.replaceState(null, '', url.pathname);
    deleteSlot(TOWER_SLOT);
    localStorage.setItem(slotKey(SAVE_KEY, TOWER_SLOT), JSON.stringify(save));
    localStorage.setItem(XP_RATE_KEY, String(XP_RATES.includes(xp) ? xp : 1));
    sessionStorage.setItem(CAMP, '1');
    switchTo(TOWER_SLOT);
    return;
  }
  if (preset || slot !== null) {
    url.searchParams.delete('preset');
    url.searchParams.delete('slot');
    history.replaceState(null, '', url);
    if (preset) startPreset(preset);
    else switchTo(slotOf(slot || MAIN));
    return;
  }
  document.head.insertAdjacentHTML('beforeend', `<style>${CSS}${LAB_CSS}</style>`);
  // The raised XP rate is for the tower run only; every other save plays at ×1.
  loadXpRate();
  addTitleButton();
  // The same panel from inside the game: a row at the top of the menu's More tab.
  G.ui.devRow = {
    html: `<div class="mcard row"><div class="ico">🛠</div><div class="info"><div class="name">Save slots and presets</div>
      <div class="desc">Dev build · playing <b>${esc(name(activeSlot()))}</b></div></div><button class="go" data-do="dev">Open</button></div>`,
    open: () => void inGamePanel(),
  };
  perfMeter();
  const auto = sessionStorage.getItem(AUTOPLAY);
  if (auto) {
    sessionStorage.removeItem(AUTOPLAY);
    // Continue (or, for a fresh story, start a new game) as soon as the title's buttons are up (once everything's loaded).
    const t = setInterval(() => {
      const btns = document.querySelector<HTMLElement>('.title-btns'), btn = document.getElementById(auto === 'new' ? 'btn-new' : 'btn-continue');
      if (btns?.hidden || !btn || btn.hidden) return;
      clearInterval(t);
      btn.click();
    }, 100);
  }
  if (sessionStorage.getItem(CAMP)) {
    sessionStorage.removeItem(CAMP);
    const t = setInterval(() => {
      if (G.mode !== 'world' || G.trans || G.ui.isOpen) return;
      clearInterval(t);
      void openCamp();
    }, 100);
  }
}

// ------------------------------------------------------------------ slots

/** Every slot with a save in it (the main one always listed). */
function slots(): string[] {
  const found = new Set([MAIN]);
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(`${SAVE_KEY}:`)) found.add(k.slice(SAVE_KEY.length + 1));
  }
  return [...found].sort((a, b) => (a === MAIN ? -1 : b === MAIN ? 1 : a.localeCompare(b)));
}

function summary(slot: string | null): string {
  const raw = localStorage.getItem(slotKey(SAVE_KEY, slot));
  if (!raw) return 'Empty';
  try {
    const s = JSON.parse(raw) as SaveState;
    const where = zoneAtX(Math.floor(s.pos.x)).name;
    return `Lv ${s.lv} · ${QUESTS[s.quest]?.title ?? 'All done'} · ${where} · ${Math.round((s.playtime ?? 0) / 60)} min`;
  } catch {
    return 'Unreadable';
  }
}

const KEYS = [SAVE_KEY, LOG_KEY, TIME_KEY];

function copySlot(from: string | null, to: string) {
  for (const k of KEYS) {
    const v = localStorage.getItem(slotKey(k, from));
    if (v === null) localStorage.removeItem(slotKey(k, to));
    else localStorage.setItem(slotKey(k, to), v);
  }
}

function deleteSlot(slot: string) {
  for (const k of KEYS) localStorage.removeItem(slotKey(k, slot));
}

/** Reloads into a slot, straight into the game if it has a save (or into a new game, with `fresh`). */
function switchTo(slot: string | null, fresh = false) {
  // Save where you are first, then nothing more: the page saves on its way out, which would land in the new slot.
  if (G.mode !== 'title') persist();
  freezeStorage();
  setActiveSlot(slot);
  if (fresh) sessionStorage.setItem(AUTOPLAY, 'new');
  else if (localStorage.getItem(slotKey(SAVE_KEY, slot))) sessionStorage.setItem(AUTOPLAY, '1');
  location.reload();
}

/** The story from the very start (waking in the Quiet Glade), in a slot of its own: your other saves stay as they are. */
function newStory() {
  let n = 1;
  while (localStorage.getItem(slotKey(SAVE_KEY, `story-${n}`))) n++;
  deleteSlot(`story-${n}`);
  switchTo(`story-${n}`, true);
}

/** The Battle Tower: a run of its own in the tower slot (a fresh one with `fresh`), opening on its camp. */
function tower(fresh: boolean) {
  if (fresh || !localStorage.getItem(slotKey(SAVE_KEY, TOWER_SLOT))) {
    deleteSlot(TOWER_SLOT);
    localStorage.setItem(slotKey(SAVE_KEY, TOWER_SLOT), JSON.stringify(towerRun()));
  }
  sessionStorage.setItem(CAMP, '1');
  switchTo(TOWER_SLOT);
}

/** How far the tower run has got, if there is one. */
function towerFloorSaved(): number | null {
  try {
    const raw = localStorage.getItem(slotKey(SAVE_KEY, TOWER_SLOT));
    return raw ? (JSON.parse(raw) as SaveState).tower?.floor ?? 1 : null;
  } catch {
    return null;
  }
}

/** A preset gets its own slot, reset to the preset (with an empty play report) every time you start it. */
function startPreset(id: string) {
  const p = PRESETS.find((p) => p.id === id);
  if (!p) {
    console.warn(`No preset "${id}". Presets: ${PRESETS.map((p) => p.id).join(', ')}`);
    return;
  }
  const slot = `preset-${p.id}`;
  deleteSlot(slot);
  localStorage.setItem(slotKey(SAVE_KEY, slot), JSON.stringify(p.make()));
  switchTo(slot);
}

// ------------------------------------------------------------------ performance

/**
 * A small readout in the corner: frames per second, the average and worst frame time over the last second, how many
 * 3D character images were rendered in that second and the time spent issuing them, and the GPU the browser is using.
 * It never takes taps, so it can sit over buttons.
 */
function perfMeter() {
  const el = document.createElement('div');
  el.id = 'dev-perf';
  el.hidden = !perfOn();
  document.body.append(el);
  const gpu = (() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      const name = gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : gl ? 'WebGL' : 'no WebGL';
      // Chrome reports the GPU through its ANGLE layer: "ANGLE (Google Inc. (Imagination Technologies), Vulkan 1.3.0
      // (PowerVR B-Series BXM-8-256 (0x…)), driver …)". Show just the chip, and the API it's driven through.
      const vulkan = name.match(/Vulkan [\d.]+ \(([^()]+)/);
      if (vulkan) return `${vulkan[1].trim()} · Vulkan`;
      const parts = name.replace(/^ANGLE \((.*)\)$/, '$1').split(', ');
      return (parts.length > 1 ? parts[1] : parts[0]).slice(0, 48);
    } catch {
      return '?';
    }
  })();
  const times: number[] = [];
  let last = performance.now(), windowStart = last;
  let renders = 0, renderMs = 0;
  const stats = () => (window as unknown as { game?: { modelStats?: { renders: number; ms: number } } }).game?.modelStats;
  const tick = (now: number) => {
    times.push(now - last);
    last = now;
    if (now - windowStart >= 1000 && el.hidden) {
      times.length = 0;
      windowStart = now;
    } else if (now - windowStart >= 1000) {
      const s = stats();
      const dr = (s?.renders ?? 0) - renders, dm = (s?.ms ?? 0) - renderMs;
      renders = s?.renders ?? 0;
      renderMs = s?.ms ?? 0;
      const avg = times.reduce((a, b) => a + b, 0) / times.length, worst = Math.max(...times);
      el.innerHTML = `<b>${Math.round((times.length * 1000) / (now - windowStart))} fps</b> · ${avg.toFixed(1)} ms<br>worst ${worst.toFixed(0)} ms · 3D ${dr}/s ${dm.toFixed(0)} ms<br><small>${esc(gpu)}${activeSlot() ? `<br>🛠 ${esc(activeSlot()!)}` : ''}</small>`;
      el.classList.toggle('slow', avg > 20);
      times.length = 0;
      windowStart = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ the panel

function addTitleButton() {
  const btn = document.createElement('button');
  btn.id = 'btn-dev';
  btn.className = 'ver-btn';
  btn.textContent = `🛠 Save slot: ${name(activeSlot())}`;
  btn.addEventListener('click', () => {
    if (G.mode === 'title' && !G.ui.isOpen) void panel();
  });
  document.querySelector('.title-btns')!.after(btn);
}

/** The panel from the menu: the world waits behind it, and your progress is saved before switching slots. */
async function inGamePanel() {
  const was = G.mode;
  G.mode = 'dialog';
  persist();
  const r = await panel(true);
  // Switching slots reloads the page, and the lab can hand over to a fight or the tower's camp; anything else comes
  // back here.
  if (r !== 'away' && G.mode === 'dialog') G.mode = was === 'dialog' ? 'world' : was;
  G.input.reset();
}

/**
 * The panel. In the game it also leads to the combat lab, in any slot but your real save (the lab may hand over to a
 * fight or the tower's camp: 'away').
 */
async function panel(inGame = false): Promise<'away' | void> {
  const active = name(activeSlot());
  const slotRows = slots().map((n) => `
    <div class="dev-row${n === active ? ' on' : ''}">
      <div class="dev-info"><b>${esc(n)}${n === active ? ' · playing' : ''}</b><small>${esc(summary(slotOf(n)))}</small></div>
      ${n === active ? '' : `<button class="go" data-dialog="play:${esc(n)}">Play</button>`}
      ${n === MAIN ? '' : `<button class="go ghost" data-dialog="del:${esc(n)}" title="Delete">✕</button>`}
    </div>`).join('');
  const presetRows = PRESETS.map((p) => `
    <div class="dev-row">
      <div class="dev-info"><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></div>
      <button class="go" data-dialog="preset:${p.id}">Start</button>
    </div>`).join('');
  const r = await G.ui.dialog(
    `<div class="big" style="font-size:22px">🛠 Save slots</div>
     <p class="dev-note">Dev builds only. Each slot keeps its own save and play report; <b>main</b> is your real playthrough.</p>
     <div class="dev-list">${slotRows}</div>
     <button class="go dev-copy" data-dialog="fresh">🌱 New story in a fresh slot</button>
     <button class="go ghost dev-copy" data-dialog="copy">Copy <b>${esc(active)}</b> to a new slot</button>
     <div class="dev-h">Combat</div>
     ${towerRow(inGame)}
     ${inGame && activeSlot() !== null ? `<div class="dev-row"><div class="dev-info"><b>⚔️ Combat lab</b><small>Any fight, levels, handling, gear and XP rate, for <b>${esc(active)}</b></small></div>
       <button class="go" data-dialog="lab">Open</button></div>` : ''}
     <div class="dev-h">Display</div>
     <div class="dev-row"><div class="dev-info"><b>Performance readout</b><small>FPS, frame times and the GPU, at the left edge</small></div>
       <button class="go${perfOn() ? '' : ' ghost'}" data-dialog="perf">${perfOn() ? 'Shown' : 'Hidden'}</button></div>
     <div class="dev-h">Start from a preset</div>
     <div class="dev-list">${presetRows}</div>`,
    [['close', 'Close']],
    'dev-panel',
  );
  const [act, arg] = r.split(/:(.*)/s);
  if (act === 'play') switchTo(slotOf(arg));
  else if (act === 'preset') startPreset(arg);
  else if (act === 'fresh') newStory();
  else if (act === 'lab') return (await lab()) === 'away' ? 'away' : panel(inGame);
  else if (act === 'tower') {
    // Already in the run: straight to its camp.
    if (inGame && activeSlot() === TOWER_SLOT && arg !== 'new') {
      void openCamp();
      return 'away';
    }
    tower(arg === 'new');
  }
  else if (act === 'perf') {
    localStorage.setItem(PERF, perfOn() ? '0' : '1');
    document.getElementById('dev-perf')!.hidden = !perfOn();
    return panel(inGame);
  }
  else if (act === 'del') {
    deleteSlot(arg);
    return panel(inGame);
  } else if (act === 'copy') {
    let n = 1;
    while (localStorage.getItem(slotKey(SAVE_KEY, `copy-${n}`))) n++;
    copySlot(activeSlot(), `copy-${n}`);
    return panel(inGame);
  }
}

function towerRow(inGame: boolean) {
  const floor = towerFloorSaved(), here = inGame && activeSlot() === TOWER_SLOT;
  return `<div class="dev-row"><div class="dev-info"><b>🗼 Battle Tower</b><small>${
    floor === null ? 'A run of its own from Lv 1: fight floor by floor, level up, forge and switch weapons at the camp' : `Run in the <b>tower</b> slot, on floor ${floor}`
  }</small></div>
    ${floor === null ? '' : `<button class="go" data-dialog="tower">${here ? 'Camp' : 'Continue'}</button>`}
    <button class="go${floor === null ? '' : ' ghost'}" data-dialog="tower:new">${floor === null ? 'Start' : 'New run'}</button></div>`;
}

const CSS = `
#btn-dev { margin-top: 6px; }
.sheet.dev-panel { max-height: 86vh; overflow-y: auto; }
.dev-panel .result { text-align: left; }
.dev-note { font-size: 13px; opacity: 0.75; margin: 4px 0 10px; }
.dev-h { font-weight: 900; margin: 14px 0 6px; }
.dev-list { display: flex; flex-direction: column; gap: 6px; }
.dev-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 12px; background: rgba(90, 58, 106, 0.07); }
.dev-row.on { background: rgba(80, 180, 90, 0.18); }
.dev-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.dev-info small { font-size: 12px; opacity: 0.75; }
.dev-row .go { padding: 6px 12px; font-size: 14px; }
.dev-copy { margin-top: 8px; width: 100%; }
.tower-camp .tower-acts { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 6px 0 4px; }
.tower-camp .tower-acts .go { padding: 8px 14px; font-size: 15px; }
.tower-camp .tower-ready { margin: 2px 0 6px; font-size: 13px; }
.tower-camp .tower-ready span { display: inline-block; margin: 0 4px; font-weight: 700; }
.tower-camp .tower-ready .ok { color: #3a9a4a; }
.tower-camp .tower-ready .no { color: #d0503a; }
.tower-camp .tower-train { display: flex; gap: 6px; align-items: center; justify-content: center; margin: 4px 0 6px; }
.tower-camp .tower-train select { flex: 1; min-width: 0; font: inherit; font-size: 13px; padding: 6px; border-radius: 10px; border: 2px solid rgba(90, 58, 106, 0.25); background: #fff; }
.tower-camp .tower-train .go { padding: 6px 10px; font-size: 13px; }
#dev-perf {
  /* Middle of the left edge: over the world or the arena, clear of the HUD, the goal and every button. */
  position: fixed; left: calc(4px + env(safe-area-inset-left)); top: 56%; z-index: 15; max-width: 46vw;
  font: 700 10.5px/1.3 ui-monospace, Menlo, monospace; color: #d8ffd0; background: rgba(20, 12, 28, 0.6);
  padding: 3px 7px; border-radius: 8px; pointer-events: none; overflow: hidden; text-overflow: ellipsis;
}
#dev-perf b { color: #fff; }
#dev-perf small { color: rgba(255, 255, 255, 0.6); font-size: 10px; }
#dev-perf.slow b { color: #ffb0a0; }

`;
