// Rooms you walk into: Granny's Kitchen and Bram's Sawmill. Each is a small map of its own (floor, walls and the
// stations you work at by hand), entered through the iris from its door outside and left by walking back out of it.
// The Overworld walks you around whichever room you're in (see Overworld.room); game/rooms.ts runs what the stations
// do and paints them.
import { Actors } from './actors';
import { T, TileMap, type WorldObj } from './world';

export type RoomId = 'kitchen' | 'sawmill';

/** Paints a room: its floor and walls, each station (in depth order with everyone), and what floats over it. */
export interface RoomPainter {
  floor(ctx: CanvasRenderingContext2D, ts: number): void;
  /** Returns the top of what it drew (pixels), for its label to sit above it. */
  obj(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number): number | void;
  over(ctx: CanvasRenderingContext2D, ts: number): void;
}

export interface RoomSpec {
  id: RoomId;
  name: string;
  /** Size in tiles, walls included: the back wall is the top two rows, the side walls one column each. */
  w: number;
  h: number;
  /** The doorway's column, in the bottom wall. */
  door: number;
  /** What you work at, placed against the walls and on the floor (solid unless `walkable`). */
  stations: Omit<WorldObj, 'kind'>[];
  /** Behind everything (seen past the walls' edges on a wide screen). */
  bg: string;
}

/** The back wall's rows, standing above the floor: stations push up against it. */
export const BACK_WALL = 2;

/** Rows below the map's top that the back wall's face rises over (it's tall: drawn up past row 0). */
export const WALL_RISE = 1.6;

export class Room extends TileMap {
  readonly actors = new Actors();
  painter: RoomPainter | null = null;

  constructor(readonly spec: RoomSpec) {
    super(spec.w, spec.h);
    const { w, h, door } = spec;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wall = y < BACK_WALL || x === 0 || x === w - 1 || (y === h - 1 && x !== door);
        this.set(x, y, wall ? T.OBST : T.GROUND);
      }
    }
    for (const s of spec.stations) this.objs.push({ kind: 'station', ...s });
    // The doormat: walk out over it, or press the action button on it.
    this.objs.push({ kind: 'door', x: door, y: h - 1.2, w: 1, h: 1.2, label: 'Leave', walkable: true });
  }

  get id(): RoomId {
    return this.spec.id;
  }

  /** Where you stand on coming in: just inside the door, looking in. */
  get spawn() {
    return { x: this.spec.door + 0.5, y: this.spec.h - 1.45 };
  }

  /** Walked out through the doorway. */
  outAt(x: number, y: number) {
    return y > this.spec.h - 0.45 && Math.floor(x) === this.spec.door;
  }

  station(id: string) {
    return this.objs.find((o) => o.kind === 'station' && o.id === id);
  }
}

/**
 * Granny's Kitchen, inside the blue house: the pantry shelf and the stove along the back wall, her recipe book on its
 * stand by the window side, and the table on its rug in front, each with floor to walk round it. Narrow and tall like
 * a phone's screen, so all of it fits on one at once. The door is at the front.
 */
export const KITCHEN: RoomSpec = {
  id: 'kitchen', name: "Granny's Kitchen", w: 8, h: 9, door: 4, bg: '#3a2630',
  stations: [
    { id: 'pantry', x: 0.75, y: 1.3, w: 2.75, h: 0.95, label: 'Pantry' },
    { id: 'stove', x: 4.1, y: 1.3, w: 2.1, h: 0.95, label: 'Stove' },
    { id: 'book', x: 5.9, y: 4.2, w: 1.2, h: 0.75, label: 'Recipes' },
    { id: 'table', x: 1.2, y: 5.0, w: 3.4, h: 0.9, label: 'Table' },
  ],
};

/**
 * Bram's Sawmill, inside: oak and pine piles along the back wall and the rarer woods down the left, the saw bench in
 * the middle with its lever on the wall behind it, and the stack of sawn planks by the door.
 */
export const SAWMILL: RoomSpec = {
  id: 'sawmill', name: "Bram's Sawmill", w: 8, h: 9, door: 4, bg: '#2e2228',
  stations: [
    { id: 'pile:bark', x: 0.85, y: 1.4, w: 1.3, h: 0.8, label: 'Oak logs' },
    { id: 'pile:pine', x: 2.55, y: 1.4, w: 1.3, h: 0.8, label: 'Pine logs' },
    { id: 'pile:glimwood', x: 0.85, y: 3.7, w: 1.1, h: 0.75, label: 'Glimwood logs' },
    { id: 'pile:emberwood', x: 0.85, y: 5.6, w: 1.1, h: 0.75, label: 'Emberwood logs' },
    { id: 'bench', x: 3.55, y: 4.2, w: 3.3, h: 0.95, label: 'Saw bench' },
    { id: 'lever', x: 6.2, y: 1.5, w: 0.7, h: 0.65, label: 'Lever' },
    { id: 'planks', x: 5.4, y: 6.4, w: 1.6, h: 0.75, label: 'Planks' },
  ],
};

export const ROOMS: Record<RoomId, RoomSpec> = { kitchen: KITCHEN, sawmill: SAWMILL };
