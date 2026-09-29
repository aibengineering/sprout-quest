// Play report: a log of every fight, gather, level-up, craft and story step, plus time spent per area and activity,
// kept in their own localStorage entries (so they never bloat the save) and exportable from the More tab.
import { GEAR, NODES, TOOLS } from './data';
import { slotKey, storageFrozen } from './slots';
import type { SaveState } from './state';

/** Where the log and time split live (per save slot, see slots.ts). */
export const LOG_KEY = 'sprout-quest-log';
export const TIME_KEY = 'sprout-quest-time';
/** Oldest events are dropped past this, to keep storage small. */
const MAX_EVENTS = 6000;

export type LogEvent =
  | {
      kind: 'fight'; zone: string; foes: string[]; boss: boolean; ambush: boolean; result: 'win' | 'lose' | 'run';
      seconds: number; swings: number; hits: number; crits: number; skills: number; dodges: number; potions: number;
      dealt: number; taken: number; hpStart: number; hpEnd: number; maxHp: number; xp: number; weapon: string; armor: string;
      /** Seconds spent wanting to attack while waiting between strikes, or resting after a combo; weapon handling level. */
      cooling: number; rested: number; handling: number;
      /** Damage from critical hits (part of `dealt`), and how many monsters fell. */
      critDealt?: number; kills?: number;
      /** On a loss: what landed the last hit ("monster:contact|shot|hazard"). */
      killedBy?: string;
    }
  | { kind: 'gather'; node: string; grass: boolean; seconds: number; strikes: number; misses: number; perfects: number; tool: number; skillLv: number; got: Record<string, number> }
  | { kind: 'level'; track: string; lv: number }
  | { kind: 'craft'; id: string }
  | { kind: 'build'; id: string; lv: number }
  | { kind: 'quest'; id: string }
  /** The first time you walk up to a guardian's gate: when you were ready to take it on, whenever you actually did. */
  | { kind: 'reached'; id: string }
  | { kind: 'session'; action: 'start' | 'new' };

/** Every event also records when it happened: wall time, and play time (seconds actually spent playing). */
export type Stamped = LogEvent & { at: number; play: number; lv: number };
type Of<K extends LogEvent['kind']> = Extract<Stamped, { kind: K }>;

function load(): Stamped[] {
  try {
    return JSON.parse(localStorage.getItem(slotKey(LOG_KEY)) ?? '[]') as Stamped[];
  } catch {
    return [];
  }
}

export function logEvent(save: SaveState, e: LogEvent) {
  if (storageFrozen()) return;
  try {
    const all = load();
    all.push({ at: Date.now(), play: Math.round(save.playtime), lv: save.lv, ...e });
    localStorage.setItem(slotKey(LOG_KEY), JSON.stringify(all.slice(-MAX_EVENTS)));
  } catch {
    // Storage full or blocked: the report is a nice-to-have.
  }
}

/** Guardians already marked as reached this session (so the log isn't read every frame). */
let reached: Set<string> | null = null;

/** Notes the first time you walk up to a guardian's gate (once per save). */
export function noteReached(save: SaveState, id: string) {
  reached ??= new Set(load().filter((e): e is Of<'reached'> => e.kind === 'reached').map((e) => e.id));
  if (reached.has(id)) return;
  reached.add(id);
  logEvent(save, { kind: 'reached', id });
}

// ------------------------------------------------------------------ time per area and activity

/** What you're doing, for the time split: walking the map, fighting, gathering, or in menus and popups. */
export type Activity = 'walking' | 'fighting' | 'gathering' | 'menus';
type TimeLog = Record<string, Record<string, number>>;

let time: TimeLog | null = null;
let unsaved = 0;

function loadTime(): TimeLog {
  if (!time) {
    try {
      time = JSON.parse(localStorage.getItem(slotKey(TIME_KEY)) ?? '{}') as TimeLog;
    } catch {
      time = {};
    }
  }
  return time;
}

/** Time in menus and popups is also split by screen ("menu:items", "dialogs"…) under this pseudo-area. */
export const SCREENS = '(screens)';

/** Adds `dt` seconds of `activity` in `zone`; written to storage every few seconds (and by flushTime). */
export function trackTime(zone: string, activity: Activity | string, dt: number) {
  const t = loadTime();
  const z = (t[zone] ??= {});
  z[activity] = (z[activity] ?? 0) + dt;
  unsaved += dt;
  if (unsaved > 5) flushTime();
}

export function flushTime() {
  unsaved = 0;
  if (storageFrozen()) return;
  try {
    localStorage.setItem(slotKey(TIME_KEY), JSON.stringify(loadTime()));
  } catch {
    // ignore
  }
}

