// Characters in real-time 3D: the hero, villagers and monsters, drawn from the models in assets/models (exported from
// the Blender scenes by art/models.py) with a cel shader that recreates the game's Blender material, lit side and
// shadow side, cast shadows and inverted-hull outlines.
//
// The world stays 2D. Each character is rendered into its own small image at the exact on-screen size, and that image
// is drawn wherever a sprite would be, so everything that works on sprites (depth sorting with trees and houses,
// flipping, hit flashes, tints, squash and stretch, fading) works unchanged. An image is only re-rendered when its
// pose, facing or size changes.
import {
  AnimationMixer, BackSide, Box3, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DirectionalLight, Float32BufferAttribute, LoopRepeat,
  Matrix4, Mesh, Object3D, OrthographicCamera, PCFShadowMap, Quaternion, Scene, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3, WebGLRenderer,
  type AnimationAction, type AnimationClip,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { DrawOpts, Frame } from './assets';
import type { CraftContact } from './crafting/types';
import { GEAR } from './data';
import { MODEL_ELEVATION, carriedMount, weaponDirection, weaponRotation, type Held } from './weaponPose';
export type { Held } from './weaponPose';

// ------------------------------------------------------------------------------------------------------------ look

/** The Blender scenes' key light (upper left, in front of the camera), in three.js axes. */
const LIGHT = new Vector3(-0.439, 0.643, 0.627).normalize();
const ELEVATION = MODEL_ELEVATION;
const OUTLINE = new Color('#3a2448');
/** The Blender outline shells read thinner than their nominal width; this matches them. */
const OUTLINE_SCALE = 0.6;

const toonVertex = /* glsl */ `
  #include <common>
  #include <shadowmap_pars_vertex>
  attribute vec3 toonBase;
  attribute vec3 toonParams;
  uniform float gold;
  varying vec3 vNormal;
  varying vec3 vBase;
  varying vec2 vParams;

  // Golden monsters: every colour but the eyes, whites and blushes turns gold by brightness (as in art/monsters.py).
  bool near(vec3 a, vec3 b) { return distance(a, b) < 0.02; }
  vec3 goldify(vec3 c) {
    if (near(c, vec3(0.0232, 0.0159, 0.0331)) || near(c, vec3(1.0)) || near(c, vec3(1.0, 0.3231, 0.3515)) || near(c, vec3(0.0823, 0.8714, 1.0))) return c;
    float lum = 0.3 * c.r + 0.6 * c.g + 0.1 * c.b;
    return lum > 0.6 ? vec3(1.0, 0.8879, 0.3916) : lum > 0.15 ? vec3(1.0, 0.6867, 0.0685) : vec3(0.6867, 0.3515, 0.0144);
  }

  void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    #include <worldpos_vertex>
    #include <shadowmap_vertex>
    vNormal = normalize(transformedNormal);
    vBase = gold > 0.5 ? goldify(toonBase) : toonBase;
    vParams = toonParams.xy;
  }`;

// Per pixel, as Blender computes it for these scenes (measured from its own renders): 1.254 × the sun angle's cosine,
// shadowed where another part blocks the sun, + 0.298 from the sky; a sharp ramp between the shadow colour (the base
// darkened and tinted purple) and the base; then a soft rim light where the surface turns away from us. Glowing parts
// skip the shadow and shine brighter.
const toonFragment = /* glsl */ `
  #include <common>
  #include <packing>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>
  uniform vec3 lightDir;
  varying vec3 vNormal;
  varying vec3 vBase;
  varying vec2 vParams;
  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float emit = vParams.y;
    float light = 1.254 * max(dot(n, lightDir), 0.0) * getShadowMask() + 0.298;
    float lit = emit > 0.0 ? 1.0 : smoothstep(0.72, 0.84, light);
    vec3 shade = mix(vBase * 0.74, vec3(0.1946, 0.1022, 0.3916), 0.14);
    vec3 c = mix(shade, vBase, lit);
    float facing = 1.0 - sqrt(abs(n.z));
    c += clamp((facing - 0.55) / 0.25, 0.0, 1.0) * vParams.x;
    gl_FragColor = vec4(c * (1.0 + emit), 1.0);
    #include <colorspace_fragment>
  }`;

const outlineVertex = /* glsl */ `
  attribute float thickness;
  uniform float outlineScale;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * thickness * outlineScale, 1.0);
  }`;

const outlineFragment = /* glsl */ `
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }`;

/** Shared by every character: set before each render. */
const lightDir = { value: new Vector3() };
const gold = { value: 0 };
const outlineScale = { value: OUTLINE_SCALE };
const outlineColor = { value: OUTLINE.clone() };

const toonMaterial = new ShaderMaterial({
  uniforms: { ...UniformsUtils.merge([UniformsLib.lights]), lightDir, gold },
  vertexShader: toonVertex,
  fragmentShader: toonFragment,
  lights: true,
});
const outlineMaterial = new ShaderMaterial({
  uniforms: { outlineScale, color: outlineColor },
  vertexShader: outlineVertex,
  fragmentShader: outlineFragment,
  side: BackSide,
});

// ------------------------------------------------------------------------------------------------------ loading

interface Model {
  root: Object3D;
  /** Whips also have a grip without their stowed coils. */
  grip?: Object3D;
  clips: Record<string, AnimationClip>;
  /** Where the model can reach across all its animations: its radius around the up axis, and its height. */
  radius: number;
  height: number;
}

const models = new Map<string, Model>();
const loading = new Map<string, Promise<Model | null>>();
/** When a failed model may be tried again (a dropped connection shouldn't lose a character for the whole session). */
const retryAt = new Map<string, number>();
let loader: GLTFLoader | null = null;

/** Float copy of an attribute (gltfpack stores them quantized), so geometry can be transformed and merged. */
function floats(a: BufferAttribute, size = a.itemSize) {
  const out = new Float32Array(a.count * size);
  for (let i = 0; i < a.count; i++) for (let c = 0; c < size; c++) out[i * size + c] = c < a.itemSize ? a.getComponent(i, c) : 1;
  return new Float32BufferAttribute(out, size);
}

/** Geometry with an index (merging needs all or none). */
function indexed(g: BufferGeometry) {
  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
  return g;
}

/**
 * Merges every mesh into one per moving part (the nodes the animations move), with its toon settings as vertex
 * attributes, plus a matching outline shell: a character draws in a couple of calls per part instead of one per sphere.
 */
function mergeParts(root: Object3D, moving: Set<string>) {
  root.updateMatrixWorld(true);
  // Preserve the hand as a joint so thrusts move both the weapon and the hand, without stretching the shoulder.
  const arm = root.getObjectByName('arm1');
  if (arm) {
    const mesh = arm.children.find((o) => {
      const box = new Box3().setFromObject(o, true);
      return !box.isEmpty() && box.getCenter(new Vector3()).applyMatrix4(arm.matrixWorld.clone().invert()).y < -0.1;
    });
    if (mesh) {
      const hand = new Object3D();
      hand.name = 'weaponHand';
      hand.position.set(0.03, -0.14, 0.01);
      arm.add(hand);
      hand.attach(mesh);
      moving.add(hand.name);
      root.updateMatrixWorld(true);
    }
  }
  const groups = new Map<Object3D, { toon: BufferGeometry[]; outline: BufferGeometry[] }>();
  const meshes: Mesh[] = [];
  root.traverse((o) => { if ((o as Mesh).isMesh) meshes.push(o as Mesh); });
  for (const m of meshes) {
    let part: Object3D = m.parent ?? root;
    while (part !== root && !moving.has(part.name)) part = part.parent ?? root;
    const rel = new Matrix4().copy(part.matrixWorld).invert().multiply(m.matrixWorld);
    const src = m.geometry;
    const g = new BufferGeometry();
    g.setAttribute('position', floats(src.getAttribute('position') as BufferAttribute));
    g.setAttribute('normal', floats(src.getAttribute('normal') as BufferAttribute));
    const col = src.getAttribute('color') as BufferAttribute | undefined;
    const params = src.getAttribute('color_1') as BufferAttribute | undefined;
    const base = col ? floats(col, 3) : new Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3);
    g.setAttribute('toonBase', base);
    const p = params ? floats(params, 3) : new Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3);
    // The outline width travels ×10 (see art/models.py).
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) / 10);
    g.setAttribute('toonParams', p);
    if (src.index) g.setIndex(src.index.clone());
    g.applyMatrix4(rel);
    const entry = groups.get(part) ?? { toon: [], outline: [] };
    groups.set(part, entry);
    entry.toon.push(g);
    // The outline shell, over the faces that have one (a mesh can join pieces of different widths). Normals are
    // smoothed across hard edges so the shell has no gaps.
    const ids = g.index ? Array.from(g.index.array) : [...Array(p.count).keys()], lined: number[] = [];
    for (let i = 0; i < ids.length; i += 3) if (p.getZ(ids[i]) > 0) lined.push(ids[i], ids[i + 1], ids[i + 2]);
    if (lined.length) {
      const shell = new BufferGeometry();
      shell.setAttribute('position', g.getAttribute('position').clone());
      shell.setAttribute('thickness', new Float32BufferAttribute(Array.from({ length: p.count }, (_, i) => p.getZ(i)), 1));
      shell.setIndex(lined);
      const smooth = mergeVertices(shell, 1e-4);
      smooth.computeVertexNormals();
      entry.outline.push(smooth);
    }
    m.removeFromParent();
  }
  for (const [part, { toon, outline }] of groups) {
    const body = new Mesh(mergeGeometries(toon.map(indexed)), toonMaterial);
    body.castShadow = body.receiveShadow = true;
    part.add(body);
    if (outline.length) part.add(new Mesh(mergeGeometries(outline.map(indexed)), outlineMaterial));
  }
}

