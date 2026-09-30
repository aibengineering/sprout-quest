// Poppy's Garden: once Mr. Floppers is home and the Garden is built, Poppy looks after it. Plant a seed in a plot and
// it grows in real time, like Bram's saw, so it comes along while you're out adventuring (or away from the game).
// Tending is light: now and then a plot gets thirsty (it stops growing until you water it) or sprouts weeds (it grows
// at half speed until you pull them). Seeds come from felled trees (oaks and pines) and from Poppy herself, who
// brings Flower Seeds back from her Secret Grove when you've run out.
import type { MatId } from './data';
import type { SaveState } from './state';

export type Crop = 'berry' | 'herb' | 'flower';
export type Seed = 'berryseed' | 'herbseed' | 'flowerseed';

/** Each crop: the seed it grows from, seconds of real time to grow, and how many you pick. */
export const CROPS: Record<Crop, { seed: Seed; seconds: number; yield: number }> = {
  berry: { seed: 'berryseed', seconds: 240, yield: 3 },
  herb: { seed: 'herbseed', seconds: 360, yield: 2 },
  flower: { seed: 'flowerseed', seconds: 480, yield: 2 },
};
export const CROP_ORDER = Object.keys(CROPS) as Crop[];

/** Plots by Garden level: none before it's built, then Sprout Patch, Berry Garden and Bloom Garden. */
export const PLOTS_BY_LEVEL = [0, 2, 4, 6];
export const plotCount = (s: SaveState) => PLOTS_BY_LEVEL[Math.min(s.build.garden, PLOTS_BY_LEVEL.length - 1)];

/** Poppy tends the Garden once it's built and her story is done (Mr. Floppers is home). */
export const gardenOpen = (s: SaveState) => s.build.garden >= 1 && (s.stories.poppy ?? 0) >= 6;

/**
 * Each planting may get thirsty once and sprout weeds once, somewhere in the middle of its growth. Thirsty plots stop
 * growing until watered; weedy ones grow at WEED_SLOW speed until the weeds are pulled.
 */
export const THIRST_CHANCE = 0.5;
export const WEED_CHANCE = 0.4;
export const WEED_SLOW = 0.5;
/** When (as a share of its growth) a plot can get thirsty or weedy. */
const TROUBLE_FROM = 0.25, TROUBLE_TO = 0.75;

/** Poppy's Flower Seeds: a handful whenever you've none left, at most once per this many seconds of real time. */
export const FLOWER_GIFT = 4;
export const GIFT_SECONDS = 600;
/** Berry Seeds she saved for the day the Garden opened: handed over once, the first time you visit. */
export const WELCOME_SEEDS = 2;

export interface Plot {
  crop: Crop;
  /** Seconds of growth so far (at full speed), as of `at`. */
  grown: number;
  /** When `grown` was last brought up to date (Date.now()). */
  at: number;
  /** How grown it'll be when it gets thirsty, or sprouts weeds (gone once it has). */
  thirstAt?: number;
  weedsAt?: number;
  thirsty?: boolean;
  weeds?: boolean;
}

export interface GardenState {
  /** One per plot, in order; empty soil is null. */
  plots: (Plot | null)[];
  /** When Poppy last gave you Flower Seeds (Date.now(); 0 = never). */
  gift: number;
}

/** The Garden's state, created on first use (older saves have none). */
export const garden = (s: SaveState): GardenState => (s.garden ??= { plots: [], gift: 0 });

/** Brings one plot's growth up to `now`: full speed, half with weeds, none while thirsty. */
export function grow(p: Plot, now: number) {
  let dt = Math.max(0, (now - p.at) / 1000);
  p.at = now;
  const total = CROPS[p.crop].seconds;
  while (dt > 0 && !p.thirsty && p.grown < total) {
    const speed = p.weeds ? WEED_SLOW : 1;
    const next = Math.min(total, p.thirstAt ?? total, p.weedsAt ?? total);
    const need = (next - p.grown) / speed;
    if (dt < need) {
      p.grown += dt * speed;
      break;
    }
    dt -= need;
    p.grown = next;
    if (p.thirstAt !== undefined && p.grown >= p.thirstAt) {
      p.thirsty = true;
      delete p.thirstAt;
    }
    if (p.weedsAt !== undefined && p.grown >= p.weedsAt) {
      p.weeds = true;
      delete p.weedsAt;
    }
  }
}

