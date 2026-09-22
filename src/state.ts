import { MAT_ORDER, type MatId, type ZoneId } from './data';

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
    pos: { x: 4.5, y: 13.5 },
    visited: ['village'],
    bossWins: 0,
    muted: false,
    tips: [],
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
    return { ...base, ...data, mats: { ...base.mats, ...data.mats }, equip: { ...base.equip, ...data.equip } } as SaveState;
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
