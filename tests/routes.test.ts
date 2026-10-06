import { describe, expect, test } from 'bun:test';
import { NODE_SPAWNS, WORLD_H, ZONES, type ZoneId } from '../src/data';
import { ROUTES, ROUTE_HEIGHTS } from '../src/routes';
import { GATE_Y, T, World } from '../src/world';
import { POPPY_GROVE } from '../src/poppyGrove';
import { RESOURCE_SITES } from '../src/resourceSites';
import { newState } from '../src/state';

type P = { x: number; y: number };

function walkableReach(w: World, from: P, m: number): Set<string> {
  const q = [from], seen = new Set([`${from.x},${from.y}`]);
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    for (const [dx, dy] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]) {
      const x = p.x + dx, y = p.y + dy, key = `${x},${y}`;
      if (x < m || x >= m + 40 || y < 0 || y >= 40 || seen.has(key) || w.blocked(x,y,.28)) continue;
      seen.add(key); q.push({x,y});
    }
  }
  return seen;
}

function flood(rows: string[], from: P, ok: (c: string) => boolean): Set<string> {
  const seen = new Set([`${from.x},${from.y}`]);
  const q = [from];
  while (q.length) {
    const { x, y } = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (ny < 0 || ny >= rows.length || nx < 0 || nx >= rows[0].length || seen.has(k) || !ok(rows[ny][nx])) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}

const find = (rows: string[], c: string): P[] => rows.flatMap((r, y) => [...r].flatMap((ch, x) => (ch === c ? [{ x, y }] : [])));
const around = (p: P) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => `${p.x + dx},${p.y + dy}`);

