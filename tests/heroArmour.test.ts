// The hero's armour is put together in the game (src/models.ts dress): the base hero (hero_base.glb) with each armour
// (armor_<id>.glb) hung on its pivots. These check the shipped models fit together, parsing them as the game does.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Box3, Mesh, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GEAR } from '../src/data';
import { CRAFT_PRESENTATIONS } from '../src/crafting/catalog';
import { HERO_PIVOTS, dress, itemModelReady, loadCraftScenes } from '../src/models';

const parse = async (path: string) => {
  const b = readFileSync(`public/${path}`);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
};
const ARMOURS = ['tunic', ...Object.values(GEAR).filter((g) => g.slot === 'armor').map((g) => g.id)].filter((id, i, all) => all.indexOf(id) === i);

/** The meshes that hang on a pivot itself (not on a pivot inside it). */
function own(pivot: Object3D): Mesh[] {
  const out: Mesh[] = [];
  const walk = (o: Object3D) => {
    for (const c of o.children) {
      if (HERO_PIVOTS.includes(c.name)) continue;
      if ((c as Mesh).isMesh) out.push(c as Mesh);
      walk(c);
    }
  };
  walk(pivot);
  return out;
}

const base = (await parse('assets/models/hero_base.glb')).scene;
base.updateMatrixWorld(true);
/** A pivot's place on its parent (the base hero's nodes are saved mid-walk, so only where each pivot is fixed counts). */
const where = (root: Object3D, name: string) => root.getObjectByName(name)!.position;

describe('the hero in each armour', () => {
  test('there is a model for every armour you can wear', () => {
    expect(ARMOURS.length).toBe(11);
  });

  for (const id of ARMOURS) {
    test(`${id}: every piece lands on the pivot it was made for, where the base hero has it`, async () => {
      const armour = (await parse(`assets/models/armor_${id}.glb`)).scene;
      armour.updateMatrixWorld(true);
      const hero = dress(base, armour);
      hero.updateMatrixWorld(true);
      const helmet = !!armour.getObjectByName('helmet');
      let pieces = 0;
      for (const name of HERO_PIVOTS) {
        const pivot = armour.getObjectByName(name);
        if (!pivot) continue;
        // The armour's pivots are where the base hero's are, so each piece sits on the body as it was built.
        expect([name, where(armour, name).distanceTo(where(base, name))]).toEqual([name, expect.closeTo(0, 4)]);
        // (Under a helmet, the base hero's head loses its bangs and sprout.)
        const hair = helmet && name === 'head' ? ['bangs', 'sprout'].reduce((n, h) => n + own(base.getObjectByName(h)!).length, 0) : 0;
        const worn = own(pivot).length, had = own(base.getObjectByName(name)!).length - hair;
        pieces += worn;
        expect(own(hero.getObjectByName(name)!).length).toBe(had + worn);
      }
      expect(pieces).toBeGreaterThan(0);
      // Every armour has its sleeves or pauldrons on both arms.
      expect(own(armour.getObjectByName('arm-1')!).length).toBeGreaterThan(0);
      expect(own(armour.getObjectByName('arm1')!).length).toBeGreaterThan(0);
      // The models it was made from are left as they were.
      expect(own(base.getObjectByName('bodyPivot')!).length).toBe(own((await parse('assets/models/hero_base.glb')).scene.getObjectByName('bodyPivot')!).length);
      // A helmet covers the bangs and the sprout; otherwise they show.
      expect(!!hero.getObjectByName('bangs')).toBe(!helmet);
      expect(!!hero.getObjectByName('sprout')).toBe(!helmet);
    });
  }

  test('the helmets are the three armours that cover the head', async () => {
    const helmets = [];
    for (const id of ARMOURS) if ((await parse(`assets/models/armor_${id}.glb`)).scene.getObjectByName('helmet')) helmets.push(id);
    expect(helmets.sort()).toEqual(['dragonmail', 'ironplate', 'shroomhood']);
  });
});

describe('the stew scene', () => {
  test('the pine fuel burns under the pot and leaves before the stew is served', async () => {
    const scene = (await parse(CRAFT_PRESENTATIONS.stew.model)).scene;
    scene.updateMatrixWorld(true);
    const box = (name: string) => new Box3().setFromObject(scene.getObjectByName(name)!, true);
    const pot = box('pot');
    expect(box('pine-fuel').max.y).toBeLessThan(pot.getCenter(new Vector3()).y);
    expect(CRAFT_PRESENTATIONS.stew.layers.find((l) => l.id === 'pine-fuel')!.finished).toBe(false);
  });
});

describe('fetching the crafting scenes', () => {
  test('one that fails to download still counts towards the progress, and is tried again when wanted', async () => {
    const good = `file://${process.cwd()}/public/${CRAFT_PRESENTATIONS.stew.model}`, bad = `file://${process.cwd()}/public/assets/crafting3d/nope.glb`;
    const seen: [number, number][] = [];
    // (three.js reports download progress with a browser event Bun doesn't have.)
    (globalThis as Record<string, unknown>).ProgressEvent ??= class extends Event { constructor(type: string, o: object) { super(type); Object.assign(this, o); } };
    const warn = console.warn;
    console.warn = () => {};
    try {
      await loadCraftScenes([good, bad], (done, total) => seen.push([done, total]));
    } finally {
      console.warn = warn;
    }
    expect(seen.map(([d]) => d).sort()).toEqual([1, 2]);
    expect(seen.every(([, t]) => t === 2)).toBe(true);
    expect(itemModelReady(good)).toBe(true);
    expect(itemModelReady(bad)).toBe(false);
  });
});