/** The optimized whip meshes merge coils into the grip: split out the handle once, before cloning it for a lash. */
function whipGrip(root: Object3D, color: string): Object3D {
  const grip = new Object3D(), coil = new Color(color);
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || m.material !== toonMaterial) return;
    const g = m.geometry, pos = g.getAttribute('position'), base = g.getAttribute('toonBase');
    const indices: number[] = [];
    for (let i = 0; i < (g.index?.count ?? pos.count); i += 3) {
      const ids = [0, 1, 2].map((k) => g.index ? g.index.getX(i + k) : i + k);
      if (ids.some((k) => pos.getX(k) > 0.225)) continue;
      const k = ids[0];
      if (Math.hypot(base.getX(k) - coil.r, base.getY(k) - coil.g, base.getZ(k) - coil.b) < 0.025) continue;
      indices.push(...ids);
    }
    const selected = g.clone();
    selected.setIndex(indices);
    const body = selected.toNonIndexed();
    selected.dispose();
    grip.add(new Mesh(body, toonMaterial));
    const shell = new BufferGeometry();
    shell.setAttribute('position', body.getAttribute('position').clone());
    shell.setIndex(Array.from({ length: body.attributes.position.count }, (_, i) => i));
    const smooth = mergeVertices(shell, 1e-4);
    smooth.computeVertexNormals();
    smooth.setAttribute('thickness', new Float32BufferAttribute(new Float32Array(smooth.attributes.position.count).fill(0.014), 1));
    grip.add(new Mesh(smooth, outlineMaterial));
  });
  return grip;
}

