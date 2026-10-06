// A separate underground map, entered through Echo Cavern's cave mouth.
// Coordinates retain their old values so saved positions and procession paths stay compatible.
import { Actors } from './actors';
import { zoneById } from './data';
import { ECHO_TUNNELS } from './routes';
import { MOUTH } from './procession';
import { T, TileMap } from './world';

export const ECHO_OUTSIDE = { x: MOUTH.x, y: MOUTH.y + .8 };
export const ECHO_EXIT = { x: MOUTH.x, y: 10.2 };

export class EchoCave extends TileMap {
  readonly actors = new Actors();
  readonly name = 'Pebbler Hollow';
  readonly spawn = { ...MOUTH };

  constructor() {
    const z = zoneById('cave');
    super(z.w, ECHO_TUNNELS.length, z.x0);
    ECHO_TUNNELS.forEach((row, y) => [...row].forEach((c, x) => this.set(z.x0 + x, y, c === '#' ? T.OBST : T.GROUND)));
    this.objs.push({ kind: 'door', id: 'echo:exit', x: ECHO_EXIT.x - .5, y: 9.8, w: 1, h: .5, label: 'Back to Echo Cavern', walkable: true });
  }

  outAt(x: number, y: number) {
    return Math.abs(x - ECHO_EXIT.x) < .5 && y > ECHO_EXIT.y;
  }
}
