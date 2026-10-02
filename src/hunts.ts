// Rook's commissions: regional sightings, persistent field records and one-time trophy/reward claims.
import { MONSTERS, zoneById, type MonsterKind, type ZoneId } from './data';
import type { SaveState } from './state';
export type HuntVariant = 'swift' | 'armoured' | 'fierce';
export interface HuntDef {
  kind: MonsterKind;
  name: string;
  zone: ZoneId;
  at: {
    x: number;
    y: number;
  };
  place: string;
  variant: HuntVariant;
  lodge: number;
}
const at = (zone: ZoneId, x: number, y: number) => ({ x: zoneById(zone).x0 + x, y });
export const HUNTS: HuntDef[] = [
  { kind: 'slime', name: 'Willow Slime', zone: 'meadow', at: at('meadow', 21.5, 9.8), place: 'the eastern shore of Willow Pond', variant: 'armoured', lodge: 1 },
  { kind: 'bunny', name: 'Orchard Hopbun', zone: 'meadow', at: at('meadow', 27.5, 12.8), place: 'the eastern orchard', variant: 'swift', lodge: 1 },
  { kind: 'shroom', name: 'Stillwater Sporecap', zone: 'woods', at: at('woods', 16.5, 12.8), place: 'the western bank of Stillwater', variant: 'fierce', lodge: 1 },
  { kind: 'wolf', name: 'Camp Woolf', zone: 'woods', at: at('woods', 10.5, 6.8), place: 'the path below Bram’s old camp', variant: 'swift', lodge: 1 },
  { kind: 'bat', name: 'Quarry Flapper', zone: 'cave', at: at('cave', 14.5, 20.8), place: 'the Old Quarry’s western descent', variant: 'swift', lodge: 2 },
  { kind: 'golem', name: 'Ironback Pebblor', zone: 'cave', at: at('cave', 25.5, 18.8), place: 'the Old Quarry’s eastern galleries', variant: 'armoured', lodge: 2 },
  { kind: 'glimmer', name: 'Mirror Glimmer', zone: 'hollow', at: at('hollow', 13.5, 27.8), place: 'the Rootlight crystal beds', variant: 'armoured', lodge: 2 },
  { kind: 'imp', name: 'Cinder Impy', zone: 'peak', at: at('peak', 13.5, 23.8), place: 'the western Cinder Basin', variant: 'swift', lodge: 3 },
  { kind: 'magma', name: 'Coalheart Slime', zone: 'peak', at: at('peak', 32.5, 27.8), place: 'the Cinder Basin’s eastern workings', variant: 'fierce', lodge: 3 },
];
export const VARIANTS: Record<HuntVariant, {
  label: string;
  color: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
}> = {
  swift: { label: 'Swift: moves and closes the distance faster', color: '#70dcd7', hp: 1.4, atk: 1.05, def: 1, speed: 1.3 },
  armoured: { label: 'Armoured: larger, tougher and slower', color: '#c2b0ef', hp: 1.75, atk: 1.05, def: 1.4, speed: .85 },
  fierce: { label: 'Fierce: stronger attacks, keep clear of its tells', color: '#f09c69', hp: 1.5, atk: 1.25, def: 1, speed: 1.05 },
};
export interface HuntContract {
  id: string;
  kind: MonsterKind;
  rank: 1 | 2;
  lv: number;
  status: 'tracking' | 'defeated';
}
export interface HuntingState {
  kills: Partial<Record<MonsterKind, number>>;
  active?: HuntContract;
  trophies: string[];
  claimed: string[];
}
export const hunting = (s: SaveState): HuntingState => s.hunting ??= { kills: {}, trophies: [], claimed: [] };
export const huntId = (d: HuntDef, rank: 1 | 2) => `${d.kind}:${rank}`;
export const hunterLevel = (s: SaveState) => s.homes.rook;
export const huntDef = (id: string) => HUNTS.find(d => id === `${d.kind}:1` || id === `${d.kind}:2`);
export function huntLock(s: SaveState, d: HuntDef, rank: 1 | 2): string | null {
  if (!s.flags.includes('rook:lodge'))
    return 'Meet Rook at his lodge first.';
  if (hunterLevel(s) < (rank === 2 ? 3 : d.lodge))
    return `Ask Bram for lodge level ${rank === 2 ? 3 : d.lodge}.`;
  const g = zoneById(d.zone).guardian;
  if (g && !s.bosses.includes(g.kind))
    return `Open the road to ${zoneById(d.zone).name} first.`;
  if (rank === 2 && !hunting(s).claimed.includes(huntId(d, 1)))
    return 'Finish this species’ first commission before its master hunt.';
  if (hunting(s).claimed.includes(huntId(d, rank)))
    return 'This commission is complete.';
  return null;
}
export function acceptHunt(s: SaveState, id: string): boolean {
  const d = huntDef(id), rank = id.endsWith(':2') ? 2 : 1;
  if (!d || hunting(s).active || huntLock(s, d, rank))
    return false;
  hunting(s).active = { id, kind: d.kind, rank, lv: Math.max(s.lv, MONSTERS[d.kind].lv) + (rank === 2 ? 2 : 0), status: 'tracking' };
  return true;
}
export function recordHuntWin(s: SaveState, kinds: string[], contractId?: string) {
  const h = hunting(s);
  for (const kind of kinds) {
    const d = HUNTS.find(d => d.kind === kind);
    if (!d)
      continue;
    h.kills[d.kind] = (h.kills[d.kind] ?? 0) + 1;
  }
  const a = h.active;
  if (a?.status === 'tracking' && a.id === contractId && kinds.includes(a.kind))
    a.status = 'defeated';
}
export function claimHunt(s: SaveState): {
  xp: number;
  trophy: string;
} | null {
  const h = hunting(s), a = h.active;
  if (!a || a.status !== 'defeated' || h.claimed.includes(a.id))
    return null;
  h.claimed.push(a.id);
  const trophy = `${a.kind}:${a.rank === 1 ? 'silver' : 'gold'}`;
  if (!h.trophies.includes(trophy))
    h.trophies.push(trophy);
  delete h.active;
  return { xp: a.lv * (a.rank === 1 ? 24 : 40), trophy };
}
export function claimSpecies(s: SaveState, kind: MonsterKind): boolean {
  const h = hunting(s), id = `${kind}:bronze`;
  if (!HUNTS.some(d => d.kind === kind) || (h.kills[kind] ?? 0) < 5 || h.trophies.includes(id))
    return false;
  h.trophies.push(id);
  return true;
}
