// Shared placements for collision boxes, resident doorsteps and the residential footpaths.
import { ZONES } from './data';
import type { HomeId } from './housing';
const V = ZONES.find((z) => z.id === 'village')!.x0;
export const RESIDENT_PLOTS: Record<HomeId, { x: number; y: number; w: number; h: number }> = {
  pip: { x: V + 18.8, y: 4.5, w: 2.2, h: 1.4 },
  hazel: { x: V + 14.5, y: 19, w: 2.4, h: 1.5 },
  moss: { x: V + 18.5, y: 19, w: 2.5, h: 1.5 },
};
export const residentDoor = (id: HomeId) => {
  const p = RESIDENT_PLOTS[id];
  return { x: p.x + p.w / 2, y: p.y + p.h + .6 };
};
export const TOWN_WAYSTONE = { x: V + 17.2, y: 10.4, w: 1.4, h: 1.1 };
export const TOWN_TRAINING = { x: V + 11.2, y: 11.2, w: 3, h: 1.6 };
export const TOWN_HOME = { x: V + 2.5, y: 18, w: 3, h: 3 };
