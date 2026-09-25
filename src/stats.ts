// Play report: a log of every fight, gather, level-up, craft and story step, kept in its own localStorage entry
// (so it never bloats the save), exportable from the More tab to hand over for balancing.
import { GEAR } from './data';
import type { SaveState } from './state';

const KEY = 'sprout-quest-log';
/** Oldest events are dropped past this, to keep storage small. */
const MAX_EVENTS = 6000;

export type LogEvent =
  | {
      kind: 'fight'; zone: string; foes: string[]; boss: boolean; ambush: boolean; result: 'win' | 'lose' | 'run';
      seconds: number; swings: number; hits: number; crits: number; skills: number; dodges: number; potions: number;
      dealt: number; taken: number; hpStart: number; hpEnd: number; maxHp: number; xp: number; weapon: string; armor: string;
    }
  | { kind: 'gather'; node: string; grass: boolean; seconds: number; strikes: number; misses: number; perfects: number; tool: number; skillLv: number; got: Record<string, number> }
  | { kind: 'level'; track: string; lv: number }
  | { kind: 'craft'; id: string }
  | { kind: 'build'; id: string; lv: number }
  | { kind: 'quest'; id: string }
  | { kind: 'session'; action: 'start' | 'new' };

/** Every event also records when it happened: wall time, and play time (seconds actually spent playing). */
export type Stamped = LogEvent & { at: number; play: number; lv: number };

function load(): Stamped[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Stamped[];
  } catch {
    return [];
  }
}

export function logEvent(save: SaveState, e: LogEvent) {
  try {
    const all = load();
    all.push({ at: Date.now(), play: Math.round(save.playtime), lv: save.lv, ...e });
    localStorage.setItem(KEY, JSON.stringify(all.slice(-MAX_EVENTS)));
  } catch {
    // Storage full or blocked: the report is a nice-to-have.
  }
}

export function clearLog() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

/** The report: a summary for a quick read (per zone, per node, level timeline) plus the raw events. */
export function buildReport(save: SaveState) {
  const events = load();
  const fights = events.filter((e): e is Extract<Stamped, { kind: 'fight' }> => e.kind === 'fight');
  const gathers = events.filter((e): e is Extract<Stamped, { kind: 'gather' }> => e.kind === 'gather');
  const byZone: Record<string, unknown> = {};
  for (const zone of [...new Set(fights.map((f) => `${f.zone}${f.boss ? ' (boss)' : ''}`))]) {
    const fs = fights.filter((f) => `${f.zone}${f.boss ? ' (boss)' : ''}` === zone);
    byZone[zone] = {
      fights: fs.length, wins: fs.filter((f) => f.result === 'win').length, losses: fs.filter((f) => f.result === 'lose').length,
      runs: fs.filter((f) => f.result === 'run').length, avgSeconds: avg(fs.map((f) => f.seconds)), avgFoes: avg(fs.map((f) => f.foes.length)),
      avgSwings: avg(fs.map((f) => f.swings)), avgHits: avg(fs.map((f) => f.hits)), avgDealt: avg(fs.map((f) => f.dealt)),
      avgTaken: avg(fs.map((f) => f.taken)), avgHpLostPct: avg(fs.map((f) => (100 * f.taken) / Math.max(1, f.maxHp))),
      avgPotions: avg(fs.map((f) => f.potions)), avgLv: avg(fs.map((f) => f.lv)), weapons: [...new Set(fs.map((f) => f.weapon))],
    };
  }
  const byNode: Record<string, unknown> = {};
  for (const node of [...new Set(gathers.map((g) => g.node))]) {
    const gs = gathers.filter((g) => g.node === node);
    byNode[node] = {
      count: gs.length, avgSeconds: avg(gs.map((g) => g.seconds)), avgStrikes: avg(gs.map((g) => g.strikes)),
      missRate: avg(gs.map((g) => g.misses / Math.max(1, g.strikes))), perfectRate: avg(gs.map((g) => g.perfects / Math.max(1, g.strikes))),
      grassShare: avg(gs.map((g) => (g.grass ? 1 : 0))),
    };
  }
  const levels = events.filter((e) => e.kind === 'level').map((e) => ({ track: (e as { track: string }).track, lv: (e as { lv: number }).lv, playMinutes: Math.round(e.play / 6) / 10 }));
  return {
    game: 'Sprout Quest',
    exported: new Date().toISOString(),
    playMinutes: Math.round(save.playtime / 6) / 10,
    now: {
      lv: save.lv, quest: save.quest, bosses: save.bosses, dragonWins: save.bossWins, skills: save.skills, mastery: save.mastery,
      tools: save.tools, build: save.build, equip: save.equip, owned: save.owned.filter((id) => GEAR[id]), mats: save.mats,
    },
    summary: {
      fights: fights.length, deaths: fights.filter((f) => f.result === 'lose').length, gathers: gathers.length,
      fightsByZone: byZone, gatheringByNode: byNode, levelTimeline: levels,
      crafted: events.filter((e) => e.kind === 'craft').map((e) => ({ id: (e as { id: string }).id, playMinutes: Math.round(e.play / 6) / 10 })),
      quests: events.filter((e) => e.kind === 'quest').map((e) => ({ id: (e as { id: string }).id, playMinutes: Math.round(e.play / 6) / 10 })),
    },
    events,
  };
}
