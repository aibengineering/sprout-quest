// Mining discoveries are permanent, optional returns to Sowerby; no tunnel opens a locked eastern region.
import { zoneById, type ZoneId } from './data';
import type { RockKind } from './nodeart';
import type { SaveState } from './state';
export interface Seam {
  id: string;
  name: string;
  zone: ZoneId;
  at: {
    x: number;
    y: number;
  };
  rock: RockKind;
  streak: number;
}
const at = (zone: ZoneId, x: number, y: number) => ({ x: zoneById(zone).x0 + x, y });
export const SEAMS: Seam[] = [
  { id: 'quarry', name: 'Pip’s Promising Tunnel', zone: 'cave', at: at('cave', 12.5, 20.8), rock: 'copper', streak: 10 },
  { id: 'stillwater', name: 'Stillwater Burrow', zone: 'woods', at: at('woods', 30.5, 18.8), rock: 'copper', streak: 10 },
  { id: 'rootlight', name: 'Rootlight Burrow', zone: 'hollow', at: at('hollow', 10.5, 29.8), rock: 'iron', streak: 11 },
  { id: 'cinder', name: 'Cinder Burrow', zone: 'peak', at: at('peak', 31.5, 30.8), rock: 'obsidian', streak: 11 },
];
export const seamById = (id: string) => SEAMS.find(p => p.id === id);
export const seamOpen = (s: SaveState, id: string) => s.flags.includes(`seam:${id}`);
export function openSeam(s: SaveState, id: string, streak: number): boolean {
  const p = seamById(id);
  if (!p || streak < p.streak || seamOpen(s, id))
    return false;
  const g = zoneById(p.zone).guardian;
  if (g && !s.bosses.includes(g.kind))
    return false;
  s.flags.push(`seam:${id}`);
  return true;
}
export const TUNNEL_HOME = { x: 35.5, y: 8.8 };
