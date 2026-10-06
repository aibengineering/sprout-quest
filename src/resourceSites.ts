import type { NodeKind, ZoneId } from './data';

/** Named gathering stops; coordinates are local to their region. No quota-filling scatter. */
export interface ResourceSite {
  id: string;
  zone: ZoneId;
  name: string;
  clearing?: [number, number, number, number];
  nodes: [number, number, NodeKind][];
}
export const RESOURCE_SITES: ResourceSite[] = [
  { id:'logging-camp', zone:'woods', name:'Bram’s logging camp', clearing:[8,5,6.4,3.5],
    nodes:[[4,6,'pine'],[7,4,'pine'],[10,3,'pine'],[12,6,'pine']] },
  { id:'south-pines', zone:'woods', name:'Southern pine grove', clearing:[11,30.5,4.5,3.8],
    nodes:[[9,29,'pine'],[12,29,'pine'],[10,32,'pine'],[13,31,'pine'],[8,31,'oak']] },
  { id:'stillwater-workings', zone:'woods', name:'Stillwater copper workings', clearing:[34.5,31,3.8,3.8],
    nodes:[[33,30,'copper'],[36,31,'copper'],[34,32,'copper'],[35,29,'rock']] },
  { id:'stillwater-bank', zone:'woods', name:'Stillwater bank',
    nodes:[[33,7,'copper'],[35,9,'pine']] },
  { id:'woods-trail', zone:'woods', name:'Logging trail',
    nodes:[[8,20,'oak'],[4,24,'pine']] },
  { id:'logging-oak', zone:'woods', name:'Trailside oak', clearing:[28.2,21,2,1.8],nodes:[[28,21,'oak']] },
  { id:'logging-rock', zone:'woods', name:'Logging trail outcrop', clearing:[14.8,16,1.8,1.8],nodes:[[15,16,'rock']] },
  { id:'cave-mouth', zone:'cave', name:'Entrance outcrop',
    nodes:[[4,10,'copper'],[6,12,'copper']] },
  { id:'upper-iron', zone:'cave', name:'Upper iron working', clearing:[24.5,14.5,3.9,3.2],
    nodes:[[22,14,'iron'],[25,13,'iron'],[25,15,'iron']] },
  { id:'west-quarry', zone:'cave', name:'Western quarry ledge', clearing:[10.5,25,3.2,2.8],
    nodes:[[9,25,'iron'],[11,24,'copper']] },
  { id:'east-quarry', zone:'cave', name:'Eastern quarry ledge', clearing:[31.5,26,3.8,3.4],
    nodes:[[30,25,'iron'],[33,27,'iron']] },
  { id:'quarry-floor', zone:'cave', name:'Lower quarry working', clearing:[20.5,42.5,4.8,2.8],
    nodes:[[18,42,'copper'],[20,43,'iron'],[23,42,'copper']] },
  { id:'rootlight', zone:'hollow', name:'Rootlight grove', clearing:[7.1,35.3,4.5,3.6],
    nodes:[[4,34,'glimwood'],[7,34,'glimwood'],[5,37,'glimwood'],[9,37,'glimwood'],[9,35,'crystal']] },
  { id:'crystal-chamber', zone:'hollow', name:'Northern crystal chamber', clearing:[34,6.5,3.8,4],
    nodes:[[33,4,'crystal'],[35,5,'crystal'],[33,8,'crystal'],[35,7,'crystal'],[32,6,'glimwood']] },
  { id:'gorge-crystals', zone:'hollow', name:'Eastern gorge shelf', clearing:[32,27,3.8,3],
    nodes:[[30,26,'crystal'],[33,27,'crystal']] },
  { id:'inner-grove', zone:'hollow', name:'Inner moss grove', clearing:[12.5,14,4.8,3.5],
    nodes:[[13,13,'glimwood'],[11,15,'glimwood'],[15,14,'glimwood'],[13,12,'iron']] },
  { id:'hollow-trail', zone:'hollow', name:'Rootlight approach', clearing:[10.5,31,2.2,1.9], nodes:[[10,31,'iron']] },
  { id:'cinder-basin', zone:'peak', name:'Cinder Basin',
    nodes:[[30,36,'emberwood'],[33,35,'emberwood'],[36,37,'emberwood'],[32,40,'emberwood'],[35,40,'obsidian'],[38,38,'obsidian'],[37,35,'obsidian']] },
  { id:'upper-obsidian', zone:'peak', name:'Upper obsidian shelf', clearing:[22,11.5,3.5,3],
    nodes:[[21,11,'obsidian'],[23,12,'obsidian'],[20,12,'iron']] },
  { id:'western-ledge', zone:'peak', name:'Western mineral ledge', clearing:[8.5,16,2.3,3.3],
    nodes:[[9,15,'obsidian'],[7,17,'iron'],[9,17,'crystal']] },
  { id:'summit', zone:'peak', name:'Summit approach', nodes:[[31,9,'crystal'],[27,9,'emberwood']] },
  { id:'peak-trail', zone:'peak', name:'Lower switchback', clearing:[9,28,2.5,2.4],
    nodes:[[9,28,'iron'],[10,34,'emberwood']] },
];
