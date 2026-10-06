import { describe, expect, test } from 'bun:test';
import { Box3, Matrix4, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Audio } from '../src/audio';
import type { Input } from '../src/input';
import { Battle } from '../src/battle/battle';
import { lashCrackAt, lashRope } from '../src/battle/pose';
import type { Swing } from '../src/battle/types';
import { WHIP_REST, battleWeapon } from '../src/battle/weaponPose';
import { GEAR, zoneById } from '../src/data';
import { newState } from '../src/state';
import { MOVESETS, skillAt, tierScale, type SkillRank } from '../src/weapons';
import { HERO_BATTLE_UNIT, MODEL_ELEVATION, WHIP_CARRIED_SCALE, carriedMount, carriedWeapon, hammerHead, heldPoint, heroBody, weaponHand, weaponRotation, weaponDirection } from '../src/weaponPose';

const fighter = (face = 0) => ({ face, moving: false, swing: null as Swing | null, whirlT: 0, whirlAng: 0 });
const swing = (s: Swing['s'], t: number, aim = 0): Swing => ({ s, t, aim, id: 2, prevAng: null, impacted: false, skill: false, finisher: true, trail: [] });
const battle = (id: string) => {
  const save = newState();
  save.equip.weapon = id;
  save.mastery[GEAR[id].style!].lv = 3;
  const input = { axis: () => ({ x: 0, y: 0 }), consume: () => false, isHeld: () => false } as unknown as Input;
  return new Battle({ zone: zoneById('meadow'), foes: [], boss: false }, save, input, { play: () => {} } as unknown as Audio, () => {});
};
// Exercise the simulation entry points too: effects must not depend on the renderer having run first.
const simulation = (b: Battle) => b as unknown as {
  shoot(ang: number, mult: number, r: number): void;
  impact(sw: Swing): void;
  lashHit(sw: Swing): void;
  skill(r: SkillRank): void;
};

