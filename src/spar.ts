// Friendly sparring: practice fights with someone from the village, for nothing but the practice. No loot, XP, story,
// potions or fainting; your own health is never touched. Whoever drops to a fifth of their health calls it.
import type { MonsterDef } from './data';
import { foxAtClearing } from './fox';
import { currentQuest } from './quests';
import { playerStats, type PlayerStats } from './rules';
import type { SaveState } from './state';

export type PartnerId = 'oswin' | 'bram' | 'fox';

/** The share of health at which a spar stops: the partner yields, or helps you up. */
export const SPAR_YIELD = 0.2;

export interface Partner {
  name: string;
  /** Their model and portrait (walker `npc/<look>`, icon `npc_<look>`). */
  look: string;
  emoji: string;
  /** What they fight like, for the picker. */
  blurb: string;
  /** The result card when they win. */
  wins: string;
  /** Size, pace, and how many of your hits (and theirs) a spar takes: see sparStats. */
  r: number;
  spd: number;
  hits: number;
  lands: number;
  /** Things they say: when you hit them, when they land one, when they yield, and when they help you up. */
  hit: string[];
  land: string[];
  yields: string;
  helps: string;
}

export const PARTNERS: Record<PartnerId, Partner> = {
  oswin: {
    name: 'Elder Oswin', look: 'elder', emoji: '🌿', wins: 'Oswin wins this one.',
    blurb: 'Slow, very well-signalled staff bonks… and one surprisingly spry move.',
    r: 14, spd: 42, hits: 7, lands: 6,
    hit: ['Oof! My back!', 'Gently, gently!', 'Ah, my poor knees…', 'Ho! You’ve been practising.'],
    land: ['Still got it!', 'Bonk! Oh dear, sorry.', 'Mind the staff, sprout.', 'Hee hee. Old tricks.'],
    yields: 'Enough, enough! You’ll do, young sprout.',
    helps: 'Up you get, sprout. No harm done. Slow and steady, now.',
  },
  bram: {
    name: 'Bram', look: 'bram', emoji: '🧔', wins: 'Bram wins this one.',
    blurb: 'Big wind-up swings with an axe handle. Step out of the swing, then step in.',
    r: 16, spd: 55, hits: 9, lands: 5,
    hit: ['That’s my lunch break gone.', 'Oi. Those posts won’t set themselves.', 'Hm. Clean cut.', 'There goes the afternoon.'],
    land: ['Like splitting kindling.', 'Mind your feet.', 'Sorry. Habit.'],
    yields: 'Alright, you win. I’ve a mill full of logs waiting anyway.',
    helps: 'Up you get. Now I’m behind on the planks.',
  },
  fox: {
    name: 'Masked Fox', look: 'fox', emoji: '🦊', wins: 'The fox wins this one.',
    blurb: 'Quick and slippery, and fond of a feint. Watch first, move second.',
    r: 13, spd: 105, hits: 8, lands: 6,
    hit: ['Hm. Better.', 'Good. Again.', 'You saw that one.'],
    land: ['Keep up, little boots.', 'Too slow.', 'Watch first. Move second.'],
    yields: 'Enough. You kept up, little boots.',
    helps: 'Up. Watch the tell next time.',
  },
};

/** Who'll spar with you: Oswin once you've reached Sowerby, Bram once he's settled there, the fox once she's at the clearing. */
export function sparPartners(s: SaveState): PartnerId[] {
  const out: PartnerId[] = [];
  if (s.flags.includes('village')) out.push('oswin');
  if (s.flags.includes('bram:hut')) out.push('bram');
  if (foxAtClearing(s)) out.push('fox');
  return out;
}

/** Oswin mentions his practice ring when he's talked to, unless he's telling you something the story needs. */
export const oswinSpars = (s: SaveState) => sparPartners(s).includes('oswin') && currentQuest(s)?.goal.type !== 'talk';

/**
 * A fair match for you, gear and all: their armour is yours, their health takes about `hits` of your plain hits to bring
 * to the yield, and their blows about `lands` to bring you there.
 */
export function sparStats(st: PlayerStats, who: PartnerId): { hp: number; atk: number; def: number } {
  const p = PARTNERS[who], def = st.def;
  const yours = (st.atk * st.atk) / (st.atk + def);
  const theirs = (st.maxHp * (1 - SPAR_YIELD)) / p.lands;
  // Their attack, so that a blow (atk² / (atk + your def), see calcDamage) does `theirs`.
  const atk = (theirs + Math.sqrt(theirs * theirs + 4 * theirs * st.def)) / 2;
  return { hp: Math.round((p.hits * yours) / (1 - SPAR_YIELD)), atk: Math.max(1, Math.round(atk)), def };
}

/** Who fights a practice bout (a lesson, a spar): a copy of you at full health with no potions, so nothing it does sticks. */
export function practiceCopy(s: SaveState): SaveState {
  const copy = structuredClone(s);
  copy.hp = playerStats(copy).maxHp;
  copy.potions = 0;
  return copy;
}

/** The battle's view of a partner: like a monster, with no drops and no XP. */
export const partnerDef = (who: PartnerId): MonsterDef => {
  const p = PARTNERS[who];
  return { name: p.name, lv: 1, hp: 1, atk: 1, def: 0, spd: p.spd, r: p.r, xp: 0, drops: [] };
};

export const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
