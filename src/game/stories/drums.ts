// Poppy runs into a dark cave. Follow a core-bearing procession, hiding from its eye beams,
// then reach her by the passage above a barred ritual chamber. She makes the peaceful exchange
// and brings the Pebblors' gift back to you. Saved story indices remain compatible with earlier saves.
import type { ActorSpec } from '../../actors';
import { drawFrame, frame } from '../../assets';
import { zoneById } from '../../data';
import type { MapLayers } from '../../overworld';
import {
  BARRIERS, BENDS, CATCH_AT, CLIMB, FORMATION, LANDING, LAY_AT, MOUTH, NEW_TOTEM, POPPY_AT, POPPY_PATH, POPPY_START, PACE, Procession, REAR, RING, SIGHT, TOTEMS,
  along, beamEnd, clearLine, drumsOpen, drumsStep, inPocket, inSideArea, rejoinAt, sees, type ProcessionEvent,
} from '../../procession';
import { hash2, type WorldObj } from '../../world';
import { busy, G, persist, syncWorld, tip, transition } from '../context';
import { bubble, lookAt, narrate, pan, say, scene, walk, wait } from '../scenes';
import { syncStories, type Story } from '../stories';
import { GRANNY, GRANNY_AT, GRANNY_ID } from './granny';
import { POPPY_TALK } from './poppy';
import { ECHO_EXIT } from '../../echoCave';

const TAU = Math.PI * 2;
const POPPY = 'drums:poppy';
const GOLEMS = FORMATION.map((_, i) => `drums:g${i}`);
const C = zoneById('cave').x0;
const at = (x: number, y: number) => ({ x: C + x, y });

/** Poppy's petals, from the chamber back down through the tunnels and the Cavern to its west gate: her way home. */
const PETALS = [
  POPPY_AT, at(30.6, 1.5), at(30.6, 3.4), at(30.6, 6.4), at(26.5, 6.4), at(26.5, 8.9), at(25, 9.6), at(24.6, 12.4), at(19.2, 12.5),
  at(18.6, 13.6), at(13.6, 13.8), at(13.2, 15.6), at(11.5, 15.4), at(11.5, 11.6), at(7.6, 11.5), at(6, 12.6), at(5.6, 14.6), at(0.3, 14.6),
];

const near = (p: { x: number; y: number }, r: number) => Math.hypot(G.over.x - p.x, G.over.y - p.y) < r;
const inVillage = () => G.over.currentZone.id === 'village';
const you = () => ({ x: G.over.x, y: G.over.y });

// What's going on in the tunnels (not saved: a reload starts the procession again from the shaft).
let proc: Procession | null = null;
/** The opening scene: they walk up into the tunnels, and nobody looks back. */
let intro = false;
/** Falling into the pocket below, or climbing out of it. */
let moving = false;
let falls = 0;
/** Footfall echoes: where, when (seconds on the clock below) and how strong. */
let ripples: { x: number; y: number; t: number; k: number }[] = [];
/** The floor cracking under you. */
let crack: { x: number; y: number; t: number } | null = null;
/** The glowing core: carried by the lead pair, or laid in the ring. */
let figure: 'carried' | 'laid' | null = null;
/** The new totem going up, 0 to 1, during the scene. */
let rise = -1;
/** How dark it is round you (eased toward the place you're in), how hidden the side area is from outside, and the clock for both. */
let dim = 0, clock = 0, last = 0;
const darkCanvas = document.createElement('canvas');
const darkCtx = darkCanvas.getContext('2d')!;

/** For the e2e test and the console: what's going on, and the spot `d` tiles behind the procession's rear on its way. */
export const drumsDebug = () => ({ proc, falls, figure, intro, moving, trail: (d: number) => along((proc?.s ?? 0) - FORMATION[REAR].back - d) });

/** Make sure there's a procession (a fresh one up the shaft, after a reload). */
const procession = () => (proc ??= new Procession(2.4));

const golem = (i: number, p: { x: number; y: number }, face: number): ActorSpec => ({
  id: GOLEMS[i], look: { kind: 'monster', name: 'golem' }, x: p.x, y: p.y, face, speed: 1.6,
});

/** How loud an echo is from this far away (1 close by, fading out across the Cavern). */
const echo = (d: number) => Math.max(0, Math.min(1, 1 - (d - 2.5) / 12));

