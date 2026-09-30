import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { GEAR } from '../src/data';
import clover from '../src/crafting/items/clovercharm';
import tooth from '../src/crafting/items/toothcharm';
import heart from '../src/crafting/items/crystalheart';
import ring from '../src/crafting/items/impring';

const recipes = {
  clovercharm: { clover: 3, goo: 3 },
  toothcharm: { fang: 4, cap: 2 },
  crystalheart: { glimmer: 4, wing: 3, clover: 1 },
  impring: { horn: 4, ember: 3 },
};
type Manifest = { size: number[]; stack: string[]; parts: Record<string, { src: string; center: number[]; bounds: number[] }> };

// Read actual canvas dimensions and alpha flags from either supported WebP header.
function webp(path: string) {
  const b = readFileSync(path);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  if (b.toString('ascii', 12, 16) === 'VP8L') {
    expect(b[20]).toBe(0x2f);
    const bits = b.readUInt32LE(21);
    expect((bits >>> 28) & 1).toBe(1);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  expect(b.toString('ascii', 12, 16)).toBe('VP8X');
  expect(b[20] & 0x10).toBe(0x10);
  return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
}

describe('ingredient-led charm assets', () => {
  test('timeline covers real ingredients, registered destinations and every rendered component', () => {
    for (const p of [clover, tooth, heart, ring]) {
      const recipe = GEAR[p.id].recipe!;
      const m = JSON.parse(readFileSync(`public/assets/crafting/${p.id}.json`, 'utf8')) as Manifest;
      expect(p.layers.map(layer => layer.id)).toEqual(m.stack);
      expect(p.complete).toBe(m.parts.complete.src);
      expect(Object.keys(p.roles).sort()).toEqual(Object.keys(recipe).sort());
      expect([...new Set(p.targets.map(t => String(t.material)))].sort()).toEqual(Object.keys(recipe).sort());
      expect([...new Set(p.targets.map(t => t.part))].sort()).toEqual([...m.stack].sort());
      const reveal = p.phases.find(phase => phase.stage === 'reveal')!;
      expect(reveal).toBeDefined();
      expect(p.phases[0].at).toBe(0);
      expect(reveal.at).toBeGreaterThan(Math.max(...p.targets.map(t => t.at+t.duration)));
      expect(p.duration-reveal.at).toBeGreaterThanOrEqual(650);
      for (const layer of p.layers) expect(layer.src).toBe(m.parts[layer.id].src);
      for (const t of p.targets) {
        const bounds = m.parts[t.part].bounds;
        expect(t.x*512).toBeGreaterThanOrEqual(bounds[0]);
        expect(t.x*512).toBeLessThanOrEqual(bounds[2]);
        expect(t.y*512).toBeGreaterThanOrEqual(bounds[1]);
        expect(t.y*512).toBeLessThanOrEqual(bounds[3]);
      }
      for (const [mat, cost] of Object.entries(recipe)) {
        const targets = p.targets.filter(t => t.material === mat);
        expect(targets.length).toBeLessThanOrEqual(cost!);
      }
    }
  });
  test('covers exactly the four existing craftable charms and preserves their recipes', () => {
    expect(Object.values(GEAR).filter((g) => g.slot === 'charm' && g.recipe).map((g) => g.id).sort()).toEqual(Object.keys(recipes).sort());
    for (const [id, recipe] of Object.entries(recipes)) expect(GEAR[id].recipe).toEqual(recipe);
    expect(GEAR.crystalheart.recipe?.crystal).toBeUndefined();
  });

  test('registered transparent layers retain the shared 512-square canvas and padded bounds', () => {
    let total = 0;
    for (const id of Object.keys(recipes)) {
      const m = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8')) as Manifest;
      expect(m.size).toEqual([512, 512]);
      expect(new Set(m.stack).size).toBe(m.stack.length);
      expect(Object.keys(m.parts).sort()).toEqual([...m.stack, 'complete'].sort());
      let bytes = 0;
      for (const [name, part] of Object.entries(m.parts)) {
        expect(part.src).toBe(`assets/crafting/${id}-${name}.webp`);
        expect(webp(`public/${part.src}`)).toEqual([512, 512]);
        const [x0, y0, x1, y1] = part.bounds;
        expect(x0).toBeGreaterThan(8);
        expect(y0).toBeGreaterThan(8);
        expect(x1).toBeLessThan(504);
        expect(y1).toBeLessThan(504);
        expect(x1).toBeGreaterThan(x0);
        expect(y1).toBeGreaterThan(y0);
        expect(part.center[0]).toBeCloseTo((x0+x1)/1024, 3);
        expect(part.center[1]).toBeCloseTo((y0+y1)/1024, 3);
        bytes += statSync(`public/${part.src}`).size;
      }
      expect(webp(`public/assets/icons/${id}.webp`)).toEqual([128, 128]);
      bytes += statSync(`public/assets/icons/${id}.webp`).size;
      expect(bytes).toBeLessThan(350_000);
      total += bytes;
    }
    expect(total).toBeLessThan(1_000_000);
  });
});