describe('route maps', () => {
  for (const [id, rows] of Object.entries(ROUTES) as [ZoneId, string[]][]) {
    const zone = ZONES.find((z) => z.id === id)!;
    const last = zone === ZONES[ZONES.length - 1];
    const start = find(rows, 'E')[0];
    // Trees, signs, campfires and the lair are solid: you walk up beside them.
    const reach = flood(rows, start, (c) => '.,=*E'.includes(c));
    const offGrass = flood(rows, start, (c) => '.=*E'.includes(c));
    const exits = [0, 1, 2, 3].map((i) => `${rows[0].length - 1},${GATE_Y + i}`);

    test(`${zone.name}: the right size, only known tiles, one arrival point`, () => {
      expect(rows.length).toBe((ROUTE_HEIGHTS as Partial<Record<ZoneId, number>>)[id] ?? WORLD_H);
      for (const r of rows) {
        expect(r.length).toBe(zone.w);
        expect(r).toMatch(/^[#.,=~^*ESCLkKpPrRuUiIyYgGfFoO]+$/);
      }
      expect(find(rows, 'E').length).toBe(1);
      if (!zone.theme.pool) expect(rows.join('')).not.toContain('~');
    });

    test(`${zone.name}: only opens onto its neighbours through the gate rows`, () => {
      for (let y = 0; y < rows.length; y++) {
        const gate = y >= GATE_Y && y < GATE_Y + 4;
        expect(rows[y][0] !== '#').toBe(gate && id !== 'glade');
        expect(rows[y][zone.w - 1] !== '#').toBe(gate && !last);
      }
    });

    test(`${zone.name}: a complete dry detour remains available alongside the encounter cuts`, () => {
      const goal = last ? find(rows, 'L').flatMap((l) => [...around(l), ...around({ x: l.x + 2, y: l.y + 2 })]) : exits;
      expect(goal.some((g) => reach.has(g))).toBe(true);
      expect(goal.some((g) => offGrass.has(g))).toBe(true);
    });

    test(`${zone.name}: every tree, rock, sign and campfire can be reached, grass-edge resources remain valid`, () => {
      for (const c of 'kKpPrRuUiIyYSC') {
        for (const p of find(rows, c)) {
          expect({ c, p, reachable: around(p).some((a) => reach.has(a)) }).toEqual({ c, p, reachable: true });
          if ('KPRUIY'.includes(c)) {
            let grass = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (rows[p.y + dy]?.[p.x + dx] === ',') grass++;
            expect({ c, p, grass: grass >= 1 }).toEqual({ c, p, grass: true });
          }
          if ('kpruiy'.includes(c)) {
            const [x, y] = [p.x, p.y];
            const safeSide = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach.has(`${x + dx},${y + dy}`) && '.=*'.includes(rows[y + dy][x + dx]));
            expect({ c, p, safeSide }).toEqual({ c, p, safeSide: true });
          }
        }
      }
    });
  }

  // Each area's gathering nodes are its own tier, so exploring never hands you materials meant for later.
  test('the Sunny Meadow (and its Secret Grove) only has oaks and rocks', () => {
    const nodes = new Set(ROUTES.meadow!.join('').replace(/[^kKpPrRuUiIyY]/g, ''));
    expect([...nodes].sort()).toEqual(['K', 'R', 'k', 'r']);
  });

  test('meadow resources keep their yields and have space around them for gathering', () => {
    const w=new World(), z=ZONES.find(z=>z.id==='meadow')!;
    const nodes=w.objs.filter(o=>o.kind==='node'&&o.x>=z.x0&&o.x<z.x0+z.w);
    for(const p of NODE_SPAWNS.meadow!) for(const grass of [false,true])
      expect(nodes.filter(o=>o.node===p.kind&&o.grass===grass).length).toBe(grass?p.grass:p.safe);
    for(const o of nodes) {
      const x=Math.floor(o.x+.4)-z.x0,y=Math.floor(o.y+.3);
      // The eight surrounding tiles are open terrain: no node is pressed against a wall or pond.
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(dx||dy)
        expect({node:o.id,open:!['#','~','^'].includes(ROUTES.meadow![y+dy][x+dx])}).toEqual({node:o.id,open:true});
    }
  });

  test('Poppy cannot leave her dead end around the slimes; defeating them opens the only way out', () => {
    const w = new World(), m = ZONES.find(z => z.id === 'meadow')!.x0;
    const rescue = { ...POPPY_GROVE.rescue, x: m + POPPY_GROVE.rescue.x, kind: 'foe' as const, label: 'Fight', hidden: false };
    w.objs.push(rescue);
    const gate=w.objs.find(o=>o.id==='poppy:thicket')!;
    gate.hidden=false;
    const start = { x: m + POPPY_GROVE.cower.x, y: 35.5 };
    expect(w.blocked(start.x, start.y, .28)).toBe(false);
    expect(start.x-gate.x-gate.w).toBeLessThan(1);
    expect(start.x).toBeLessThan(rescue.x);
    expect(walkableReach(w,start,m).has(`${m+11.5},34.5`)).toBe(false);
    // Quarter-tile walking with the real player feet box catches gaps beside the pack,
    // including bypasses through the adjoining clearing and the western chase branch.
    const escape = () => walkableReach(w,start,m).has(`${m+29.5},35.5`);
    expect(escape()).toBe(false);
    rescue.hidden = true;
    expect(escape()).toBe(true);
  });

  test('Poppy’s rich grove stays gated between rescue and chase, and completed saves retain access', () => {
    const w=new World(),m=ZONES.find(z=>z.id==='meadow')!.x0;
    const gate=w.objs.find(o=>o.id==='poppy:thicket')!, s=newState();
    for(const step of [0,1,2,3]) {
      s.stories.poppy=step;gate.hidden=!gate.shown!(s);
      expect(gate.hidden).toBe(false);
      expect(walkableReach(w,{x:m+POPPY_GROVE.cower.x,y:35.5},m).has(`${m+11.5},34.5`)).toBe(false);
    }
    for(const step of [4,5,6]) {
      s.stories.poppy=step;gate.hidden=!gate.shown!(s);
      expect(gate.hidden).toBe(true);
    }
    s.stories.poppy=0;s.flags.push('poppy:returned');
    expect(gate.shown!(s)).toBe(false);
  });

  test('authored gathering stops leave space around nodes, without putting resources inside scenery', () => {
    const w=new World();
    for(const site of RESOURCE_SITES)for(const [x,y,kind]of site.nodes) {
      const rows=ROUTES[site.zone]!,m=ZONES.find(z=>z.id===site.zone)!.x0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)
        expect({site:site.id,x,y,open:!['#','~','^'].includes(rows[y+dy][x+dx])}).toEqual({site:site.id,x,y,open:true});
      const node=w.objs.find(o=>o.node===kind&&Math.floor(o.x)===m+x&&Math.floor(o.y)===y)!;
      expect(node).toBeDefined();
      const overlaps=w.objs.filter(o=>o!==node&&!o.hidden&&!o.walkable&&
        node.x<o.x+o.w&&node.x+node.w>o.x&&node.y<o.y+o.h&&node.y+node.h>o.y);
      expect({site:site.id,x,y,overlaps:overlaps.map(o=>o.id??o.kind)}).toEqual({site:site.id,x,y,overlaps:[]});
    }
  });

  test('the rescue and every chase pack guard the same single trail into a resource-rich glade', () => {
    const m = ZONES.find(z => z.id === 'meadow')!.x0;
    for (const bounds of [POPPY_GROVE.rescue, POPPY_GROVE.pack1, POPPY_GROVE.pack2, POPPY_GROVE.bigbun]) {
      const w = new World();
      w.objs.push({...bounds,x:m+bounds.x,kind:'foe',label:'Fight'});
      expect(walkableReach(w,{x:m+29.5,y:35.5},m).has(`${m+11.5},34.5`)).toBe(false);
    }
    const w = new World(), reach = walkableReach(w,{x:m+29.5,y:35.5},m);
    expect(reach.has(`${m+11.5},34.5`)).toBe(true);
    const nodes = w.objs.filter(o => o.kind === 'node' && o.x >= m+2 && o.x < m+14 && o.y > 26);
    expect(nodes.filter(o => o.node === 'oak').length).toBe(6);
    expect(nodes.filter(o => o.node === 'rock').length).toBe(4);
    for (const o of nodes) {
      // Each resource has an actual reachable gathering position beside its collision box.
      expect([...reach].some(key => {
        const [x,y] = key.split(',').map(Number);
        const dx = Math.max(o.x-x,0,x-o.x-o.w), dy = Math.max(o.y-y,0,y-o.y-o.h);
        return Math.hypot(dx,dy)<.8;
      })).toBe(true);
    }
    // The thief's cinematic stays on this same walkable trail, with no hops through tree walls.
    for (let i=1;i<POPPY_GROVE.getaway.length;i++) {
      const a=POPPY_GROVE.getaway[i-1],b=POPPY_GROVE.getaway[i];
      for(let t=0;t<=1;t+=.05) expect(w.blocked(m+a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,.28)).toBe(false);
    }
  });
});

