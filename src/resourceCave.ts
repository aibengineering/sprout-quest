// Pip's first discovery is a real underground instance, with a blocked neck and a mixed-ore gallery beyond it.
import { Actors } from './actors';
import { T, TileMap } from './world';
import { SEAMS, seamOpen } from './seams';
import type { SaveState } from './state';
const ROWS = [
  '##############',
  '#............#',
  '#............#',
  '#............#',
  '#............#',
  '#............#',
  '######..######',
  '######..######',
  '######..######',
  '####......####',
  '####......####',
  '####......####',
  '####......####',
  '######..######',
  '######..######',
  '##############',
];
export class ResourceCave extends TileMap {
  opened = false;
  readonly actors = new Actors();
  readonly name = 'Pip’s Ore Gallery';
  readonly outside = { x: SEAMS[0].at.x + .45, y: SEAMS[0].at.y + .8 };
  readonly spawn = { x: SEAMS[0].at.x + 1, y: 13.7 };
  readonly pip = { x: SEAMS[0].at.x - .5, y: 10.6 };
  constructor() {
    const x0 = SEAMS[0].at.x - 6.5;
    super(14, ROWS.length, x0);
    for (let y = 0; y < ROWS.length; y++)
      for (let x = 0; x < 14; x++)
        this.set(x0 + x, y, ROWS[y][x] === '#' ? T.OBST : T.GROUND);
    this.objs.push({ kind: 'node', id: 'boulder:quarry', boulder: 'quarry', node: 'copper', x: x0 + 6, y: 7, w: 2, h: 1.15, label: 'Break boulder' });
    for (const [i, [node, x, y]] of ([['rock', 2, 2], ['copper', 5, 2], ['iron', 8, 2], ['copper', 2, 4], ['iron', 8, 4], ['rock', 11, 4]] as const).entries())
      this.objs.push({ kind: 'node', id: `ore-gallery:${i}`, node, x: x0 + x, y, w: .7, h: .65, label: 'Mine' });
    this.objs.push({ kind: 'door', id: 'resource:exit', x: x0 + 6, y: 14, w: 2, h: 1, label: 'Back to Echo Cavern', walkable: true });
    this.objs.push({ kind: 'door', id: 'burrow:quarry', tunnel: 'quarry', x: x0 + 11, y: 1.9, w: 1.2, h: .6, label: 'Tunnel to Sowerby', walkable: true, hidden: true });
  }
  sync(s: SaveState) { this.opened = seamOpen(s, 'quarry'); for (const o of this.objs) {
    if (o.boulder)
      o.hidden = seamOpen(s, o.boulder);
    if (o.tunnel)
      o.hidden = !seamOpen(s, o.tunnel);
    if (o.node && !o.boulder)
      o.hidden = !this.opened;
  } }
  outAt(x: number, y: number) { return y > 14.5 && Math.abs(x - this.spawn.x) < 1; }
}
