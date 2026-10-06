// Authored route choices: dry detours, short encounter cuts, gathering spurs and timber returns.
// Coordinates stay zone-local; region identities and saved shortcut flags remain stable.
import type { ZoneId, NodeKind } from './data';
import { RESOURCE_SITES } from './resourceSites';
import { POPPY_GROVE } from './poppyGrove';

export const ROUTE_HEIGHTS = { meadow: 40, woods: 40, cave: 46, hollow: 42, peak: 46 } as const;
type Point = [number, number];
class Route {
  grid: string[][];
  constructor(readonly w: number, readonly h: number) { this.grid = Array.from({length:h},()=>Array(w).fill('#')); }
  box(x:number,y:number,w:number,h:number,c:string, keepPaths=false) {
    for(let j=Math.max(1,y);j<Math.min(this.h-1,y+h);j++) for(let i=Math.max(1,x);i<Math.min(this.w-1,x+w);i++) if(!keepPaths||this.grid[j][i]!=='=')this.grid[j][i]=c;
    return this;
  }
  path(points: Point[], width=2, surface='=') {
    for(let n=1;n<points.length;n++) {
      const [ax,ay]=points[n-1], [bx,by]=points[n];
      if(ax!==bx&&ay!==by) throw new Error('Routes use deliberate orthogonal bends');
      const x=Math.min(ax,bx),y=Math.min(ay,by),w=Math.abs(ax-bx)+width,h=Math.abs(ay-by)+width;
      this.box(x-1,y-1,w+2,h+2,'.',true); this.box(x,y,w,h,surface);
    }
    return this;
  }
  mark(x:number,y:number,c:string) { this.grid[y][x]=c; return this; }
  grass(x:number,y:number,w:number,h:number) { this.box(x,y,w,h,',');return this; }
  /** Rounded, gently uneven clearings instead of rectangular strips beside every road. */
  patch(cx:number,cy:number,rx:number,ry:number,c:string,keepPaths=false) {
    for(let y=1;y<this.h-1;y++) for(let x=1;x<this.w-1;x++) {
      const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry,angle=Math.atan2(dy,dx);
      const edge=1+.08*Math.sin(angle*3)+.05*Math.cos(angle*5);
      if(Math.hypot(dx,dy)<=edge&&(!keepPaths||this.grid[y][x]!=='='))this.grid[y][x]=c;
    }
    return this;
  }
  gates(last=false) {
    for(let y=12;y<16;y++) { this.grid[y][0]='=';this.grid[y][1]='='; if(!last){this.grid[y][this.w-1]='=';this.grid[y][this.w-2]='=';} }
    this.mark(1,14,'E'); return this.grid.map(row=>row.join(''));
  }
}
function meadow() {
  const r=new Route(40,40);
  // One arrival and a real fork: the cart trail goes round the orchard; Bunny Cut crosses it.
  r.path([[1,13],[4,13],[4,17],[8,17]])
   .path([[8,17],[8,9],[18,9],[18,18],[19,18]]) // dry cart trail
   .path([[8,17],[8,22],[18,22],[18,18]]) // shorter Bunny Cut
   .path([[19,18],[19,7],[31,7],[31,18],[38,18],[38,13]]) // safe ridge
   .path([[19,18],[19,24],[31,24],[31,18]]) // Slime Bend
   .path([[13,9],[13,6]],1).patch(13.5,5.5,5.2,3.5,'.') // scattered gathering grove
   .path([[31,7],[31,4]],1).patch(32,4.3,4.3,2.7,'.') // Moss's stop
   .patch(3.5,17.4,2.5,2.4,'.'); // camp rests off the arrival bend
  // Broad roadside grass; the dry roads remain visible around its edges.
  r.patch(5.4,8.7,3.6,4.2,',',true)
   .patch(11.6,21.9,5.6,3.6,',') // the whole short crossing runs through the orchard grass
   .patch(25.4,4.1,4.1,2.7,',',true)
   .patch(35.1,16.2,3.7,4.1,',',true)
   .patch(25.1,25,6,3,',');
  // Willow Pond's opposite banks end at a visible, buildable crossing, not an empty trail.
  r.patch(25.5,17.1,2.8,5.3,'~')
   .path([[19,18],[22,18]]).path([[28,18],[31,18]])
   .box(23,18,5,2,'~');
  // Sunny Meadow is a generous clearing off Slime Bend, explored on foot rather than crossed by stray dirt stubs.
  r.patch(23.5,30.3,7,4.3,'.').patch(27.5,31.2,4.5,3.5,'.')
   .patch(20.2,30.6,3.5,2.7,',').patch(27.8,32.3,2.6,2.3,',')
   .path([[28,34],[28,35]],1);
  // One forest trail for both stories. Seal the expanded meadow's southern edge,
  // then cut a two-tile corridor whose only exit is behind the rescue slimes.
  // Explicit bends avoid the walkable margins that path() paints beside normal roads.
  r.box(2,33,30,6,'#')
   .box(28,32,2,4,'.').box(20,34,8,2,'=').box(14,34,3,2,'=').box(20,35,2,4,'=')
   .box(15,37,7,2,'=').box(15,34,2,5,'=');
  const g = POPPY_GROVE.clearing;
  r.patch(g.x,g.y,g.rx,g.ry,'.');
  // Each meadow stop has an authored resource mix; the secret grove holds the largest reserve.
  for(const [x,y,c] of [
    [11,4,'k'],[16,6,'k'],[33,3,'k'],[24,29,'k'],
    [5,28,'k'],[10,29,'k'],[3,31,'k'],[9,31,'k'],[12,33,'k'],[7,35,'k'],
    [14,3,'r'],[32,5,'r'],[26,30,'r'],
    [7,28,'r'],[11,30,'r'],[5,33,'r'],[10,35,'r'],
    [10,21,'K'],[14,23,'K'],[24,4,'K'],[35,14,'K'],[19,30,'K'],
    [5,8,'R'],[25,25,'R'],[27,31,'R'],
  ] as [number,number,string][])r.mark(x,y,c);
  r.mark(4,16,'S').mark(1,17,'C');
  return r.gates();
}
function woods() {
 const r=new Route(40,40);
 r.path([[1,13],[7,13],[7,18],[30,18],[30,13],[38,13]])
  .path([[7,18],[7,34],[30,34],[30,18]])
  .path([[16,18],[16,9],[8,9],[8,6]])
  .box(3,3,12,5,'.')
  .path([[7,18],[8,18],[8,13]],1).path([[8,9],[8,10]],1)
  .box(6,10,5,4,'~') // Bram's direct creek crossing
  .path([[16,18],[16,10],[18,10]]).path([[27,10],[30,10],[30,8],[34,8]])
  .box(19,8,8,10,'~') // Stillwater
  .box(32,6,5,5,'.')
  .path([[30,31],[34,31]],1).box(33,29,4,5,'.')
  .path([[11,34],[11,31]],1).box(9,29,5,4,'.');
 r.grass(34,10,4,4).grass(18,16,3,6).grass(3,23,4,6).grass(19,28,6,5);
 r.path([[3,13],[3,16]],1).box(2,15,4,4,'.').path([[21,34],[21,32]],1).mark(3,17,'C').mark(5,12,'S');
 return r.gates();
}
function cave() {
 const r=new Route(40,46);
 r.path([[1,13],[9,13],[9,21],[24,21],[24,23],[38,23],[38,13]])
  .path([[9,21],[9,42],[30,42],[30,23]])
  .path([[9,21],[9,9],[19,9],[19,6],[26,6],[26,9]],1)
  .box(24,7,5,4,'.') // Pebbler mouth: its interior is a separate instance
  .path([[19,9],[24,9],[24,14]],1).box(22,13,5,4,'.')
  .path([[9,33],[5,33]],1).box(3,31,5,5,'.') // Pip's tunnel
  .path([[9,31],[13,31]]).path([[28,31],[30,31]])
  .box(15,28,13,13,'~').box(13,31,15,2,'~')
  .box(8,23,5,4,'.').box(28,24,6,5,'.');
 r.grass(12,6,4,3).grass(33,27,4,4).grass(16,19,3,5).grass(3,9,5,5).grass(18,43,5,2);
 r.mark(4,16,'C').mark(5,12,'S');
 return r.gates();
}
function hollow() {
 const r=new Route(40,42);
 r.path([[1,13],[2,13],[2,24],[6,24]],1).path([[6,24],[6,7],[28,7],[28,20],[38,20],[38,13]])
  .path([[6,24],[12,24],[12,30],[26,30],[26,20],[28,20]])
  .box(17,13,5,16,'^')
  .path([[12,24],[16,24]]).path([[22,24],[26,24]])
  .box(17,24,5,2,'^')
  .path([[12,33],[7,33],[7,36]],1).box(3,33,8,6,'.')
  .path([[28,10],[34,10],[34,5]],1).box(32,3,5,5,'.')
  .path([[6,10],[6,7],[13,7],[13,5],[20,5]],1)
  .box(18,3,7,5,'.') // secluded fox trial, off the main ridge
  .path([[23,5],[25,5],[25,7]],1).box(24,4,6,5,'.'); // den + training gear
 r.grass(30,13,4,5).grass(3,33,4,3).grass(18,28,3,6).grass(9,12,7,4).grass(29,25,4,4);
 r.mark(3,18,'C').mark(3,12,'S');
 return r.gates();
}
function peak() {
 const r=new Route(44,46);
 // Entrance descends to the foot of the mountain; the ascent then makes a genuine fork.
 r.path([[1,13],[2,13],[2,35],[9,35]])
  .path([[9,35],[9,29],[7,29],[7,9],[12,9],[12,4],[28,4],[28,7]])
  .path([[9,35],[22,35],[22,17],[28,17],[28,7]])
  .box(12,18,7,12,'~').path([[7,23],[11,23]]).path([[19,23],[22,23]])
  .box(12,23,7,2,'~')
  .path([[22,35],[30,35],[30,39],[38,39]],1).box(28,34,13,9,'.')
  .path([[22,17],[22,12]],1).box(20,10,5,4,'.')
  .box(26,5,7,6,'.').mark(28,6,'L').box(6,26,3,5,'.'); // injured Rook, west descent
 r.grass(14,33,3,5).grass(20,25,5,3).grass(8,14,3,5).grass(34,34,6,6);
 r.mark(7,37,'C').mark(3,17,'S');
 return r.gates(true);
}
function glade() {
 const r=new Route(16,26);
 r.box(1,10,6,7,'.').path([[4,13],[4,8]],1).box(4,7,3,3,'.').path([[7,13],[14,13]]);
 r.path([[12,13],[12,8]],1).box(11,6,2,3,'.');
 r.mark(2,15,'*').mark(6,16,'*');
 for(let y=12;y<16;y++)r.grid[y][15]='=';
 r.mark(3,13,'E');return r.grid.map(row=>row.join(''));
}
// Resource locations are authored destinations, never the first available cells in a scan.
const NODE_CHAR: Record<NodeKind,string> = {oak:'k',pine:'p',rock:'r',copper:'u',iron:'i',crystal:'y',glimwood:'g',emberwood:'f',obsidian:'o'};
function resources(id:ZoneId,rows:string[]) {
 const r = new Route(rows[0].length,rows.length);
 r.grid = rows.map(row=>[...row]);
 for(const site of RESOURCE_SITES.filter(s=>s.zone===id)) {
   if(site.clearing) {
     const terrain=r.grid.map(row=>[...row]);
     r.patch(...site.clearing,'.',true);
     for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)if(',~^'.includes(terrain[y][x]))r.grid[y][x]=terrain[y][x];
   }
 }
 for(const site of RESOURCE_SITES.filter(s=>s.zone===id))for(const [x,y,kind]of site.nodes) {
   const c=NODE_CHAR[kind]; r.mark(x,y,r.grid[y][x]===','?c.toUpperCase():c);
 }
 return r.grid.map(row=>row.join(''));
}
export const ROUTES: Partial<Record<ZoneId,string[]>> = { glade:glade(), meadow:meadow(), woods:resources('woods',woods()), cave:resources('cave',cave()), hollow:resources('hollow',hollow()), peak:resources('peak',peak()) };

/** Pebbler Hollow: an independent cave map, with a barred chamber and a lower recovery tunnel. */
export const ECHO_TUNNELS = [
  '########################################',
  '########################.......#########',
  '###################....#.#..#...########',
  '###################.............########',
  '###################......#####..########',
  '###################......#..#...########',
  '###################......#......########',
  '##########################.#############',
  '#########################...############',
  '#########################...############',
  '#########################...############',
  '########################################',
  '########################################',
  '########################################',
  '########################################',
  '########################################',
  '########################################',
  '########################################',
  '#..######..#############################',
  '##..####..##############################',
  '###..##..###############################',
  '####....################################',
  '########################################',
  '########################################',
  '########################################',
  '########################################',
];
