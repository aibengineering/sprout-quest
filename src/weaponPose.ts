// Attachment geometry shared by the model renderer and combat. All positions use the hero's model units.
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Gear } from './data';
import { UNIT } from './battle/types';

export const MODEL_ELEVATION = Math.PI / 6;
export const HERO_MODEL_SCALE = 1.2;
export const HERO_BATTLE_UNIT = UNIT * HERO_MODEL_SCALE;
const SIN = Math.sin(MODEL_ELEVATION), COS = Math.cos(MODEL_ELEVATION);
const DOWN = new Vector3(0, -1, 0);
const CAMERA = new Vector3(0, SIN, COS);
export const HAND = new Vector3(0.03, -0.15, 0.01);

export interface Held {
  id: string;
  at: 'hand' | 'back' | 'hip';
  ang?: number;
  lift?: number;
  scale: number;
  /** Extension along the weapon's axis, in model units. The hand follows it. */
  off?: number;
  hipDown?: boolean;
  headUp?: boolean;
  /** Show only the whip's grip while its coils are out as the lash. */
  uncoiled?: boolean;
}

/** Dimensions of the art/weapons.py models: tip, hammer head center, and whip grip outlet along +X. */
export function weaponLength(g: Gear): number {
  if (g.id === 'twig') return 0.876;
  if (g.id === 'emberblade') return 1.15;
  if (g.id === 'wyrmbreaker') return 1.4;
  if (g.style === 'sword') return 0.82 + 0.07 * (g.tier ?? 0);
  if (g.style === 'hammer') return 0.95 + 0.06 * (g.tier ?? 0);
  if (g.style === 'whip') return 0.22;
  return ({ jellywand: 1.01, sporewand: 0.96, batwand: 1.02, glimmerwand: 0.962, wyrmfire: 1.06 } as Record<string, number>)[g.id] ?? 1;
}

export function hammerHead(g: Gear): number {
  return g.id === 'wyrmbreaker' ? 1.05 : 0.8 + 0.05 * (g.tier ?? 0);
}

/** A carried whip is bigger than its old hip coil, so its grip and colour read at a glance. */
export const WHIP_CARRIED_SCALE = 0.85;
/** Its grip rides out sideways at the hip (angled a little toward the camera), with the coils hanging below it. */
export const WHIP_HIP_DIR = new Vector3(0.8, 0, 0.55);

export function carriedWeapon(g: Gear, size: number): Held {
  const hip = g.style === 'wand' || g.style === 'whip';
  return {
    id: `wpn_${g.id}`, at: hip ? 'hip' : 'back',
    scale: (g.style === 'wand' ? 0.32 : g.style === 'whip' ? WHIP_CARRIED_SCALE : g.style === 'hammer' ? 0.56 : 0.52) * size,
    hipDown: g.style === 'wand', headUp: g.style === 'hammer',
  };
}

export function carriedMount(h: Held): { position: Vector3; rotation: Quaternion } {
  const position = h.at === 'back' ? new Vector3(0.2, h.headUp ? 0.18 : 0.57, -0.34) : new Vector3(0.32, h.hipDown ? 0.4 : 0.44, -0.02);
  const dir = h.at === 'back'
    ? h.headUp ? new Vector3(-0.95, 0.7, -0.25) : new Vector3(-0.75, -0.72, -0.1)
    : h.hipDown ? new Vector3(0.1, -1, 0.2) : WHIP_HIP_DIR.clone();
  return { position, rotation: new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), dir.normalize()) };
}

export function weaponDirection(ang: number, lift: number): Vector3 {
  return new Vector3(Math.cos(ang) * Math.cos(lift), Math.sin(lift), Math.sin(ang) * Math.cos(lift));
}

export function weaponRotation(dir: Vector3): Quaternion {
  const normal = CAMERA.clone().addScaledVector(dir, -CAMERA.dot(dir));
  // An overhead swing can point straight at the camera. Keep a valid basis there too.
  if (normal.lengthSq() < 1e-8) normal.set(1, 0, 0).addScaledVector(dir, -dir.x);
  normal.normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(dir, new Vector3().crossVectors(normal, dir), normal));
}

export const heroYaw = (face: number) => Math.round((Math.PI / 2 - face) * 36 / Math.PI) * Math.PI / 36;
export const projectWeaponPoint = (p: Vector3, unit = 1) => ({ x: p.x * unit, y: (-p.y * COS + p.z * SIN) * unit });

/** The exported hero's body keyframes (art/models.py), sampled at the renderer's 24 fps. */
export function heroBody(face: number, moving: boolean, t: number): Matrix4 {
  const duration = moving ? 12 / 24 : 50 / 24;
  const period = moving ? 4 / 9 : 50 / 24;
  const phase = ((t / period % 1) + 1) % 1;
  const sample = Math.floor(phase * duration * 24) / (duration * 24);
  const s = Math.sin(sample * Math.PI * 2);
  const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heroYaw(face));
  if (moving) rotation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.05 * s)).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.06));
  const scale = moving ? new Vector3(1, 1, 1) : new Vector3(1 - 0.008 * s, 1 + 0.015 * s, 1 - 0.008 * s);
  return new Matrix4().compose(new Vector3(0, moving ? Math.abs(s) * 0.05 : 0, 0), rotation, scale);
}

/** World-space grip position. This does not depend on a previous render, WebGL, or a downloaded model. */
export function weaponHand(h: Held, face: number, moving: boolean, t: number): Vector3 {
  const body = heroBody(face, moving, t);
  const dir = weaponDirection(h.ang ?? 0, h.lift ?? 0);
  const armDir = dir.clone().addScaledVector(DOWN, 0.55).normalize();
  const arm = new Quaternion().setFromUnitVectors(DOWN, armDir);
  const parent = new Quaternion().setFromRotationMatrix(body.clone().scale(new Vector3(1, 1, 1).divide(new Vector3().setFromMatrixScale(body))));
  const local = parent.invert().multiply(arm);
  const matrix = body.clone().multiply(new Matrix4().compose(new Vector3(0.29, 0.37, 0), local, new Vector3(1, 1, 1)));
  return HAND.clone().applyMatrix4(matrix).addScaledVector(dir, h.off ?? 0);
}

export function heldPoint(h: Held, face: number, moving: boolean, t: number, along: number): Vector3 {
  return weaponHand(h, face, moving, t).addScaledVector(weaponDirection(h.ang ?? 0, h.lift ?? 0), along * h.scale);
}
