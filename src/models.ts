// Characters in real-time 3D: the hero, villagers and monsters, drawn from the models in assets/models (exported from
// the Blender scenes by art/models.py) with a cel shader that recreates the game's Blender material, lit side and
// shadow side, cast shadows and inverted-hull outlines.
//
// The world stays 2D. Each character is rendered into its own small image at the exact on-screen size, and that image
// is drawn wherever a sprite would be, so everything that works on sprites (depth sorting with trees and houses,
// flipping, hit flashes, tints, squash and stretch, fading) works unchanged. An image is only re-rendered when its
// pose, facing or size changes.
import {
  AnimationMixer, BackSide, Box3, BufferAttribute, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, LoopRepeat,
  Matrix4, Mesh, Object3D, OrthographicCamera, PCFShadowMap, Quaternion, Scene, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3, WebGLRenderer,
  type AnimationAction, type AnimationClip,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { DrawOpts, Frame } from './assets';

// ------------------------------------------------------------------------------------------------------------ look

/** The Blender scenes' key light (upper left, in front of the camera), in three.js axes. */
const LIGHT = new Vector3(-0.439, 0.643, 0.627).normalize();
const ELEVATION = (30 * Math.PI) / 180;
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
function mergeParts(root: Object3D, clips: AnimationClip[]) {
  const moving = new Set(clips.flatMap((c) => c.tracks.map((t) => t.name.slice(0, t.name.lastIndexOf('.')))));
  root.updateMatrixWorld(true);
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
    const width = p.getZ(0);
    if (width > 0) {
      // Smooth normals across hard edges so the shell has no gaps, then the width per vertex.
      const shell = new BufferGeometry();
      shell.setAttribute('position', g.getAttribute('position').clone());
      if (g.index) shell.setIndex(g.index.clone());
      const smooth = mergeVertices(shell, 1e-4);
      smooth.computeVertexNormals();
      smooth.setAttribute('thickness', new Float32BufferAttribute(new Float32Array(smooth.attributes.position.count).fill(width), 1));
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

/** Loads a model (once); resolves null if it can't be (the caller keeps its sprite or drawing). */
export function loadModel(id: string): Promise<Model | null> {
  const have = models.get(id);
  if (have) return Promise.resolve(have);
  let p = loading.get(id);
  if (!p && (retryAt.get(id) ?? 0) > performance.now()) return Promise.resolve(null);
  if (!p) {
    loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    p = loader.loadAsync(`assets/models/${id}.glb`).then((gltf) => {
      const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
      mergeParts(gltf.scene, gltf.animations);
      const m: Model = { root: gltf.scene, clips, ...measure(gltf.scene, clips) };
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

/** Can this browser do WebGL at all? Checked quietly first, since three.js logs errors when it can't. */
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
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
  mounts?: { hand: Object3D; back: Object3D; hip: Object3D };
  weapon?: { id: string; obj: Object3D };
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
    s.mounts = { hand: mount(arm, 0.03, -0.15, 0.01), back: mount(body, 0.2, 0.52, -0.27), hip: mount(body, 0.29, 0.14, -0.02) };
  }
  slots.set(name, s);
  return s;
}

/**
 * Something held or carried: a weapon model (wpn_<id>), in the hand pointing along `ang` on the ground (radians: 0 to
 * the right, π/2 toward the camera) raised by `lift`, or on the back, or at the hip (`hipDown`: pointing down, like
 * a wand in a belt, rather than hanging sideways like a coiled whip). `scale`: its size in the character's units.
 */
export interface Held { id: string; at: 'hand' | 'back' | 'hip'; ang?: number; lift?: number; scale: number; hipDown?: boolean; headUp?: boolean }

const DOWN = new Vector3(0, -1, 0);
/** The camera looks down 30° from the front: blades turn their flat side toward it, as the sprites were drawn. */
const TO_CAMERA = new Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
const tmpQ = new Quaternion(), tmpV = new Vector3(), tmpM = new Matrix4();

/** Puts the weapon in the right place for this render: in the hand (turning the arm to hold it out), or stowed. */
function placeHeld(s: Slot, held: Held | undefined) {
  if (!s.mounts || !s.arm) return;
  const wanted = held && models.get(held.id);
  if (held && !wanted) void loadModel(held.id);
  if (s.weapon && (!wanted || s.weapon.id !== held!.id)) {
    s.weapon.obj.removeFromParent();
    s.weapon = undefined;
  }
  if (!wanted || !held) return;
  if (!s.weapon) s.weapon = { id: held.id, obj: wanted.root.clone(true) };
  const w = s.weapon.obj;
  w.scale.setScalar(held.scale);
  s.mounts[held.at].add(w);
  s.root.updateMatrixWorld(true);
  if (held.at === 'hand') {
    w.position.set(0, 0, 0);
    // Where the weapon points, in the world: along the ground at `ang`, tilted up by `lift`.
    const lift = held.lift ?? 0, ang = held.ang ?? 0;
    const dir = new Vector3(Math.cos(ang) * Math.cos(lift), Math.sin(lift), Math.sin(ang) * Math.cos(lift)).normalize();
    // The arm reaches out that way (a little below it, as an arm would), turned in the body's frame.
    const armDir = tmpV.copy(dir).addScaledVector(DOWN, 0.55).normalize();
    const parentQ = s.arm.parent!.getWorldQuaternion(new Quaternion());
    s.arm.quaternion.copy(parentQ.invert().multiply(tmpQ.setFromUnitVectors(DOWN, armDir)));
    s.root.updateMatrixWorld(true);
    // The blade along `dir`, its flat side turned toward the camera.
    const normal = TO_CAMERA.clone().addScaledVector(dir, -TO_CAMERA.dot(dir)).normalize();
    const side = new Vector3().crossVectors(normal, dir);
    const worldQ = new Quaternion().setFromRotationMatrix(tmpM.makeBasis(dir, side, normal));
    const mountQ = s.mounts.hand.getWorldQuaternion(new Quaternion());
    w.quaternion.copy(mountQ.invert().multiply(worldQ));
  } else if (held.at === 'back') {
    // Strapped across the back. A blade goes hilt up over the right shoulder (so it shows from the front) and down to
    // the left hip; a hammer goes the other way up, its grip low at the right hip and its head up behind the left
    // shoulder, where it peeks out from every side.
    w.position.set(0, held.headUp ? -0.3 : 0, 0);
    // (The hammer leans well out to the side, or the big head hides it from the front.)
    w.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), held.headUp ? new Vector3(-0.95, 0.7, -0.25).normalize() : new Vector3(-0.62, -1, -0.12).normalize());
  } else {
    w.position.set(0, 0, 0);
    // At the right hip: a wand tucked in the belt pointing down, or a whip's coils hanging flat against the thigh.
    w.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), held.hipDown ? new Vector3(0.1, -1, 0.2).normalize() : new Vector3(0.1, -0.35, 1).normalize());
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
  const h = pose.held, heldKey = h && models.has(h.id) ? `${h.id}|${h.at}|${Math.round((h.ang ?? 0) * 36 / Math.PI)}|${Math.round((h.lift ?? 0) * 20)}|${h.scale.toFixed(2)}` : '';
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
  const reachOut = held ? (models.get(held.id)?.radius ?? 0) * held.scale : 0;
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

