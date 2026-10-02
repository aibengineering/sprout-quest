import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { sceneModel } from './sceneModel';
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

  test('every craftable item has a presentation, and their models are small', () => {
    expect(items).toHaveLength(54);
    expect(Object.keys(CRAFT_PRESENTATIONS).sort()).toEqual(items.map(i => i.id).sort());
    let total = 0;
    for (const p of Object.values(CRAFT_PRESENTATIONS)) {
      const { bytes } = sceneModel(p.model);
      expect(bytes, p.id).toBeLessThan(140 * 1024);
      total += bytes;
    }
    // The 52 scenes' WebP layers were 4.0 MB.
    expect(total).toBeLessThan(2 * 1024 * 1024);
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
    test(`${id}: actual recipe, contacts, model layers and reveal agree`, () => {
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
      // The model has exactly the scene's layers, each with something to see, carrying the toon look.
      expect(presentation.model).toBe(`assets/crafting3d/${id}.glb`);
      const model = sceneModel(presentation.model);
      expect(Object.keys(model.layers).sort()).toEqual([...layers].sort());
      for (const layer of layers) expect(model.layers[layer], `${id}: ${layer}`).toBeGreaterThan(0);
      expect(model.compressed).toBe(true);
      expect(model.toon).toBe(true);
      expect(model.textures).toBe(0);
      for (const target of presentation.targets) {
        expect(MATS[target.material]).toBeDefined();
        expect(recipe[target.material]).toBeGreaterThan(0);
        expect(layers).toContain(target.part);
        expect(target.at).toBeGreaterThanOrEqual(0);
        expect(target.duration).toBeGreaterThan(0);
        expect(target.at + target.duration).toBeLessThanOrEqual(reveal.at);
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
