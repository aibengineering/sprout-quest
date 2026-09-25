import { VERSION } from './version';
import { GEAR, MAT_ORDER, QUESTS, type MatId, type ProjectId, type SkillId, type Style, type ZoneId } from './data';

export interface SaveState {
  version: 1;
  lv: number;
  xp: number;
  hp: number;
  mats: Record<MatId, number>;
  owned: string[];
  equip: { weapon: string; armor: string; charm: string | null };
  potions: number;
  pos: { x: number; y: number };
  visited: ZoneId[];
  bossWins: number;
  muted: boolean;
  tips: string[];
  /** Index into QUESTS of the current story step. */
  quest: number;
  /** Progress counters for the current step. */
  questKills: number;
  talked: boolean;
  crafted: number;
  /** Guardians (and the dragon) defeated. */
  bosses: string[];
  build: Record<ProjectId, number>;
  /** Zones whose campfire checkpoint has been lit. */
  camps: ZoneId[];
  /** Where you wake up after fainting. */
  respawn: ZoneId | 'village';
  /** Systems revealed so far (see unlocks.ts) and those not yet looked at ("new" dots). */
  unlocked: string[];
  fresh: string[];
  wins: number;
  /** Clover-dropping kills since the last clover (see cloverPity). */
  cloverDry: number;
  /** Best tool tier owned for each gathering skill (0 = none yet). */
  tools: Record<SkillId, number>;
  skills: Record<SkillId, { lv: number; xp: number }>;
  /** When each felled tree (by world node id) grows back, as a Date.now() timestamp. */
  nodes: Record<string, number>;
  /** Weapon handling per class: winning with a class trains it, and better weapons of that class need it. */
  mastery: Record<Style, { lv: number; xp: number }>;
  /** Seconds actually spent playing (not on the title screen), for the play report. */
  playtime: number;
  /** Story flags set by scripted events (prologue fights, arriving in the village…). */
  flags: string[];
  /** The newest version whose patch notes you've read (older than VERSION shows a "new" dot on them). */
  seenVersion: string;
}

const KEY = 'sprout-quest-save';

export function newState(): SaveState {
  const mats = Object.fromEntries(MAT_ORDER.map((m) => [m, 0])) as Record<MatId, number>;
  return {
    version: 1,
    lv: 1,
    xp: 0,
    hp: 30,
    mats,
    owned: ['twig', 'tunic'],
    equip: { weapon: 'twig', armor: 'tunic', charm: null },
    potions: 2,
    // New adventures begin in the Quiet Glade, west of the village.
    pos: { x: 3.5, y: 13.9 },
    visited: ['glade'],
    bossWins: 0,
    muted: false,
    tips: [],
    quest: 0,
    questKills: 0,
    talked: false,
    crafted: 0,
    bosses: [],
    build: { home: 1, forge: 0, garden: 0, training: 0, warp: 0 },
    camps: [],
    respawn: 'glade',
    unlocked: [],
    fresh: [],
    wins: 0,
    cloverDry: 0,
    tools: { wood: 0, mine: 0 },
    skills: { wood: { lv: 1, xp: 0 }, mine: { lv: 1, xp: 0 } },
    nodes: {},
    mastery: { sword: { lv: 1, xp: 0 }, hammer: { lv: 1, xp: 0 }, whip: { lv: 1, xp: 0 }, wand: { lv: 1, xp: 0 } },
    playtime: 0,
    flags: [],
    // A new adventure has nothing to catch up on.
    seenVersion: VERSION,
  };
}

export function loadState(): SaveState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveState>;
    if (data.version !== 1) return null;
    // Merge onto defaults so newly-added fields and materials are always present.
    const base = newState();
    const merged = {
      ...base, ...data,
      mats: { ...base.mats, ...data.mats },
      equip: { ...base.equip, ...data.equip },
      build: { ...base.build, ...data.build },
      tools: { ...base.tools, ...data.tools },
      skills: { ...base.skills, ...data.skills },
      mastery: { ...base.mastery, ...data.mastery },
    } as SaveState;
    if (data.mastery === undefined) migrateToTracks(merged);
    // Saves from before the story update: credit progress that already happened.
    if (data.flags === undefined) {
      // Saves from before the prologue existed: the world gained a 16-tile glade on the west, and the story gained
      // four prologue steps. Shift everything over and treat the prologue as done.
      merged.flags = ['sword', 'glade1', 'glade2', 'village'];
      merged.pos = { x: (data.pos?.x ?? 4.5) + 16, y: data.pos?.y ?? 13.5 };
      const oldOrder = ['hello', 'meadow', 'gear', 'cottage', 'kingslime', 'smithy', 'alphawolf', 'warp', 'crystalking', 'master', 'dragon', 'legend'];
      const newOrder = ['wake', 'firstfight', 'dodge', 'village', 'meadow', 'repair', 'gear', 'cottage', 'kingslime', 'smithy', 'alphawolf', 'warp', 'crystalking', 'master', 'dragon', 'legend'];
      const id = oldOrder[data.quest ?? 0] ?? 'meadow';
      merged.quest = newOrder.indexOf(id === 'hello' ? 'meadow' : id);
      if (merged.respawn === ('glade' as ZoneId)) merged.respawn = 'village';
      if (data.build?.forge === undefined) merged.build.forge = 1;
      if (!merged.visited.includes('village')) merged.visited.push('village');
    }
    if (data.unlocked === undefined) {
      // Existing players keep everything they've already seen: count past fights as wins so unlocks catch up silently.
      merged.wins = merged.lv > 1 || merged.owned.length > 2 ? 10 : 0;
      merged.fresh = [];
    }
    if (data.quest === undefined) {
      merged.crafted = Math.max(0, merged.owned.length - 2);
      if ((data.bossWins ?? 0) > 0) merged.bosses = ['dragon'];
    }
    // Saves from before patch notes existed were made on 0.1.0.
    if (data.seenVersion === undefined) merged.seenVersion = '0.1.0';
    return merged;
  } catch {
    return null;
  }
}

/** Weapons retired in the tracks overhaul, and the new gear of the same tier that replaces them in old saves. */
const RETIRED: Record<string, string> = {
  jelly: 'stonesword', cloverhatchet: 'stonehammer', fangspear: 'coppersword', timberaxe: 'copperhammer', mushmallet: 'copperhammer',
  crystalwand: 'ironsword', geode: 'ironsword', boulder: 'ironhammer', magmacleaver: 'crystalhammer', wyrmfang: 'wyrmbreaker',
};

/**
 * Saves from before Glimmer Hollow and the gear tracks: swap retired gear for its new equivalent, and step the story
 * past the new Glimmer Hollow chapter if they were already beyond it.
 */
function migrateToTracks(s: SaveState) {
  s.owned = [...new Set(s.owned.map((id) => RETIRED[id] ?? id).filter((id) => GEAR[id]))];
  if (RETIRED[s.equip.weapon]) s.equip.weapon = RETIRED[s.equip.weapon];
  if (!GEAR[s.equip.weapon]) s.equip.weapon = 'twig';
  if (!s.owned.includes(s.equip.weapon)) s.owned.push(s.equip.weapon);
  const hollow = QUESTS.findIndex((q) => q.id === 'hollow');
  if (s.quest >= hollow) s.quest++;
}

export function saveState(s: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or disabled (private mode) — the game still runs, it just won't persist.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