/** How far the model reaches across all its animations, so its image is always big enough. */
function measure(root: Object3D, clips: Record<string, AnimationClip>) {
  const mixer = new AnimationMixer(root), box = new Box3(), tmp = new Box3();
  root.updateMatrixWorld(true);
  box.setFromObject(root, true);
  for (const clip of Object.values(clips)) {
    const action = mixer.clipAction(clip).play();
    for (let i = 0; i < 8; i++) {
      action.time = (i / 8) * clip.duration;
      mixer.update(0);
      root.updateMatrixWorld(true);
      box.union(tmp.setFromObject(root, true));
    }
    action.stop();
  }
  mixer.uncacheRoot(root);
  const r = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z));
  return { radius: r, height: box.max.y };
}

/** The hero's moving parts (art/hero.py), which armour hangs on. */
const HERO_PIVOTS = ['hero', 'bodyPivot', 'arm-1', 'arm1', 'head', 'foot-1', 'foot1'];

/** The base hero and the armours, kept as loaded: every armour's hero is put together from them. */
const heroParts = new Map<string, Promise<GLTF>>();
function gltf(name: string, url = `assets/models/${name}.glb`): Promise<GLTF> {
  loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return loader.loadAsync(url);
}
function heroPart(name: string): Promise<GLTF> {
  let p = heroParts.get(name);
  if (!p) heroParts.set(name, (p = gltf(name)));
  p.catch(() => heroParts.delete(name));
  return p;
}

/**
 * The hero in an armour (`hero_<armor>`): the base hero (art/hero.py build_base) with each armour piece hung on the
 * pivot it's named after, as the weapons hang in the hand. A helmet hides the bangs and the leaf sprout.
 */
async function dressedHero(armor: string): Promise<{ scene: Object3D; animations: AnimationClip[] }> {
  const [base, worn] = await Promise.all([heroPart('hero_base'), heroPart(`armor_${armor}`)]);
  const scene = base.scene.clone(true), armour = worn.scene.clone(true);
  if (armour.getObjectByName('helmet')) for (const hair of ['bangs', 'sprout']) scene.getObjectByName(hair)?.removeFromParent();
  // The pieces under each armour pivot sit where they would on the hero's pivot of the same name.
  for (const name of HERO_PIVOTS) {
    const from = armour.getObjectByName(name), to = scene.getObjectByName(name);
    if (from && to) for (const piece of [...from.children]) if (!HERO_PIVOTS.includes(piece.name)) to.add(piece);
  }
  return { scene, animations: base.animations };
}

/** Loads a model (once); resolves null if it can't be (the caller keeps its sprite or drawing). */
export function loadModel(id: string): Promise<Model | null> {
  const have = models.get(id);
  if (have) return Promise.resolve(have);
  let p = loading.get(id);
  if (!p && (retryAt.get(id) ?? 0) > performance.now()) return Promise.resolve(null);
  if (!p) {
    const armor = /^hero_(.+)$/.exec(id)?.[1];
    p = (armor ? dressedHero(armor) : gltf(id)).then(({ scene, animations }) => {
      const clips = Object.fromEntries(animations.map((c) => [c.name, c]));
      mergeParts(scene, new Set(animations.flatMap((c) => c.tracks.map((t) => t.name.slice(0, t.name.lastIndexOf('.'))))));
      const gear = GEAR[id.replace(/^wpn_/, '')];
      const grip = gear?.style === 'whip' ? whipGrip(scene, gear.id === 'dragontail' ? '#c83a3a' : gear.color!) : undefined;
      const m: Model = { root: scene, grip, clips, ...measure(scene, clips) };
      models.set(id, m);
      return m;
    }).catch((e) => {
      console.warn(`model ${id}:`, e);
      loading.delete(id);
      retryAt.set(id, performance.now() + 5000);
      return null;
    });
    loading.set(id, p);
  }
  return p;
}

