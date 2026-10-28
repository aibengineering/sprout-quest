// Above-ground land ends at these mouths; Echo Cavern is shown only after entering it.
import { WORLD_W, zoneById } from './data';

export const CAVE_WEST_EDGE = zoneById('cave').x0;
export const CAVE_EAST_EDGE = CAVE_WEST_EDGE + zoneById('cave').w;
// The west mouth is set into the cliff at the head of the path, so you walk up into it (behind the Alpha Woolf's rocks).
export const CAVE_WEST_MOUTH = { x: CAVE_WEST_EDGE - 1.8, y: 10.55, w: 1.6, h: 1.5 };
export const CAVE_EAST_MOUTH = { x: CAVE_EAST_EDGE + .1, y: 12.5, w: 1.6, h: 1.5 };
export const CAVE_WEST_OUTSIDE = { x: CAVE_WEST_EDGE - 1, y: 13.1 };
export const CAVE_EAST_OUTSIDE = { x: CAVE_EAST_EDGE + 2.4, y: 14.8 };

export function surfaceBounds(x: number) {
  return x >= CAVE_EAST_EDGE
    ? { x0: CAVE_EAST_EDGE, w: WORLD_W - CAVE_EAST_EDGE }
    : { x0: 0, w: CAVE_WEST_EDGE };
}

/** Woodland gives way to scree and a rock face around the mouth, rather than changing at a straight colour seam. */
export function caveApproachStone(x: number, y: number) {
  if(x >= CAVE_WEST_EDGE || y < 7 || y > 22) return 0;
  const towardWall = Math.max(0, Math.min(1, (x - (CAVE_WEST_EDGE - 8)) / 6));
  const alongWall = Math.max(0, Math.min(1, (8 - Math.abs(y - 14.5)) / 3));
  return towardWall * alongWall;
}

/**
 * A spirit can't go underground, so if you faint in the caves your body is found just outside a mouth (the east one
 * only once the Hollow's road is open and it's nearer). Old saves with a body in the caves move there too.
 */
export function bodyOutsideCaves(p: { x: number; y: number }, eastOpen: boolean): { x: number; y: number } {
  if (p.x < CAVE_WEST_EDGE || p.x >= CAVE_EAST_EDGE) return p;
  const east = eastOpen && p.x - CAVE_WEST_EDGE > CAVE_EAST_EDGE - p.x;
  return { ...(east ? CAVE_EAST_OUTSIDE : CAVE_WEST_OUTSIDE) };
}
