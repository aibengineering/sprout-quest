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

  // Characters are 3D models (the game needs WebGL): the hero in every armor, every monster and every villager.
  const model = (id: string) => existsSync(`public/assets/models/${id}.glb`);

  test('the hero has a 3D model in every armor, and every weapon one to hold', () => {
    for (const g of Object.values(GEAR).filter((g) => g.slot === 'armor')) expect({ id: g.id, model: model(`hero_${g.id}`) }).toEqual({ id: g.id, model: true });
    for (const g of Object.values(GEAR).filter((g) => g.slot === 'weapon')) expect({ id: g.id, model: model(`wpn_${g.id}`) }).toEqual({ id: g.id, model: true });
  });

  test('every monster and villager has a 3D model, and their old sprites are no longer shipped', () => {
    for (const kind of Object.keys(MONSTERS)) expect({ kind, model: model(`mon_${kind}`) }).toEqual({ kind, model: true });
    for (const n of ['elder', 'granny', 'poppy', 'poppy_hug', 'bram', 'bram_hurt', 'pip']) expect({ n, model: model(`npc_${n}`) }).toEqual({ n, model: true });
    expect(Object.keys(atlas.frames).filter((k) => /^(hero|mon|npc)\//.test(k))).toEqual([]);
  });

  test('every boss and building has art', () => {
    for (const k of ['kingslime', 'alphawolf', 'crystalking', 'dragon']) expect(existsSync(`public/assets/icons/boss_${k}.webp`)).toBe(true);
    for (const n of ['home1', 'home2', 'home3', 'forge2', 'forge3', 'garden1', 'garden2', 'garden3', 'training1', 'training2', 'training3', 'warp0', 'warp1', 'plot', 'campfire', 'gate_bramble', 'gate_crystal', 'gate_rock']) {
      expect(atlas.frames[`env/${n}`]).toBeDefined();
    }
  });

  test("Poppy's story: every portrait and keepsake", () => {
    for (const id of ['npc_poppy', 'npc_poppy_scared', 'npc_poppy_sad', 'npc_poppy_hug', 'npc_granny', 'npc_granny_worried', 'floppers', 'trailboots', 'boss_bigbun']) {
      expect(existsSync(`public/assets/icons/${id}.webp`)).toBe(true);
    }
  });

  test('every material and charm has an icon', () => {
    for (const id of [...Object.keys(MATS), ...Object.values(GEAR).map((g) => g.id)]) {
      expect(existsSync(`public/assets/icons/${id}.webp`)).toBe(true);
    }
  });
});
