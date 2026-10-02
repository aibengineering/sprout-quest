import { slotKey, storageFrozen } from './slots';
import { VERSION } from './version';
import type { MealId } from './kitchen';
import type { SawState } from './sawmill';
import type { GardenState } from './garden';
import type { RoomId } from './room';
import { inSideArea, MOUTH } from './procession';
import type { Homes } from './housing';
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
  /** Old saves' mute, carried over once into the device's sound settings (src/sound.ts), which replaced it. */
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
  /** Resident homes and additions, independent of workshop upgrades. */
  homes: Homes;
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
  /** Side stories: how far through each one you are (see game/stories.ts; missing = not started). */
  stories: Record<string, number>;
  /** Lasting upgrades earned from side stories (e.g. 'trailboots'). */
  perks: string[];
  /** The meal you last ate at Granny's and how much of it is left (fights, seconds on the map, or chops; see kitchen.ts). */
  meal: { id: MealId; left: number } | null;
  /** Bram's Sawmill: planks queued, ready to collect, and when the current one was started (see sawmill.ts). */
  sawmill?: SawState;
  /** Poppy's Garden: what's growing in each plot, and when she last brought you Flower Seeds (see garden.ts). */
  garden?: GardenState;
  /** The room you're in (Granny's Kitchen, Bram's Sawmill): you carry on there. `pos` is then just outside its door. */
  room?: RoomId;
  /** A separate underground instance; pos remains outside its entrance. */
  underground?: { id: 'echo'; x: number; y: number };
  /** Set once the Forge has its five levels (older saves had three: Smithy was ★★★–★★★★, Master Forge the third). */
  forgeLevels?: 5;
  /** Set once the save knows about the Echo Queen (0.3.0 put her quest between the Waystone and Glimmer Hollow). */
  echoQueen?: true;
  /** Set once the save counts materials in handfuls (0.4.0): see MATERIAL_SCALE. */
  units?: 2;
  /**
   * Fainted: you walk as a spirit from your last checkpoint back to your body, lying here (tile coordinates), and touch it
   * to wake. Veyra keeps bringing you back (see game/death.ts).
   */
  spirit?: { x: number; y: number };
  /** A Battle Tower run (dev builds, in a slot of its own): the next floor to fight. */
  tower?: { floor: number };
  /**
   * Set once the save knows Sowerby is wider (it grew FIELD_SHIFT tiles east for Poppy's field, pushing every area
   * past it along): older saves standing (or lying) east of the village move with their area.
   */
  field?: true;
  /** Recipes you've seen in the Forge; ones revealed since show as new (missing: everything revealed counts as seen). */
  forgeSeen?: string[];
}

/** Where the save lives (see slots.ts). */
export const SAVE_KEY = 'sprout-quest-save';

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
    build: { home: 1, forge: 0, garden: 0, training: 0, warp: 0, sawmill: 0, cottage: 0 },
    homes: { pip: 0, hazel: 0, moss: 0 },
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
    echoQueen: true,
    stories: {},
    perks: [],
    meal: null,
    forgeSeen: [],
    forgeLevels: 5,
    units: 2,
    field: true,
  };
}

/** How far east Sowerby grew for Poppy's field, and where the areas past it used to begin. */
export const FIELD_SHIFT = 9;
const OLD_MEADOW_X0 = 38;

/**
 * 0.4.0 counts materials in sensible amounts: a bunny drops a handful of fluff, a tree a few logs, a house takes dozens
 * of planks. Drops, yields and recipes all grew by the same factor per material (so the effort is the same), and a log
 * now saws into two planks. Older saves are multiplied by the same factors so nothing is worth less.
 */
export const MATERIAL_SCALE: Partial<Record<MatId, number>> = {
  goo: 3, fluff: 3, cap: 3, glimmer: 3, ember: 3, fang: 2, wing: 2, horn: 2,
  bark: 3, pine: 3, glimwood: 3, emberwood: 3, stone: 3, copper: 3, iron: 3, crystal: 2, obsidian: 2,
  berry: 2, herb: 2, flower: 2, plank: 8, pineplank: 8, glimplank: 8, emberplank: 8,
};

