// Granny's Kitchen, walked into: pick a recipe from her book, carry each ingredient from the pantry to the pot, stir
// it (tap as the spoon comes round through the gold), spoon it out and serve it at the table. The meal is exactly
// the one she'd make you from her menu (kitchen.ts): nothing is spent until it's served. Granny fusses about,
// and asking her still brings up her menu, for when you'd rather she just made it.
import { MATS, type MatId } from '../data';
import { addToPot, cook, cooked, kitchenOpen, knownMeals, MEALS, MEAL_ORDER, startDish, stillNeeded, stir, STIRS, type Cooking, type MealId } from '../kitchen';
import { hasMats } from '../rules';
import type { Room } from '../room';
import { crate, drawCarried, drawProp, hintPill, paintShell, paintWindow, PROP_SCALE, propRise, propUnit, steam } from '../roomArt';
import { rrect } from '../sprites';
import { costChips, esc, icon } from '../ui';
import type { WorldObj } from '../world';
import { G, paused, persist } from './context';
import type { RoomPlay } from './rooms';
import { askFavour, bramDue, grannyCooks } from './stories/granny';

const GRANNY = 'room:granny';
/** Where she potters, by her book and just in from the door, with clear floor over her head. */
const GRANNY_AT = { x: 6.5, y: 7.1 };

const TAU = Math.PI * 2;

/** The pot on the stove (null: empty, waiting for a recipe). */
let pot: Cooking | null = null;
/** What you're carrying: an ingredient for the pot, or the meal for the table. */
let held: { mat: MatId } | { dish: MealId } | null = null;
/** Stirring: the spoon's angle round the pot, the gold arc's middle, and whether she's told you to go gently yet. */
let stirring: { a: number; gold: number } | null = null;
let fussed = false;
/** A served meal sits on the table for a moment. */
let served: { dish: MealId; t: number } | null = null;
let t = 0;

const ENTER_LINES = ['Come in, come in! Wipe your feet, dear.', "There's my favourite helper. My book's on the stand.", "Hungry? Pick a recipe and we'll make it together."];
let enterLine = 0;

/** The gold arc's half-width and the spoon's speed (radians, radians per second): generous, it's a kitchen. */
const GOLD = 0.6, SPOON = 3.6;

const say = (text: string, secs = 3) => G.over.room?.actors.say(GRANNY, text, secs);
const feel = (emoji: string) => G.over.room?.actors.bubble(GRANNY, emoji);
const lower = (m: MatId) => MATS[m].name.toLowerCase();

function reset() {
  pot = null;
  held = null;
  stirring = null;
  fussed = false;
}

/** Her book: the recipes she knows, each with what it takes; resolves to the one you picked. */
async function book() {
  const s = G.save;
  const rows = knownMeals(s).map((id) => {
    const m = MEALS[id], can = hasMats(s, m.recipe);
    return `<div class="mcard row"><div class="ico">${icon(`meal_${id}`, m.icon)}</div><div class="info">
      <div class="name">${esc(m.name)}</div><div class="desc">${esc(m.desc)}</div><div class="chips">${costChips(s, m.recipe)}</div></div>
      <button class="go" data-dialog="dish:${id}" ${can ? '' : 'disabled'}>Make</button></div>`;
  }).join('');
  const r = await paused(() => G.ui.dialog(
    `<div class="big" style="font-size:22px">📖 Granny's Recipes</div><p>Pick one, then fetch what it takes from the pantry.</p><div class="kitchen">${rows}</div>`,
    [['close', 'Not now']],
    'kitchen',
  ));
  if (!r.startsWith('dish:')) return;
  const id = r.slice(5) as MealId;
  const c = MEAL_ORDER.includes(id) ? startDish(s, id) : 'unknown';
  if (typeof c === 'string') return;
  pot = c;
  held = null;
  stirring = null;
  fussed = false;
  G.audio.play('ui');
  say(`${MEALS[id].name}? Lovely. Fetch the ${lower(stillNeeded(c)[0])} from the pantry, dear.`);
  feel('😊');
}

function pantry() {
  if (!pot) return say('Pick something from my book first, dear.');
  if (held) return say("One thing at a time, dear. Into the pot with that.");
  const next = stillNeeded(pot)[0];
  if (!next) return say("That's everything. Now give it a stir.");
  held = { mat: next };
  G.audio.play('craftPull');
  const o = G.over.room!.station('pantry')!;
  G.over.fx.burst((o.x + o.w / 2) * G.over.ts, (o.y - 0.4) * G.over.ts, '#fff6c8', 6, G.over.ts * 1.2, { star: true, size: G.over.ts * 0.06, life: 0.5 });
}