function onEvents(ev: ProcessionEvent[]) {
  const p = proc!, ms = p.members(), mid = { x: ms.reduce((a, m) => a + m.x, 0) / ms.length, y: ms.reduce((a, m) => a + m.y, 0) / ms.length };
  for (const e of ev) {
    if (e === 'step') {
      const k = echo(Math.hypot(mid.x - G.over.x, mid.y - G.over.y));
      if (k <= 0) continue;
      G.audio.play('stomp', 0.15 + 0.85 * k ** 1.4);
      ripples.push({ ...mid, t: clock, k });
    } else if (e === 'warn') {
      bubble(GOLEMS[REAR], '❓', PACE.warn + 0.2);
    } else if (e === 'look') {
      bubble(GOLEMS[REAR], '👀', PACE.look);
    } else if (e === 'spotted') {
      void fall();
    } else if (e === 'arrived') {
      tip('drums:chamber', '🌸 Poppy is above the gate. Take the narrow passage at the far end of the tunnel and talk to her.');
      // Into the chamber: the lead pair to the ring's middle with the figure, the others to their places.
      void walk(GOLEMS[0], [{ x: LAY_AT.x - 0.4, y: LAY_AT.y + 0.5 }]);
      void walk(GOLEMS[1], [{ x: LAY_AT.x + 0.4, y: LAY_AT.y + 0.5 }]);
      void walk(GOLEMS[2], [RING[0]]);
      void walk(GOLEMS[3], [RING[3]]);
    }
  }
}

/** Spotted: it stamps, the floor cracks, and down you go into the tunnel below. */
async function fall() {
  if (moving) return;
  moving = true;
  falls++;
  bubble(GOLEMS[REAR], '❗', 1.6);
  G.mode = 'dialog';
  G.input.reset();
  G.audio.play('cave-in');
  crack = { x: G.over.x, y: G.over.y, t: clock };
  await wait(700);
  transition(() => {
    G.over.relocate(LANDING.x, LANDING.y);
    G.over.face = 0;
    crack = null;
    G.mode = 'world';
    moving = false;
    persist();
    G.ui.toast(falls === 1 ? '🕳️ The floor gave way! Find the way back up: the procession will wait.' : '🕳️ Down again! Back up the slope.', 3600);
  });
}

/** Up the rubble slope at the pocket's far end, back to the trail: the last bend behind the procession. */
function climb() {
  moving = true;
  G.mode = 'dialog';
  G.input.reset();
  G.audio.play('step');
  transition(() => {
    const p = proc && drumsStep(G.save) === 2 ? rejoinAt(proc.s - FORMATION[REAR].back) : along(BENDS[0]);
    G.over.relocate(p.x, p.y + 0.1);
    G.mode = 'world';
    moving = false;
    persist();
  });
}

/** The side area's props: the totems, the new one (once it's up), the core laid before it, the cave mouth and lattices, the slope out of the pocket. */
const prop = (id: string, p: { x: number; y: number }, w: number, h: number, shown?: WorldObj['shown']): WorldObj => ({
  kind: 'prop', id, zone: 'cave', x: p.x - w / 2, y: p.y - h, w, h, label: '', shown,
});
const raised = (s: { stories: Record<string, number> }) => (s.stories.drums ?? 0) >= 3;
const NEW_PROP = prop('prop_totem_new', NEW_TOTEM, 0.6, 0.35, raised);
const FIGURE_PROP = prop('prop_echo_core', LAY_AT, 0.7, 0.25, raised);
const OBJS: WorldObj[] = [
  ...TOTEMS.map((p, i) => prop(i === 1 ? 'prop_totem1' : 'prop_totem0', p, 0.6, 0.35)),
  NEW_PROP,
  FIGURE_PROP,
  ...BARRIERS,
  // Not solid: you walk onto the slope to climb it.
  prop('prop_climb', { x: CLIMB.x, y: CLIMB.y - 0.25 }, 0.01, 0.01),
];
const ENTRANCE: WorldObj = { ...prop('prop_cavemouth', { x: MOUTH.x, y: 9 }, 2.4, .6), label: 'Enter cave', walkable: true };

// ---------------------------------------------------------------- painting

