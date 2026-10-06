import { expect, test } from 'bun:test';
import { Cavern } from '../src/cavern';
import { Actors } from '../src/actors';
import { World,T } from '../src/world';
import { zoneById } from '../src/data';
import { newState } from '../src/state';
import { SHORTCUTS,shortcutWorldPoint } from '../src/shortcuts';
import { Overworld } from '../src/overworld';
import { CAVE_WEST_EDGE, CAVE_EAST_EDGE, CAVE_WEST_OUTSIDE, CAVE_EAST_OUTSIDE } from '../src/caveEntrance';
import { Roamers } from '../src/roamers';
test('main Cavern has its own tile grid and bounds while retaining quest object identity',()=>{
 const world=new World(), actors=new Actors(), cave=new Cavern(world,actors), z=zoneById('cave');
 expect(cave.tiles).not.toBe(world.tiles);expect(cave.w).toBe(z.w);expect(cave.h).toBe(46);expect(cave.actors).toBe(actors);
 expect(cave.tile(z.x0-1,14)).toBe(T.OBST);expect(cave.tile(z.x0+z.w,14)).toBe(T.OBST);
 expect(cave.objs.find(o=>o.kind==='gate'&&o.zone==='hollow')).toBe(world.obj('gate','hollow'));
 const p=SHORTCUTS.find(p=>p.id==='cave-quarry')!, at=shortcutWorldPoint(p,p.deck), s=newState();
 expect(cave.tile(at.x,at.y)).toBe(T.POOL);s.flags.push(p.flag);world.setShortcuts(s);cave.sync();expect(cave.tile(at.x,at.y)).toBe(T.BRIDGE);
});

test('outdoor camera and walking bounds exclude the cavern from both approaches',()=>{
 const w=new World(),s=newState();s.pos={...CAVE_WEST_OUTSIDE};const over=new Overworld(w,s);
 expect(over.sceneBounds).toEqual({x0:0,w:CAVE_WEST_EDGE});
 expect(over.underground).toBeNull();
 over.teleport(CAVE_EAST_OUTSIDE.x,CAVE_EAST_OUTSIDE.y);
 expect(over.sceneBounds.x0).toBe(CAVE_EAST_EDGE);
 over.teleport(CAVE_WEST_EDGE+2.5,14.8);
 expect(over.sceneBounds).toEqual({x0:CAVE_WEST_EDGE,w:40});
 expect(over.underground).toBe(over.cavern);
});

test('cave monsters cannot notice, catch or be attacked by someone outdoors at the mouth',()=>{
 const w=new World(),roamers=new Roamers(w,()=>.47);roamers.populate(125,14.8,false);
 const bat=roamers.list.find(r=>r.zone==='cave')!;expect(bat).toBeDefined();roamers.list=[bat];roamers.calm=0;
 Object.assign(bat,{x:127.5,y:14.8,state:'idle',t:10});
 expect(roamers.unaware(126.4,14.8,2)).toBeNull();
 expect(roamers.update(.2,126.4,14.8,false)).toBeNull();expect(bat.state).toBe('idle');
 expect(roamers.unaware(127.6,14.8)).toBe(bat);expect(roamers.update(.01,127.6,14.8,false)).toBe(bat);
});
