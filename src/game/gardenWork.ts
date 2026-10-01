// Poppy's Garden, worked by hand right there on the map: walk up and the view leans in, take seeds from her basket,
// plant them in an empty bed, fill the watering can at the water butt and water thirsty beds, tug the weeds out and
// pick what's ripe. The action button works on the bed you're nearest that needs something (hold it to keep going),
// or tap a bed to work on that one. Poppy potters over to help and chatters about it. Underneath it's the same Garden
// (garden.ts): the same seeds, growth, troubles and harvest as her menu, which talking to her still brings up.
import { MATS } from '../data';
import { bedJob, bedSpot, CAN_POURS, CROPS, gardenOpen, gardenUpdate, nextSeed, pick, plant, plotCount, pullWeeds, readyIn, takeGift, takeWelcome, targetBed, water, WEED_TUGS, type BedJob, type Crop, type Hand } from '../garden';
import { poppyAway } from '../procession';
import { hintPill } from '../roomArt';
import type { WorldObj } from '../world';
import { G, persist } from './context';
import { GARDEN_SPOT, POPPY_ID } from './stories/poppy';

/** What you're holding: a handful of one seed, or the watering can (and how many pours are left in it). */
let hand: Hand = null;
/** Tugs on each bed's weeds so far. */
const tugs = new Map<number, number>();
/** The bed the action button works on just now. */
let target: number | null = null;
/** Were you in the Garden last frame (for her hello), how long since you last did anything (she wanders back). */
let inside = false, idle = 0;
let repeatIn = 0, lastAct: number | null = null;
/** Things she's said once already. */
const said = new Set<string>();

const plot = () => G.world.objs.find((o) => o.kind === 'plot' && o.project === 'garden')!;
const spots = () => Array.from({ length: plotCount(G.save) }, (_, i) => bedSpot(plot(), i));
const poppy = () => G.over.actors.get(POPPY_ID);
const say = (text: string, secs = 2.8) => G.over.actors.say(POPPY_ID, text, secs);
const sayOnce = (key: string, text: string) => {
  if (said.has(key)) return;
  said.add(key);
  say(text);
};
const feel = (emoji: string) => G.over.actors.bubble(POPPY_ID, emoji);
const seedName = (c: Crop) => MATS[CROPS[c].seed].name.replace(' Seeds', '');

/** You can work the Garden: it's built, Poppy tends it, and she's home. */
export const gardenWorkable = () => gardenOpen(G.save) && !poppyAway(G.save);

/** Standing in or around the Garden (where the view leans in and the action button works its beds). */
export function inGarden(x = G.over.x, y = G.over.y) {
  if (!gardenWorkable() || G.over.room) return false;
  const o = plot();
  return x > o.x - 1.4 && x < o.x + o.w + 1.4 && y > o.y - 0.6 && y < o.y + o.h + 1.7;
}

function jobs(): BedJob[] {
  const plots = gardenUpdate(G.save).plots;
  return spots().map((_, i) => bedJob(plots[i] ?? null, hand, G.save));
}

/** Where Poppy stands to help at a bed: at the Garden's right-hand side, level with it (her basket's on the left). */
function helpAt(i: number) {
  const o = plot(), b = bedSpot(o, i);
  return { x: o.x + o.w + 0.45, y: b.y + 0.55 };
}

function poppyComes(i: number) {
  const p = poppy(), at = helpAt(i);
  idle = 0;
  if (!p || p.path.length || Math.hypot(p.x - at.x, p.y - at.y) < 0.9 || Math.hypot(G.over.x - at.x, G.over.y - at.y) < 0.6) return;
  void G.over.actors.walk(POPPY_ID, [at], 2.6);
}

const burst = (i: number, color: string, n: number, opts: { star?: boolean; grav?: number } = {}) => {
  const b = bedSpot(plot(), i), ts = G.over.ts;
  G.over.fx.burst(b.x * ts, (b.y - 0.15) * ts, color, n, ts * 1.4, { size: ts * 0.06, life: 0.55, ...opts });
};

