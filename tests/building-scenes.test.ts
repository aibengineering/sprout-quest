import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { buildPresentation, craftFlights } from '../src/crafting';
import { BUILD_PRESENTATIONS } from '../src/crafting/building-catalog';
import { MATS, PROJECTS, type MatId, type ProjectId } from '../src/data';

// Every project level that costs something rises from its materials (a Tent is already standing).
const levels = (Object.keys(PROJECTS) as ProjectId[]).flatMap((project) =>
  PROJECTS[project].levels.map((l, i) => ({ project, level: i + 1, id: `${project}${i + 1}`, ...l })).filter((l) => Object.keys(l.cost).length));

describe('village buildings rise from their materials', () => {
  test('every scene file is in the catalog, and every level with a cost has a scene', () => {
    const files = [...new Bun.Glob('*.ts').scanSync('src/crafting/buildings')].map((p) => p.slice(0, -3)).sort();
    expect(Object.keys(BUILD_PRESENTATIONS).sort()).toEqual(files);
    expect(levels.length).toBeGreaterThanOrEqual(16);
    for (const l of levels) expect(buildPresentation(l.project, l.level), l.id).toBe(BUILD_PRESENTATIONS[l.id]);
    // A cost change without a place for the new material falls back to the old toast rather than miscounting.
    expect(buildPresentation('home', 1)).toBeUndefined();
  });

  test('the new sawmill levels and the manor have building art for the map and the menus', () => {
    const atlas = JSON.parse(readFileSync('public/assets/atlas.json', 'utf8'));
    for (const l of levels) {
      const art = l.project === 'forge' && l.level === 1 ? 'forge' : l.id;
      expect(atlas.frames[`env/${art}`], `env/${art}`).toBeDefined();
      expect(existsSync(`public/assets/icons/b_${art}.webp`), `b_${art}`).toBe(true);
    }
  });

  test('stays within the phone art budget', () => {
    let total = 0;
    for (const p of Object.values(BUILD_PRESENTATIONS)) {
      const bytes = [...new Set([...p.layers.map((l) => l.src), p.complete])].reduce((n, src) => n + statSync(`public/${src}`).size, 0);
      expect(bytes, p.id).toBeLessThan(120 * 1024);
      total += bytes;
    }
    expect(total).toBeLessThan(1.5 * 1024 * 1024);
  });

  for (const l of levels) {
    test(`${l.id} (${l.name}): every material has a role and lands on a visible layer, then the reveal`, () => {
      const p = BUILD_PRESENTATIONS[l.id];
      expect(p, `${l.id} has no scene`).toBeDefined();
      expect(p.id).toBe(l.id);
      expect(p.scene).toBe('building');
      const layers = p.layers.map((x) => x.id);
      expect(new Set(layers).size).toBe(layers.length);
      expect(p.phases[0].at).toBe(0);
      expect(p.phases.map((x) => x.at)).toEqual(p.phases.map((x) => x.at).sort((a, b) => a - b));
      const reveal = p.phases.find((x) => x.stage === 'reveal')!;
      expect(reveal).toBeDefined();
      expect(p.phases[p.phases.length - 1]).toBe(reveal);
      expect(reveal.at).toBeLessThan(p.duration);
      const manifest = JSON.parse(readFileSync(`public/assets/buildings/${l.id}.json`, 'utf8'));
      expect(manifest.size).toEqual([640, 480]);
      // Layers stack in build order, exactly as rendered.
      expect(manifest.stack).toEqual(layers);
      for (const src of [...p.layers.map((x) => x.src), p.complete]) {
        expect(src.startsWith(`assets/buildings/${l.id}-`)).toBe(true);
        expect(existsSync(`public/${src}`)).toBe(true);
        const art = Object.values(manifest.parts).find((x: any) => x.src === src) as any;
        expect(art).toBeDefined();
      }
      // What already stood before an upgrade (or waited on the site) shows from the start; everything else arrives.
      for (const layer of p.layers) {
        if (!p.targets.some((t) => t.part === layer.id)) expect(['base', 'site']).toContain(layer.id);
      }
      for (const t of p.targets) {
        expect(MATS[t.material]).toBeDefined();
        expect(l.cost[t.material]).toBeGreaterThan(0);
        expect(layers).toContain(t.part);
        expect(t.at).toBeGreaterThanOrEqual(0);
        expect(t.duration).toBeGreaterThan(0);
        expect(t.at + t.duration).toBeLessThanOrEqual(reveal.at);
        const [x0, y0, x1, y1] = (Object.values(manifest.parts).find((x: any) => x.src === p.layers.find((y) => y.id === t.part)!.src) as any).bounds;
        expect(t.x * 640).toBeGreaterThanOrEqual(x0);
        expect(t.x * 640).toBeLessThanOrEqual(x1);
        expect(t.y * 480).toBeGreaterThanOrEqual(y0);
        expect(t.y * 480).toBeLessThanOrEqual(y1);
      }
      for (const material of Object.keys(l.cost) as MatId[]) {
        expect(p.roles[material], `${l.id}: no role for ${material}`).toBeTruthy();
        for (const quantity of [1, l.cost[material]!, l.cost[material]! + 7]) {
          const flights = craftFlights(p, { ...l.cost, [material]: quantity });
          expect(flights.filter((f) => f.material === material).reduce((sum, f) => sum + f.count, 0)).toBe(quantity);
        }
      }
    });
  }
});