export function clearLog() {
  time = {};
  try {
    localStorage.removeItem(slotKey(LOG_KEY));
    localStorage.removeItem(slotKey(TIME_KEY));
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------------ the report

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
const minutes = (secs: number) => Math.round(secs / 6) / 10;
const byKey = <T>(xs: T[], key: (x: T) => string) => {
  const out: Record<string, T[]> = {};
  for (const x of xs) (out[key(x)] ??= []).push(x);
  return out;
};

function fightStats(fs: Of<'fight'>[]) {
  return {
    fights: fs.length, wins: fs.filter((f) => f.result === 'win').length, losses: fs.filter((f) => f.result === 'lose').length,
    runs: fs.filter((f) => f.result === 'run').length, avgSeconds: avg(fs.map((f) => f.seconds)), avgFoes: avg(fs.map((f) => f.foes.length)),
    avgSwings: avg(fs.map((f) => f.swings)), avgHits: avg(fs.map((f) => f.hits)), avgDealt: avg(fs.map((f) => f.dealt)),
    avgTaken: avg(fs.map((f) => f.taken)), avgHpLostPct: avg(fs.map((f) => (100 * f.taken) / Math.max(1, f.maxHp))),
    avgPotions: avg(fs.map((f) => f.potions)), avgLv: avg(fs.map((f) => f.lv)),
    // Pace: how long you were kept waiting per fight, and at what handling.
    avgCoolingSec: avg(fs.map((f) => f.cooling ?? 0)), avgRestedSec: avg(fs.map((f) => f.rested ?? 0)), avgHandling: avg(fs.map((f) => f.handling ?? 1)),
    // How much each kill took: damage per landed hit, strikes and seconds per monster, what share of damage was crits,
    // and everything you did per kill (strikes, specials, dodges, potions).
    avgDamagePerHit: avg(fs.map((f) => f.dealt / Math.max(1, f.hits))),
    strikesPerKill: avg(fs.map((f) => f.swings / Math.max(1, f.kills ?? f.foes.length))),
    secondsPerKill: avg(fs.map((f) => f.seconds / Math.max(1, f.kills ?? f.foes.length))),
    critShare: avg(fs.map((f) => (f.critDealt ?? 0) / Math.max(1, f.dealt))),
    avgDodges: avg(fs.map((f) => f.dodges)),
    actionsPerKill: avg(fs.map((f) => (f.swings + f.skills + f.dodges + f.potions) / Math.max(1, f.kills ?? f.foes.length))),
  };
}

/** Gathering per node, split into full-speed runs and "chipping" the next tier with a slow tool. */
function gatherStats(gs: Of<'gather'>[]) {
  const one = (xs: Of<'gather'>[]) => ({
    count: xs.length, avgSeconds: avg(xs.map((g) => g.seconds)), avgStrikes: avg(xs.map((g) => g.strikes)),
    missRate: avg(xs.map((g) => g.misses / Math.max(1, g.strikes))), perfectRate: avg(xs.map((g) => g.perfects / Math.max(1, g.strikes))),
  });
  const tier = (g: Of<'gather'>) => NODES[g.node as keyof typeof NODES]?.tier ?? 0;
  const fast = gs.filter((g) => g.tool >= tier(g)), slow = gs.filter((g) => g.tool < tier(g));
  return { ...one(gs), grassShare: avg(gs.map((g) => (g.grass ? 1 : 0))), ...(slow.length ? { fullSpeed: one(fast), chipping: one(slow) } : {}) };
}

/** When each tool was crafted, and how long you played since the previous tier of it (or since the start). */
function toolTimeline(crafts: Of<'craft'>[]) {
  const last: Record<string, number> = {};
  return crafts.flatMap((c) => {
    const t = TOOLS.find((t) => t.id === c.id);
    if (!t) return [];
    const since = minutes(c.play - (last[t.skill] ?? 0));
    last[t.skill] = c.play;
    return [{ id: t.id, tier: t.tier, playMinutes: minutes(c.play), minutesSincePreviousTier: since }];
  });
}

/** Minutes per area per activity, plus totals, and the menu time split by screen. */
function timeSplit() {
  const t = loadTime(), total: Record<string, number> = {};
  const byZone: Record<string, Record<string, number>> = {};
  const menusByScreen = Object.fromEntries(Object.entries(t[SCREENS] ?? {}).map(([k, v]) => [k, minutes(v)]));
  for (const [zone, acts] of Object.entries(t)) {
    if (zone === SCREENS) continue;
    byZone[zone] = {};
    for (const [a, secs] of Object.entries(acts)) {
      byZone[zone][a] = minutes(secs);
      total[a] = (total[a] ?? 0) + secs;
    }
  }
  return { totalMinutes: Object.fromEntries(Object.entries(total).map(([a, s]) => [a, minutes(s)])), menusByScreen, byZone };
}

/** The summary: small enough to paste into a chat. Per-area fights, weapons, gathering, time, deaths and timelines. */
export function buildSummary(save: SaveState) {
  const events = load();
  const fights = events.filter((e): e is Of<'fight'> => e.kind === 'fight');
  const gathers = events.filter((e): e is Of<'gather'> => e.kind === 'gather');
  const crafts = events.filter((e): e is Of<'craft'> => e.kind === 'craft');
  const at = (e: Stamped) => minutes(e.play);
  const map = <T, U>(o: Record<string, T>, f: (v: T) => U) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
  return {
    game: 'Sprout Quest',
    exported: new Date().toISOString(),
    playMinutes: minutes(save.playtime),
    now: {
      lv: save.lv, quest: save.quest, bosses: save.bosses, dragonWins: save.bossWins, skills: save.skills, mastery: save.mastery,
      tools: save.tools, build: save.build, equip: save.equip, owned: save.owned.filter((id) => GEAR[id]), mats: save.mats,
    },
    summary: {
      fights: fights.length, deaths: fights.filter((f) => f.result === 'lose').length, gathers: gathers.length,
      time: timeSplit(),
      fightsByZone: map(byKey(fights, (f) => `${f.zone}${f.boss ? ' (boss)' : ''}`), fightStats),
      fightsByWeapon: map(byKey(fights.filter((f) => !f.boss), (f) => f.weapon), fightStats),
      defeatsAndRuns: fights.filter((f) => f.result !== 'win').map((f) => ({
        result: f.result, zone: f.zone, foes: f.foes, by: f.killedBy, lv: f.lv, weapon: f.weapon, armor: f.armor, playMinutes: at(f),
      })),
      gatheringByNode: map(byKey(gathers, (g) => g.node), gatherStats),
      tools: toolTimeline(crafts),
      levelTimeline: events.filter((e): e is Of<'level'> => e.kind === 'level').map((e) => ({ track: e.track, lv: e.lv, playMinutes: at(e) })),
      crafted: crafts.map((e) => ({ id: e.id, playMinutes: at(e) })),
      quests: events.filter((e): e is Of<'quest'> => e.kind === 'quest').map((e) => ({ id: e.id, playMinutes: at(e) })),
      storyline: storyline(events),
    },
  };
}

/**
 * The playthrough as the story's chapters: each quest from when the last one finished to when it did, with the fights,
 * levels and handling in between, what you crafted, and (for a guardian) when you first walked up to it. The gap
 * between reaching a guardian and beating it is the extra levelling you chose to do first.
 */
export function storyline(events: Stamped[]) {
  const quests = events.filter((e): e is Of<'quest'> => e.kind === 'quest');
  const handling = (upTo: number) => {
    const h: Record<string, number> = {};
    for (const e of events) if (e.kind === 'level' && e.track.startsWith('handling:') && e.play <= upTo) h[e.track.slice(9)] = e.lv;
    return h;
  };
  let from = 0, lvFrom = 1;
  return quests.map((q) => {
    const within = (e: Stamped) => e.play > from && e.play <= q.play;
    const fights = events.filter((e): e is Of<'fight'> => e.kind === 'fight' && within(e));
    const reach = events.find((e): e is Of<'reached'> => e.kind === 'reached' && within(e));
    const row = {
      id: q.id, startMinutes: minutes(from), doneMinutes: minutes(q.play), minutes: minutes(q.play - from),
      fights: fights.length, deaths: fights.filter((f) => f.result === 'lose').length, lvFrom, lvTo: q.lv, handling: handling(q.play),
      crafted: events.filter((e): e is Of<'craft'> => e.kind === 'craft' && within(e)).map((e) => e.id),
      ...(reach ? { reachedGuardianAt: minutes(reach.play), lvWhenReached: reach.lv, fightsAfterReaching: fights.filter((f) => f.play > reach.play).length - 1 } : {}),
    };
    from = q.play;
    lvFrom = q.lv;
    return row;
  });
}

/** The raw events as one table per kind (column names once, then a row per event). */
function eventTables(events: Stamped[]) {
  const tables: Record<string, { cols: string[]; rows: unknown[][] }> = {};
  for (const e of events) {
    const t = (tables[e.kind] ??= { cols: [], rows: [] });
    for (const k of Object.keys(e)) if (k !== 'kind' && !t.cols.includes(k)) t.cols.push(k);
    t.rows.push(t.cols.map((c) => (e as Record<string, unknown>)[c] ?? null));
  }
  // Rows written before a column appeared are shorter; pad them so every row lines up with the columns.
  for (const t of Object.values(tables)) for (const r of t.rows) while (r.length < t.cols.length) r.push(null);
  return tables;
}

/** The full report as JSON text: the summary, then every event, one line per event so it stays readable. */
export function reportText(save: SaveState): string {
  const head = JSON.stringify(buildSummary(save), null, 1);
  const tables = Object.entries(eventTables(load())).map(([kind, t]) =>
    ` "${kind}": {\n  "cols": ${JSON.stringify(t.cols)},\n  "rows": [\n${t.rows.map((r) => `   ${JSON.stringify(r)}`).join(',\n')}\n  ]\n }`);
  return `${head.slice(0, -2)},\n "events": {\n${tables.join(',\n')}\n }\n}\n`;
}

/** The summary alone as JSON text, for pasting. */
export const summaryText = (save: SaveState) => `${JSON.stringify(buildSummary(save), null, 1)}\n`;

/** How much has been recorded, for the More tab. */
export function reportInfo() {
  const events = load();
  return { fights: events.filter((e) => e.kind === 'fight').length, gathers: events.filter((e) => e.kind === 'gather').length };
}
