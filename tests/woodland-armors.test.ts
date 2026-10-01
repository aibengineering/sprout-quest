import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { GEAR } from '../src/data';
import barkvest from '../src/crafting/items/barkvest';
import shroomhood from '../src/crafting/items/shroomhood';
import batcloak from '../src/crafting/items/batcloak';
import glimmershawl from '../src/crafting/items/glimmershawl';

const ids = ['barkvest', 'shroomhood', 'batcloak', 'glimmershawl'] as const;

function glb(id: string) {
  const b = readFileSync(`public/assets/models/hero_${id}.glb`);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  return JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
}

function webpSize(path: string) {
  const b = readFileSync(path);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  if (b.toString('ascii', 12, 16) === 'VP8L') {
    expect(b[20]).toBe(0x2f);
    const bits = b.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  expect(b.toString('ascii', 12, 16)).toBe('VP8X');
  return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
}

describe('ingredient-led woodland armor assets', () => {
  test('presentations cover actual ingredients, registered layers and completed contacts before reveal', () => {
    for (const p of [barkvest, shroomhood, batcloak, glimmershawl]) {
      const recipe = GEAR[p.id].recipe!;
      expect(Object.keys(p.roles).sort()).toEqual(Object.keys(recipe).sort());
      const layers = new Set(p.layers.map(l => l.id));
      expect(layers.size).toBe(p.layers.length);
      expect(p.phases[0].at).toBe(0);
      const reveal = p.phases.find(phase => phase.stage === 'reveal')!;
      expect(reveal).toBeDefined();
      expect(p.duration - reveal.at).toBeGreaterThanOrEqual(650);
      for (const material of Object.keys(recipe)) {
        const targets = p.targets.filter(t => t.material === material);
        expect(targets.length).toBeGreaterThan(0);
        expect(targets.length).toBeLessThanOrEqual(recipe[material as keyof typeof recipe]!);
      }
      for (const t of p.targets) {
        expect(layers.has(t.part)).toBe(true);
        expect(t.at + t.duration).toBeLessThan(reveal.at);
        expect(t.x).toBeGreaterThan(0); expect(t.x).toBeLessThan(1);
        expect(t.y).toBeGreaterThan(0); expect(t.y).toBeLessThan(1);
      }
      for (const l of p.layers) expect(statSync(`public/${l.src}`).size).toBeGreaterThan(0);
    }
  });
  test('production costs and stats remain unchanged', () => {
    expect(ids.map(id => ({ id, recipe: GEAR[id].recipe, def: GEAR[id].def, hp: GEAR[id].hp,
      spd: GEAR[id].spd, regen: GEAR[id].regen }))).toEqual([
      { id: 'barkvest', recipe: { bark: 36, stone: 18 }, def: 4, hp: 6, spd: undefined, regen: undefined },
      { id: 'shroomhood', recipe: { cap: 36, fang: 8 }, def: 6, hp: 12, spd: undefined, regen: undefined },
      { id: 'batcloak', recipe: { wing: 24, fang: 12 }, def: 10, hp: 10, spd: 12, regen: undefined },
      { id: 'glimmershawl', recipe: { glimmer: 48, core: 1 }, def: 15, hp: 22, spd: undefined, regen: 1 },
    ]);
  });

  for (const id of ids) {
    test(`${id}: full registered layers and final inventory icon`, () => {
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8'));
      expect(manifest.size).toEqual([512, 512]);
      expect(manifest.stack).toHaveLength(5);
      let bytes = 0;
      for (const part of [...manifest.stack, 'complete']) {
        const entry = manifest.parts[part];
        expect(webpSize(`public/${entry.src}`)).toEqual([512, 512]);
        const [x0, y0, x1, y1] = entry.bounds;
        expect(x0).toBeGreaterThan(0);
        expect(y0).toBeGreaterThan(0);
        expect(x1).toBeLessThan(512);
        expect(y1).toBeLessThan(512);
        expect(x1).toBeGreaterThan(x0);
        expect(y1).toBeGreaterThan(y0);
        expect(entry.center[0]).toBeCloseTo((x0 + x1) / 1024, 3);
        expect(entry.center[1]).toBeCloseTo((y0 + y1) / 1024, 3);
        bytes += statSync(`public/${entry.src}`).size;
      }
      // The Fluffy Vest pilot's seven layers total 159 kB; these six stay below that.
      expect(bytes).toBeLessThan(160 * 1024);
      expect(webpSize(`public/assets/icons/${id}.webp`)).toEqual([128, 128]);
    });

  }
});
