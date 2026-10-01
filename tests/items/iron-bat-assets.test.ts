import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { GEAR } from '../../src/data';
import { craftGear, equip } from '../../src/rules';
import { newState } from '../../src/state';
import ironsword from '../../src/crafting/items/ironsword';
import ironhammer from '../../src/crafting/items/ironhammer';
import batwhip from '../../src/crafting/items/batwhip';
import batwand from '../../src/crafting/items/batwand';

const recipes = { ironsword:{iron:15,pine:9},ironhammer:{iron:18,pine:9},batwhip:{wing:12,core:1,fang:4},batwand:{wing:10,core:2} };
const parts = { ironsword:['pine-grip','iron-blade','iron-fittings'],ironhammer:['pine-shaft','iron-head','iron-collars'],batwhip:['wing-grip','wing-lash','core-pommel','fang-hooks'],batwand:['wing-shaft','left-wing','right-wing','core-crown','core-pommel'] };
const presentations={ironsword,ironhammer,batwhip,batwand};

describe('iron and bat recipe art',()=>{
  for (const id of Object.keys(recipes) as (keyof typeof recipes)[]) {
    test(`${id}: real ingredients land within registered layers before the reveal`,()=>{
      const p=presentations[id], manifest=JSON.parse(readFileSync(`public/assets/crafting/${id}.json`,'utf8'));
      expect(p.id).toBe(id);expect(p.layers.map(l=>l.id)).toEqual(parts[id]);
      expect(Object.keys(p.roles).sort()).toEqual(Object.keys(recipes[id]).sort());
      expect([...new Set(p.targets.map(t=>String(t.material)))].sort()).toEqual(Object.keys(recipes[id]).sort());
      for(const target of p.targets) {
        const [x0,y0,x1,y1]=manifest.parts[target.part].bounds;
        expect(target.x*512).toBeGreaterThanOrEqual(x0);expect(target.x*512).toBeLessThanOrEqual(x1);
        expect(target.y*512).toBeGreaterThanOrEqual(y0);expect(target.y*512).toBeLessThanOrEqual(y1);
      }
      const reveal=p.phases.find(phase=>phase.stage==='reveal')!;
      expect(reveal.at).toBeGreaterThan(Math.max(...p.targets.map(t=>t.at+t.duration)));
      expect(p.duration-reveal.at).toBeGreaterThanOrEqual(650);
      expect(p.phases[0].at).toBe(0);
      expect(p.phases.map(t=>t.at)).toEqual(p.phases.map(t=>t.at).sort((a,b)=>a-b));
    });
    test(`${id}: recipe, ownership and equipped transaction stay intact`,()=>{
      expect(GEAR[id].recipe).toEqual(recipes[id]);
      const s=newState();s.lv=20;s.build.forge=5;s.skills.mine.lv=10;
      s.mastery[GEAR[id].style!].lv=10;
      for(const [mat,n] of Object.entries(recipes[id])) (s.mats as Record<string,number>)[mat]=n*2;
      expect(craftGear(s,id)).toBe('ok');
      expect(craftGear(s,id)).toBe('owned');
      expect(equip(s,id)).toBe(true);
      expect(s.equip.weapon).toBe(id);
      for(const [mat,n] of Object.entries(recipes[id])) expect((s.mats as Record<string,number>)[mat]).toBe(n);
    });
    test(`${id}: layers remain registered on one full-size transparent canvas`,()=>{
      const manifest=JSON.parse(readFileSync(`public/assets/crafting/${id}.json`,'utf8'));
      expect(manifest.size).toEqual([512,512]);expect(manifest.stack).toEqual(parts[id]);
      let total=0;
      for(const part of [...parts[id],'complete']) {
        const layer=manifest.parts[part],data=readFileSync(`public/${layer.src}`);
        expect(data.toString('ascii',0,4)).toBe('RIFF');expect(data.toString('ascii',8,12)).toBe('WEBP');
        expect(data.toString('ascii',12,16)).toBe('VP8X');
        // Extended WebP canvas dimensions: alpha bit must be set; never crop each layer independently.
        expect(data[20]&16).toBe(16);expect(data.readUIntLE(24,3)+1).toBe(512);expect(data.readUIntLE(27,3)+1).toBe(512);
        const [x0,y0,x1,y1]=layer.bounds;
        expect(Math.min(x0,y0)).toBeGreaterThan(10);expect(Math.max(x1,y1)).toBeLessThan(502);
        expect(layer.center[0]).toBeCloseTo((x0+x1)/1024,3);expect(layer.center[1]).toBeCloseTo((y0+y1)/1024,3);
        total+=data.byteLength;
      }
      expect(total).toBeLessThan(100_000);
    });
    test(`${id}: compressed equipped model preserves toon attributes and attachment origin`,()=>{
      const path=`public/assets/models/wpn_${id}.glb`,data=readFileSync(path);
      expect(data.toString('ascii',0,4)).toBe('glTF');expect(data.readUInt32LE(4)).toBe(2);
      const gltf=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)).trim());
      for(const mesh of gltf.meshes)for(const p of mesh.primitives){expect(p.attributes.COLOR_0).toBeDefined();expect(p.attributes.COLOR_1).toBeDefined();expect(p.attributes.POSITION).toBeDefined();}
      const root=gltf.nodes.find((n:any)=>n.name==='weapon');expect(root).toBeDefined();
      expect(root.translation??[0,0,0]).toEqual([0,0,0]);
      expect(statSync(path).size).toBeLessThan(30_000);
    });
  }
});
