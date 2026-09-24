// Overworld map generation and collision. Coordinates are in tiles.
import { WORLD_H, WORLD_W, ZONES, zoneAtX, type MonsterKind, type NodeKind, type ProjectId, type Zone, type ZoneId } from './data';
import { ROUTES } from './routes';

export const T = {
  GROUND: 0,
  GRASS: 1,
  OBST: 2,
  POOL: 3,
  PATH: 4,
  DECOR: 5,
} as const;

/** Routes connect through rows GATE_Y..GATE_Y+3 on their west and east edges. */
export const GATE_Y = 12;

/** Route map characters → tiles (markers stand on open ground, or tall grass for trees out in the grass). */
const ROUTE_TILE: Record<string, number> = {
  '#': T.OBST, '.': T.GROUND, ',': T.GRASS, '=': T.PATH, '~': T.POOL, '*': T.DECOR,
  E: T.PATH, S: T.GROUND, C: T.GROUND, L: T.GROUND, k: T.GROUND, p: T.GROUND, K: T.GRASS, P: T.GRASS,
};

export type ObjKind = 'forge' | 'fountain' | 'house' | 'sign' | 'lair' | 'gate' | 'camp' | 'elder' | 'plot' | 'pickup' | 'foe' | 'node';

export interface WorldObj {
  kind: ObjKind;
  /** Solid box, top-left in tiles. */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  text?: string;
  /** Zone this object belongs to (gates, camps). */
  zone?: ZoneId;
  /** Construction project on this plot. */
  project?: ProjectId;
  /** Hidden objects are neither drawn nor solid (opened gates, unlit camps). */
  hidden?: boolean;
  /** Story flag set when this scripted object is resolved (sword picked up, prologue foe beaten). */
  flag?: string;
  monster?: MonsterKind;
  /** Gathering node: which tree, its stable id (for regrowth timers) and whether it stands in tall grass. */
  node?: NodeKind;
  id?: string;
  grass?: boolean;
}

export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const VILLAGE_END = ZONES.find((z) => z.id === 'meadow')!.x0;
const V = ZONES.find((z) => z.id === 'village')!.x0;
/** Where the glade's forest path begins (the clearing is west of it). */
const GLADE_PATH_X = 7;
const MID = Math.floor(WORLD_H / 2);

/** The walkable path's row for a given column. Straight in the village, then winds east. */
export function pathY(x: number): number {
  const amp = Math.max(0, Math.min(1, (x - VILLAGE_END) / 8));
  const y = MID + amp * (Math.sin(x * 0.13) * 3.5 + Math.sin(x * 0.051 + 1) * 2.5);
  return Math.max(5, Math.min(WORLD_H - 7, Math.round(y)));
}

export class World {
  readonly w = WORLD_W;
  readonly h = WORLD_H;
  readonly tiles = new Uint8Array(WORLD_W * WORLD_H);
  readonly objs: WorldObj[] = [];
  /** Marker positions from the route maps, by `${zone}:${char}`. */
  private marks = new Map<string, { x: number; y: number }[]>();

  constructor(seed = 7) {
    this.generate(seed);
  }

  tile(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T.OBST;
    return this.tiles[y * this.w + x];
  }

  private set(x: number, y: number, t: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.tiles[y * this.w + x] = t;
  }

  zoneAt(x: number): Zone {
    return zoneAtX(Math.floor(x));
  }

