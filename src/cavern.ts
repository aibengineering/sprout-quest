// Echo Cavern is its own underground map. Its logical tile coordinates remain stable for quests and old saves.
import { Actors } from './actors';
import { zoneById } from './data';
import { ROUTES } from './routes';
import { TileMap, type World } from './world';
export class Cavern extends TileMap {
  readonly name = 'Echo Cavern';
  constructor(readonly source: World, readonly actors: Actors) {
    const z=zoneById('cave');
    super(z.w,ROUTES.cave!.length,z.x0);
    this.sync();
  }
  sync() {
    for(let y=0;y<this.h;y++) for(let x=0;x<this.w;x++) this.tiles[y*this.w+x]=this.source.tile(this.x0+x,y);
    // Objects retain their identity: story visibility, regrowth, hunts and paid bridges update together.
    this.objs.splice(0,this.objs.length,...this.source.objs.filter(o=>o.x+o.w>this.x0&&o.x<this.x0+this.w+.1));
  }
  outAt(x:number,y:number) { return y>=12&&y<=16&&(x<this.x0+.8||x>this.x0+this.w-.8); }
}