/** Works on bed `i`: whatever it needs, with what's in your hand. */
async function work(i: number) {
  const s = G.save, plots = gardenUpdate(s).plots, p = plots[i] ?? null, job = bedJob(p, hand, s);
  lastAct = i;
  G.over.face = Math.atan2(bedSpot(plot(), i).y - G.over.y, bedSpot(plot(), i).x - G.over.x);
  switch (job) {
    case 'plant': {
      const crop = (hand as { seed: Crop }).seed;
      if (plant(s, i, crop) !== 'ok') return;
      G.audio.play('step');
      burst(i, '#8a5a3a', 8);
      poppyComes(i);
      say(said.has('planted') ? ['In you go, little seed!', 'Grow big and strong!', "What'll it be? I hope it's huge."][Math.floor(Math.random() * 3)] : `In you go, little ${seedName(crop).toLowerCase()} seed! Grow big!`);
      said.add('planted');
      if (s.mats[CROPS[crop].seed] <= 0) hand = null;
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
        if (n === 1) say('Pull! Pull!', 1.6);
        return;
      }
      tugs.delete(i);
      pullWeeds(s, i);
      burst(i, '#7ac84a', 10, { grav: G.over.ts * 3 });
      say(said.has('weeded') ? 'Bye-bye, weeds!' : 'Bye-bye, weeds! Mr. Floppers is so proud.');
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
      say(['Look how many!', 'Can I count them? One, two, three…', 'Mr. Floppers wants one. Just one!'][Math.floor(Math.random() * 3)]);
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
      return say(hand && 'can' in hand ? 'The can is empty. The water butt is right there!' : "It's thirsty! Grab the watering can by the water butt.");
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

/** The action button at the Garden itself: the bed it's pointing at. */
export function gardenAct() {
  if (target !== null) return work(target);
}

/** The water butt and the seed basket beside the Garden. */
export function gardenStation(o: WorldObj) {
  const s = G.save;
  if (!gardenWorkable()) return;
  if (o.id === 'garden:butt') {
    const full = hand && 'can' in hand && hand.can >= CAN_POURS;
    hand = { can: CAN_POURS };
    G.audio.play(full ? 'ui' : 'heal');
    const ts = G.over.ts;
    G.over.fx.burst((o.x + o.w / 2) * ts, o.y * ts, '#8ad0f8', 8, ts * 1.2, { size: ts * 0.06, life: 0.5, grav: ts * 2 });
    sayOnce('can', 'Fill it right to the top! That waters three beds.');
    return;
  }
  if (o.id === 'garden:seeds') {
    const next = nextSeed(s, hand && 'seed' in hand ? hand.seed : null);
    if (!next) return say('No seeds left? Oak trees drop Berry Seeds when they fall, and pines drop Herb Seeds!');
    hand = { seed: next };
    G.audio.play('craftPull');
    sayOnce(`seed:${next}`, `${seedName(next)} seeds! Pop them in an empty bed.`);
  }
}

/** Every frame on the map: the Garden's view, its labels, which bed you're on, holding the button, and taps on beds. */
export function gardenTick(dt: number, canAct: boolean) {
  // The view leans in while you're at the Garden (and stays in while you talk to Poppy there).
  const near = inGarden(), o = plot();
  G.over.focus = near ? { x: o.x + o.w / 2, y: o.y + o.h - 0.1, zoom: 1.85 } : null;
  if (near && !canAct) return;
  const here = near;
  if (here && !inside) hello();
  inside = here;
  if (!here) {
    // Walk off and you put things back where they live.
    if (hand && !inGarden()) hand = null;
    target = null;
    G.over.gardenBed = null;
    G.over.carried = null;
    homeTime(dt);
    return;
  }
  const s = G.save, js = jobs();
  target = targetBed(spots(), js, G.over.x, G.over.y - 0.2, 2.2);
  G.over.gardenBed = target;
  const LABEL: Record<BedJob, string> = { pick: 'Pick', weed: 'Pull weeds', water: 'Water', plant: 'Plant', thirsty: 'Thirsty', empty: 'Empty bed', growing: 'Growing' };
  o.label = target === null ? 'Garden' : js[target] === 'plant' && hand && 'seed' in hand ? `Plant ${seedName(hand.seed)}` : LABEL[js[target]];
  for (const st of G.world.objs) {
    if (st.kind !== 'station' || !st.id?.startsWith('garden:')) continue;
    if (st.id === 'garden:butt') st.label = hand && 'can' in hand ? 'Refill can' : 'Watering can';
    if (st.id === 'garden:seeds') {
      const next = nextSeed(s, hand && 'seed' in hand ? hand.seed : null);
      st.label = next ? `${seedName(next)} seeds` : 'Seed basket';
    }
  }
  G.over.carried = hand ? ('seed' in hand
    ? { icon: CROPS[hand.seed].seed, emoji: MATS[CROPS[hand.seed].seed].icon, count: s.mats[CROPS[hand.seed].seed] }
    : { icon: 'g_can', emoji: '🚿', count: hand.can }) : null;
  // Hold the button to keep going: bed after bed, tug after tug.
  if (G.input.isHeld('act') && lastAct !== null && target !== null && ['plant', 'weed', 'water', 'pick'].includes(js[target])) {
    repeatIn -= dt;
    if (repeatIn <= 0) {
      repeatIn = 0.25;
      void work(target);
    }
  } else repeatIn = 0.3;
  if (!G.input.isHeld('act')) lastAct = null;
  // A tap on a bed works on that bed.
  const tap = G.input.tapAt;
  if (tap && G.input.consume('tap')) {
    // The bed under your finger (its soil, or what's growing up out of it): the closest, where they overlap.
    const m = G.over.toMap(tap.x, tap.y);
    let at = -1, best = Infinity;
    spots().forEach((b, i) => {
      const d = Math.hypot(m.x - b.x, (m.y - (b.y - 0.2)) * 1.6);
      if (Math.abs(m.x - b.x) < 0.5 && m.y > b.y - 0.75 && m.y < b.y + 0.25 && d < best) [at, best] = [i, d];
    });
    if (at >= 0) void work(at);
  }
  idle += dt;
}

/** On walking up: Poppy says hello, with the seeds she saved for the Garden's first day, or some from her grove. */
function hello() {
  const s = G.save, welcome = takeWelcome(s), gift = takeGift(s);
  if (welcome || gift) {
    G.audio.play('pickup');
    G.ui.toast([welcome && `${MATS.berryseed.icon} +${welcome} Berry Seeds`, gift && `${MATS.flowerseed.icon} +${gift} Flower Seeds`].filter(Boolean).join(' · '));
    say(welcome ? `A real garden! Here, I saved ${welcome} Berry Seeds. They're in the basket!` : `Out of Flower Seeds? I put ${gift} from my Secret Grove in the basket. Shh!`, 3.6);
    persist();
  } else if (!said.has('hello')) {
    said.add('hello');
    say(['Hi! Want to help in the garden?', 'Mr. Floppers and I were just checking on everything!'][Math.floor(Math.random() * 2)]);
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

/** What to do next, at the top of the screen, while you're at the Garden. */
export function drawGardenHud(ctx: CanvasRenderingContext2D, vw: number) {
  if (!inside) return;
  const js = jobs(), any = (j: BedJob) => js.includes(j);
  const text = any('pick') ? '🧺 Pick what\'s ripe'
    : any('weed') ? '🌿 Tap the weeds out'
    : any('thirsty') ? (hand && 'can' in hand && hand.can > 0 ? '💧 Water the thirsty bed' : '💧 Fill the can at the water butt')
    : any('empty') || any('plant') ? (hand && 'seed' in hand ? '🌱 Plant in an empty bed' : '🌱 Take seeds from the basket')
    : '🌼 All tended! Off you go, it grows while you\'re out';
  hintPill(ctx, vw, text);
}

/** For tests and the console. */
export const gardenDebug = () => ({ hand, target, tugs: Object.fromEntries(tugs), inside });
