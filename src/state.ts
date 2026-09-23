import { MAT_ORDER, type MatId, type ProjectId, type ZoneId } from './data';

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
    // Start right next to Elder Bloom so the story begins immediately.
    pos: { x: 9.2, y: 13.2 },
    visited: ['village'],
    bossWins: 0,
    muted: false,
    tips: [],
    quest: 0,
    questKills: 0,
    talked: false,
    crafted: 0,
    bosses: [],
    build: { home: 1, forge: 1, garden: 0, training: 0, warp: 0 },
    camps: [],
    respawn: 'village',
    unlocked: [],
    fresh: [],
    wins: 0,
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
    } as SaveState;
    // Saves from before the story update: credit progress that already happened.
    if (data.unlocked === undefined) {
      // Existing players keep everything they've already seen: count past fights as wins so unlocks catch up silently.
      merged.wins = merged.lv > 1 || merged.owned.length > 2 ? 10 : 0;
      merged.fresh = [];
    }
    if (data.quest === undefined) {
      merged.crafted = Math.max(0, merged.owned.length - 2);
      if ((data.bossWins ?? 0) > 0) merged.bosses = ['dragon'];
    }
    return merged;
  } catch {
    return null;
  }
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
