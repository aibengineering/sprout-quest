// Poppy's Garden, worked by hand right there on the map: a fenced field of plots, one tile each. Take seeds from her
// basket and walk onto an empty plot to plant, fill the watering can at the water butt and water thirsty plots, tug the
// weeds out and pick what's ripe. The action button works on the plot you're standing on (or the one just in front of
// you); hold it and walk along a row to work every plot you pass, or tap a plot near you. Poppy potters over to help and
// chatters about it. Underneath it's the same Garden (garden.ts): the same seeds, growth, troubles and harvest as her
// menu, which talking to her still brings up.
import { MATS } from '../data';
import {
  CAN_POURS, CROPS, DOABLE, FIELD_PLOTS, gardenOpen, gardenUpdate, nextSeed, pick, plant, plotCount, plotJob, plotSpot, pullWeeds, readyIn, takeGift,
  takeWelcome, targetPlot, water, WEED_TUGS, plotAt, type Crop, type Hand, type PlotJob,
} from '../garden';
import { poppyAway } from '../procession';
import { hintPill } from '../roomArt';
import type { WorldObj } from '../world';
import { G, persist } from './context';
import { GARDEN_SPOT, POPPY_ID } from './stories/poppy';

/** What you're holding: a handful of one seed, or the watering can (and how many pours are left in it). */
let hand: Hand = null;
/** Tugs on each plot's weeds so far. */
const tugs = new Map<number, number>();
/** The plot the action button works on just now, and the untilled one you're on (for the next Garden level). */
let target: number | null = null, untilled: number | null = null;
/** Were you in the Garden last frame (for her hello), how long since you last did anything (she wanders back). */
let inside = false, idle = 0;
/** Holding the button: the plot you last worked (a new one gets worked straight away), and when to work it again. */
let repeatIn = 0, lastAct: number | null = null;
/** Things she's said once already. */
const said = new Set<string>();

/** The field: the Garden's plot on the map, one tile per plot. */
const field = () => G.world.objs.find((o) => o.kind === 'plot' && o.project === 'garden')!;
const poppy = () => G.over.actors.get(POPPY_ID);
const say = (text: string, secs = 2.8) => G.over.actors.say(POPPY_ID, text, secs);
const sayOnce = (key: string, text: string) => {
  if (said.has(key)) return;
  said.add(key);
  say(text);
};
const feel = (emoji: string) => G.over.actors.bubble(POPPY_ID, emoji);
const seedName = (c: Crop) => MATS[CROPS[c].seed].name.replace(' Seeds', '');
const pickOne = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** What the Garden says while Poppy's off after the drums in Echo Cavern. */
export const POPPY_AWAY = "🌷 Poppy's not here. Her garden waits for her.";

/** You can work the Garden: it's built, Poppy tends it, and she's home. */
export const gardenWorkable = () => gardenOpen(G.save) && !poppyAway(G.save);

/** Standing inside the field's fence (or at its gate), where the action button works its plots. */
export function inGarden(x = G.over.x, y = G.over.y) {
  if (!gardenWorkable() || G.over.room) return false;
  const o = field();
  return x > o.x - 1.1 && x < o.x + o.w + 1.1 && y > o.y - 1.2 && y < o.y + o.h + 1.1;
}

function jobs(): PlotJob[] {
  const plots = gardenUpdate(G.save).plots;
  return Array.from({ length: plotCount(G.save) }, (_, i) => plotJob(plots[i] ?? null, hand, G.save));
}

/**
 * Where Poppy comes to help at plot `i`: beside it (inside the fence, clear of the butt and basket), on the side away
 * from you.
 */
function helpAt(i: number) {
  const o = field(), b = plotSpot(o, i);
  const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: b.x + dx, y: b.y + dy + 0.2 }))
    .filter((p) => p.x > o.x && p.x < o.x + o.w + 1 && p.y > o.y - 0.6 && p.y < o.y + o.h + 1);
  return spots.sort((a, b) => Math.hypot(b.x - G.over.x, b.y - G.over.y) - Math.hypot(a.x - G.over.x, a.y - G.over.y))[0];
}

