// Bram's Sawmill: drop off logs and he saws each into a couple of Planks, a log every few seconds of real time, so they
// pile up while you're out adventuring (or away from the game). Come back and collect them. Each wood makes its own
// plank, and each blade upgrade saws the next wood (and faster): copper for Oak, iron for Pine, crystal for Glimmerwood,
// obsidian for Emberwood.
import type { MatId } from './data';
import type { SaveState } from './state';

/** Planks sawn from each log. */
export const PLANKS_PER_LOG = 2;
export type SawLog = 'bark' | 'pine' | 'glimwood' | 'emberwood';
export type Plank = 'plank' | 'pineplank' | 'glimplank' | 'emberplank';

/** The plank each wood becomes, and the Sawmill level that first saws it. */
export const SAW: Record<SawLog, { plank: Plank; level: number }> = {
  bark: { plank: 'plank', level: 1 },
  pine: { plank: 'pineplank', level: 2 },
  glimwood: { plank: 'glimplank', level: 3 },
  emberwood: { plank: 'emberplank', level: 4 },
};
export const SAW_LOGS = Object.keys(SAW) as SawLog[];

/** Seconds of real time per log, by Sawmill level: each blade is faster than the last. */
const SAW_SECONDS_BY_LEVEL = [5, 5, 3.5, 2.5, 2];
export const SAW_SECONDS = SAW_SECONDS_BY_LEVEL[1];

/** How long a log takes at this Sawmill. */
export const sawSeconds = (s: SaveState) => SAW_SECONDS_BY_LEVEL[Math.min(s.build.sawmill, SAW_SECONDS_BY_LEVEL.length - 1)];
/** Which logs it can saw at its level. */
export const sawLogs = (s: SaveState): SawLog[] => SAW_LOGS.filter((l) => s.build.sawmill >= SAW[l].level);
/** Logs waiting on the bench at once. */
export const SAW_MAX = 60;

export interface SawState {
  /** Logs handed over, sawn in order. */
  queue: SawLog[];
  /** Sawn and waiting to be collected, by plank. */
  ready: Partial<Record<Plank, number>>;
  /** When the plank being sawn now was started (Date.now()). */
  since: number;
}

const saw = (s: SaveState): SawState => (s.sawmill ??= { queue: [], ready: {}, since: 0 });

/** Brings the sawing up to `now`: every log's worth of seconds turns the next queued log into its planks. */
export function sawUpdate(s: SaveState, now = Date.now()): SawState {
  const w = saw(s);
  const each = sawSeconds(s) * 1000;
  while (w.queue.length > 0 && now - w.since >= each) {
    const plank = SAW[w.queue.shift()!].plank;
    w.ready[plank] = (w.ready[plank] ?? 0) + PLANKS_PER_LOG;
    w.since += each;
  }
  if (w.queue.length === 0) w.since = now;
  return w;
}

/** Planks sawn and waiting to be collected. */
export const sawReady = (s: SaveState, now = Date.now()) => Object.values(sawUpdate(s, now).ready).reduce((a, n) => a + (n ?? 0), 0);

/** How many more of these logs you could hand over now (room on the bench, and logs in your bag). */
export function canOrder(s: SaveState, log: SawLog = 'bark', now = Date.now()): number {
  if (!sawLogs(s).includes(log)) return 0;
  return Math.max(0, Math.min(SAW_MAX - sawUpdate(s, now).queue.length, s.mats[log]));
}

/** Hands Bram up to `n` logs to saw; returns how many he took. */
export function sawOrder(s: SaveState, n: number, log: SawLog = 'bark', now = Date.now()): number {
  const k = Math.min(n, canOrder(s, log, now));
  if (k <= 0) return 0;
  const w = saw(s);
  if (w.queue.length === 0) w.since = now;
  for (let i = 0; i < k; i++) w.queue.push(log);
  s.mats[log] -= k;
  return k;
}

/** Takes every ready plank; returns how many of each. */
export function sawCollect(s: SaveState, now = Date.now()): Partial<Record<Plank, number>> {
  const w = sawUpdate(s, now), got = { ...w.ready };
  for (const [p, n] of Object.entries(got) as [MatId, number][]) s.mats[p] = (s.mats[p] ?? 0) + n;
  w.ready = {};
  return got;
}

/** Seconds until the next log is sawn (0 when nothing's on the bench). */
export function nextPlankIn(s: SaveState, now = Date.now()): number {
  const w = sawUpdate(s, now);
  return w.queue.length > 0 ? Math.max(0, Math.ceil(sawSeconds(s) - (now - w.since) / 1000)) : 0;
}