/** A ripple: a ring spreading out where they stepped, or (if that's off screen) an arc on the screen's edge, toward them. */
function drawRipple(ctx: CanvasRenderingContext2D, ts: number, view: { x: number; y: number; w: number; h: number }, r: { x: number; y: number; t: number; k: number }) {
  const age = (clock - r.t) / 1.1;
  if (age >= 1) return;
  const a = (1 - age) * (0.35 + 0.65 * r.k), px = r.x * ts, py = (r.y - 0.15) * ts;
  ctx.save();
  ctx.strokeStyle = `rgba(214,236,255,${a})`;
  ctx.lineWidth = ts * (0.05 + 0.06 * r.k) * (1 - age * 0.5);
  const m = ts * 0.6;
  if (px > view.x + m && px < view.x + view.w - m && py > view.y + m && py < view.y + view.h - m) {
    for (const lag of [0, 0.22]) {
      const q = age - lag;
      if (q < 0) continue;
      ctx.beginPath();
      ctx.ellipse(px, py, ts * (0.3 + q * 1.6), ts * (0.15 + q * 0.8), 0, 0, TAU);
      ctx.stroke();
    }
  } else {
    // Pinned to the screen's edge, toward where the sound came from.
    const cx = view.x + view.w / 2, cy = view.y + view.h / 2, ang = Math.atan2(py - cy, px - cx);
    const k = Math.min((view.w / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (view.h / 2 - m * 2.5) / Math.abs(Math.sin(ang) || 1e-6));
    const ex = cx + Math.cos(ang) * k, ey = cy + Math.sin(ang) * k;
    for (const lag of [0, 0.22]) {
      const q = age - lag;
      if (q < 0) continue;
      ctx.beginPath();
      ctx.arc(ex, ey, ts * (0.3 + q * 0.9), ang - 0.9, ang + 0.9);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Light originates at the eyes, and every edge stops at the same cover used by detection. */
function drawGaze(ctx: CanvasRenderingContext2D, ts: number) {
  const p = proc!, r = p.rear, look = p.phase === 'look';
  const eye = { x: r.x, y: r.y - 0.3 };
  // Lift the sight plane to eye/chest height when projecting it onto the screen.
  const lift = 0.38;
  const x = eye.x * ts, y = (eye.y - lift) * ts;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(x, y, 0, x, y, SIGHT.range * ts);
  glow.addColorStop(0, look ? 'rgba(180,248,255,.62)' : 'rgba(150,226,255,.28)');
  glow.addColorStop(1, 'rgba(95,188,235,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= 64; i++) {
    const end = beamEnd(G.over.map, eye, p.gaze - SIGHT.half + 2 * SIGHT.half * i / 64);
    ctx.lineTo(end.x * ts, (end.y - lift) * ts);
  }
  ctx.closePath();
  ctx.fill();
  // Two bright shafts inside the soft beam. No ground outline or dashed warning wedge.
  for (const offset of [-0.045, 0.045]) {
    const end = beamEnd(G.over.map, eye, p.gaze + offset);
    const shaft = ctx.createLinearGradient(x, y, end.x * ts, (end.y - lift) * ts);
    shaft.addColorStop(0, 'rgba(224,255,255,.95)');
    shaft.addColorStop(1, 'rgba(125,220,255,0)');
    ctx.strokeStyle = shaft;
    ctx.lineWidth = ts * (look ? .045 : .025);
    ctx.beginPath(); ctx.moveTo(x + offset * ts, y); ctx.lineTo(end.x * ts, (end.y - lift) * ts); ctx.stroke();
    ctx.fillStyle = '#d9ffff';
    ctx.beginPath(); ctx.arc(x + offset * ts, y, ts * .035, 0, TAU); ctx.fill();
  }
  if (look && sees(G.over.map, r, p.gaze, you())) {
    ctx.strokeStyle = 'rgba(210,255,255,.9)';
    ctx.lineWidth = ts * .04;
    ctx.beginPath(); ctx.arc(G.over.x * ts, (G.over.y - .65) * ts, ts * .32, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

/** Cracks running out from your feet as the floor gives. */
function drawCrack(ctx: CanvasRenderingContext2D, ts: number) {
  const c = crack!, grow = Math.min(1, (clock - c.t) / 0.45);
  ctx.save();
  ctx.strokeStyle = 'rgba(30,20,40,0.85)';
  ctx.lineWidth = ts * 0.06;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    let x = c.x * ts, y = c.y * ts, ang = (i / 7) * TAU + hash2(i, 3, 9);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      ang += (hash2(i, j, 5) - 0.5) * 1.2;
      x += Math.cos(ang) * ts * 0.35 * grow;
      y += Math.sin(ang) * ts * 0.2 * grow;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Poppy's petals along her way home: a few pink and white flecks every so often. */
function drawPetals(ctx: CanvasRenderingContext2D, ts: number, path = PETALS) {
  const sprite = frame('env/prop_petals');
  let carry = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = carry; d < len; d += 1.3) {
      const x = a.x + ((b.x - a.x) * d) / len + (hash2(i, Math.round(d * 10), 4) - 0.5) * 0.3, y = a.y + ((b.y - a.y) * d) / len;
      if (sprite) drawFrame(ctx, sprite, x * ts, y * ts, ts / 1.6, { rot: hash2(i, Math.round(d * 10), 6) * TAU * 0.1 });
      else {
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = k === 1 ? '#fff4f8' : '#ff9ac0';
          ctx.beginPath();
          ctx.ellipse((x + (k - 1) * 0.12) * ts, (y + hash2(i, k, 7) * 0.1) * ts, ts * 0.07, ts * 0.04, k, 0, TAU);
          ctx.fill();
        }
      }
      carry = d + 1.3 - len;
    }
  }
}

/** The core in the lead pair's arms, or laid in the ring (before it's a prop), and the new totem going up. */
function drawCeremony(ctx: CanvasRenderingContext2D, ts: number) {
  const f = frame('env/prop_echo_core'), unit = ts / 1.6;
  const lead = [G.over.cast.get(GOLEMS[0]), G.over.cast.get(GOLEMS[1])];
  if (figure === 'carried' && f && lead[0] && lead[1]) {
    const bob = Math.sin(clock * 5) * ts * 0.03;
    // Held up between them, at shoulder height.
    drawFrame(ctx, f, ((lead[0].x + lead[1].x) / 2) * ts, ((lead[0].y + lead[1].y) / 2 - 0.62) * ts + bob, unit * 1.15);
  } else if (figure === 'laid' && f && FIGURE_PROP.hidden) drawFrame(ctx, f, LAY_AT.x * ts, (LAY_AT.y - 0.2) * ts, unit);
  // (Until the map syncs after the scene, when they're props like the rest.)
  const t = frame('env/prop_totem_new');
  if (rise > 0 && t && NEW_PROP.hidden) drawFrame(ctx, t, NEW_TOTEM.x * ts, (NEW_TOTEM.y - 0.2) * ts, unit, { sy: rise, rot: (1 - rise) * 0.25 });
}

/** Darkness is a mask with small, wall-clipped pools of light: mainly the carried core. */
function drawDark(ctx: CanvasRenderingContext2D, ts: number, view: { x: number; y: number; w: number; h: number }) {
  const cave = G.over.currentZone.id === 'cave', me = you();
  const underground = !!G.over.underground;
  // The main cavern stays readable everywhere; the secluded tunnels keep the deeper mood.
  const want = cave ? (underground ? .78 : .28) : 0;
  dim += (want - dim) * Math.min(1, Math.max(0, clock - last) * 5);
  if (dim < .01) return;
  const w = Math.ceil(view.w), h = Math.ceil(view.h);
  if (darkCanvas.width !== w || darkCanvas.height !== h) { darkCanvas.width = w; darkCanvas.height = h; }
  const m = darkCtx;
  m.clearRect(0, 0, w, h);
  m.fillStyle = `rgba(7,9,20,${dim})`; m.fillRect(0, 0, w, h);
  const lights: { x: number; y: number; radius: number }[] = [];
  const light = (p: { x: number; y: number }, radius: number, strength: number) => {
    lights.push({ ...p, radius });
    const eye = { x: p.x, y: p.y - .3 };
    const x = eye.x * ts - view.x, y = eye.y * ts - view.y;
    if (x < -radius * ts || x > w + radius * ts || y < -radius * ts || y > h + radius * ts) return;
    m.save(); m.beginPath();
    for (let i = 0; i <= 64; i++) {
      const end = beamEnd(G.over.map, eye, i / 64 * TAU, radius);
      const ex = end.x * ts - view.x, ey = end.y * ts - view.y;
      if (!i) m.moveTo(ex, ey); else m.lineTo(ex, ey);
    }
    m.closePath(); m.clip();
    m.globalCompositeOperation = 'destination-out';
    const glow = m.createRadialGradient(x, y, ts * .25, x, y, radius * ts);
    glow.addColorStop(0, `rgba(0,0,0,${strength})`);
    glow.addColorStop(.55, `rgba(0,0,0,${strength * .75})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = glow; m.fillRect(0, 0, w, h); m.restore();
  };
  light(me, underground ? 3.3 : 4.8, .9);
  if (!underground) light(MOUTH, 4, .8);
  else light(ECHO_EXIT, 2.5, .8);
  const lead = G.over.cast.get(GOLEMS[0]);
  if (underground && figure === 'carried' && lead) light(lead, 3.0, 1);
  if (underground && (figure === 'laid' || drumsStep(G.save) >= 3)) light(LAY_AT, 3.8, 1);
  const poppy = G.over.cast.get(POPPY);
  if (poppy) light(poppy, 1.45, .7);
  // The map's walls live on the floor plane, while heads rise above it. Keep a lit
  // character's upper body visible without opening another pool of light through a wall.
  for (const a of [me, ...G.over.cast.list.filter((a) => a.id.startsWith('drums:'))]) {
    if (a !== me && !lights.some((l) => Math.hypot(a.x - l.x, a.y - l.y) < l.radius * .85
      && clearLine(G.over.map, { x: l.x, y: l.y - .3 }, { x: a.x, y: a.y - .3 }))) continue;
    const x = a.x * ts - view.x, y = (a.y - .65) * ts - view.y;
    m.save(); m.globalCompositeOperation = 'destination-out';
    const body = m.createRadialGradient(x, y, ts * .14, x, y, ts * .65);
    body.addColorStop(0, 'rgba(0,0,0,.85)'); body.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = body; m.fillRect(x - ts * .65, y - ts * .65, ts * 1.3, ts * 1.3); m.restore();
  }
  ctx.drawImage(darkCanvas, view.x, view.y);
}

const layers: Partial<MapLayers> = {
  // The tunnels run along the top of the Cavern: let the camera look up past it, so they're clear of the HUD.
  headroom: () => G.over.underground ? 3 : 0,
  ground(ctx, ts) {
    if (G.over.currentZone.id !== 'cave') return;
    if (drumsStep(G.save) === 3) drawPetals(ctx, ts, G.over.underground ? PETALS.slice(0, 6) : PETALS.slice(5));
    if (drumsStep(G.save) === 2 && proc?.phase === 'arrived') drawPetals(ctx, ts, PETALS.slice(0, 3));
    if (crack) drawCrack(ctx, ts);
  },
  over(ctx, ts, view) {
    const now = performance.now() / 1000;
    last = clock;
    clock = now;
    if (G.over.currentZone.id !== 'cave' && dim < 0.01) return;
    if (G.over.underground) drawCeremony(ctx, ts);
    drawDark(ctx, ts, view);
    if (G.over.underground && proc && drumsStep(G.save) === 2 && (proc.phase === 'warn' || proc.phase === 'look')) drawGaze(ctx, ts);
    ripples = ripples.filter((r) => clock - r.t < 1.1);
    for (const r of ripples) drawRipple(ctx, ts, view, r);
  },
};

export const DRUMS: Story = {
  id: 'drums',
  title: 'The Drums in the Dark',
  icon: '🪘',
  available: () => drumsOpen(G.save),
  objs: [ENTRANCE],
  undergroundObjs: OBJS,
  castSpace: (step) => step === 0 ? 'world' : 'echo',
  layers,

  steps: [
    {
      id: 'entrance', label: 'Follow Poppy into the cave',
      target: () => POPPY_START,
      done: () => !G.over.underground && G.over.currentZone.id === 'cave' && near(POPPY_START, 4.2),
      async then() {
        await scene(async () => {
          await pan(POPPY_START.x, POPPY_START.y - .7, 600);
          bubble(POPPY, '👂', 2);
          await say(POPPY_TALK, 'Listen… those drums. Someone is calling from inside.');
          await walk(POPPY, [MOUTH], 4.5);
          G.over.actors.remove(POPPY);
          await wait(400);
        });
      },
    },
    {
      id: 'catch', label: 'Catch up with Poppy and talk to her',
      target: () => G.over.underground ? CATCH_AT : MOUTH,
      done: () => !!G.over.underground && G.save.flags.includes('drums:caught'),
      async then() {
        // A procession, carrying a glowing core into the side tunnels.
        proc = new Procession(2.4);
        figure = 'carried';
        intro = true;
        syncStories();
        const poppy = G.over.cast.get(POPPY);
        if (poppy) Object.assign(poppy, CATCH_AT);
        try {
          await scene(async () => {
            await pan(MOUTH.x, MOUTH.y - 2, 900);
            await narrate('Pebblors, in a slow, quiet line. The front two cradle a glowing core between them.');
            await say(POPPY_TALK, 'I can fit through the little passage above their gate. Follow their footsteps; I’ll meet you there.');
            const ahead = walk(POPPY, [at(26.5, 6.6), at(30.6, 6.6), ...POPPY_PATH], 4.2);
            await narrate('Follow them, but keep back. Their footsteps echo. Don\'t let them see you.');
            await ahead;
          });
        } finally {
          intro = false;
        }
        tip('drums:look', '👀 When the last one turns to look back, duck behind a pillar or round a corner.');
      },
    },
    {
      id: 'tail',
      get label() { return proc?.phase === 'arrived' ? 'Talk to Poppy above the gate' : 'Follow the Pebblors, unseen'; },
      // In the Cavern you go by their echoes; anywhere else, the arrow takes you back to the tunnels.
      noArrow: () => proc?.phase !== 'arrived' && !!G.over.underground,
      target: () => !G.over.underground ? MOUTH : proc?.phase === 'arrived' ? POPPY_AT : MOUTH,
      done: () => !!G.over.underground && proc?.phase === 'arrived' && G.save.flags.includes('drums:listen') && near(POPPY_AT, 1.8),
      async then() {
        // Commit the unique gift before the cinematic can be interrupted by a reload.
        if (!G.save.perks.includes('echoanklet')) G.save.perks.push('echoanklet');
        persist();
        await scene(async () => {
          await pan(LAY_AT.x + 1, LAY_AT.y - 0.6, 900);
          lookAt(POPPY);
          bubble(POPPY, '🤫', 2.4);
          await say(POPPY_TALK, 'Shh… listen. This is a goodbye.', 'sad');
          lookAt(POPPY, GOLEMS[0]);
          // The figure laid down in the middle of the ring.
          await wait(600);
          figure = 'laid';
          await wait(900);
          await Promise.all([walk(GOLEMS[0], [RING[1]]), walk(GOLEMS[1], [RING[2]])]);
          for (const id of GOLEMS) lookAt(id, POPPY);
          for (const [i, id] of GOLEMS.entries()) {
            const a = G.over.cast.get(id);
            if (a) a.face = Math.atan2(NEW_TOTEM.y - RING[i].y, NEW_TOTEM.x - RING[i].x);
          }
          await narrate('They lay the fading core down. Then, all together, they raise a new totem.');
          // Up it goes, slowly.
          G.audio.play('stomp', 0.6);
          for (let k = 1; k <= 20; k++) {
            rise = k / 20;
            await wait(70);
          }
          G.audio.play('stomp');
          await wait(1500);
          bubble(POPPY, '🥺', 3);
          await say(POPPY_TALK, 'Are they… sad?', 'sad');
          await wait(1300);
          // The Pebblor meets Poppy at the lattice; the hero stays on her side of it.
          const giver = GOLEMS[3];
          await walk(giver, [at(24.5, 3.25)], 1.4);
          lookAt(giver, POPPY);
          lookAt(POPPY);
          await pan(POPPY_AT.x, POPPY_AT.y + .6, 600);
          await say(POPPY_TALK, 'Easy. There is no anger in its song. It means us no harm.');
          await walk(POPPY, [at(24.5, 1.85)], 1.5);
          lookAt(POPPY, giver);
          await narrate('Across the stone lattice, the Pebblor offers her a string of tiny drum-stones.');
          await wait(600);
          await walk(POPPY, [POPPY_AT], 1.8);
          lookAt(POPPY);
          await say(POPPY_TALK, 'For you. You listened instead of fighting. I think it knows.');
          await G.ui.itemFound('echoanklet', 'Echo Anklet', 'Tiny drum-stones on a string, from the Pebblors. In a fight, you can dodge twice in a row.', '🪘', 'Poppy gives you', true);
          void walk(giver, [RING[3]], 1.4);
          await wait(500);
          lookAt(POPPY);
          bubble(POPPY, '🌸', 2.5);
          await say(POPPY_TALK, 'I left a trail of petals on the way in. I can find home all by myself!');
          // Off she goes, along her petals.
          await walk(POPPY, PETALS.slice(1, 6), 4.8);
          await wait(1700);
        });
        rise = -1;
        figure = null;
        proc = null;
        G.over.cast.remove(POPPY);
        syncWorld();
      },
    },
    {
      id: 'home', label: 'Go home to Sowerby',
      target: () => G.over.underground ? ECHO_EXIT : ({ x: GRANNY_AT.x, y: GRANNY_AT.y + 1 }),
      done: () => inVillage() && near(GRANNY_AT, 2.8),
      async then() {
        await scene(async () => {
          await pan(GRANNY_AT.x - 0.8, GRANNY_AT.y + 0.2, 700);
          if (G.over.cast.get('poppy:poppy')) {
            await walk('poppy:poppy', [{ x: GRANNY_AT.x - 1.1, y: GRANNY_AT.y + 0.15 }], 3);
            lookAt('poppy:poppy', GRANNY_ID);
          }
          bubble(GRANNY_ID, '😤', 2.2);
          await say(GRANNY, 'A whole night, in a cave, with monsters! What were you thinking, young lady?', 'worried');
          bubble('poppy:poppy', '😣', 2.2);
          await say(POPPY_TALK, "But Granny, they weren't scary. They were… quiet.", 'sad');
          await say(GRANNY, 'Bath. Supper. Bed. And no more caves.');
          bubble(GRANNY_ID, '💖', 2.5);
          await say(GRANNY, 'Thank you for bringing her home, dear. Again.');
        });
      },
    },
  ],

  cast(step) {
    const cast: ActorSpec[] = [];
    if (step < 3) {
      cast.push({
        id: POPPY, look: { kind: 'walker', name: 'poppy' },
        ...(step === 0 ? POPPY_START : step === 1 ? CATCH_AT : POPPY_AT), face: Math.PI * .85,
        label: step > 0 ? 'Talk' : undefined,
        talk: async () => {
          if (step === 1) {
            await scene(async () => {
              lookAt(POPPY);
              await say(POPPY_TALK, 'There you are! Stay behind them, and hide when their eyes turn towards you.');
            });
            if (!G.save.flags.includes('drums:caught')) G.save.flags.push('drums:caught');
            persist();
          } else if (step === 2 && proc?.phase === 'arrived' && near(POPPY_AT, 1.8)) {
            if (!G.save.flags.includes('drums:listen')) G.save.flags.push('drums:listen');
            persist();
          } else if (step === 2) {
            await scene(async () => { await say(POPPY_TALK, 'Wait here with me. Let them finish their journey first.'); });
          }
        },
      });
    }
    if (step === 2) {
      const p = procession();
      figure ??= 'carried';
      p.members().forEach((m, i) => cast.push(golem(i, m, m.face)));
    } else if (step >= 3) {
      // They stay in their chamber, standing round the totems.
      RING.forEach((p, i) => cast.push(golem(i, p, Math.atan2(NEW_TOTEM.y - p.y, NEW_TOTEM.x - p.x))));
    }
    return cast;
  },

  tick(step) {
    const me = you();
    if (!G.over.underground) return;
    // Nothing jumps out at you in the tunnels, or by the way up while you're following the procession.
    if (inSideArea(me) || (step < 3 && near(MOUTH, 5))) G.over.roamers.calm = Math.max(G.over.roamers.calm, 0.5);
    // The rubble slope at the far end of the pocket climbs back up.
    if (!moving && G.mode === 'world' && !busy() && inPocket(me) && Math.hypot(me.x - CLIMB.x, me.y - CLIMB.y) < 0.75) climb();
    if (step !== 2 || !proc) return;
    const dt = Math.min(0.1, clock - last);
    if (!(intro || (G.mode === 'world' && !busy())) || moving || dt <= 0) return;
    // The opening scene walks them into the tunnels, then they wait for you to follow.
    if (intro && proc.s >= 4.6) return;
    const ev = proc.update(dt, me, G.over.map, intro);
    if (proc.phase !== 'arrived' || ev.includes('arrived')) {
      proc.members().forEach((m, i) => {
        const a = G.over.cast.get(GOLEMS[i]);
        if (!a || a.path.length) return;
        a.moving = Math.hypot(a.x - m.x, a.y - m.y) > 0.005;
        Object.assign(a, { x: m.x, y: m.y, face: m.face });
      });
    }
    onEvents(ev);
  },
};