/** Is this model loaded (and so drawn in 3D)? */
export const hasModel = (id: string) => models.has(id);

/** Loads several models, reporting progress (for the loading screen). */
export async function loadModels(ids: string[], onProgress?: (done: number, total: number) => void) {
  let done = 0;
  await Promise.all(ids.map((id) => loadModel(id).then(() => onProgress?.(++done, ids.length))));
}

// ------------------------------------------------------------------------------------------------------ rendering

let renderer: WebGLRenderer | null = null;
let unsupported = false;
const scene = new Scene();
const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
camera.position.set(0, Math.sin(ELEVATION) * 20, Math.cos(ELEVATION) * 20);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
const sun = new DirectionalLight(0xffffff, 1);

/**
 * Can this browser do WebGL at all? Checked quietly first, since three.js logs errors when it can't. The game needs it:
 * every character is a 3D model (their sprites aren't shipped).
 */
let canWebgl: boolean | undefined;
export function webglAvailable() {
  // Checked once: each check makes a context, and phones only allow a few.
  if (canWebgl === undefined) {
    try {
      const c = document.createElement('canvas');
      canWebgl = !!(c.getContext('webgl2') ?? c.getContext('webgl'));
    } catch {
      canWebgl = false;
    }
  }
  return canWebgl;
}

function gl(): WebGLRenderer | null {
  if (renderer || unsupported) return renderer;
  if (!webglAvailable()) {
    unsupported = true;
    return null;
  }
  try {
    renderer = new WebGLRenderer({ canvas: document.createElement('canvas'), alpha: true, antialias: true, premultipliedAlpha: false });
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.setSize(256, 256, false);
    sun.position.copy(LIGHT).multiplyScalar(8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.015;
    scene.add(sun, sun.target);
    lightDir.value.copy(LIGHT).transformDirection(camera.matrixWorldInverse);
  } catch {
    unsupported = true;
    renderer = null;
  }
  return renderer;
}

/** One on-screen character: its own copy of the model and animation state, and its last rendered image. */
interface Slot {
  id: string;
  model: Model;
  root: Object3D;
  mixer: AnimationMixer;
  actions: Record<string, AnimationAction>;
  canvas: HTMLCanvasElement;
  frame: Frame;
  key: string;
  seen: number;
  /** Walkers only: the weapon hand's arm, and where a weapon goes in the hand, on the back and at the hip. */
  arm?: Object3D;
  handJoint?: Object3D;
  armBridge?: Mesh;
  mounts?: { hand: Object3D; back: Object3D; hip: Object3D };
  weapon?: { id: string; obj: Object3D; uncoiled: boolean };
  /** Where the hand was on the last render, in model units from the feet, on screen (y down). */
  hand: { x: number; y: number };
}

const slots = new Map<string, Slot>();
let clock = 0;

function slotFor(name: string, id: string, model: Model): Slot {
  let s = slots.get(name);
  if (s && s.id === id) return s;
  const root = model.root.clone(true);
  const mixer = new AnimationMixer(root);
  const actions = Object.fromEntries(Object.entries(model.clips).map(([k, c]) => [k, mixer.clipAction(c).setLoop(LoopRepeat, Infinity)]));
  const canvas = document.createElement('canvas');
  s = { id, model, root, mixer, actions, canvas, frame: { img: canvas, x: 0, y: 0, w: 0, h: 0, ax: 0, ay: 0, ppu: 1 }, key: '', seen: 0, hand: { x: 0, y: 0 } };
  // Characters built like the hero (art/hero.py) hold things in their right hand (arm1) and carry them on the body.
  const arm = root.getObjectByName('arm1'), body = root.getObjectByName('bodyPivot');
  if (arm && body) {
    const mount = (parent: Object3D, x: number, y: number, z: number) => {
      const o = new Object3D();
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    };
    // The hand sits at the end of the arm (art/hero.py: a sphere 0.14 below the shoulder, in glTF axes).
    s.arm = arm;
    s.handJoint = arm.getObjectByName('weaponHand');
    s.mounts = { hand: s.handJoint ? mount(s.handJoint, 0, -0.01, 0) : mount(arm, 0.03, -0.15, 0.01), back: mount(body, 0, 0, 0), hip: mount(body, 0, 0, 0) };
    if (s.handJoint) {
      const shoulder = arm.children.find((o) => (o as Mesh).isMesh) as Mesh | undefined;
      const color = shoulder?.geometry.getAttribute('toonBase');
      const g = new CylinderGeometry(0.04, 0.045, 1, 8);
      const colors = new Float32Array(g.attributes.position.count * 3), params = new Float32Array(colors.length);
      for (let i = 0; i < colors.length; i += 3) {
        colors.set([color?.getX(0) ?? 0.2, color?.getY(0) ?? 0.1, color?.getZ(0) ?? 0.3], i);
        params.set([0.22, 0, 0.012], i);
      }
      g.setAttribute('toonBase', new Float32BufferAttribute(colors, 3));
      g.setAttribute('toonParams', new Float32BufferAttribute(params, 3));
      s.armBridge = new Mesh(g, toonMaterial);
      arm.add(s.armBridge);
    }
  }
  slots.set(name, s);
  return s;
}

const DOWN = new Vector3(0, -1, 0);
const tmpQ = new Quaternion(), tmpV = new Vector3();

/** Puts the weapon in the right place for this render: in the hand (turning the arm to hold it out), or stowed. */
function placeHeld(s: Slot, held: Held | undefined) {
  if (!s.mounts || !s.arm) return;
  const wanted = held && models.get(held.id);
  if (held && !wanted) void loadModel(held.id);
  if (s.handJoint) s.handJoint.position.set(0.03, -0.14, 0.01);
  if (s.armBridge) s.armBridge.visible = held?.at === 'hand';
  if (s.weapon && (!wanted || s.weapon.id !== held!.id || s.weapon.uncoiled !== !!held?.uncoiled)) {
    s.weapon.obj.removeFromParent();
    s.weapon = undefined;
  }
  if (!wanted || !held) return;
  if (!s.weapon) s.weapon = { id: held.id, obj: (held.uncoiled && wanted.grip ? wanted.grip : wanted.root).clone(true), uncoiled: !!held.uncoiled };
  const w = s.weapon.obj;
  w.scale.setScalar(held.scale);
  s.mounts[held.at].add(w);
  s.root.updateMatrixWorld(true);
  if (held.at === 'hand') {
    w.position.set(0, 0, 0);
    // Where the weapon points, in the world: along the ground at `ang`, tilted up by `lift`.
    const lift = held.lift ?? 0, ang = held.ang ?? 0;
    const dir = weaponDirection(ang, lift);
    // The arm reaches out that way (a little below it, as an arm would), turned in the body's frame.
    const armDir = tmpV.copy(dir).addScaledVector(DOWN, 0.55).normalize();
    const parentQ = s.arm.parent!.getWorldQuaternion(new Quaternion());
    s.arm.quaternion.copy(parentQ.invert().multiply(tmpQ.setFromUnitVectors(DOWN, armDir)));
    s.root.updateMatrixWorld(true);
    if (s.handJoint) {
      const inv = s.arm.matrixWorld.clone().invert();
      const hand = s.mounts.hand.getWorldPosition(new Vector3());
      const delta = hand.clone().addScaledVector(dir, held.off ?? 0).applyMatrix4(inv).sub(hand.applyMatrix4(inv));
      s.handJoint.position.add(delta);
      if (s.armBridge) {
        const from = new Vector3(0.02, -0.04, 0), end = s.handJoint.position;
        s.armBridge.position.copy(from).add(end).multiplyScalar(0.5);
        s.armBridge.scale.y = from.distanceTo(end);
        s.armBridge.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), end.clone().sub(from).normalize());
      }
      s.root.updateMatrixWorld(true);
    }
    // The blade along `dir`, its flat side turned toward the camera.
    const worldQ = weaponRotation(dir);
    const mountQ = s.mounts.hand.getWorldQuaternion(new Quaternion());
    w.quaternion.copy(mountQ.invert().multiply(worldQ));
  } else {
    const mount = carriedMount(held);
    w.position.copy(mount.position);
    w.quaternion.copy(mount.rotation);
  }
}

