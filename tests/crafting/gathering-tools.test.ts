import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { TOOLS } from '../../src/data';
import axe1 from '../../src/crafting/items/axe1';
import axe2 from '../../src/crafting/items/axe2';
import pick1 from '../../src/crafting/items/pick1';
import pick2 from '../../src/crafting/items/pick2';
import pick3 from '../../src/crafting/items/pick3';
import pick4 from '../../src/crafting/items/pick4';
import type { CraftPresentation } from '../../src/crafting/types';
const presentations: CraftPresentation[] = [axe1, axe2, pick1, pick2, pick3, pick4];

type ArtManifest = { size: number[]; stack: string[]; existing: string[]; parts: Record<string, { src: string; center: number[]; bounds: number[] }> };
const ids = ['axe1', 'axe2', 'pick1', 'pick2', 'pick3', 'pick4'];
const recipes = [{ goo: 2, fluff: 1 }, { copper: 3, bark: 4 }, { goo: 2, fluff: 2 }, { copper: 4, bark: 3 }, { iron: 4, pine: 3 }, { crystal: 4, iron: 3 }];
const dimensions = (path: string): [number, number] => {
  const b = readFileSync(path);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  const codec = b.toString('ascii', 12, 16);
  if (codec === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  expect(codec).toBe('VP8X');
  return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
};

describe('recipe-led gathering tool art', () => {
  test('assembly definitions cover every real ingredient with registered destinations and ordered contacts', () => {
    for (const p of presentations) {
      const tool = TOOLS.find((t) => t.id === p.id)!;
      const art = JSON.parse(readFileSync(`public/assets/crafting/${p.id}.json`, 'utf8')) as ArtManifest;
      expect(p.layers.map((l) => l.id)).toEqual(art.stack);
      expect(Object.keys(p.roles).sort()).toEqual(Object.keys(tool.recipe).sort());
      for (const [material, count] of Object.entries(tool.recipe)) {
        const targets = p.targets.filter((t) => t.material === material);
        expect(targets.length).toBeGreaterThan(0);
        // Every declared destination receives a nonzero bundle, even for the
        // Stone Axe's single fluff. Inherited layers have no invented ingredient.
        expect(targets.length).toBeLessThanOrEqual(count!);
      }
      for (const t of p.targets) {
        expect(t.at).toBeGreaterThanOrEqual(0); expect(t.duration).toBeGreaterThan(0);
        expect(p.layers.some((l) => l.id === t.part)).toBe(true);
        const [x0, y0, x1, y1] = art.parts[t.part].bounds;
        expect(t.x * 512).toBeGreaterThanOrEqual(x0); expect(t.x * 512).toBeLessThanOrEqual(x1);
        expect(t.y * 512).toBeGreaterThanOrEqual(y0); expect(t.y * 512).toBeLessThanOrEqual(y1);
        expect(tool.recipe[t.material]).toBeGreaterThan(0);
      }
      for (const layer of p.layers) {
        expect(layer.src).toBe(art.parts[layer.id].src);
        if (!art.existing.includes(layer.id)) expect(p.targets.some((t) => t.part === layer.id)).toBe(true);
      }
      expect(p.phases[0].at).toBe(0);
      expect(p.phases.map((f) => f.at)).toEqual(p.phases.map((f) => f.at).sort((a, b) => a - b));
      const reveal = p.phases.find((f) => f.stage === 'reveal')!;
      expect(reveal).toBeDefined();
      expect(reveal.at).toBeGreaterThan(Math.max(...p.targets.map((t) => t.at + t.duration)));
      expect(p.duration).toBeGreaterThanOrEqual(reveal.at + 600);
    }
  });
  test('all six original recipe costs stay intact', () => {
    // (Later tools, like the Iron and Crystal Axes, come after these; the originals keep their order and recipes.)
    expect(ids.filter((id) => !TOOLS.some((t) => t.id === id))).toEqual([]);
    expect(ids.map((id) => TOOLS.find((t) => t.id === id)!.recipe)).toEqual(recipes);
  });
  test('every assembly layer stays on its registered 512-square canvas', () => {
    for (const id of ids) {
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8')) as ArtManifest;
      expect(manifest.size).toEqual([512, 512]);
      expect(new Set(manifest.stack).size).toBe(manifest.stack.length);
      for (const part of [...manifest.stack, 'complete']) {
        const layer = manifest.parts[part];
        expect(layer).toBeDefined();
        expect(dimensions(`public/${layer.src}`)).toEqual([512, 512]);
        const [x0, y0, x1, y1] = layer.bounds;
        expect(x0).toBeGreaterThan(0); expect(y0).toBeGreaterThan(0);
        expect(x1).toBeLessThan(512); expect(y1).toBeLessThan(512);
        expect(layer.center[0]).toBeCloseTo((x0 + x1) / 1024, 3);
        expect(layer.center[1]).toBeCloseTo((y0 + y1) / 1024, 3);
      }
      expect(dimensions(`public/assets/icons/${id}.webp`)).toEqual([128, 128]);
    }
  });
  test('stone recipes show pre-existing tools; crystal uses iron, without an unlisted wood shaft', () => {
    for (const id of ids) {
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8')) as ArtManifest;
      expect(manifest.existing).toEqual(id.endsWith('1') ? ['existing-tool'] : []);
      if (id.endsWith('1')) expect(manifest.stack).toEqual(['existing-tool', 'goo-joint', 'fluff-wrap']);
      if (id === 'pick4') expect(manifest.stack).toEqual(['iron-haft', 'crystal-head', 'iron-socket']);
    }
  });
  test('swing frames retain the grip canvas and head contact points used by the game', () => {
    for (const id of ids) {
      const f = JSON.parse(readFileSync(`public/assets/gather/${id}.json`, 'utf8'));
      expect(f.name).toBe(`gather/${id}`);
      expect(f.size).toEqual([220, 260]);
      expect(dimensions(`public/${f.src}`)).toEqual([220, 260]);
      expect(f.ppu).toBe(240); expect(f.ax).toBeCloseTo(110, 3); expect(f.ay).toBeCloseTo(239.2, 3);
      expect(f.grip).toEqual([0, 0, 0]);
      expect(f.tip).toEqual(id.startsWith('axe') ? [-.29, 0, .65] : [-.4, 0, .57]);
      expect(existsSync(`art/gear/${id}.py`)).toBe(true);
    }
  });
  test('new art fits a 300 KiB total family budget and 40 KiB per layer budget', () => {
    let total = 0;
    for (const id of ids) {
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8')) as ArtManifest;
      for (const part of [...manifest.stack, 'complete']) {
        const bytes = statSync(`public/${manifest.parts[part].src}`).size;
        expect(bytes).toBeLessThan(40 * 1024);
        total += bytes;
      }
      total += statSync(`public/assets/gather/${id}.webp`).size + statSync(`public/assets/icons/${id}.webp`).size;
    }
    expect(total).toBeLessThan(300 * 1024);
  });
});
