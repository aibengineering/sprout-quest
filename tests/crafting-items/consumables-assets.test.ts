import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { POTION_RECIPES } from '../../src/data';
import { MEALS, MEAL_ORDER } from '../../src/kitchen';

const ids = [...POTION_RECIPES.map((p) => p.id), ...MEAL_ORDER];
const recipes = Object.fromEntries([...POTION_RECIPES, ...Object.values(MEALS)].map((item) => [item.id, item.recipe]));
const asset = (name: string) => `public/assets/crafting/${name}`;
const manifest = (id: string) => JSON.parse(readFileSync(asset(`${id}.json`), 'utf8'));

// WEBP dimensions from the extended header emitted by Blender, including the transparent canvas.
function dimensions(path: string): [number, number] {
  const bytes = readFileSync(path);
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
  expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
  expect(bytes.toString('ascii', 12, 16)).toBe('VP8X');
  return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
}

describe('potion and Granny meal ingredient art', () => {
  for (const id of ids) {
    test(`${id}: every real ingredient has a visual destination and no extra ingredient`, () => {
      const data = manifest(id);
      expect(Object.keys(data.ingredientRoles).sort()).toEqual(Object.keys(recipes[id]).sort());
      for (const destinations of Object.values(data.ingredientRoles) as string[][]) {
        expect(destinations.length).toBeGreaterThan(0);
        for (const part of destinations) expect(data.stack).toContain(part);
      }
      expect(new Set(data.stack).size).toBe(data.stack.length);
    });

    test(`${id}: layers share their complete image's 512px registration and fit safely`, () => {
      const data = manifest(id);
      expect(data.size).toEqual([512, 512]);
      for (const key of [...data.stack, 'complete']) {
        const part = data.parts[key];
        expect(part).toBeDefined();
        expect(existsSync(`public/${part.src}`)).toBe(true);
        expect(dimensions(`public/${part.src}`)).toEqual([512, 512]);
        const [x0, y0, x1, y1] = part.bounds;
        expect(x0).toBeGreaterThanOrEqual(6);
        expect(y0).toBeGreaterThanOrEqual(6);
        expect(x1).toBeLessThanOrEqual(506);
        expect(y1).toBeLessThanOrEqual(506);
        expect(x1).toBeGreaterThan(x0);
        expect(y1).toBeGreaterThan(y0);
        expect(part.center[0]).toBeCloseTo((x0 + x1) / 1024, 3);
        expect(part.center[1]).toBeCloseTo((y0 + y1) / 1024, 3);
      }
      expect(dimensions(`public/assets/icons/${data.iconId}.webp`)).toEqual([128, 128]);
    });

    test(`${id}: full on-demand layer set stays below 160KiB`, () => {
      const data = manifest(id);
      const bytes = Object.values(data.parts).reduce((total: number, part: any) => total + statSync(`public/${part.src}`).size, 0);
      expect(bytes).toBeLessThan(160 * 1024);
    });
  }

  test('all seven layer sets together fit below 768KiB', () => {
    const bytes = ids.reduce((total, id) => total + Object.values(manifest(id).parts).reduce((n: number, part: any) => n + statSync(`public/${part.src}`).size, 0), 0);
    expect(bytes).toBeLessThan(768 * 1024);
  });

  test('pine has a fuel role, separate from the edible caps and finished stew', () => {
    const data = manifest('stew');
    expect(data.ingredientRoles.pine).toEqual(['pine-fuel']);
    expect(data.ingredientRoles.cap).toEqual(['cap-broth', 'shroom-caps']);
    expect(data.props).toContain('pot');
  });
});