/** What to draw: which animation and how far through it (0–1), which way it faces, and whether it's golden. */
export interface Pose {
  anim: string;
  phase: number;
  yaw: number;
  gold?: boolean;
  /** A heavier outline (the hero), so you can always spot yourself. */
  bold?: boolean;
  /** A weapon in the hand or carried (walkers only). */
  held?: Held;
}

/** Where a character's hand was on its last render, in canvas units from its feet (for effects that start at the hand). */
export function handOf(slot: string, unit: number): { x: number; y: number } | null {
  const s = slots.get(slot);
  return s?.mounts ? { x: s.hand.x * unit, y: s.hand.y * unit } : null;
}

/**
 * Renders (if needed) and draws a character with its feet at (x, y), `unit` canvas units per model unit, like a sprite
 * (see drawFrame). `slot` names this on-screen character so its image is reused while nothing changes. Returns false if
 * the model or WebGL isn't available yet (draw the old way).
 */
export function drawModel(ctx: CanvasRenderingContext2D, slot: string, id: string, pose: Pose, x: number, y: number, unit: number, o: DrawOpts, draw: (f: Frame) => void): boolean {
  const model = models.get(id);
  if (!model) {
    void loadModel(id);
    return false;
  }
  const r = gl();
  if (!r) return false;
  const s = slotFor(slot, id, model);
  s.seen = clock;
  // Render at the pixel size it'll be shown at, in steps so small zooms don't re-render every frame.
  const t = ctx.getTransform();
  const ppu = Math.max(8, Math.round((unit * Math.hypot(t.a, t.b) * Math.max(Math.abs(o.sx ?? 1), Math.abs(o.sy ?? 1))) / 2) * 2);
  const clip = model.clips[pose.anim] ?? Object.values(model.clips)[0];
  const step = Math.floor((((pose.phase % 1) + 1) % 1) * clip.duration * 24);
  const yaw = Math.round(pose.yaw * 36 / Math.PI);
  const h = pose.held, heldKey = h && models.has(h.id) ? `${h.id}|${h.at}|${(h.ang ?? 0).toFixed(4)}|${(h.lift ?? 0).toFixed(4)}|${h.scale.toFixed(2)}|${(h.off ?? 0).toFixed(3)}|${h.uncoiled ? 1 : 0}|${h.hipDown ? 1 : 0}|${h.headUp ? 1 : 0}` : '';
  if (h && !models.has(h.id)) void loadModel(h.id);
  const key = `${clip.name}|${step}|${yaw}|${ppu}|${pose.gold ? 1 : 0}|${pose.bold ? 1 : 0}|${heldKey}`;
  if (key !== s.key) {
    s.key = key;
    gold.value = pose.gold ? 1 : 0;
    outlineScale.value = pose.bold ? 1 : OUTLINE_SCALE;
    render(r, s, clip, step / 24, (yaw * Math.PI) / 36, ppu, heldKey ? h : undefined);
  }
  draw(s.frame);
  return true;
}

