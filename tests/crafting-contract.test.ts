import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { craftFlights, craftPresentation } from '../src/crafting';
import { CRAFT_PRESENTATIONS } from '../src/crafting/catalog';
import { GEAR, TOOLS, POTION_RECIPES, MATS, type MatId } from '../src/data';
import { MEALS } from '../src/kitchen';

const items = [...Object.values(GEAR).filter((g) => g.recipe), ...TOOLS, ...POTION_RECIPES, ...Object.values(MEALS)];

describe('registered crafting contributions', () => {
  test('every item file is included by the integration catalog', () => {
    const files = [...new Bun.Glob('*.ts').scanSync('src/crafting/items')].map((p) => p.slice(0, -3)).sort();
    expect(Object.keys(CRAFT_PRESENTATIONS).sort()).toEqual(files);
  });

  test('every craftable item has a presentation and stays within the phone art budget', () => {
    expect(items).toHaveLength(50);
    expect(Object.keys(CRAFT_PRESENTATIONS).sort()).toEqual(items.map(i => i.id).sort());
    let total = 0;
    for (const p of Object.values(CRAFT_PRESENTATIONS)) {
      const bytes = [...new Set([...p.layers.map(l => l.src), p.complete])].reduce((n, src) => n + statSync(`public/${src}`).size, 0);
      expect(bytes).toBeLessThan(180 * 1024);
      total += bytes;
    }
    expect(total).toBeLessThan(4 * 1024 * 1024);
    for (const id of ['tea', 'stew']) {
      const p = CRAFT_PRESENTATIONS[id];
      expect(p.layers.find(l => l.id === 'steam')?.showAt).toBe(p.phases.find(f => f.stage === 'simmer')!.at);
    }
    expect(CRAFT_PRESENTATIONS.stew.layers.find(l => l.id === 'pine-fuel')?.finished).toBe(false);
  });

  test('the gathering atlas uses each contributed grip frame', () => {
    const atlas = JSON.parse(readFileSync('public/assets/atlas.json', 'utf8'));
    for (const t of TOOLS) {
      const contributed = JSON.parse(readFileSync(`public/assets/gather/${t.id}.json`, 'utf8'));
      const [page, , , w, h, ax, ay, ppu] = atlas.frames[contributed.name];
      expect(existsSync(`public/assets/${atlas.pages[page]}`)).toBe(true);
      expect(ppu).toBe(contributed.ppu);
      // Trimmed frame keeps the grip relative to the original full canvas.
      expect(w).toBeLessThanOrEqual(contributed.size[0]);
      expect(h).toBeLessThanOrEqual(contributed.size[1]);
      expect(ax).toBeGreaterThan(0); expect(ay).toBeGreaterThan(0);
    }
  });

  for (const [id, presentation] of Object.entries(CRAFT_PRESENTATIONS)) {
    test(`${id}: actual recipe, contacts, registered art and reveal agree`, () => {
      const item = items.find((i) => i.id === id)!;
      expect(item).toBeDefined();
      const recipe = item.recipe!;
      expect(craftPresentation(item)).toBe(presentation);
      expect(presentation.id).toBe(id);
      const layers = presentation.layers.map((p) => p.id);
      expect(new Set(layers).size).toBe(layers.length);
      expect(presentation.phases[0].at).toBe(0);
      expect(presentation.phases.map((p) => p.at)).toEqual(presentation.phases.map((p) => p.at).sort((a, b) => a - b));
      const reveal = presentation.phases.find((p) => p.stage === 'reveal')!;
      expect(reveal).toBeDefined();
      expect(reveal.at).toBeLessThan(presentation.duration);
      const manifest = JSON.parse(readFileSync(`public/assets/crafting/${id}.json`, 'utf8'));
      expect(manifest.size).toEqual([512, 512]);
      for (const src of [...presentation.layers.map((p) => p.src), presentation.complete]) {
        expect(src.startsWith(`assets/crafting/${id}-`)).toBe(true);
        expect(existsSync(`public/${src}`)).toBe(true);
        const art = Object.values(manifest.parts).find((p: any) => p.src === src) as any;
        expect(art).toBeDefined();
        expect(art.bounds.every((n: number) => n >= 0 && n <= 512)).toBe(true);
      }
      for (const target of presentation.targets) {
        expect(MATS[target.material]).toBeDefined();
        expect(recipe[target.material]).toBeGreaterThan(0);
        expect(layers).toContain(target.part);
        expect(target.at).toBeGreaterThanOrEqual(0);
        expect(target.duration).toBeGreaterThan(0);
        expect(target.at + target.duration).toBeLessThanOrEqual(reveal.at);
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(1);
        expect(target.y).toBeGreaterThan(0);
        expect(target.y).toBeLessThan(1);
        const layer = presentation.layers.find(l => l.id === target.part)!;
        const art = Object.values(manifest.parts).find((p: any) => p.src === layer.src) as any;
        const [x0, y0, x1, y1] = art.bounds;
        expect(target.x * 512).toBeGreaterThanOrEqual(x0);
        expect(target.x * 512).toBeLessThanOrEqual(x1);
        expect(target.y * 512).toBeGreaterThanOrEqual(y0);
        expect(target.y * 512).toBeLessThanOrEqual(y1);
      }
      for (const material of Object.keys(recipe) as MatId[]) {
        expect(presentation.roles[material]).toBeTruthy();
        for (const quantity of [1, recipe[material]!, recipe[material]! + 7]) {
          const flights = craftFlights(presentation, { ...recipe, [material]: quantity });
          expect(flights.filter((f) => f.material === material).reduce((sum, f) => sum + f.count, 0)).toBe(quantity);
          expect(flights.every((f) => f.count > 0)).toBe(true);
        }
      }
    });
  }
});
