import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { GEAR } from '../src/data';
import magmamail from '../src/crafting/items/magmamail';
import dragonmail from '../src/crafting/items/dragonmail';

const presentations = { magmamail, dragonmail };

const expected = {
  magmamail: { recipe: { ember: 42, horn: 8, crystal: 12, iron: 12 }, def: 24, hp: 34,
    parts: ['iron-shell', 'ember-seams', 'left-horns', 'right-horns', 'crystal-clasps'] },
  dragonmail: { recipe: { scale: 4, ember: 24, crystal: 12, iron: 18 }, def: 30, hp: 50,
    parts: ['iron-shell', 'back-scales', 'front-scales', 'left-mantle', 'right-mantle', 'ember-seams', 'crystal-clasps'] },
};

describe('ingredient-built late armor assets', () => {
  for (const [id, item] of Object.entries(expected)) {
    test(`${id} gives every recipe material an automatic, finite assembly destination`, () => {
      const spec = presentations[id as keyof typeof presentations];
      const ids = spec.layers.map((layer) => layer.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(Object.keys(spec.roles).sort()).toEqual(Object.keys(item.recipe).sort());
      expect([...new Set(spec.targets.map((target) => String(target.material)))].sort()).toEqual(Object.keys(item.recipe).sort());
      const reveal = spec.phases.find((phase) => phase.stage === 'reveal')!;
      expect(spec.phases[0].at).toBe(0);
      for (let i = 1; i < spec.phases.length; i++) expect(spec.phases[i].at).toBeGreaterThan(spec.phases[i - 1].at);
      for (const target of spec.targets) {
        expect(ids).toContain(target.part);
        expect(target.at).toBeGreaterThanOrEqual(0);
        expect(target.duration).toBeGreaterThan(0);
        expect(target.at + target.duration).toBeLessThan(reveal.at);
      }
      expect(spec.duration - reveal.at).toBeGreaterThanOrEqual(600);
      expect(spec.duration).toBeLessThanOrEqual(4500);
      // All crystals set their chunky clasps in one assembly step, instead of six
      // separate clipped specks; the recipe quantity is allocated to that one contact.
      expect(spec.targets.filter((target) => target.material === 'crystal').map((target) => target.part))
        .toEqual(['crystal-clasps']);
      expect(spec.layers.some((layer) => 'clip' in layer)).toBe(false);
    });
    test(`${id} preserves the recipe and combat balance`, () => {
      expect(GEAR[id].recipe).toEqual(item.recipe);
      expect(GEAR[id].def).toBe(item.def);
      expect(GEAR[id].hp).toBe(item.hp);
    });

  }
});
