import type { SaveState } from './state';

/** One dead-end forest trail, shared by Poppy's rescue, the bunny chase and collision checks. */
export const POPPY_GROVE = {
  cower: { x: 24.5, y: 35.4 },
  barrier: { x: 23, y: 34, w: 1, h: 2 },
  mouth: { x: 28.6, y: 35.2 },
  rescue: { x: 26, y: 34, w: 2, h: 2 },
  pack1: { x: 22, y: 34, w: 2, h: 2 },
  pack2: { x: 16, y: 37, w: 3, h: 2 },
  bigbun: { x: 14, y: 33, w: 1, h: 4 },
  camera: { x: 26, y: 35.4 },
  clearing: { x: 7.8, y: 31.9, rx: 6.2, ry: 5.8 },
  getaway: [
    { x: 24.5, y: 35.4 }, { x: 20.5, y: 35.5 }, { x: 20.5, y: 37.6 },
    { x: 15.5, y: 37.6 }, { x: 15.5, y: 35.5 }, { x: 14.5, y: 35.5 },
  ],
} as const;

/** The thief clears the fallen log during the chase, then guards the glade until defeated. */
export const poppyTrailOpen = (s: SaveState) => (s.stories.poppy ?? 0) >= 4 || s.flags.includes('poppy:bigbun') || s.flags.includes('poppy:returned');
