// Granny's Kitchen: pick up one plate with all the recipe's ingredients beside the pantry, carry it to the stove,
// and watch the shared creation animation. The recipe is committed and saved once, before its presentation.
import { MEALS, cook, kitchenOpen, knownMeals, prepareMeal, type MealTray } from '../kitchen';
import { craftPresentation } from '../crafting';
import { hasMats } from '../rules';
import type { Room } from '../room';
import { crate, drawIngredientPlate, drawProp, hintPill, paintShell, paintWindow, PROP_SCALE, propRise, propUnit, stationGlow, steam } from '../roomArt';
import { rrect } from '../sprites';
import { costChips, esc, icon } from '../ui';
import type { WorldObj } from '../world';
import { G, paused, persist } from './context';
import type { RoomPlay } from './rooms';
import { say as dialogue } from './scenes';
import { GRANNY as GRANNY_SPEAKER, askFavour, bramDue } from './stories/granny';

const GRANNY = 'room:granny';
const GRANNY_AT = { x: 3.25, y: 3.65 };
const TAU = Math.PI * 2;
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let held: MealTray | null = null;
let cooking = false, choosing = false;
let finished: { dish: MealTray['dish']; t: number } | null = null;
let t = 0;
const ENTER_LINES = ['Come in, come in! Wipe your feet, dear.', "My recipe book's by the pantry, dear.", "Hungry? Pick a recipe and we'll make it together."];
let enterLine = 0;
const say = (text: string, secs = 3) => G.over.room?.actors.say(GRANNY, text, secs);
const feel = (emoji: string) => G.over.room?.actors.bubble(GRANNY, emoji);
const guide = () => ({ next: held ? 'stove' : 'book', stations: cooking ? [] : held ? ['stove'] : ['book'] });

function reset() {
  held = null;
  finished = null;
  cooking = choosing = false;
}

/** Selecting a recipe puts the whole ingredient plate in your hands. */
async function book() {
  if (choosing || cooking) return;
  choosing = true;
  try {
    const s = G.save;
    const rows = knownMeals(s).map((id) => {
      const m = MEALS[id], can = hasMats(s, m.recipe);
      return `<div class="mcard row"><div class="ico">${icon(`meal_${id}`, m.icon)}</div><div class="info">
        <div class="name">${esc(m.name)}</div><div class="desc">${esc(m.desc)}</div><div class="chips">${costChips(s, m.recipe)}</div></div>
        <button class="go" data-dialog="dish:${id}" ${can ? '' : 'disabled'}>Prepare</button></div>`;
    }).join('');
    const r = await paused(() => G.ui.dialog(
      `<div class="big" style="font-size:22px">📖 Granny's Recipes</div><p>Take an ingredient plate, then bring it to the pot.</p><div class="kitchen">${rows}</div>`,
      [['close', 'Not now']], 'kitchen',
    ));
    if (!r.startsWith('dish:')) return;
    const tray = prepareMeal(s, r.slice(5) as MealTray['dish']);
    if (typeof tray === 'string') return;
    held = tray;
    G.audio.play('craftPull');
    say(`Everything for ${MEALS[tray.dish].name}, on one plate. Over to the pot, dear.`);
    feel('😊');
  } finally {
    choosing = false;
  }
}

async function stove(o: WorldObj) {
  if (cooking || choosing) return;
  if (!held) return say("Choose a recipe by the pantry first, dear. I'll put everything on a plate.");
  const tray = held, meal = MEALS[tray.dish], before = { ...G.save.mats };
  held = null;
  if (cook(G.save, tray.dish) !== 'ok') return say("Oh! We're short of something. Pick a recipe we can make, dear.");
  cooking = true;
  if (!G.save.flags.includes('kitchen:byhand')) G.save.flags.push('kitchen:byhand');
  persist();
  if (!craftPresentation(meal)) G.audio.play('craft');
  const ts = G.over.ts, at = potAt(o, ts);
  G.over.fx.burst(at.x, at.y, '#fff6c8', 8, ts * 1.4, { star: true, size: ts * 0.06, life: 0.5 });
  try {
    await paused(() => G.ui.madeItem({ ...meal, iconId: `meal_${meal.id}` }, before, meal.desc, meal.icon, 'You made', meal.id === 'tea' ? 'Drink' : 'Enjoy'));
    finished = { dish: meal.id, t: 0 };
    say(`${meal.name}! Lovely. Come back when you're hungry, dear.`);
    feel('😋');
  } finally {
    cooking = false;
  }
}

