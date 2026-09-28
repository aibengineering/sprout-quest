// Bram's Sawmill: drop off logs and he saws them into Planks, one every so many seconds of real time, so they pile up
// while you're out adventuring (or away from the game). Come back and collect them. The copper blade only manages
// Oak; the Iron Sawmill cuts Pine too, and faster.
import type { SaveState } from './state';

/** Logs per Plank. */
export const LOGS_PER_PLANK = 2;
/** Seconds of real time per Plank: the copper blade, and the iron one. */
export const SAW_SECONDS = 30;
export const IRON_SAW_SECONDS = 20;
export type SawLog = 'bark' | 'pine';

/** How long a plank takes at this Sawmill. */
export const sawSeconds = (s: SaveState) => (s.build.sawmill >= 2 ? IRON_SAW_SECONDS : SAW_SECONDS);
/** Which logs it can saw: Oak with the copper blade, Pine too once it's iron. */
export const sawLogs = (s: SaveState): SawLog[] => (s.build.sawmill >= 2 ? ['bark', 'pine'] : ['bark']);
/** Planks waiting to be sawn or collected at once. */
export const SAW_MAX = 12;

export interface SawState {
  /** Planks ordered and not sawn yet. */
  queued: number;
  /** Sawn and waiting to be collected. */
  ready: number;
  /** When the plank being sawn now was started (Date.now()). */
  since: number;
}

const saw = (s: SaveState): SawState => (s.sawmill ??= { queued: 0, ready: 0, since: 0 });

/** Brings the sawing up to `now`: every SAW_SECONDS turns one queued plank into a ready one. */
export function sawUpdate(s: SaveState, now = Date.now()): SawState {
  const w = saw(s);
  const each = sawSeconds(s) * 1000;
  while (w.queued > 0 && now - w.since >= each) {
    w.queued--;
    w.ready++;
    w.since += each;
  }
  if (w.queued === 0) w.since = now;
  return w;
}

/** How many more planks you could order from these logs now (room at the mill, and logs in your bag). */
export function canOrder(s: SaveState, log: SawLog = 'bark', now = Date.now()): number {
  if (!sawLogs(s).includes(log)) return 0;
  const w = sawUpdate(s, now);
  return Math.max(0, Math.min(SAW_MAX - w.queued - w.ready, Math.floor(s.mats[log] / LOGS_PER_PLANK)));
}

/** Hands Bram the logs for up to `n` planks; returns how many he took on. */
export function sawOrder(s: SaveState, n: number, log: SawLog = 'bark', now = Date.now()): number {
  const k = Math.min(n, canOrder(s, log, now));
  if (k <= 0) return 0;
  const w = saw(s);
  if (w.queued === 0) w.since = now;
  w.queued += k;
  s.mats[log] -= k * LOGS_PER_PLANK;
  return k;
}

/** Takes every ready plank; returns how many. */
export function sawCollect(s: SaveState, now = Date.now()): number {
  const w = sawUpdate(s, now), n = w.ready;
  s.mats.plank = (s.mats.plank ?? 0) + n;
  w.ready = 0;
  return n;
}

/** Seconds until the next plank is done (0 when nothing's on the bench). */
export function nextPlankIn(s: SaveState, now = Date.now()): number {
  const w = sawUpdate(s, now);
  return w.queued > 0 ? Math.max(0, Math.ceil(sawSeconds(s) - (now - w.since) / 1000)) : 0;
}