function countInHandfuls(s: SaveState) {
  for (const [m, k] of Object.entries(MATERIAL_SCALE) as [MatId, number][]) s.mats[m] = (s.mats[m] ?? 0) * k;
  // Planks ordered at the Sawmill were each two old logs: now four logs, which saw into the eight planks one is worth.
  const w = s.sawmill as unknown as { queue?: string[]; queued?: number; ready: number | Record<string, number>; since: number } | undefined;
  if (w) {
    const orders: string[] = Array.isArray(w.queue) ? w.queue : Array.from({ length: w.queued ?? 0 }, () => 'bark');
    const ready: Record<string, number> = typeof w.ready === 'number' ? { plank: w.ready } : { ...w.ready };
    for (const k of Object.keys(ready)) ready[k] *= MATERIAL_SCALE.plank!;
    s.sawmill = { queue: orders.flatMap((l) => [l, l, l, l]) as SawState['queue'], ready, since: w.since ?? 0 };
  }
  s.units = 2;
}

export function loadState(): SaveState | null {
  try {
    const raw = localStorage.getItem(slotKey(SAVE_KEY));
    if (!raw) return null;
    // The Jelly Slingshot became the Jelly Wand in 0.3.1.
    const data = JSON.parse(raw.replaceAll('"jellysling"', '"jellywand"')) as Partial<SaveState>;
    if (data.version !== 1) return null;
    // Merge onto defaults so newly-added fields and materials are always present.
    const base = newState();
    const merged = {
      ...base, ...data,
      mats: { ...base.mats, ...data.mats },
      equip: { ...base.equip, ...data.equip },
      build: { ...base.build, ...data.build },
      homes: { ...base.homes, ...data.homes },
      tools: { ...base.tools, ...data.tools },
      skills: { ...base.skills, ...data.skills },
      mastery: { ...base.mastery, ...data.mastery },
    } as SaveState;
    merged.homes.pip = Math.max(merged.homes.pip, merged.build.cottage);
    for (const id of ['pip', 'hazel', 'moss'] as const) {
      merged.homes[id] = Math.max(0, Math.min(2, Math.floor(Number(merged.homes[id]) || 0)));
    }
    if (merged.homes.pip) merged.build.cottage = 1;
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
    if (data.units === undefined) countInHandfuls(merged);
    // The Forge went from three levels to five (one per tier): nobody loses recipes they could make.
    if (data.forgeLevels === undefined) {
      merged.build.forge = [0, 1, 4, 5][merged.build.forge] ?? merged.build.forge;
      merged.forgeLevels = 5;
    }
    // Elder Oswin hands over his old axe and pick on arrival (older saves reached Sowerby before he did).
    if (merged.flags.includes('village') && !merged.flags.includes('oldtools')) merged.flags.push('oldtools');
    // The Echo Queen now guards Glimmer Hollow, with her own quest before it. Saves already past that point skip her
    // (she's counted as beaten, her campfire lit) and keep their place in the story; others meet her on the way.
    if (data.echoQueen === undefined) {
      const at = QUESTS.findIndex((q) => q.id === 'echoqueen');
      const beyond = merged.visited.includes('hollow') || merged.quest > at;
      if (merged.quest >= at && beyond) merged.quest++;
      if (beyond && !merged.bosses.includes('echoqueen')) {
        merged.bosses.push('echoqueen');
        if (!merged.camps.includes('hollow')) merged.camps.push('hollow');
      }
      merged.echoQueen = true;
    }
    // Sowerby grew east for Poppy's field: everything past it moved along with its area.
    if (data.field === undefined) {
      const along = (p: { x: number; y: number }) => (p.x >= OLD_MEADOW_X0 ? { x: p.x + FIELD_SHIFT, y: p.y } : p);
      merged.pos = along(merged.pos);
      if (merged.spirit) merged.spirit = along(merged.spirit);
      merged.field = true;
    }
    // Saves from before patch notes existed were made on 0.1.0.
    if (data.seenVersion === undefined) merged.seenVersion = '0.1.0';
    // Old saves in the former side tunnels resume in their new independent map.
    if (!merged.room && !merged.underground && inSideArea(merged.pos)) {
      merged.underground = { id: 'echo', ...merged.pos };
      merged.pos = { x: MOUTH.x, y: MOUTH.y + .8 };
    }
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
  if (storageFrozen()) return;
  try {
    localStorage.setItem(slotKey(SAVE_KEY), JSON.stringify(s));
  } catch {
    // Storage full or disabled (private mode) — the game still runs, it just won't persist.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(slotKey(SAVE_KEY));
  } catch {
    // ignore
  }
}
