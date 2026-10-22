import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { NODES } from '../src/data';
import { RESOURCE_FRAMES, TREE_PROFILES } from '../src/resourceVectors';

test('every resource has vector map, depleted and close-up frames, excluded by the atlas packer', () => {
  const names = new Set(RESOURCE_FRAMES);
  const atlas = JSON.parse(readFileSync('public/assets/atlas.json', 'utf8'));
  const pattern = readFileSync('art/pack.py', 'utf8').match(/VECTOR_RESOURCE = re.compile\(r'([^']+)'\)/)![1];
  const excluded = new RegExp(pattern);
  for (const kind of Object.keys(NODES)) {
    const tree = kind in TREE_PROFILES;
    for (const name of [`env/${kind}_node`, `env/${kind}_${tree ? 'stump' : 'rubble'}`,
      ...(tree ? ['whole', 'top', 'stump'].map(part => `gather/${kind}_${part}`) : [`gather/${kind}`])]) {
      expect(names.has(name)).toBe(true);
    }
  }
  for (const name of names) {
    expect(excluded.test(name)).toBe(true);
    expect(atlas.frames[name]).toBeUndefined();
  }
  // Tools and unrelated scenery must remain sprites, not be caught by an overbroad filter.
  for (const name of Object.keys(atlas.frames)) expect(excluded.test(name)).toBe(false);
  expect(excluded.test('gather/pick1')).toBe(false);
  expect(excluded.test('env/grass_cave')).toBe(false);
});