/** Rendering counters, for tuning (window.game.modelStats). */
export const modelStats = { renders: 0, ms: 0, copyMs: 0, shadowMs: 0 };

function render(r: WebGLRenderer, s: Slot, clip: AnimationClip, time: number, yaw: number, ppu: number, held?: Held) {
  const t0 = performance.now();
  modelStats.renders++;
  // A weapon in hand or on the back reaches further than the character does: grow the image to fit it.
  const reachOut = held ? (models.get(held.id)?.radius ?? 0) * held.scale + Math.abs(held.off ?? 0) : 0;
  const radius = s.model.radius + reachOut, height = s.model.height + reachOut * 0.8;
  const sin = Math.sin(ELEVATION), cos = Math.cos(ELEVATION);
  // The image covers the model's reach in every animation and facing, plus a margin for the outline.
  const pad = 4;
  const w = Math.ceil(radius * 2 * ppu) + pad * 2;
  const up = (height * cos + radius * sin) * ppu, down = radius * sin * ppu;
  const h = Math.ceil(up + down) + pad * 2;
  const size = r.getSize(new Vector2());
  if (size.x < w || size.y < h) r.setSize(Math.max(size.x, w, 256), Math.max(size.y, h, 256), false);
  const ch = r.domElement.height;
  // Pose it.
  for (const [name, a] of Object.entries(s.actions)) {
    if (name === clip.name) {
      a.play();
      a.time = time;
      a.weight = 1;
    } else a.stop();
  }
  s.mixer.update(0);
  s.root.rotation.y = yaw;
  placeHeld(s, held);
  // Frame it: one model unit is `ppu` pixels, with its feet `pad + up` pixels from the image's top.
  const ax = w / 2, ay = pad + up;
  Object.assign(camera, { left: -ax / ppu, right: (w - ax) / ppu, top: ay / ppu, bottom: -(h - ay) / ppu });
  camera.updateProjectionMatrix();
  lightDir.value.copy(LIGHT).transformDirection(camera.matrixWorldInverse);
  const reach = Math.max(radius, height) + 0.3;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.5, far: 20 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(s.root);
  // Where the hand ends up on screen (for effects that start from it): in camera space, one unit per model unit.
  if (s.mounts) {
    s.root.updateMatrixWorld(true);
    const p = s.mounts.hand.getWorldPosition(new Vector3()).applyMatrix4(camera.matrixWorldInverse);
    s.hand = { x: p.x, y: -p.y };
  }
  r.setViewport(0, 0, w, h);
  r.setScissor(0, 0, w, h);
  r.setScissorTest(true);
  r.clear();
  r.render(scene, camera);
  scene.remove(s.root);
  // Copy it out (WebGL's viewport starts at the bottom of the canvas).
  if (s.canvas.width !== w || s.canvas.height !== h) {
    s.canvas.width = w;
    s.canvas.height = h;
  }
  const t1 = performance.now();
  const c = s.canvas.getContext('2d')!;
  c.clearRect(0, 0, w, h);
  c.drawImage(r.domElement, 0, ch - h, w, h, 0, 0, w, h);
  modelStats.copyMs += performance.now() - t1;
  modelStats.ms += performance.now() - t0;
  s.frame = { img: s.canvas, x: 0, y: 0, w, h, ax, ay, ppu };
}

/** Call once a frame: forgets characters that haven't been drawn for a while. */
export function tickModels() {
  clock++;
  for (const [name, s] of slots) if (clock - s.seen > 120) slots.delete(name);
}

// ------------------------------------------------------------------------------------------------ crafting scenes

/**
 * Crafting and building scenes (assets/crafting3d, see src/crafting.ts): an item or building whose layers appear one
 * by one as their ingredients land, drawn with the characters' toon look and outlines. Each top-level node of the
 * model is a layer named after its id.
 */
const craftScenes = new Map<string, Object3D>(), craftFetched = new Map<string, Object3D>(), craftFetching = new Set<string>();