function stove(o: WorldObj) {
  const ts = G.over.ts, { x, y } = potAt(o, ts);
  if (held && 'mat' in held) {
    if (!pot || !addToPot(pot, held.mat)) return;
    G.audio.play(held.mat === 'goo' ? 'craftGoo' : held.mat === 'fluff' ? 'craftFluff' : 'pickup');
    G.over.fx.burst(x, y, '#9ad8ff', 10, ts * 1.6, { size: ts * 0.07, life: 0.5, grav: ts * 2 });
    held = null;
    const next = stillNeeded(pot)[0];
    say(next ? `In it goes! Now the ${lower(next)}.` : "That's everything. Now stir, nice and gentle.");
    return;
  }
  if (held) return say('Serve it at the table, dear, while it\'s hot.');
  if (!pot) return say("The pot's waiting. My book's on the stand.");
  if (stillNeeded(pot).length) return say(`Still needs the ${lower(stillNeeded(pot)[0])}, dear.`);
  if (!cooked(pot)) {
    stirring = { a: Math.PI / 2, gold: Math.random() * TAU };
    G.input.reset();
    return;
  }
  // Spooned out, ready for the table.
  held = { dish: pot.dish };
  G.audio.play('pickup');
  G.over.fx.burst(x, y, '#fff6c8', 8, ts * 1.2, { star: true, size: ts * 0.07, life: 0.6 });
}

function table(o: WorldObj) {
  if (!held || !('dish' in held)) return say(pot ? 'Cook it first, then we eat at the table.' : "That's for eating at, dear. Cook something first!");
  const id = held.dish, m = MEALS[id];
  if (cook(G.save, id) !== 'ok') {
    reset();
    return say("Oh! We're short of something. Never mind, dear.");
  }
  reset();
  served = { dish: id, t: 0 };
  if (!G.save.flags.includes('kitchen:byhand')) G.save.flags.push('kitchen:byhand');
  persist();
  G.audio.play('craft');
  const ts = G.over.ts;
  G.over.fx.burst((o.x + o.w / 2) * ts, (o.y - 0.2) * ts, '#fff6a0', 16, ts * 2.4, { star: true, size: ts * 0.08, life: 0.8 });
  G.ui.banner(`${m.icon} ${m.name}`, m.desc);
  say(`${m.name}! Eat up, there's plenty more.`);
  feel('🥰');
}

/** One tap while stirring: through the gold is a good stir, anywhere else a slop. */
function stirTap() {
  if (!stirring || !pot) return;
  const off = Math.abs(((stirring.a - stirring.gold + 3 * Math.PI) % TAU) - Math.PI);
  const o = G.over.room!.station('stove')!, ts = G.over.ts, { x, y } = potAt(o, ts);
  if (off <= GOLD) {
    G.audio.play('craftStitch');
    G.over.fx.burst(x, y, '#ffe08a', 8, ts * 1.4, { star: true, size: ts * 0.06, life: 0.5 });
    if (stir(pot)) {
      stirring = null;
      say('Smells lovely! Spoon it out for the table.');
      feel('😋');
    } else stirring.gold = (stirring.gold + Math.PI * (0.6 + Math.random() * 0.8)) % TAU;
  } else {
    G.audio.play('glance');
    G.over.fx.burst(x, y, '#c8a070', 5, ts * 1.2, { size: ts * 0.06, life: 0.4, grav: ts * 3 });
    if (!fussed) {
      fussed = true;
      say("Gently, dear! It's a pot, not a monster.");
      feel('😅');
    }
  }
}

function tick(dt: number, room: Room): boolean {
  t += dt;
  if (served) {
    served.t += dt;
    if (served.t > 4) served = null;
  }
  const name = (m: MatId) => MATS[m].name;
  for (const o of room.objs) {
    if (o.kind !== 'station') continue;
    if (o.id === 'pantry') o.label = pot && !held && stillNeeded(pot).length ? `Take ${name(stillNeeded(pot)[0])}` : 'Pantry';
    if (o.id === 'stove') o.label = held && 'mat' in held ? `Add ${name(held.mat)}` : pot && !held && !stillNeeded(pot).length ? (cooked(pot) ? 'Spoon it out' : 'Stir') : 'Stove';
    if (o.id === 'table') o.label = held && 'dish' in held ? 'Serve' : 'Table';
  }
  // When she's a favour to ask (Bram's pie), she says so.
  const g = room.actors.get(GRANNY);
  if (g) {
    g.label = bramDue() ? 'Talk' : 'Ask Granny';
    g.mood = bramDue() ? '💭' : undefined;
  }
  if (!stirring) return false;
  stirring.a = (stirring.a + dt * SPOON) % TAU;
  // Walking off (or Esc) puts the spoon down; the pot waits.
  const a = G.input.axis();
  if (Math.hypot(a.x, a.y) > 0.6 || G.input.consume('menu')) {
    stirring = null;
    return false;
  }
  if (G.input.consume('act') || G.input.consume('tap') || G.input.consume('attack')) stirTap();
  return true;
}

