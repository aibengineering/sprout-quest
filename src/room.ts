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
  obj(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number): void;
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
 * stand, and the table in the middle where meals are served. The door is at the front.
 */
export const KITCHEN: RoomSpec = {
  id: 'kitchen', name: "Granny's Kitchen", w: 9, h: 8, door: 4, bg: '#3a2630',
  stations: [
    { id: 'pantry', x: 0.8, y: 1.3, w: 2.75, h: 0.95, label: 'Pantry' },
    { id: 'stove', x: 3.95, y: 1.3, w: 2.1, h: 0.95, label: 'Stove' },
    { id: 'book', x: 6.6, y: 1.45, w: 1.2, h: 0.75, label: 'Recipes' },
    { id: 'table', x: 2.8, y: 4.35, w: 3.4, h: 0.9, label: 'Table' },
  ],
};

/**
 * Bram's Sawmill, inside: a log pile for each wood along the back wall, the saw bench with its lever, and the stack
 * of sawn planks by the door.
 */
export const SAWMILL: RoomSpec = {
  id: 'sawmill', name: "Bram's Sawmill", w: 10, h: 8, door: 4, bg: '#2e2228',
  stations: [
    { id: 'pile:bark', x: 0.95, y: 1.4, w: 1.3, h: 0.8, label: 'Oak logs' },
    { id: 'pile:pine', x: 2.45, y: 1.4, w: 1.3, h: 0.8, label: 'Pine logs' },
    { id: 'pile:glimwood', x: 0.95, y: 3.2, w: 1.1, h: 0.75, label: 'Glimwood logs' },
    { id: 'pile:emberwood', x: 0.95, y: 4.75, w: 1.1, h: 0.75, label: 'Emberwood logs' },
    { id: 'bench', x: 4.4, y: 2.75, w: 3.3, h: 0.95, label: 'Saw bench' },
    { id: 'lever', x: 8.05, y: 1.5, w: 0.7, h: 0.65, label: 'Lever' },
    { id: 'planks', x: 6.6, y: 5.25, w: 1.6, h: 0.75, label: 'Planks' },
  ],
};

export const ROOMS: Record<RoomId, RoomSpec> = { kitchen: KITCHEN, sawmill: SAWMILL };
