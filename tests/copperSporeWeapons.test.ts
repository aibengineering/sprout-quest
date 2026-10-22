import { describe, expect, test } from 'bun:test';
import { sceneModel } from './sceneModel';
import { readFileSync, statSync } from 'node:fs';
import { Color, Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GEAR } from '../src/data';
import { craftGear } from '../src/rules';
import { newState } from '../src/state';
import coppersword from '../src/crafting/items/coppersword';
import copperhammer from '../src/crafting/items/copperhammer';
import sporewhip from '../src/crafting/items/sporewhip';
import sporewand from '../src/crafting/items/sporewand';

const ids = ['coppersword', 'copperhammer', 'sporewhip', 'sporewand'] as const;
const presentations = { coppersword, copperhammer, sporewhip, sporewand };
const ingredientColors = {
  coppersword: ['#e8904a', '#ffc890', '#7a5238', '#bc8960'],
  copperhammer: ['#e8904a', '#ffc890', '#c39965', '#7b593b'],
  sporewhip: ['#e8505a', '#fff0d8', '#ca7886'],
  sporewand: ['#e8505a', '#fff0d8', '#bb8294', '#7b593b', '#c39965', '#5ac85a'],
};

describe('copper and spore weapon ingredient art', () => {
  for (const id of ids) {
    test(`${id} assembles every recipe ingredient before the final lift`, () => {
      const p = presentations[id], recipe = GEAR[id].recipe!;
      expect(Object.keys(p.roles).sort()).toEqual(Object.keys(recipe).sort());
      const m = { stack: Object.keys(sceneModel(`assets/crafting3d/${id}.glb`).layers) };
      expect(p.layers.map(l => l.id)).toEqual(m.stack);
      for (const material of Object.keys(recipe)) expect(p.targets.some(t => t.material === material)).toBe(true);
      for (const t of p.targets) {
        expect(t.at).toBeGreaterThanOrEqual(0);
        expect(t.duration).toBeGreaterThan(0);
        expect(p.layers.some(l => l.id === t.part)).toBe(true);
      }
      expect(p.phases[0].at).toBe(0);
      const reveal = p.phases.find(phase => phase.stage === 'reveal')!;
      expect(reveal.at).toBeGreaterThan(Math.max(...p.targets.map(t => t.at + t.duration)));
      expect(p.duration - reveal.at).toBeGreaterThanOrEqual(500);
    });

    test(`${id} equips real geometry for each recipe material within the model budget`, async () => {
      const path = `public/assets/models/wpn_${id}.glb`;
      expect(statSync(path).size).toBeLessThan(24 * 1024);
      const file = readFileSync(path), buffer = new ArrayBuffer(file.length);
      new Uint8Array(buffer).set(file);
      const model = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, '');
      const colors: Color[] = [];
      let vertices = 0;
      model.scene.traverse(o => {
        if (!(o instanceof Mesh)) return;
        const attribute = o.geometry.getAttribute('color');
        vertices += o.geometry.getAttribute('position').count;
        if (attribute) for (let i = 0; i < attribute.count; i++) colors.push(new Color().setRGB(attribute.getX(i), attribute.getY(i), attribute.getZ(i)));
      });
      expect(vertices).toBeLessThan(6000);
      for (const hex of ingredientColors[id]) {
        const wanted = new Color(hex);
        expect(colors.some(c => Math.hypot(c.r-wanted.r, c.g-wanted.g, c.b-wanted.b) < .012)).toBe(true);
      }
      if (id.startsWith('spore')) for (const hex of ['#ffd35a', '#6a4a3a', '#6a3a4a']) {
        const unwanted = new Color(hex);
        expect(colors.some(c => Math.hypot(c.r-unwanted.r, c.g-unwanted.g, c.b-unwanted.b) < .012)).toBe(false);
      }
    });
  }

  test('ingredient-led shapes retain the actual copper/spore recipes', () => {
    expect(GEAR.coppersword.recipe).toEqual({ copper: 12, bark: 9 });
    expect(GEAR.copperhammer.recipe).toEqual({ copper: 15, pine: 9 });
    expect(GEAR.sporewhip.recipe).toEqual({ cap: 18, fang: 4 });
    expect(GEAR.sporewand.recipe).toEqual({ cap: 15, fang: 6, pine: 6, clover: 1 });
  });

  test('the Spore Wand needs both wood and magic, and spends each ingredient once', () => {
    const s = newState();
    s.build.forge = 2;
    s.mastery.wand.lv = 4;
    Object.assign(s.mats, { cap: 17, fang: 9, pine: 5, clover: 1 });
    const before = { ...s.mats };
    expect(craftGear(s, 'sporewand')).toBe('missing');
    expect(s.mats).toEqual(before);
    s.mats.pine = 8; s.mats.clover = 0;
    expect(craftGear(s, 'sporewand')).toBe('missing');
    expect(s.mats.pine).toBe(8);
    s.mats.clover = 1;
    expect(craftGear(s, 'sporewand')).toBe('ok');
    expect({ cap: s.mats.cap, fang: s.mats.fang, pine: s.mats.pine, clover: s.mats.clover }).toEqual({ cap: 2, fang: 3, pine: 2, clover: 0 });
    expect(craftGear(s, 'sporewand')).toBe('owned');
    expect(s.mats.pine).toBe(2);
    expect(s.mats.clover).toBe(0);
    const last = sporewand.targets.at(-1)!;
    expect(last.material).toBe('clover');
    expect(last.at).toBeGreaterThan(Math.max(...sporewand.targets.slice(0, -1).map(t => t.at + t.duration)));
  });
});