// ---------------------------------------------------------------- drawing

function floor(ctx: CanvasRenderingContext2D, ts: number) {
  const room = G.over.room!;
  paintShell(ctx, room, ts, { boards: ['#c98d5a', '#bf8350', 'rgba(90,50,30,0.35)'], board: 0.5, wall: '#f6e3c8', stripe: 'rgba(232,170,150,0.35)', wainscot: '#a8714a', wood: '#7a4a30' });
  // A window over her book, a little shelf of plates, and a framed drawing of Poppy and Mr. Floppers.
  paintWindow(ctx, 6.3, -0.95, 0.85, 1.05, ts, '#7a4a30', '#e86a8a');
  ctx.fillStyle = '#7a4a30';
  ctx.fillRect(1.0 * ts, -0.35 * ts, 2.0 * ts, 0.1 * ts);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = ['#ffffff', '#9ad8ff', '#ffffff', '#f8c0d0'][i];
    ctx.beginPath();
    ctx.arc((1.25 + i * 0.5) * ts, -0.55 * ts, 0.2 * ts, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#c8a070';
  rrect(ctx, 3.85 * ts, -1.2 * ts, 0.9 * ts, 0.75 * ts, ts * 0.05);
  ctx.fill();
  ctx.fillStyle = '#fff8e8';
  ctx.fillRect(3.95 * ts, -1.1 * ts, 0.7 * ts, 0.55 * ts);
  ctx.fillStyle = '#ff8ab0';
  ctx.beginPath();
  ctx.arc(4.2 * ts, -0.8 * ts, 0.12 * ts, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f0e0d0';
  ctx.beginPath();
  ctx.ellipse(4.45 * ts, -0.78 * ts, 0.1 * ts, 0.08 * ts, 0, 0, TAU);
  ctx.fill();
  // The rug under the table.
  const tb = room.station('table')!;
  ctx.fillStyle = '#d8606a';
  rrect(ctx, (tb.x - 0.3) * ts, (tb.y - 0.5) * ts, (tb.w + 0.6) * ts, 1.85 * ts, ts * 0.5);
  ctx.fill();
  ctx.strokeStyle = '#ffd38a';
  ctx.lineWidth = Math.max(2, ts * 0.06);
  rrect(ctx, (tb.x - 0.15) * ts, (tb.y - 0.38) * ts, (tb.w + 0.3) * ts, 1.61 * ts, ts * 0.4);
  ctx.stroke();
}

/** How far the stove's model stands back from the front of its box (tiles), and where its pot's surface is. */
const STOVE_BACK = 0.16;
/** The pot sits left of the stove's middle, its stew about 1.37 Blender units up (seen at 30°: × 0.87). */
const potAt = (o: WorldObj, ts: number) => ({ x: (o.x + o.w / 2) * ts - 0.25 * propUnit(ts), y: (o.y + o.h - STOVE_BACK * PROP_SCALE) * ts - propRise(1.37, ts) });

function obj(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number): number | void {
  switch (o.id) {
    case 'pantry':
      return drawProp(ctx, 'k_pantry', o, ts, 0.12, (x, y, w, h) => {
        crate(ctx, x, y, w, h, '#8a5a3a', '#a8714a', ts * 1.6);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = ['#ffd35a', '#9ad85a', '#ff8a5a', '#ffffff', '#c8a0ff', '#8ad8ff'][i];
          ctx.fillRect(x + (0.15 + (i % 3) * 0.32) * w, y - ts * (1.3 - Math.floor(i / 3) * 0.7), w * 0.2, ts * 0.4);
        }
      });
    case 'stove': {
      const top = drawProp(ctx, 'k_stove', o, ts, STOVE_BACK, (x, y, w, h) => {
        crate(ctx, x, y, w, h, '#3a3440', '#5a5260', ts * 0.6);
        ctx.fillStyle = '#5a5a6a';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y - ts * 0.55, w * 0.32, ts * 0.22, 0, 0, TAU);
        ctx.fill();
      });
      // What's in the pot: a bubbling stew once anything's in, steaming harder once it's cooked.
      const { x: cx, y: cy } = potAt(o, ts);
      if (pot?.added.length) {
        ctx.fillStyle = cooked(pot) ? '#e8a050' : '#d8b878';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 0.4 * propUnit(ts), 0.2 * propUnit(ts), 0, 0, TAU);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          const q = (t * 1.3 + i / 3) % 1;
          ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - q)})`;
          ctx.beginPath();
          ctx.arc(cx + (i - 1) * ts * 0.15, cy - q * ts * 0.05, ts * (0.03 + q * 0.035), 0, TAU);
          ctx.fill();
        }
        steam(ctx, cx, cy - ts * 0.1, ts, t, pot && cooked(pot) ? 1 : 0.5);
      }
      return top;
    }
    case 'book':
      return drawProp(ctx, 'k_book', o, ts, 0.08, (x, y, w, h) => {
        crate(ctx, x + w * 0.2, y, w * 0.6, h, '#8a5a3a', '#a8714a', ts * 0.5);
        ctx.fillStyle = '#e8584a';
        ctx.fillRect(x + w * 0.1, y - ts * 0.75, w * 0.8, ts * 0.3);
        ctx.fillStyle = '#fff8e8';
        ctx.fillRect(x + w * 0.15, y - ts * 0.72, w * 0.7, ts * 0.22);
      });
    case 'table': {
      const top = drawProp(ctx, 'k_table', o, ts, 0.4, (x, y, w, h) => crate(ctx, x, y, w, h, '#a8714a', '#f6e8d8', ts * 0.45));
      if (served) {
        const cx = (o.x + o.w / 2) * ts, cy = (o.y + 0.1) * ts;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (4 - served.t) * 2);
        drawCarried(ctx, cx, cy + ts * 1.55, ts * 0.9, `meal_${served.dish}`, MEALS[served.dish].icon);
        ctx.restore();
      }
      return top;
    }
  }
}

function over(ctx: CanvasRenderingContext2D, ts: number) {
  const hx = G.over.x * ts, hy = G.over.y * ts;
  if (held) {
    if ('mat' in held) drawCarried(ctx, hx, hy, ts, held.mat, MATS[held.mat].icon, MEALS[pot!.dish].recipe[held.mat], t);
    else drawCarried(ctx, hx, hy, ts, `meal_${held.dish}`, MEALS[held.dish].icon, undefined, t);
  }
  if (stirring && pot) drawStirDial(ctx, ts);
}

/** Over the pot while you stir: the rim, the gold arc to hit, the spoon going round, and a dot per good stir. */
function drawStirDial(ctx: CanvasRenderingContext2D, ts: number) {
  const o = G.over.room!.station('stove')!, pot0 = potAt(o, ts), cx = pot0.x, cy = pot0.y - ts * 1.6, r = ts * 0.7;
  ctx.save();
  ctx.fillStyle = 'rgba(42,26,48,0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + ts * 0.22, 0, TAU);
  ctx.fill();
  ctx.lineWidth = ts * 0.16;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#ffd35a';
  ctx.beginPath();
  ctx.arc(cx, cy, r, stirring!.gold - GOLD, stirring!.gold + GOLD);
  ctx.stroke();
  const sx = cx + Math.cos(stirring!.a) * r, sy = cy + Math.sin(stirring!.a) * r;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#8a5a3a';
  ctx.lineWidth = ts * 0.05;
  ctx.beginPath();
  ctx.arc(sx, sy, ts * 0.15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < STIRS; i++) {
    ctx.fillStyle = i < pot!.stirs ? '#8ad85a' : 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx + (i - (STIRS - 1) / 2) * ts * 0.32, cy, ts * 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function hud(ctx: CanvasRenderingContext2D, vw: number) {
  const name = (m: MatId) => MATS[m].name;
  const text = stirring ? 'Tap as the spoon passes the gold!'
    : held && 'dish' in held ? '🍽 Serve it at the table'
    : held ? '🍲 Drop it in the pot'
    : !pot ? "📖 Pick a recipe from Granny's book"
    : stillNeeded(pot).length ? `🧺 Fetch the ${name(stillNeeded(pot)[0])} from the pantry`
    : cooked(pot) ? '🥄 Spoon it out at the stove' : '🥄 Stir the pot';
  hintPill(ctx, vw, text);
}

export const KITCHEN_PLAY: RoomPlay = {
  setup(room) {
    room.painter = { floor, obj, over };
    room.actors.add({ id: GRANNY, name: 'Granny', look: { kind: 'idle', name: 'granny' }, ...GRANNY_AT, label: 'Ask Granny', talk: () => (bramDue() ? askFavour() : grannyCooks()) });
  },
  enter() {
    reset();
    say(bramDue() ? "Oh, there you are, dear. Come here a moment, I've a favour to ask." : ENTER_LINES[enterLine++ % ENTER_LINES.length], 3.2);
  },
  act(o) {
    if (!kitchenOpen(G.save)) return;
    if (o.id === 'book') return book();
    if (o.id === 'pantry') return pantry();
    if (o.id === 'stove') return stove(o);
    if (o.id === 'table') return table(o);
  },
  tick,
  hud: (ctx, vw) => hud(ctx, vw),
};

/** For tests and the console: what's going on in the kitchen. */
export const kitchenDebug = () => ({ pot, held, stirring, served });