/** Brings every plot up to `now`. */
export function gardenUpdate(s: SaveState, now = Date.now()): GardenState {
  const g = garden(s);
  for (const p of g.plots) if (p) grow(p, now);
  return g;
}

export const isReady = (p: Plot) => p.grown >= CROPS[p.crop].seconds;

/** How a plot looks: 0 empty soil, 1 a sprout, 2 growing, 3 ready to pick. */
export function growthStage(p: Plot | null): 0 | 1 | 2 | 3 {
  if (!p) return 0;
  if (isReady(p)) return 3;
  return p.grown < CROPS[p.crop].seconds / 3 ? 1 : 2;
}

/** Seconds of real time until it's ready, if it's tended when it needs it (thirsty: until you water it). */
export function readyIn(p: Plot): number {
  const left = CROPS[p.crop].seconds - p.grown;
  return Math.max(0, Math.ceil(p.weeds ? left / WEED_SLOW : left));
}

/** Plants a seed from your bag in an empty plot. */
export function plant(s: SaveState, i: number, crop: Crop, now = Date.now(), rng: () => number = Math.random): 'ok' | 'seed' | 'busy' | 'closed' {
  if (!gardenOpen(s) || i < 0 || i >= plotCount(s)) return 'closed';
  const g = gardenUpdate(s, now), seed = CROPS[crop].seed;
  if (g.plots[i]) return 'busy';
  if (s.mats[seed] <= 0) return 'seed';
  s.mats[seed]--;
  const total = CROPS[crop].seconds, when = () => total * (TROUBLE_FROM + rng() * (TROUBLE_TO - TROUBLE_FROM));
  const p: Plot = { crop, grown: 0, at: now };
  if (rng() < THIRST_CHANCE) p.thirstAt = when();
  if (rng() < WEED_CHANCE) p.weedsAt = when();
  while (g.plots.length <= i) g.plots.push(null);
  g.plots[i] = p;
  return 'ok';
}

/** Waters a thirsty plot: it grows again from here. */
export function water(s: SaveState, i: number, now = Date.now()): boolean {
  const p = gardenUpdate(s, now).plots[i];
  if (!p?.thirsty) return false;
  p.thirsty = false;
  return true;
}

/** Pulls a plot's weeds: back to full speed. */
export function pullWeeds(s: SaveState, i: number, now = Date.now()): boolean {
  const p = gardenUpdate(s, now).plots[i];
  if (!p?.weeds) return false;
  p.weeds = false;
  return true;
}

/** Picks a ready plot into your bag and leaves the soil empty; returns what you got. */
export function pick(s: SaveState, i: number, now = Date.now()): { mat: MatId; n: number } | null {
  const g = gardenUpdate(s, now), p = g.plots[i];
  if (!p || !isReady(p)) return null;
  const n = CROPS[p.crop].yield;
  s.mats[p.crop] += n;
  g.plots[i] = null;
  // The first berries teach Granny her tart (see kitchen.ts).
  if (p.crop === 'berry' && !s.flags.includes('garden:berries')) s.flags.push('garden:berries');
  return { mat: p.crop, n };
}

/** Plots that need you: thirsty, weedy or ready to pick. */
export const needsTending = (s: SaveState, now = Date.now()) => gardenUpdate(s, now).plots.filter((p) => p && (p.thirsty || p.weeds || isReady(p))).length;

/** Whether Poppy has Flower Seeds for you: you've none left, and her last handful was long enough ago. */
export const giftDue = (s: SaveState, now = Date.now()) => gardenOpen(s) && s.mats.flowerseed <= 0 && now - garden(s).gift >= GIFT_SECONDS * 1000;

/** Poppy's Flower Seeds, if they're due; returns how many she gave. */
export function takeGift(s: SaveState, now = Date.now()): number {
  if (!giftDue(s, now)) return 0;
  s.mats.flowerseed += FLOWER_GIFT;
  garden(s).gift = now;
  return FLOWER_GIFT;
}

/** The Berry Seeds she saved for the Garden's first day, once. */
export function takeWelcome(s: SaveState): number {
  if (!gardenOpen(s) || s.flags.includes('garden:welcome')) return 0;
  s.flags.push('garden:welcome');
  s.mats.berryseed += WELCOME_SEEDS;
  return WELCOME_SEEDS;
}