function poppyComes(i: number) {
  const p = poppy(), at = helpAt(i);
  idle = 0;
  if (!p || !at || p.path.length) return;
  // Already close by and out of your way: she stays put.
  const b = plotSpot(field(), i);
  if (Math.hypot(p.x - b.x, p.y - b.y) < 1.8 && Math.hypot(p.x - G.over.x, p.y - G.over.y) > 0.7) return;
  void G.over.actors.walk(POPPY_ID, [at], 2.8);
}

const burst = (i: number, color: string, n: number, opts: { star?: boolean; grav?: number } = {}) => {
  const b = plotSpot(field(), i), ts = G.over.ts;
  G.over.fx.burst(b.x * ts, (b.y - 0.15) * ts, color, n, ts * 1.4, { size: ts * 0.06, life: 0.55, ...opts });
};

/** Works on plot `i`: whatever it needs, with what's in your hand. */
async function work(i: number) {
  const s = G.save, plots = gardenUpdate(s).plots, p = plots[i] ?? null, job = plotJob(p, hand, s);
  lastAct = i;
  switch (job) {
    case 'plant': {
      const crop = (hand as { seed: Crop }).seed;
      if (plant(s, i, crop) !== 'ok') return;
      G.audio.play('step');
      burst(i, '#8a5a3a', 8);
      poppyComes(i);
      if (!said.has('planted') || Math.random() < 0.35) say(said.has('planted') ? pickOne(['In you go, little seed!', 'Grow big and strong!', "What'll it be? I hope it's huge.", 'Another one! The field is filling up!']) : `In you go, little ${seedName(crop).toLowerCase()} seed! Grow big!`);
      said.add('planted');
      if (s.mats[CROPS[crop].seed] <= 0) {
        hand = null;
        say(`That's all the ${seedName(crop)} Seeds!`, 2);
      }
      persist();
      return;
    }
    case 'weed': {
      const n = (tugs.get(i) ?? 0) + 1;
      burst(i, '#5aa84a', 4, { grav: G.over.ts * 2 });
      G.audio.play('glance');
      poppyComes(i);
      if (n < WEED_TUGS) {
        tugs.set(i, n);
        if (n === 1 && !said.has('weeded')) say('Pull! Pull!', 1.6);
        return;
      }
      tugs.delete(i);
      pullWeeds(s, i);
      burst(i, '#7ac84a', 10, { grav: G.over.ts * 3 });
      if (!said.has('weeded') || Math.random() < 0.3) say(said.has('weeded') ? 'Bye-bye, weeds!' : 'Bye-bye, weeds! Mr. Floppers is so proud.');
      said.add('weeded');
      persist();
      return;
    }
    case 'water': {
      const can = hand as { can: number };
      if (!water(s, i)) return;
      can.can--;
      G.audio.play('heal');
      burst(i, '#8ad0f8', 12, { grav: G.over.ts * 3 });
      poppyComes(i);
      say(can.can > 0 ? 'Glug, glug! Look, it perks right up!' : 'Glug, glug! That was the last drop.');
      persist();
      return;
    }
    case 'pick': {
      const first = !s.flags.includes('garden:berries');
      const got = pick(s, i);
      if (!got) return;
      G.audio.play('pickup');
      burst(i, '#fff6c8', 12, { star: true });
      G.ui.toast(`${MATS[got.mat].icon} +${got.n} ${MATS[got.mat].name}`);
      poppyComes(i);
      feel('🧺');
      if (Math.random() < 0.5) say(pickOne(['Look how many!', 'Can I count them? One, two, three…', 'Mr. Floppers wants one. Just one!', "That's a whole basket!"]));
      persist();
      if (first && got.mat === 'berry') {
        G.mode = 'dialog';
        await G.ui.itemFound('meal_tart', 'Berry Tart', 'Granny can bake it now: +10% max HP for 5 minutes. Berries and Bunny Fluff.', '🥧', 'New recipe');
        G.mode = 'world';
        G.input.reset();
        say("Our first berries! Granny's going to bake her berry tart, I just know it!", 3.5);
      }
      return;
    }
    case 'thirsty':
      return say(hand && 'can' in hand ? 'The can is empty. The water butt is by the gate!' : "It's thirsty! Grab the watering can by the water butt.");
    case 'empty': {
      const any = nextSeed(s, null);
      return say(any ? 'Grab some seeds from the basket first!' : 'No seeds left? Oak trees drop Berry Seeds when they fall!');
    }
    case 'growing': {
      const left = readyIn(p!);
      return say(left > 60 ? `Shh, it's growing. About ${Math.ceil(left / 60)} more minutes!` : `Nearly there! ${left} more seconds.`);
    }
  }
}