function tick(dt: number, room: Room): boolean {
  t += dt;
  if (finished && (finished.t += dt) > 4) finished = null;
  for (const o of room.objs) {
    if (o.id === 'book' || o.id === 'pantry') o.label = held ? 'Change recipe' : 'Recipes';
    if (o.id === 'stove') o.label = held ? `Make ${MEALS[held.dish].name}` : 'Cooking bench';
  }
  const granny = room.actors.get(GRANNY);
  if (granny) granny.mood = bramDue() ? '💭' : undefined;
  return false;
}

function floor(ctx: CanvasRenderingContext2D, ts: number) {
  const room = G.over.room!;
  paintShell(ctx, room, ts, { boards: ['#c98d5a', '#bf8350', 'rgba(90,50,30,0.35)'], board: 0.5, wall: '#f6e3c8', stripe: 'rgba(232,170,150,0.35)', wainscot: '#a8714a', wood: '#7a4a30' });
  // A window by the stove, a little shelf of plates, and a framed drawing of Poppy and Mr. Floppers.
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
  rrect(ctx, (tb.x - 0.15) * ts, (tb.y - 0.3) * ts, (tb.w + 0.3) * ts, 1.45 * ts, ts * 0.3);
  ctx.fill();
  ctx.strokeStyle = '#ffd38a';
  ctx.lineWidth = Math.max(2, ts * 0.06);
  rrect(ctx, (tb.x - 0.05) * ts, (tb.y - 0.2) * ts, (tb.w + 0.1) * ts, 1.25 * ts, ts * 0.25);
  ctx.stroke();
}

/** Where the pot sits on the stove sprite. */
const STOVE_BACK = 0.16;
const potAt = (o: WorldObj, ts: number) => ({ x: (o.x + o.w / 2) * ts - 0.9 * propUnit(ts), y: (o.y + o.h - STOVE_BACK * PROP_SCALE) * ts - propRise(1.37, ts) });

function obj(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number): number | void {
  const active = guide().stations.includes(o.id!);
  const pulse = motion.matches ? 0.8 : 0.8 + Math.sin(t * 2.4) * 0.2;
  if (active) stationGlow(ctx, o, ts, pulse);
  const glow = active ? { tint: '#ffe5a3', tintAmount: 0.14 * pulse, outline: { color: '#ffe5a3', width: 0.04 } } : {};
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
      const top = drawProp(ctx, 'k_stove', o, ts, STOVE_BACK, (x, y, w, h) => crate(ctx, x, y, w, h, '#3a3440', '#5a5260', ts * 0.6), glow);
      if (cooking || finished) {
        const at = potAt(o, ts);
        ctx.fillStyle = '#e8a050';
        ctx.beginPath();
        ctx.ellipse(at.x, at.y, 0.4 * propUnit(ts), 0.2 * propUnit(ts), 0, 0, TAU);
        ctx.fill();
        steam(ctx, at.x, at.y - ts * 0.1, ts, t, 0.6);
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
      }, glow);
    case 'table':
      return drawProp(ctx, 'k_table', o, ts, 0.4, (x, y, w, h) => crate(ctx, x, y, w, h, '#a8714a', '#f6e8d8', ts * 0.45));
  }
}

function over(ctx: CanvasRenderingContext2D, ts: number) {
  if (held) drawIngredientPlate(ctx, G.over.x * ts, G.over.y * ts, ts, held.ingredients, G.over.face, !motion.matches && G.over.moving ? t : 0);
}

function talk() {
  if (bramDue()) return askFavour();
  return paused(async () => {
    await dialogue(GRANNY_SPEAKER, held
      ? "Everything is on your plate, dear. Bring it to the cooking bench, and we can make it together. I'll be right here."
      : "Have a flip through the recipe book and see what you fancy, dear. I'll be right here beside you, guiding you along the way.");
  });
}

export const KITCHEN_PLAY: RoomPlay = {
  setup(room) {
    room.painter = { floor, obj, over };
    room.actors.add({ id: GRANNY, name: 'Granny', look: { kind: 'idle', name: 'granny' }, ...GRANNY_AT, label: 'Talk', talk });
  },
  enter() { reset(); say(ENTER_LINES[enterLine++ % ENTER_LINES.length], 3.2); },
  act(o) {
    if (!kitchenOpen(G.save)) return;
    if (o.id === 'book' || o.id === 'pantry') return book();
    if (o.id === 'stove') return stove(o);
  },
  tick,
  hud(ctx, vw) { hintPill(ctx, vw, held ? '🍲 Bring the ingredient plate to the glowing pot' : '📖 Choose a recipe beside the pantry'); },
};

export const kitchenDebug = () => ({ held, cooking, finished, guide: guide() });
