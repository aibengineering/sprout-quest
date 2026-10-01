import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { Color, Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GEAR } from '../src/data';
import coppersword from '../src/crafting/items/coppersword';
import copperhammer from '../src/crafting/items/copperhammer';
import sporewhip from '../src/crafting/items/sporewhip';
import sporewand from '../src/crafting/items/sporewand';

const ids = ['coppersword', 'copperhammer', 'sporewhip', 'sporewand'] as const;
const presentations = { coppersword, copperhammer, sporewhip, sporewand };
const ingredientColors = {
  coppersword: ['#e8904a', '#ffc890', '#7a5238', '#bc8960'],
  copperhammer: ['#e8904a', '#ffc890', '#c39965', '#7b593b'],
  sporewhip: ['#e8505a', '#fff0d8', '#ca7886'],
  sporewand: ['#e8505a', '#fff0d8', '#eacdb8', '#bb8294'],
};
type Manifest = { size: number[]; stack: string[]; parts: Record<string, { src: string; center: number[]; bounds: number[] }> };

describe('copper and spore weapon ingredient art', () => {
  for (const id of ids) {
    test(`${id} assembles every recipe ingredient before the final lift`, () => {
      const p = presentations[id], recipe = GEAR[id].recipe!;
      expect(Object.keys(p.roles).sort()).toEqual(Object.keys(recipe).sort());
      const m: Manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8'));
      expect(p.layers.map(l => l.id)).toEqual(m.stack);
      expect(p.complete).toBe(m.parts.complete.src);
      for (const material of Object.keys(recipe)) expect(p.targets.some(t => t.material === material)).toBe(true);
      for (const t of p.targets) {
        expect(t.at).toBeGreaterThanOrEqual(0);
        expect(t.duration).toBeGreaterThan(0);
        expect(p.layers.some(l => l.id === t.part)).toBe(true);
        const [x0, y0, x1, y1] = m.parts[t.part].bounds;
        expect(t.x * 512).toBeGreaterThanOrEqual(x0); expect(t.x * 512).toBeLessThanOrEqual(x1);
        expect(t.y * 512).toBeGreaterThanOrEqual(y0); expect(t.y * 512).toBeLessThanOrEqual(y1);
      }
      expect(p.phases[0].at).toBe(0);
      const reveal = p.phases.find(phase => phase.stage === 'reveal')!;
      expect(reveal.at).toBeGreaterThan(Math.max(...p.targets.map(t => t.at + t.duration)));
      expect(p.duration - reveal.at).toBeGreaterThanOrEqual(500);
    });
    test(`${id} ships registered, uncropped assembly art within the item budget`, () => {
      const m: Manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8'));
      expect(m.size).toEqual([512, 512]);
      expect(m.stack).toHaveLength(4);
      expect(new Set(m.stack).size).toBe(4);
      expect(Object.keys(m.parts).sort()).toEqual([...m.stack, 'complete'].sort());
      let bytes = 0;
      for (const part of Object.values(m.parts)) {
        bytes += statSync(`public/${part.src}`).size;
        const [x0, y0, x1, y1] = part.bounds;
        expect(x0).toBeGreaterThan(0); expect(y0).toBeGreaterThan(0);
        expect(x1).toBeLessThan(512); expect(y1).toBeLessThan(512);
        expect(x1).toBeGreaterThan(x0); expect(y1).toBeGreaterThan(y0);
        expect(part.center[0]).toBeCloseTo((x0 + x1) / 1024, 3);
        expect(part.center[1]).toBeCloseTo((y0 + y1) / 1024, 3);
        // VP8X stores the actual uncropped canvas size, independently of the JSON.
        const file = readFileSync(`public/${part.src}`);
        expect(file.toString('ascii', 0, 4)).toBe('RIFF');
        expect(file.toString('ascii', 12, 16)).toBe('VP8X');
        expect(file.readUIntLE(24, 3) + 1).toBe(512);
        expect(file.readUIntLE(27, 3) + 1).toBe(512);
      }
      expect(bytes).toBeLessThan(64 * 1024);
    });

    test(`${id} equips real geometry for each recipe material within the model budget`, async () => {
      const path = `public/assets/models/wpn_${id}.glb`;
      expect(statSync(path).size).toBeLessThan(24 * 1024);
      const file = readFileSync(path), buffer = new ArrayBuffer(file.length);
      new Uint8Array(buffer).set(file);
      const model = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, '');
      const colors: Color[] = [];
      let vertices = 0;
      model.scene.traverse(o => {
        if (!(o instanceof Mesh)) return;
        const attribute = o.geometry.getAttribute('color');
        vertices += o.geometry.getAttribute('position').count;
        if (attribute) for (let i = 0; i < attribute.count; i++) colors.push(new Color().setRGB(attribute.getX(i), attribute.getY(i), attribute.getZ(i)));
      });
      expect(vertices).toBeLessThan(6000);
      for (const hex of ingredientColors[id]) {
        const wanted = new Color(hex);
        expect(colors.some(c => Math.hypot(c.r-wanted.r, c.g-wanted.g, c.b-wanted.b) < .012)).toBe(true);
      }
      if (id.startsWith('spore')) for (const hex of ['#ffd35a', '#6a4a3a', '#6a3a4a']) {
        const unwanted = new Color(hex);
        expect(colors.some(c => Math.hypot(c.r-unwanted.r, c.g-unwanted.g, c.b-unwanted.b) < .012)).toBe(false);
      }
    });
  }

  test('ingredient-led shapes retain the actual copper/spore recipes', () => {
    expect(GEAR.coppersword.recipe).toEqual({ copper: 12, bark: 9 });
    expect(GEAR.copperhammer.recipe).toEqual({ copper: 15, pine: 9 });
    expect(GEAR.sporewhip.recipe).toEqual({ cap: 18, fang: 4 });
    expect(GEAR.sporewand.recipe).toEqual({ cap: 15, fang: 6 });
  });
});
