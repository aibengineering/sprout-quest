import { describe, expect, test } from 'bun:test';
import { SHORTCUTS, buildShortcut, canBuildShortcut, shortcutLock, shortcutWorldPoint } from '../src/shortcuts';
import { loadState, newState, saveState } from '../src/state';
import { GATE_Y, T, World } from '../src/world';
import { ZONES, zoneById, type MatId } from '../src/data';
import { MOUTH } from '../src/procession';
import { ECHO_OUTSIDE } from '../src/echoCave';

/** Walking distances respect real object collisions and the player's feet, rather than just the ASCII road. */
function distance(w: World, a: { x: number; y: number }, b: { x: number; y: number }) {
  const start = Math.floor(a.y)*w.w + Math.floor(a.x), end = Math.floor(b.y)*w.w + Math.floor(b.x);
  const d = new Int32Array(w.w*w.h).fill(-1), q = [start]; d[start] = 0;
  for (let n = 0; n < q.length; n++) {
    const i = q[n], x = i % w.w, y = Math.floor(i/w.w);
    if (i === end) return d[i];
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const xx=x+dx, yy=y+dy, j=yy*w.w+xx;
      if (xx<0 || xx>=w.w || yy<0 || yy>=w.h || d[j]>=0 || w.blocked(xx+.5,yy+.9,.28)) continue;
      d[j]=d[i]+1;q.push(j);
    }
  }
  return -1;
}
function openWorld() {
  const w = new World();
  for (const o of w.objs) if (o.kind === 'gate' || o.story || o.shown) o.hidden = true;
  return w;
}
function ready() {
  const s = newState();s.flags.push('bram:home');s.stories.bram=8;s.build.sawmill=4;
  s.bosses=ZONES.flatMap((z) => z.guardian ? [z.guardian.kind] : []);
  for (const m of Object.keys(s.mats) as MatId[]) s.mats[m]=100;
  return s;
}
describe('intentional timber return loops', () => {
  test('later regions gain exploration space without shifting Sowerby, entrances or the separate cave mouth', () => {
    const w = new World();
    expect(w.h).toBe(46);
    for (const id of ['meadow','woods','cave','hollow','peak'] as const) {
      const at=w.entryPoint(id);expect(w.blocked(at.x,at.y,.28)).toBe(false);expect(Math.floor(at.y)).toBe(14);
    }
    expect(w.blocked(ECHO_OUTSIDE.x,ECHO_OUTSIDE.y,.28)).toBe(false);
    expect(MOUTH).toEqual({ x: zoneById('cave').x0+26.5,y:8.9 });
    // The added height does not open a path around old borders in the village or Meadow.
    for (const id of ['village'] as const) for (let x=zoneById(id).x0;x<zoneById(id).x0+zoneById(id).w;x++) expect(w.tile(x,26)).toBe(T.OBST);
  });
  test('shortcut flags and definitions are unique, and every tier of planks has a use', () => {
    expect(new Set(SHORTCUTS.map((p)=>p.id)).size).toBe(SHORTCUTS.length);
    expect(new Set(SHORTCUTS.map((p)=>p.flag)).size).toBe(SHORTCUTS.length);
    expect([...new Set(SHORTCUTS.flatMap((p)=>Object.keys(p.cost)))].sort()).toEqual(['emberplank','glimplank','pineplank','plank']);
  });
  for (const p of SHORTCUTS) {
    test(`${p.name}: both banks are reachable before building, and the crossing removes at least half the detour`, () => {
      const w=openWorld(), a=shortcutWorldPoint(p,p.from),b=shortcutWorldPoint(p,p.to), s=ready();
      expect(w.blocked(a.x,a.y,.28)).toBe(false);expect(w.blocked(b.x,b.y,.28)).toBe(false);
      expect(distance(w,w.entryPoint(p.zone),a), 'construction bank unreachable').toBeGreaterThanOrEqual(0);
      expect(distance(w,w.entryPoint(p.zone),b), 'far bank unreachable').toBeGreaterThanOrEqual(0);
      const before=distance(w,a,b);
      expect(before).toBeGreaterThan(0);
      expect(buildShortcut(s,p)).toBe('ok');w.setShortcuts(s);
      const after=distance(w,a,b);
      expect(after).toBeGreaterThan(0);expect(before-after).toBeGreaterThanOrEqual(12);expect(after).toBeLessThanOrEqual(before/2);
      // A player fits across the whole deck, not merely one centre point.
      const d=p.deck, at=shortcutWorldPoint(p,d);
      for (let y=d.y+.5;y<d.y+d.h;y+=.25) for (let x=at.x+.5;x<at.x+d.w-.25;x+=.25) expect(w.blocked(x,y,.28)).toBe(false);
      w.setShortcuts(newState());
      expect(w.solidAt(at.x+.5,d.y+.5)).toBe(true);
    });
    test(`${p.name}: Bram, the right blade and the region must be unlocked; an already-built crossing never charges twice`, () => {
      const s=ready();s.flags=[];s.stories.bram=0;
      expect(canBuildShortcut(s,p)).toBe('locked');expect(shortcutLock(s,p)).toContain('Bram');
      s.flags.push('bram:home');s.build.sawmill=p.mill-1;
      expect(canBuildShortcut(s,p)).toBe('locked');
      s.build.sawmill=p.mill;
      const guardian=zoneById(p.zone).guardian;
      if (guardian) { s.bosses=[];expect(canBuildShortcut(s,p)).toBe('locked');s.bosses.push(guardian.kind); }
      const material=Object.keys(p.cost)[0] as MatId,n=p.cost[material]!;
      s.mats[material]=n-1;expect(buildShortcut(s,p)).toBe('missing');expect(s.flags).not.toContain(p.flag);
      s.mats[material]=n;expect(buildShortcut(s,p)).toBe('ok');expect(s.mats[material]).toBe(0);
      const paid={...s.mats};expect(buildShortcut(s,p)).toBe('built');expect(s.mats).toEqual(paid);
    });
  }
  test('even building every shortcut cannot reach through a guardian’s closed boundary', () => {
    const w=openWorld(),s=ready();s.flags.push(...SHORTCUTS.map((p)=>p.flag));w.setShortcuts(s);
    for (const z of ZONES.filter((z)=>z.guardian)) {
      const gate=w.obj('gate',z.id)!;gate.hidden=false;
      expect(distance(w,{ x:z.x0-.5,y:GATE_Y+1.9 },{ x:z.x0+2.5,y:GATE_Y+1.9 }),z.id).toBe(-1);
      gate.hidden=true;
    }
  });
  test('an existing Bram bridge and new crossings persist without changing workshop or housing progress', () => {
    const store: Record<string,string>={};
    globalThis.localStorage={getItem:(k:string)=>store[k]??null,setItem:(k:string,v:string)=>{store[k]=v;},removeItem:(k:string)=>{delete store[k];}} as Storage;
    const s=ready(),before={...s.build},homes={...s.homes};s.flags.push('bridge:woods');
    const old=SHORTCUTS.find((p)=>p.flag==='bridge:woods')!;
    expect(buildShortcut(s,old)).toBe('built');
    for (const p of SHORTCUTS) buildShortcut(s,p);
    saveState(s);const loaded=loadState()!;
    expect(loaded.flags).toEqual(s.flags);expect(loaded.mats).toEqual(s.mats);expect(loaded.build).toEqual(before);expect(loaded.homes).toEqual(homes);
    const w=new World();w.setShortcuts(loaded);
    for (const p of SHORTCUTS) {const at=shortcutWorldPoint(p,p.deck);expect(w.tile(at.x,at.y)).toBe(T.BRIDGE);}
  });
});