/** The action button in the field: the plot it's pointing at (or the untilled ground you're on). */
export function gardenAct() {
  if (target !== null) return work(target);
  if (untilled !== null) say("We can dig more plots here when the Garden's upgraded. The sign by the gate says how!", 3.2);
}

/** The water butt and the seed basket in the field. */
export function gardenStation(o: WorldObj) {
  const s = G.save;
  if (!gardenWorkable()) return G.ui.toast(POPPY_AWAY);
  if (o.id === 'garden:butt') {
    const full = hand && 'can' in hand && hand.can >= CAN_POURS;
    hand = { can: CAN_POURS };
    G.audio.play(full ? 'ui' : 'heal');
    const ts = G.over.ts;
    G.over.fx.burst((o.x + o.w / 2) * ts, o.y * ts, '#8ad0f8', 8, ts * 1.2, { size: ts * 0.06, life: 0.5, grav: ts * 2 });
    sayOnce('can', `Fill it right to the top! That waters ${CAN_POURS} plots.`);
    return;
  }
  if (o.id === 'garden:seeds') {
    const next = nextSeed(s, hand && 'seed' in hand ? hand.seed : null);
    if (!next) return say('No seeds left? Oak trees drop Berry Seeds when they fall, and pines drop Herb Seeds!');
    hand = { seed: next };
    G.audio.play('craftPull');
    sayOnce(`seed:${next}`, `${seedName(next)} seeds! Hold the button and walk along a row to plant them.`);
  }
}

const LABEL: Record<PlotJob, string> = { pick: 'Pick', weed: 'Pull weeds', water: 'Water', plant: 'Plant', thirsty: 'Thirsty', empty: 'Empty plot', growing: 'Growing' };