/** Fetches a crafting scene once; one that fails is fetched again the next time it's wanted. */
function fetchCraftScene(url: string): Promise<void> {
  if (craftScenes.has(url) || craftFetched.has(url) || craftFetching.has(url)) return Promise.resolve();
  craftFetching.add(url);
  return gltf(url, url).then(({ scene }) => { craftFetched.set(url, scene); }, (e) => console.warn(`crafting scene ${url}:`, e))
    .finally(() => craftFetching.delete(url));
}

/** Fetches every crafting scene on the title (reporting progress), so a scene never waits for its download. */
export async function loadCraftScenes(urls: string[], onProgress?: (done: number, total: number) => void) {
  let done = 0;
  await Promise.all(urls.map((url) => fetchCraftScene(url).then(() => onProgress?.(++done, urls.length))));
}

/** Readies a fetched scene for drawing the first time it's shown: the costly part, so it isn't done on the title. */
function craftScene(url: string): Object3D | undefined {
  let scene = craftScenes.get(url);
  if (scene) return scene;
  scene = craftFetched.get(url);
  if (!scene) {
    void fetchCraftScene(url);
    return undefined;
  }
  craftFetched.delete(url);
  scene.updateMatrixWorld(true);
  // Each layer becomes a plain node holding its meshes, so its meshes merge under it.
  for (const node of [...scene.children]) {
    const layer = new Object3D();
    layer.name = node.name;
    node.name = '';
    scene.add(layer);
    layer.attach(node);
  }
  mergeParts(scene, new Set(scene.children.map((c) => c.name)));
  craftScenes.set(url, scene);
  return scene;
}

/** A crafting scene playing on a canvas. */
export interface CraftView {
  /** Where a layer's middle is on the canvas, in CSS pixels from its top-left (where its ingredients land). */
  at(layer: string): { x: number; y: number };
  /** Shows a layer: at once, or arriving with a contact's motion. */
  show(layer: string, contact?: CraftContact): void;
  /** The finished piece: every layer but `gone`, then a slow sway. */
  reveal(gone: string[]): void;
  /** Draws the scene as it is at `now` (a frame time). */
  frame(now: number): void;
}

/** How each contact moves the layer that lands: [time 0–1, scale across, scale up, rise (× the scene's size)]. */
const ARRIVE: Record<CraftContact, { ms: number; keys: number[][] }> = {
  soft: { ms: 370, keys: [[0, 0.4, 0.28, 0], [0.45, 1.11, 0.85, 0], [0.72, 0.96, 1.04, 0], [1, 1, 1, 0]] },
  bind: { ms: 240, keys: [[0, 0.9, 1.06, 0], [1, 1, 1, 0]] },
  solid: { ms: 280, keys: [[0, 0.94, 0.94, 0.03], [0.65, 1.02, 0.98, -0.008], [1, 1, 1, 0]] },
  energy: { ms: 340, keys: [[0, 0.7, 0.7, 0], [0.65, 1.07, 1.07, 0], [1, 1, 1, 0]] },
};
/** …and the whole piece answers some of them: a squeeze as goo binds, a little dip as something solid sets. */
const ANSWER: Partial<Record<CraftContact, { ms: number; keys: number[][] }>> = {
  bind: { ms: 220, keys: [[0, 1, 1, 0], [0.5, 1.025, 0.975, 0], [1, 1, 1, 0]] },
  solid: { ms: 180, keys: [[0, 1, 1, 0], [0.5, 1, 1, -0.008], [1, 1, 1, 0]] },
};

/** Eases out over the whole motion, then steps linearly through its keys. */
function motion(keys: number[][], t: number): number[] {
  const e = 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;
  let i = 1;
  while (i < keys.length - 1 && keys[i][0] < e) i++;
  const [a, b] = [keys[i - 1], keys[i]], k = (e - a[0]) / (b[0] - a[0] || 1);
  return [1, 2, 3].map((j) => a[j] + (b[j] - a[j]) * k);
}

/**
 * The fixed 3/4 views the scenes are seen from (a little from above for gear on the bench, the map's angle for
 * buildings), and how far a finished piece sways either side of it.
 */
const CRAFT_VIEW = { gear: { yaw: -0.42, elevation: 0.36 }, building: { yaw: -0.49, elevation: MODEL_ELEVATION } };
const CRAFT_SWAY = { gear: 0.28, building: 0.1 };

/**
 * Starts a crafting scene on `canvas` with the `shown` layers already in place, or null if it can't be drawn (no
 * WebGL, or its model didn't load). The whole model is framed to fill the canvas, however it sways.
 */
/** How long a finished piece's one sway takes. */
const SWAY_MS = 8800;

