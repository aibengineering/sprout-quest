import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
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

  const glb = (id: string) => {
    const b = readFileSync(`public/assets/models/${id}.glb`);
    expect(b.toString('ascii', 0, 4)).toBe('glTF');
    return JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
  };
  const pivots = ['hero', 'bodyPivot', 'head', 'arm-1', 'arm1', 'foot-1', 'foot1'];

  test('one base hero carries the rig and its animations, with the hair helmets hide on their own pivots', () => {
    const base = glb('hero_base');
    const names = base.nodes.map((n: { name?: string }) => n.name);
    for (const name of [...pivots, 'bangs', 'sprout']) expect(names).toContain(name);
    expect(base.animations.map((a: { name: string }) => a.name).sort()).toEqual(['idle', 'walk']);
    for (const a of base.animations) {
      const moved = a.channels.map((c: { target: { node: number } }) => names[c.target.node]);
      for (const name of ['bodyPivot', 'arm-1', 'arm1', 'foot-1', 'foot1']) expect(moved).toContain(name);
    }
  });

  test('every armor is a small model of pieces hung on the hero pivots, with its toon settings', () => {
    for (const g of Object.values(GEAR).filter((g) => g.slot === 'armor')) {
      const a = glb(`armor_${g.id}`), names = a.nodes.map((n: { name?: string }) => n.name);
      expect({ id: g.id, pivots: ['hero', 'bodyPivot'].every((p) => names.includes(p)) }).toEqual({ id: g.id, pivots: true });
      expect(a.animations ?? []).toEqual([]);
      expect(a.extensionsRequired).toContain('EXT_meshopt_compression');
      for (const mesh of a.meshes) for (const p of mesh.primitives) expect(p.attributes.COLOR_1).toBeDefined();
      // Every piece hangs on a pivot (not loose at the top of the scene).
      const roots: number[] = a.scenes[0].nodes;
      expect(roots.map((i) => names[i])).toEqual(['hero']);
      expect(statSync(`public/assets/models/armor_${g.id}.glb`).size).toBeLessThan(150 * 1024);
    }
    // Helmets say so, and hide the bangs and the leaf sprout.
    const helmets = Object.values(GEAR).filter((g) => g.slot === 'armor' && glb(`armor_${g.id}`).nodes.some((n: { name?: string }) => n.name === 'helmet')).map((g) => g.id);
    expect(helmets.sort()).toEqual(['dragonmail', 'ironplate', 'shroomhood']);
  });

  test('every weapon has one to hold', () => {
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
