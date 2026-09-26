// Dev tools, only in dev builds (`bun run dev`, or `bun run build --dev`): save slots and preset saves, from a button
// on the title screen or straight from the URL:
//
//   ?preset=poppy-chase   start that preset (in its own slot, reset to the preset each time)
//   ?slot=copy-1          switch to a slot (?slot=main for your real save)
//
// Switching reloads the page into the slot and continues straight into the game.
import { QUESTS, zoneAtX } from '../data';
import { G } from '../game/context';
import { activeSlot, setActiveSlot, slotKey } from '../slots';
import { SAVE_KEY, type SaveState } from '../state';
import { LOG_KEY, TIME_KEY } from '../stats';
import { PRESETS } from './presets';

/** Set across the reload so the game continues without a stop at the title screen. */
const AUTOPLAY = 'sprout-quest-autoplay';
const MAIN = 'main';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
const name = (slot: string | null) => slot ?? MAIN;
const slotOf = (name: string) => (name === MAIN ? null : name);

export function install() {
  const url = new URL(location.href);
  const preset = url.searchParams.get('preset'), slot = url.searchParams.get('slot');
  if (preset || slot !== null) {
    url.searchParams.delete('preset');
    url.searchParams.delete('slot');
    history.replaceState(null, '', url);
    if (preset) startPreset(preset);
    else switchTo(slotOf(slot || MAIN));
    return;
  }
  document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
  addTitleButton();
  if (activeSlot()) document.body.insertAdjacentHTML('beforeend', `<div id="dev-badge">🛠 ${esc(activeSlot()!)}</div>`);
  if (sessionStorage.getItem(AUTOPLAY)) {
    sessionStorage.removeItem(AUTOPLAY);
    // Continue as soon as the title's buttons are up (once everything's loaded).
    const t = setInterval(() => {
      const btns = document.querySelector<HTMLElement>('.title-btns'), cont = document.getElementById('btn-continue');
      if (btns?.hidden || !cont || cont.hidden) return;
      clearInterval(t);
      cont.click();
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

/** Reloads into a slot, straight into the game if it has a save. */
function switchTo(slot: string | null) {
  setActiveSlot(slot);
  if (localStorage.getItem(slotKey(SAVE_KEY, slot))) sessionStorage.setItem(AUTOPLAY, '1');
  location.reload();
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

async function panel() {
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
     <button class="go ghost dev-copy" data-dialog="copy">Copy <b>${esc(active)}</b> to a new slot</button>
     <div class="dev-h">Start from a preset</div>
     <div class="dev-list">${presetRows}</div>`,
    [['close', 'Close']],
    'dev-panel',
  );
  const [act, arg] = r.split(/:(.*)/s);
  if (act === 'play') switchTo(slotOf(arg));
  else if (act === 'preset') startPreset(arg);
  else if (act === 'del') {
    deleteSlot(arg);
    void panel();
  } else if (act === 'copy') {
    let n = 1;
    while (localStorage.getItem(slotKey(SAVE_KEY, `copy-${n}`))) n++;
    copySlot(activeSlot(), `copy-${n}`);
    void panel();
  }
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
#dev-badge {
  position: fixed; left: 50%; bottom: calc(4px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 30;
  font: 700 11px ui-rounded, system-ui, sans-serif; color: #fff; background: rgba(40, 20, 50, 0.55);
  padding: 2px 8px; border-radius: 8px; pointer-events: none;
}
`;