export function craftView(canvas: HTMLCanvasElement, url: string, shown: string[], kind: 'gear' | 'building' = 'gear'): CraftView | null {
  const prepared = craftScene(url);
  const r = prepared && gl();
  if (!prepared || !r) return null;
  const { yaw, elevation } = CRAFT_VIEW[kind], sway = CRAFT_SWAY[kind];
  const eye = new OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  eye.position.set(0, Math.sin(elevation) * 20, Math.cos(elevation) * 20);
  eye.lookAt(0, 0, 0);
  eye.updateMatrixWorld();
  const model = prepared.clone(true), turn = new Object3D();
  turn.add(model);
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model, true), centre = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3()).length();
  // Each layer turns and squashes about its own middle.
  const layers = new Map<string, { pivot: Object3D; rest: Vector3; arrive?: { contact: CraftContact; start: number } }>();
  for (const node of [...model.children]) {
    const pivot = new Object3D();
    new Box3().setFromObject(node, true).getCenter(pivot.position);
    model.add(pivot);
    pivot.attach(node);
    pivot.visible = shown.includes(node.name);
    layers.set(node.name, { pivot, rest: pivot.position.clone() });
  }
  model.position.copy(centre).negate();
  // Frame what the camera sees of the model over its whole sway, with a little room for the layers' overshoot.
  const view = new Box3(), seen = new Object3D();
  seen.matrixAutoUpdate = false;
  seen.matrix.copy(eye.matrixWorldInverse);
  seen.add(turn);
  for (const k of [-1, 0, 1]) {
    turn.rotation.y = yaw + k * sway;
    seen.updateMatrixWorld(true);
    view.union(new Box3().setFromObject(seen, true));
  }
  seen.remove(turn);
  const css = { w: canvas.clientWidth || 258, h: canvas.clientHeight || 258 };
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(css.w * dpr);
  canvas.height = Math.round(css.h * dpr);
  const mid = view.getCenter(new Vector3()), span = view.getSize(new Vector3());
  const unit = Math.max((span.x * 1.12) / css.w, (span.y * 1.12) / css.h);
  Object.assign(eye, { left: mid.x - (css.w / 2) * unit, right: mid.x + (css.w / 2) * unit, top: mid.y + (css.h / 2) * unit, bottom: mid.y - (css.h / 2) * unit });
  eye.updateProjectionMatrix();
  const ctx = canvas.getContext('2d')!;
  let answer: { contact: CraftContact; start: number } | undefined, swayFrom: number | null = null, drawn = false;

  const pose = (now: number) => {
    let moving = false;
    for (const layer of layers.values()) {
      const a = layer.arrive;
      if (!a) continue;
      const t = (now - a.start) / ARRIVE[a.contact].ms;
      const [across, up, rise] = motion(ARRIVE[a.contact].keys, t);
      layer.pivot.scale.set(across, up, across);
      layer.pivot.position.copy(layer.rest).y += rise * size;
      if (t >= 1) layer.arrive = undefined;
      moving = true;
    }
    if (answer) {
      const spec = ANSWER[answer.contact]!, t = (now - answer.start) / spec.ms;
      const [across, up, rise] = motion(spec.keys, t);
      turn.scale.set(across, up, across);
      turn.position.y = rise * size;
      if (t >= 1) answer = undefined;
      moving = true;
    }
    // One slow sway there and back, then it rests: no drawing every frame while you read the popup.
    if (swayFrom !== null && now - swayFrom >= SWAY_MS) swayFrom = null, moving = true;
    turn.rotation.y = yaw + (swayFrom === null ? 0 : sway * Math.sin(((now - swayFrom) / SWAY_MS) * Math.PI * 2));
    return moving || swayFrom !== null;
  };

  const render = () => {
    const w = canvas.width, h = canvas.height;
    const have = r.getSize(new Vector2());
    if (have.x < w || have.y < h) r.setSize(Math.max(have.x, w), Math.max(have.y, h), false);
    lightDir.value.copy(LIGHT).transformDirection(eye.matrixWorldInverse);
    const reach = size;
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.5, far: 20 + reach });
    sun.shadow.camera.updateProjectionMatrix();
    gold.value = 0;
    outlineScale.value = 1;
    scene.add(turn);
    r.setViewport(0, 0, w, h);
    r.setScissor(0, 0, w, h);
    r.setScissorTest(true);
    r.clear();
    r.render(scene, eye);
    scene.remove(turn);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(r.domElement, 0, r.domElement.height - h, w, h, 0, 0, w, h);
  };

  return {
    at(name) {
      const pivot = layers.get(name)?.pivot;
      if (!pivot) return { x: css.w / 2, y: css.h / 2 };
      turn.updateMatrixWorld(true);
      const p = pivot.getWorldPosition(new Vector3()).applyMatrix4(eye.matrixWorldInverse);
      return { x: (p.x - eye.left) / unit, y: (eye.top - p.y) / unit };
    },
    show(name, contact) {
      const layer = layers.get(name);
      if (!layer) return;
      layer.pivot.visible = true;
      if (contact) {
        layer.arrive = { contact, start: performance.now() };
        if (ANSWER[contact]) answer = { contact, start: performance.now() };
      }
      drawn = false;
    },
    reveal(gone) {
      for (const [name, layer] of layers) {
        layer.pivot.visible = !gone.includes(name);
        layer.arrive = undefined;
        layer.pivot.scale.setScalar(1);
        layer.pivot.position.copy(layer.rest);
      }
      answer = undefined;
      turn.scale.setScalar(1);
      turn.position.y = 0;
      swayFrom = performance.now();
      drawn = false;
    },
    frame(now) {
      if (pose(now) || !drawn) render();
      drawn = true;
    },
  };
}