/** Every frame on the map: which plot you're on, its label, holding the button down a row, and taps on plots. */
export function gardenTick(dt: number, canAct: boolean) {
  const here = inGarden(), o = field();
  if (here && !canAct) return;
  // A tap anywhere else on the map is nothing (and mustn't wait to work a plot once you walk up).
  const tap = canAct && G.input.consume('tap') ? G.input.tapAt : null;
  if (here && !inside) hello();
  inside = here;
  if (!here) {
    // Walk off and you put things back where they live (and the weeds you were tugging settle back in).
    hand = null;
    target = untilled = null;
    tugs.clear();
    if (gardenOpen(G.save)) o.label = 'Garden';
    G.over.gardenPlot = null;
    G.over.carried = null;
    const p = poppy();
    if (p && gardenOpen(G.save)) p.label = 'Garden';
    homeTime(dt);
    return;
  }
  const s = G.save, js = jobs(), n = js.length;
  for (const i of tugs.keys()) if (js[i] !== 'weed') tugs.delete(i);
  target = targetPlot(o, n, G.over.x, G.over.y, G.over.face);
  const any = target === null ? targetPlot(o, FIELD_PLOTS.length, G.over.x, G.over.y, G.over.face) : null;
  untilled = any !== null && any >= n ? any : null;
  G.over.gardenPlot = target;
  // Out on a plot, the button's for the plot, even with Poppy right there helping (talk to her from the paths).
  const p = poppy();
  if (p) p.label = target !== null ? '' : 'Garden';
  // (On the paths round the plots the field has nothing to say, so the butt, the basket and Poppy get the button.)
  o.label = target !== null ? (js[target] === 'plant' && hand && 'seed' in hand ? `Plant ${seedName(hand.seed)}` : LABEL[js[target]]) : untilled !== null ? 'Untilled' : '';
  for (const st of G.world.objs) {
    if (st.kind !== 'station') continue;
    if (st.id === 'garden:butt') st.label = hand && 'can' in hand ? 'Refill can' : 'Watering can';
    if (st.id === 'garden:seeds') {
      const next = nextSeed(s, hand && 'seed' in hand ? hand.seed : null);
      st.label = next ? `${seedName(next)} seeds` : 'Seed basket';
    }
  }
  G.over.carried = hand ? ('seed' in hand
    ? { icon: CROPS[hand.seed].seed, emoji: MATS[CROPS[hand.seed].seed].icon, count: s.mats[CROPS[hand.seed].seed] }
    : { icon: 'g_can', emoji: '🚿', count: hand.can }) : null;
  // Hold the button and keep going: down the row as you walk (a new plot straight away), tug after tug on one.
  const held = G.input.isHeld('act');
  if (held && lastAct !== null && target !== null && DOABLE.includes(js[target])) {
    repeatIn -= dt;
    if (target !== lastAct || repeatIn <= 0) {
      repeatIn = 0.25;
      void work(target);
    }
  } else repeatIn = 0.25;
  if (!held) lastAct = null;
  // A tap on a plot near you works that plot (its soil, or what's growing up out of it).
  if (tap) {
    const m = G.over.toMap(tap.x, tap.y);
    const at = plotAt(o, n, m.x, m.y) ?? plotAt(o, n, m.x, m.y + 0.35);
    if (at !== null) {
      const b = plotSpot(o, at);
      if (Math.hypot(b.x - G.over.x, b.y - G.over.y) < 2.6) void work(at);
    }
  }
  idle += dt;
}

/** On walking in: Poppy says hello, with the seeds she saved for the Garden's first day, or some from her grove. */
function hello() {
  const s = G.save, welcome = takeWelcome(s), gift = takeGift(s);
  if (welcome || gift) {
    G.audio.play('pickup');
    G.ui.toast([welcome && `${MATS.berryseed.icon} +${welcome} Berry Seeds`, gift && `${MATS.flowerseed.icon} +${gift} Flower Seeds`].filter(Boolean).join(' · '));
    say(welcome ? `A real field! Here, I saved ${welcome} Berry Seeds. They're in the basket!` : `Out of Flower Seeds? I put ${gift} from my Secret Grove in the basket. Shh!`, 3.6);
    persist();
  } else if (!said.has('hello')) {
    said.add('hello');
    say(pickOne(['Hi! Want to help in the field?', 'Mr. Floppers and I were just checking on everything!']));
  }
  feel('💖');
}

/** A while after you stop (or once you've gone), she wanders back to her spot. */
function homeTime(dt: number) {
  idle += dt;
  const p = poppy();
  if (!p || p.path.length || idle < 6 || Math.hypot(p.x - GARDEN_SPOT.x, p.y - GARDEN_SPOT.y) < 0.2 || !gardenWorkable()) return;
  void G.over.actors.walk(POPPY_ID, [GARDEN_SPOT], 2);
}

/** What to do next, at the top of the screen, while you're in the field. */
export function drawGardenHud(ctx: CanvasRenderingContext2D, vw: number) {
  if (!inside) return;
  const js = jobs(), any = (j: PlotJob) => js.includes(j);
  const text = any('pick') ? '🧺 Pick what\'s ripe'
    : any('weed') ? '🌿 Tug the weeds out'
    : any('thirsty') ? (hand && 'can' in hand && hand.can > 0 ? '💧 Water the thirsty plots' : '💧 Fill the can at the water butt')
    : any('empty') || any('plant') ? (hand && 'seed' in hand ? '🌱 Walk onto empty plots to plant' : '🌱 Take seeds from the basket')
    : '🌼 All tended! Off you go, it grows while you\'re out';
  hintPill(ctx, vw, text);
}

/** For tests and the console. */
export const gardenDebug = () => ({ hand, target, untilled, tugs: Object.fromEntries(tugs), inside });
