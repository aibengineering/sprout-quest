// Sowerby: a north-side work yard, an open green, a kitchen/garden neighbourhood, and a quiet southern home lane.
// Footprints and paths share tile coordinates; paths stop at fronts, never cross a lot.
import { FOX_TRAINING } from './fox';
import { ZONES } from './data';
import type { HomeId } from './housing';
const V = ZONES.find((z) => z.id === 'village')!.x0;
export const RESIDENT_PLOTS: Record<HomeId, { x: number; y: number; w: number; h: number }> = {
  pip: { x: V + 18.9, y: 4.5, w: 2.2, h: 1.5 },
  rook: { x: V + 10.3, y: 19.5, w: 2.4, h: 1.5 },
  moss: { x: V + 24, y: 9.5, w: 2.5, h: 1.5 },
};
export const residentDoor = (id: HomeId) => {
  const p = RESIDENT_PLOTS[id];
  return { x: p.x + p.w / 2, y: p.y + p.h + .6 };
};
export const TOWN_FORGE = { x: V + 5, y: 8, w: 4, h: 3 };
export const TOWN_SAWMILL = { x: V + 1.8, y: 5, w: 3.4, h: 2 };
export const TOWN_CABIN = { x: V + 6.5, y: 4.6, w: 2, h: 1.4 };
export const TOWN_WAYSTONE = { x: V + 17.8, y: 10.5, w: 1.4, h: 1.5 };
// Kept under the original export for saved project compatibility; this is outside Sowerby.
export const TOWN_TRAINING = FOX_TRAINING;
export const TOWN_HOME = { x: V + 3, y: 18, w: 3, h: 3 };
export const TOWN_SPRING = { x: V + 12, y: 16, w: 2, h: 2 };

// The through-road stays on rows 13–14. Short northern approaches serve the doors;
// one southern branch reaches the Spring and the shared residential lane.
export const VILLAGE_PATHS = [
  { x: V + 3, y: 7, w: 1, h: 6 }, // Work yard, kept west of the Forge.
  { x: V + 4, y: 7, w: 4, h: 1 },
  { x: V + 7, y: 6, w: 1, h: 1 }, // Bram's doorstep beside the mill.
  { x: V + 7, y: 11, w: 1, h: 2 },
  { x: V + 14, y: 10, w: 1, h: 3 },
  { x: V + 20, y: 6, w: 1, h: 7 },
  { x: V + 18, y: 12, w: 1, h: 1 },
  { x: V + 8, y: 15, w: 1, h: 8 },
  { x: V + 9, y: 18, w: 5, h: 1 },
  { x: V + 4, y: 22, w: 8, h: 1 },
  { x: V + 25, y: 11, w: 1, h: 2 }, // Moss, beside the kitchen and garden.
  ...[4, 11].map((x) => ({ x: V + x, y: 21, w: 1, h: 1 })),
];
