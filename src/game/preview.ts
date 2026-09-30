// A move's preview popup: its demo battle plays on a loop in a little window, with what it does and what to press.
// Shown when handling unlocks a special rank or a class trick, and again from the Skills menu's path ("▶ Watch").
import { MoveDemo, moveAt, type DemoMove } from '../battle/demo';
import { drawBattle } from '../battle/render';
import { STYLE_NAMES, type Style } from '../data';
import { usingKeyboard } from '../input';
import { esc } from '../ui';
import { TRICKS, skillAt, MOVESETS } from '../weapons';
import { G } from './context';

/** How far a preview zooms in from the whole arena, onto you and the dummies. */
const CLOSE_UP = 2.3;

/** The button for an action: its key on a keyboard, its emoji on a touch screen. */
const btn = (key: string, emoji: string) => (usingKeyboard() ? `<kbd>${key}</kbd>` : emoji);

/** What a move is called, what it does, and how you do it. */
function words(m: DemoMove): { name: string; note: string; how: string } {
  if (m.kind === 'skill') {
    const sk = skillAt(MOVESETS[m.style].skill, m.lv)!;
    return { name: sk.name, note: sk.note, how: `${btn('L', '✨')} to use it. It recharges after.` };
  }
  const t = TRICKS[m.trick];
  // Just what to press, and when (the note above says what it does).
  const how = {
    riposte: `${btn('K', '💨')} through its attack, then ${btn('J', '⚔️')} straight away.`,
    stagger: `${btn('J', '⚔️')} just as it winds up.`,
    snare: `${btn('J', '⚔️')} with it right at the tip of your whip.`,
    blink: `${btn('K', '💨')} to blink out of the way.`,
  }[m.trick];
  return { name: t.name, note: t.note, how };
}

/** Plays a move's preview until you close it. `fresh`: it was just unlocked. */
export async function showPreview(m: DemoMove, fresh = false) {
  const w = words(m);
  const mark = m.kind === 'skill' ? '✨' : '🎯';
  const shown = G.ui.dialog(
    `<div class="preview-head"><small>${fresh ? `New ${STYLE_NAMES[m.style]} move!` : STYLE_NAMES[m.style]}</small><b>${mark} ${esc(w.name)}</b></div>
     <canvas class="demo-cv" aria-label="${esc(w.name)} being used"></canvas>
     <p class="preview-note">${esc(w.note)}</p><p class="preview-how">${w.how}</p>`,
    [['ok', fresh ? 'Got it!' : 'Done']],
    'preview',
  );
  const cv = document.querySelector<HTMLCanvasElement>('#modal .sheet canvas.demo-cv');
  const ctx = cv?.getContext('2d');
  if (!cv || !ctx) return shown;
  const demo = new MoveDemo(m, G.save, G.audio);
  let open = true, last = performance.now();
  const frame = (now: number) => {
    if (!open) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    demo.update(dt);
    const dpr = Math.min(2, window.devicePixelRatio || 1), cw = cv.clientWidth, ch = cv.clientHeight;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
      cv.width = Math.round(cw * dpr);
      cv.height = Math.round(ch * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBattle(demo.battle, ctx, cw, ch, CLOSE_UP);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  try {
    return await shown;
  } finally {
    open = false;
  }
}

/** Every move newly unlocked between two handling levels, previewed one after another. */
export async function previewUnlocked(style: Style, from: number, to: number) {
  for (let lv = from + 1; lv <= to; lv++) {
    const m = moveAt(style, lv);
    if (m) await showPreview(m, true);
  }
}
