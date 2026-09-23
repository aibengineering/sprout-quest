import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { GEAR, MATS, MONSTERS } from '../src/data';
import { MOVESETS } from '../src/weapons';

const atlas = JSON.parse(readFileSync('public/assets/atlas.json', 'utf8')) as { frames: Record<string, number[]> };

describe('rendered assets', () => {
  test('every weapon has a moveset, a sprite and an icon', () => {
    for (const g of Object.values(GEAR).filter((g) => g.slot === 'weapon')) {
      expect(MOVESETS[g.style!]).toBeDefined();
      expect(atlas.frames[`wpn/${g.id}`]).toBeDefined();
      expect(existsSync(`public/assets/icons/${g.id}.webp`)).toBe(true);
    }
  });

  test('every armor has hero frames in all 5 directions', () => {
    for (const g of Object.values(GEAR).filter((g) => g.slot === 'armor')) {
      for (let d = 0; d < 5; d++) for (let f = 0; f < 5; f++) expect(atlas.frames[`hero/${g.id}/${d}/${f}`]).toBeDefined();
    }
  });

  test('every monster has an idle loop (and a golden one unless it is the boss)', () => {
    for (const [kind, m] of Object.entries(MONSTERS)) {
      for (let f = 0; f < 6; f++) {
        expect(atlas.frames[`mon/${kind}/${f}`]).toBeDefined();
        if (!m.boss) expect(atlas.frames[`mon/${kind}_gold/${f}`]).toBeDefined();
      }
    }
  });

  test('Elder Bloom and every boss and building have art', () => {
    for (let f = 0; f < 4; f++) expect(atlas.frames[`npc/elder/${f}`]).toBeDefined();
    for (const k of ['kingslime', 'alphawolf', 'crystalking', 'dragon']) expect(existsSync(`public/assets/icons/boss_${k}.webp`)).toBe(true);
    for (const n of ['home1', 'home2', 'home3', 'forge2', 'forge3', 'garden1', 'garden2', 'garden3', 'training1', 'training2', 'training3', 'warp0', 'warp1', 'plot', 'campfire', 'gate_bramble', 'gate_crystal', 'gate_rock']) {
      expect(atlas.frames[`env/${n}`]).toBeDefined();
    }
  });

  test('every material and charm has an icon', () => {
    for (const id of [...Object.keys(MATS), ...Object.values(GEAR).map((g) => g.id)]) {
      expect(existsSync(`public/assets/icons/${id}.webp`)).toBe(true);
    }
  });
});