describe('weapon attachments', () => {
  test('carried weapons use their own mount, below the head', () => {
    for (const g of Object.values(GEAR).filter((g) => g.slot === 'weapon')) {
      const h = carriedWeapon(g, MOVESETS[g.style!].size), m = carriedMount(h);
      expect(h.at).toBe(g.style === 'whip' || g.style === 'wand' ? 'hip' : 'back');
      expect(m.position.y).toBeLessThan(0.6);
      expect(m.position.y).toBeGreaterThan(0.1);
      expect(m.rotation.toArray().every(Number.isFinite)).toBe(true);
    }
  });

  test('a carried whip is a readable size, its grip out sideways at the hip with the coils hanging', () => {
    for (const g of Object.values(GEAR).filter((g) => g.style === 'whip')) {
      const h = carriedWeapon(g, MOVESETS.whip.size), m = carriedMount(h);
      expect(h.scale).toBeCloseTo(WHIP_CARRIED_SCALE * MOVESETS.whip.size, 6);
      expect(h.scale).toBeGreaterThan(0.7);
      const grip = new Vector3(1, 0, 0).applyQuaternion(m.rotation);
      // Mostly across the screen (not pointed at the camera), and level: the coils hang straight down under it.
      expect(Math.abs(grip.x)).toBeGreaterThan(Math.abs(grip.z));
      expect(Math.abs(grip.y)).toBeLessThan(0.05);
      expect(new Vector3(0, -1, 0).applyQuaternion(m.rotation).y).toBeLessThan(-0.99);
      expect(m.position.y).toBeCloseTo(0.44, 6);
    }
  });

  test('a whip at rest in a fight is held out, larger, pointing away from the body; lashes keep their size', () => {
    const g = GEAR.glimmerwhip, m = MOVESETS.whip, base = (34 * m.size) / HERO_BATTLE_UNIT;
    // Facing the camera the hand is on screen right, facing away on screen left: the whip points outward from it.
    for (const [face, ang] of [[Math.PI / 2, WHIP_REST.ang], [-Math.PI / 2, Math.PI - WHIP_REST.ang], [0, WHIP_REST.ang], [Math.PI, Math.PI - WHIP_REST.ang]]) {
      const rest = battleWeapon(g, m, 1, fighter(face), 0).held;
      expect(rest.uncoiled).toBe(false);
      expect(rest.scale).toBeCloseTo(base * WHIP_REST.scale, 6);
      expect(rest.lift).toBeCloseTo(WHIP_REST.lift, 6);
      expect(rest.ang).toBeCloseTo(ang, 6);
    }
    const p = fighter(0), s = m.combo[0];
    p.swing = swing(s, lashCrackAt(s));
    expect(battleWeapon(g, m, 1, p, 0).held.scale).toBeCloseTo(base, 6);
    // Other weapons keep the shared rest pose.
    expect(battleWeapon(GEAR.ironsword, MOVESETS.sword, 1, fighter(Math.PI / 2), 0).held.ang).toBeCloseTo(Math.PI - 0.75, 6);
  });

  test('a blade aimed directly at the camera has a finite orientation', () => {
    const q = weaponRotation(new Vector3(0, Math.sin(MODEL_ELEVATION), Math.cos(MODEL_ELEVATION)));
    expect(q.toArray().every(Number.isFinite)).toBe(true);
    expect(q.length()).toBeCloseTo(1, 6);
  });

  test('the exported meshes clear the ground when carried or held at rest, including walking', async () => {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    for (const g of Object.values(GEAR).filter((g) => g.slot === 'weapon')) {
      const bytes = readFileSync(`public/assets/models/wpn_${g.id}.glb`);
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const model = (await loader.parseAsync(buffer, '')).scene;
      for (const face of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        for (const moving of [false, true]) for (const t of [0, 0.11, 0.22, 0.33]) {
          const carried = carriedWeapon(g, MOVESETS[g.style!].size), mount = carriedMount(carried);
          model.matrixAutoUpdate = false;
          model.matrix.copy(heroBody(face, moving, t).multiply(new Matrix4().compose(mount.position, mount.rotation, new Vector3().setScalar(carried.scale))));
          model.updateMatrixWorld(true);
          expect(new Box3().setFromObject(model, true).min.y).toBeGreaterThan(0);
          const held = battleWeapon(g, MOVESETS[g.style!], tierScale(g.tier!), { ...fighter(face), moving }, t).held;
          model.matrix.copy(new Matrix4().compose(weaponHand(held, face, moving, t), weaponRotation(weaponDirection(held.ang!, held.lift!)), new Vector3().setScalar(held.scale)));
          model.updateMatrixWorld(true);
          expect(new Box3().setFromObject(model, true).min.y).toBeGreaterThan(0);
        }
      }
    }
  });

  test('a thrust pulls the hand back and extends it along the blade', () => {
    const g = GEAR.ironsword, m = MOVESETS.sword, s = m.combo[2], p = fighter();
    p.swing = swing(s, s.windup);
    const back = battleWeapon(g, m, tierScale(g.tier!), p, 0);
    p.swing.t = s.windup + s.active;
    const forward = battleWeapon(g, m, tierScale(g.tier!), p, 0);
    expect(back.held.off!).toBeLessThan(0);
    expect(forward.held.off!).toBeGreaterThan(0);
    expect(forward.hand.x - back.hand.x).toBeGreaterThan(35);
    expect(forward.tip.x - back.tip.x).toBeCloseTo(forward.hand.x - back.hand.x, 6);
  });

  test('every hammer contacts the ground and emits its impact at its head', () => {
    for (const g of Object.values(GEAR).filter((g) => g.style === 'hammer')) {
      for (const face of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const b = battle(g.id), s = b.moves.combo[0];
        b.p.face = face;
        b.p.swing = swing(s, s.windup + s.active, face);
        const wp = battleWeapon(g, b.moves, b.reach, b.p, b.t);
        const head = heldPoint(wp.held, face, false, b.t, hammerHead(g));
        expect(Math.abs(head.y)).toBeLessThan(0.001);
        // A frame can step into recovery before impact() runs; it still uses the contact pose.
        b.p.swing.t += 0.02;
        simulation(b).impact(b.p.swing);
        expect(b.rings[0].x).toBeCloseTo(b.p.x + wp.head.x, 6);
        expect(b.rings[0].y).toBeCloseTo(b.p.y + wp.head.y, 6);
        expect(b.rings[0].r1).toBeCloseTo(s.size * b.reach * 1.2, 6);
      }
    }
  });

  test('a whip uncoils during lashes and Whirl, with the crack at the visible rope tip', () => {
    const b = battle('batwhip'), s = b.moves.combo[0];
    expect(battleWeapon(b.weapon, b.moves, b.reach, b.p, b.t).held.uncoiled).toBe(false);
    b.p.swing = swing(s, lashCrackAt(s));
    const wp = battleWeapon(b.weapon, b.moves, b.reach, b.p, b.t);
    expect(wp.held.uncoiled).toBe(true);
    simulation(b).lashHit(b.p.swing);
    const rope = lashRope(b.p.swing, b.reach), tip = rope[rope.length - 1];
    expect(b.rings[0].x).toBeCloseTo(b.p.x + wp.tip.x + tip[0], 6);
    expect(b.rings[0].y).toBeCloseTo(b.p.y + wp.tip.y + tip[1], 6);
    b.p.swing = null;
    b.p.whirlT = 0.2;
    expect(battleWeapon(b.weapon, b.moves, b.reach, b.p, b.t).held.uncoiled).toBe(true);
  });

  test('regular shots and Scatter start at the wand outlet without a previous render', () => {
    for (const g of Object.values(GEAR).filter((g) => g.style === 'wand')) {
      const b = battle(g.id), s = b.moves.combo[0];
      b.p.face = Math.PI;
      b.p.swing = swing(s, s.windup, b.p.face);
      const wp = battleWeapon(g, b.moves, b.reach, b.p, b.t);
      simulation(b).shoot(b.p.face, 1, 8);
      expect(b.projs[0].x).toBeCloseTo(b.p.x + wp.tip.x, 6);
      expect(b.projs[0].y).toBeCloseTo(b.p.y + wp.tip.y, 6);
      b.projs = [];
      simulation(b).skill(skillAt('scatter', 2)!);
      const scatter = battleWeapon(g, b.moves, b.reach, b.p, b.t);
      expect(scatter.idle).toBe(false);
      expect(b.projs.length).toBe(5);
      const castId = b.projs[0].strikeId;
      expect(castId).toBeGreaterThan(0);
      expect(new Set(b.projs.map(p => p.strikeId)).size).toBe(1);
      for (const p of b.projs) {
        expect(p.x).toBeCloseTo(b.p.x + scatter.tip.x, 6);
        expect(p.y).toBeCloseTo(b.p.y + scatter.tip.y, 6);
      }
      b.projs = [];
      simulation(b).skill(skillAt('scatter', 2)!);
      expect(b.projs[0].strikeId).not.toBe(castId);
    }
  });
});