  /** Standing spot next to a zone's campfire (the warp/respawn point past its gate), on open ground if there is any. */
  campPoint(id: ZoneId): { x: number; y: number } {
    const camp = this.objs.find((o) => o.kind === 'camp' && o.zone === id);
    if (!camp) return this.entryPoint(id);
    const cx = Math.floor(camp.x), cy = Math.floor(camp.y);
    const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: cx + dx, y: cy + dy }));
    const open = spots.filter((p) => { const t = this.tile(p.x, p.y); return t === T.GROUND || t === T.PATH || t === T.DECOR; });
    const at = open[0] ?? spots.find((p) => this.tile(p.x, p.y) === T.GRASS) ?? spots[2];
    return { x: at.x + 0.5, y: at.y + 0.9 };
  }

  private mark(zone: ZoneId, c: string) {
    return this.marks.get(`${zone}:${c}`) ?? [];
  }

  obj(kind: ObjKind, key?: string): WorldObj | undefined {
    return this.objs.find((o) => o.kind === kind && (key === undefined || o.zone === key || o.project === key));
  }

  entryPoint(id: ZoneId): { x: number; y: number } {
    if (id === 'glade') return { x: 3.5, y: MID + 0.9 };
    if (id === 'village') return { x: V + 4.5, y: MID + 0.5 };
    const e = this.mark(id, 'E')[0];
    return { x: e.x + 0.5, y: e.y + 0.9 };
  }

  private generate(seed: number) {
    const { w, h } = this;
    for (let x = 0; x < w; x++) {
      const zone = zoneAtX(x);
      const route = ROUTES[zone.id];
      if (route) {
        for (let y = 0; y < h; y++) {
          const c = route[y][x - zone.x0];
          this.set(x, y, ROUTE_TILE[c] ?? T.OBST);
          if (!'#.,=~*'.includes(c)) {
            const key = `${zone.id}:${c}`;
            this.marks.set(key, [...(this.marks.get(key) ?? []), { x, y }]);
          }
        }
        continue;
      }
      const py = pathY(x);
      for (let y = 0; y < h; y++) {
        let t: number = T.GROUND;
        const nearPath = y >= py - 1 && y <= py + 2;
        const gladeClearing = zone.id === 'glade' && x < GLADE_PATH_X;
        if ((y === py || y === py + 1) && !gladeClearing) t = T.PATH;
        else if (y < 2 || y >= h - 2 || x === 0 || x === w - 1) t = T.OBST;
        else if (zone.id === 'glade') t = this.gladeTile(x, y, nearPath, seed);
        else t = this.villageTile(x, y, seed, nearPath);
        this.set(x, y, t);
      }
    }
    this.placeObjects();
  }

  /** A small sunny clearing ringed by trees, with a narrow forest path leading east. */
  private gladeTile(x: number, y: number, nearPath: boolean, seed: number): number {
    const inClearing = x >= 1 && x < GLADE_PATH_X + 2 && Math.abs(y - (MID + 0.5)) <= 4.2;
    const inCorridor = x >= GLADE_PATH_X && nearPath;
    if (!inClearing && !inCorridor) return T.OBST;
    return hash2(x, y, seed + 31) < 0.14 ? T.DECOR : T.GROUND;
  }

  private villageTile(x: number, y: number, seed: number, nearPath: boolean): number {
    const edgeTree = (y < 4 || y > this.h - 5 || (x - V < 2 && !nearPath)) && hash2(x, y, seed + 21) < 0.55;
    if (edgeTree) return T.OBST;
    if (hash2(x, y, seed + 22) < 0.12) return T.DECOR;
    return T.GROUND;
  }

  private placeObjects() {
    const add = (o: WorldObj, clear = true) => {
      this.objs.push(o);
      if (!clear) return;
      // Clear the tiles under and around each object so it never sits in a tree.
      for (let y = Math.floor(o.y) - 1; y <= Math.ceil(o.y + o.h); y++)
        for (let x = Math.floor(o.x) - 1; x <= Math.ceil(o.x + o.w); x++)
          if (this.tile(x, y) !== T.PATH) this.set(x, y, T.GROUND);
    };
    // Prologue: the sword in the grass, then two monsters blocking the forest path.
    add({ kind: 'pickup', flag: 'sword', x: 4.2, y: MID - 1.4, w: 0.6, h: 0.5, label: 'Pick up', text: 'Twig Sword' });
    const gy = pathY(10) - 1;
    add({ kind: 'foe', flag: 'glade1', monster: 'slime', x: 10, y: gy, w: 1, h: 4, label: 'Fight', text: 'Slime' }, false);
    add({ kind: 'foe', flag: 'glade2', monster: 'bunny', x: 13, y: gy, w: 1, h: 4, label: 'Fight', text: 'Hopbun' }, false);
    add({ kind: 'forge', x: V + 5, y: 7, w: 4, h: 3, label: 'Forge', text: 'The Forge' });
    add({ kind: 'house', x: V + 13, y: 6.5, w: 3, h: 3, label: '' });
    add({ kind: 'elder', x: V + 10.1, y: 10.3, w: 0.7, h: 0.5, label: 'Talk', text: 'Elder Bloom' });
    add({ kind: 'plot', project: 'home', x: V + 3, y: 17, w: 3, h: 3, label: 'Build', text: 'Home' });
    add({ kind: 'plot', project: 'garden', x: V + 7.2, y: 18.4, w: 3, h: 1.6, label: 'Build', text: 'Garden' });
    add({ kind: 'plot', project: 'training', x: V + 15.6, y: 17.6, w: 3, h: 1.6, label: 'Build', text: 'Training Yard' });
    add({ kind: 'plot', project: 'warp', x: V + 18.3, y: 7.4, w: 1.4, h: 1.1, label: 'Build', text: 'Warp Stone' });
    add({ kind: 'fountain', x: V + 12, y: 17, w: 2, h: 2, label: 'Rest', text: 'Healing Fountain' });
    add({
      kind: 'sign', x: V + 18.6, y: MID - 2, w: 0.8, h: 0.6, label: 'Read',
      text: 'East: Sunny Meadow. Walk through tall grass to find monsters. Bring back materials to the Forge!',
    });
    for (const z of ZONES) {
      for (const p of this.mark(z.id, 'S')) {
        add({
          kind: 'sign', x: p.x + 0.1, y: p.y + 0.2, w: 0.8, h: 0.6, label: 'Read',
          text: `${z.name} — recommended Lv ${z.rec}+. Monsters here are Lv ${z.lv[0]}–${z.lv[1]}.`,
        }, false);
      }
      // Guardians block the road into their zone; a campfire checkpoint waits just past each gate.
      if (z.guardian) add({ kind: 'gate', zone: z.id, x: z.x0, y: GATE_Y, w: 1, h: 4, label: 'Challenge', text: z.name }, false);
      for (const p of this.mark(z.id, 'C')) add({ kind: 'camp', zone: z.id, x: p.x + 0.1, y: p.y + 0.2, w: 0.8, h: 0.6, label: 'Rest', text: 'Campfire' }, false);
      for (const p of this.mark(z.id, 'L')) add({ kind: 'lair', x: p.x, y: p.y, w: 3, h: 2, label: 'Enter', text: "Emberwyrm's Lair" }, false);
      // Choppable trees: by the path (safe) or out in the grass.
      const trees: [string, NodeKind, boolean][] = [['k', 'oak', false], ['K', 'oak', true], ['p', 'pine', false], ['P', 'pine', true]];
      for (const [c, kind, grass] of trees) {
        this.mark(z.id, c).forEach((p, i) => this.objs.push({
          kind: 'node', node: kind, id: `${z.id}:${kind}:${grass ? 'g' : 's'}${i}`, grass, x: p.x + 0.1, y: p.y + 0.35, w: 0.8, h: 0.6, label: 'Chop', text: kind,
        }));
      }
    }
  }

  /** Tiles you can walk to from the village (guardian gates count as open). */
  reachable(): Uint8Array {
    const seen = new Uint8Array(this.w * this.h);
    const start = this.entryPoint('village');
    const q = [Math.floor(start.y) * this.w + Math.floor(start.x)];
    seen[q[0]] = 1;
    while (q.length) {
      const i = q.pop()!;
      const x = i % this.w, y = (i - x) / this.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = ny * this.w + nx;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h || seen[j]) continue;
        const t = this.tile(nx, ny);
        if (t === T.OBST || t === T.POOL) continue;
        if (this.objs.some((o) => o.kind !== 'gate' && o.kind !== 'node' && nx + 0.5 >= o.x && nx + 0.5 < o.x + o.w && ny + 0.5 >= o.y && ny + 0.5 < o.y + o.h)) continue;
        seen[j] = 1;
        q.push(j);
      }
    }
    return seen;
  }

  solidAt(x: number, y: number): boolean {
    const t = this.tile(Math.floor(x), Math.floor(y));
    if (t === T.OBST || t === T.POOL) return true;
    for (const o of this.objs) if (!o.hidden && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) return true;
    return false;
  }

  /** Whether a feet-box of half-width `r` whose bottom edge is at y overlaps anything solid. */
  blocked(x: number, y: number, r: number): boolean {
    const top = y - r, bot = y - 0.02;
    return this.solidAt(x - r, top) || this.solidAt(x + r, top) || this.solidAt(x - r, bot) || this.solidAt(x + r, bot);
  }

  nearestObj(x: number, y: number, maxDist: number): WorldObj | null {
    let best: WorldObj | null = null;
    let bestD = maxDist;
    for (const o of this.objs) {
      if (!o.label || o.hidden) continue;
      const cx = Math.max(o.x, Math.min(x, o.x + o.w));
      const cy = Math.max(o.y, Math.min(y, o.y + o.h));
      const d = Math.hypot(cx - x, cy - y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }
}