describe("Bram's Bridge", () => {
  test('the creek blocks the way up to the old camp until the bridge is built, then it walks straight through', () => {
    const w = new World();
    const W = ZONES.find((z) => z.id === 'woods')!.x0;
    // The narrow way: from the west gate (row 12) straight up to the camp (row 7), across the creek at rows 9-10.
    const across = [14,13,12,11,10,9,8].map(y=>({x:W+8.5,y:y+.5}));
    expect(across.some((p) => w.solidAt(p.x, p.y))).toBe(true);
    w.setBridge(true);
    expect(across.filter((p) => w.solidAt(p.x, p.y))).toEqual([]);
    // Wider than the way, so there's no stepping around it.
    expect(w.solidAt(W + 7.5, 11.5) && w.solidAt(W + 10.5, 11.5)).toBe(true);
  });
});

// A dry path alone is insufficient: it must cost enough walking for the encounter cut to be a real choice.
describe('route decisions with actual scenery clearance', () => {
  for (const id of ['meadow','woods','cave','hollow','peak'] as const) test(`${id}: the risky passage saves at least eight tiles`, () => {
    const w=new World(), z=ZONES.find(z=>z.id===id)!;
    for(const o of w.objs)if(o.kind==='gate'||o.story||o.shown)o.hidden=true;
    const goal=id==='peak'?w.obj('lair')!:null;
    const end=goal?{x:Math.floor(goal.x+1),y:Math.ceil(goal.y+goal.h+.3)}:{x:z.x0+z.w-2,y:14};
    function distance(dry:boolean){
      const q=[{x:z.x0+1,y:14,d:0}], seen=new Set([`${z.x0+1},14`]);
      for(let i=0;i<q.length;i++){
        const p=q[i];if(p.x===end.x&&p.y===end.y)return p.d;
        for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
          const x=p.x+dx,y=p.y+dy,key=`${x},${y}`;
          if(x<z.x0||x>=z.x0+z.w||y<0||y>=ROUTES[id]!.length||seen.has(key)||w.blocked(x+.5,y+.9,.28)||(dry&&w.tile(x,y)===T.GRASS))continue;
          seen.add(key);q.push({x,y,d:p.d+1});
        }
      }
      return -1;
    }
    const risky=distance(false), safe=distance(true);
    expect(risky).toBeGreaterThan(0);expect(safe).toBeGreaterThanOrEqual(risky+8);
  });
});
