// The drums in the dark: once the Cavern's open and Poppy's home and braver, drums echo up out of Echo Cavern one night
// and she goes to see. Granny's beside herself. In the Cavern you find a procession of Pebblors carrying a little stone
// figure up into side tunnels, and you tail them by the echo of their footfalls, ducking out of sight whenever the last
// one looks back (spotted, it stamps and the floor drops you into a tunnel below). In their chamber they lay the figure
// down and raise a new bone totem, with Poppy hidden behind a rock, watching. They notice you, and that you didn't
// fight, and give you the Echo Anklet (two dodges in a row). Poppy runs home along her trail of petals. The chamber
// stays. The places and the procession itself are in procession.ts. See the story bible (Side quests).
import type { ActorSpec } from '../../actors';
import { drawFrame, frame } from '../../assets';
import { zoneById } from '../../data';
import type { MapLayers } from '../../overworld';
import {
  BENDS, CLIMB, FORMATION, LANDING, LAY_AT, MOUTH, NEW_TOTEM, POPPY_AT, PACE, Procession, REAR, RING, ROCK, SIGHT, TOTEMS,
  along, drumsOpen, drumsStep, inChamber, inPocket, inSideArea, rejoinAt, type ProcessionEvent,
} from '../../procession';
import { T, hash2, type WorldObj } from '../../world';
import { busy, G, persist, syncWorld, tip, transition } from '../context';
import { bubble, lookAt, narrate, pan, say, scene, walk, wait } from '../scenes';
import { syncStories, type Story } from '../stories';
import { GRANNY, GRANNY_AT, GRANNY_ID } from './granny';
import { POPPY_TALK } from './poppy';

const TAU = Math.PI * 2;
const POPPY = 'drums:poppy';
const GOLEMS = FORMATION.map((_, i) => `drums:g${i}`);
const C = zoneById('cave').x0;
const at = (x: number, y: number) => ({ x: C + x, y });

/** Poppy's petals, from the chamber back down through the tunnels and the Cavern to its west gate: her way home. */
const PETALS = [
  POPPY_AT, at(25.2, 3.4), at(30.6, 3.4), at(30.6, 6.4), at(26.5, 6.4), at(26.5, 8.9), at(25, 9.6), at(24.6, 12.4), at(19.2, 12.5),
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
/** The little stone figure: carried by the lead pair, or laid in the ring. */
let figure: 'carried' | 'laid' | null = null;
/** The new totem going up, 0 to 1, during the scene. */
let rise = -1;
/** How dark it is round you (eased toward the place you're in), how hidden the side area is from outside, and the clock for both. */
let dim = 0, cover = [0, 0], clock = 0, last = 0;
/**
 * Seen from out on the Cavern's paths, the side area is in shadow: the chamber and the pocket below, and the tunnels
 * (except while you watch the procession go up into them).
 */
const SHADOWED = [[{ x: C + 19, y: -0.5, w: 6, h: 7.7 }, { x: C + 1, y: 17.7, w: 10, h: 4.6 }], [{ x: C + 25, y: 1.2, w: 7, h: 5.8 }]];

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
    G.over.teleport(LANDING.x, LANDING.y);
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
    G.over.teleport(p.x, p.y + 0.1);
    G.mode = 'world';
    moving = false;
    persist();
  });
}

/** The side area's props: the totems, the new one (once it's up), the figure laid before it, Poppy's rock, the slope out of the pocket. */
const prop = (id: string, p: { x: number; y: number }, w: number, h: number, shown?: WorldObj['shown']): WorldObj => ({
  kind: 'prop', id, zone: 'cave', x: p.x - w / 2, y: p.y - h, w, h, label: '', shown,
});
const raised = (s: { stories: Record<string, number> }) => (s.stories.drums ?? 0) >= 3;
const NEW_PROP = prop('prop_totem_new', NEW_TOTEM, 0.6, 0.35, raised);
const FIGURE_PROP = prop('prop_stonefigure', LAY_AT, 0.7, 0.25, raised);
const OBJS: WorldObj[] = [
  ...TOTEMS.map((p, i) => prop(i === 1 ? 'prop_totem1' : 'prop_totem0', p, 0.6, 0.35)),
  NEW_PROP,
  FIGURE_PROP,
  { kind: 'prop', id: 'boulder1', zone: 'cave', ...ROCK, label: '' },
  // Not solid: you walk onto the slope to climb it.
  prop('prop_climb', { x: CLIMB.x, y: CLIMB.y - 0.25 }, 0.01, 0.01),
];

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

/** Where the rear one's looking, on the floor: a cone cut short by rocks and walls (where to hide). */
function drawGaze(ctx: CanvasRenderingContext2D, ts: number) {
  const p = proc!, r = p.rear, look = p.phase === 'look';
  const eye = { x: r.x, y: r.y - 0.3 }, n = 28;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(r.x * ts, r.y * ts);
  for (let i = 0; i <= n; i++) {
    const ang = p.gaze - SIGHT.half + (2 * SIGHT.half * i) / n;
    let d = 0.3;
    while (d < SIGHT.range && G.world.tile(Math.floor(eye.x + Math.cos(ang) * d), Math.floor(eye.y + Math.sin(ang) * d)) !== T.OBST) d += 0.08;
    ctx.lineTo((r.x + Math.cos(ang) * d) * ts, (r.y + Math.sin(ang) * d) * ts);
  }
  ctx.closePath();
  const pulse = 0.5 + 0.5 * Math.sin(clock * 12);
  ctx.fillStyle = look ? 'rgba(255,214,90,0.3)' : `rgba(255,214,90,${0.08 + 0.08 * pulse})`;
  ctx.fill();
  ctx.strokeStyle = look ? 'rgba(255,214,90,0.85)' : `rgba(255,214,90,${0.3 + 0.3 * pulse})`;
  ctx.lineWidth = ts * 0.05;
  ctx.setLineDash(look ? [] : [ts * 0.18, ts * 0.12]);
  ctx.stroke();
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
function drawPetals(ctx: CanvasRenderingContext2D, ts: number) {
  const sprite = frame('env/prop_petals');
  let carry = 0;
  for (let i = 1; i < PETALS.length; i++) {
    const a = PETALS[i - 1], b = PETALS[i], len = Math.hypot(b.x - a.x, b.y - a.y);
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

/** The figure in the lead pair's arms, or laid in the ring (before it's a prop), and the new totem going up. */
function drawCeremony(ctx: CanvasRenderingContext2D, ts: number) {
  const f = frame('env/prop_stonefigure'), unit = ts / 1.6;
  const lead = [G.over.actors.get(GOLEMS[0]), G.over.actors.get(GOLEMS[1])];
  if (figure === 'carried' && f && lead[0] && lead[1]) {
    const bob = Math.sin(clock * 5) * ts * 0.03;
    // Held up between them, at shoulder height.
    drawFrame(ctx, f, ((lead[0].x + lead[1].x) / 2) * ts, ((lead[0].y + lead[1].y) / 2 - 0.62) * ts + bob, unit * 1.15);
  } else if (figure === 'laid' && f && FIGURE_PROP.hidden) drawFrame(ctx, f, LAY_AT.x * ts, (LAY_AT.y - 0.2) * ts, unit);
  // (Until the map syncs after the scene, when they're props like the rest.)
  const t = frame('env/prop_totem_new');
  if (rise > 0 && t && NEW_PROP.hidden) drawFrame(ctx, t, NEW_TOTEM.x * ts, (NEW_TOTEM.y - 0.2) * ts, unit, { sy: rise, rot: (1 - rise) * 0.25 });
}

/** The tunnels are dim, closing in round you (the pocket below darker still); the chamber's softly lit. */
function drawDark(ctx: CanvasRenderingContext2D, ts: number, view: { x: number; y: number; w: number; h: number }) {
  const me = you(), cave = G.over.currentZone.id === 'cave';
  const want = !cave ? 0 : inPocket(me) ? 1 : inChamber(me) ? 0.42 : inSideArea(me) ? 0.9 : 0;
  const dt = Math.min(0.1, clock - last);
  dim += (want - dim) * Math.min(1, dt * 3);
  SHADOWED.forEach((rects, i) => {
    const out = cave && !inSideArea(me) && !(i === 1 && intro);
    const k = (cover[i] += ((out ? 1 : 0) - cover[i]) * Math.min(1, dt * 3));
    if (k < 0.01) return;
    // Soft-edged: only the blurred shadow of each box lands on the map (the box itself is drawn well off to the side).
    ctx.save();
    ctx.shadowColor = `rgba(14,10,26,${0.86 * k})`;
    ctx.shadowBlur = ts * 0.9;
    ctx.shadowOffsetX = view.w * 4;
    ctx.fillStyle = '#000';
    for (const r of rects) ctx.fillRect(r.x * ts - view.w * 4, r.y * ts, r.w * ts, r.h * ts);
    ctx.restore();
  });
  if (dim < 0.01) return;
  const px = me.x * ts, py = (me.y - 0.4) * ts;
  const g = ctx.createRadialGradient(px, py, ts * (1.9 + (1 - dim) * 3.4), px, py, ts * (4.8 + (1 - dim) * 4.4));
  g.addColorStop(0, 'rgba(14,10,26,0)');
  g.addColorStop(1, `rgba(14,10,26,${0.9 * dim})`);
  ctx.fillStyle = g;
  ctx.fillRect(view.x, view.y, view.w, view.h);
  // The chamber's own soft light, warm round the totems.
  if (inChamber(me)) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cx = LAY_AT.x * ts, cy = (LAY_AT.y - 0.3) * ts;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 3.2);
    glow.addColorStop(0, `rgba(255,200,140,${0.16 + 0.02 * Math.sin(clock * 2)})`);
    glow.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - ts * 3.2, cy - ts * 3.2, ts * 6.4, ts * 6.4);
    ctx.restore();
  }
}

const layers: Partial<MapLayers> = {
  // The tunnels run along the top of the Cavern: let the camera look up past it, so they're clear of the HUD.
  headroom: () => (G.over.currentZone.id === 'cave' && inSideArea(you()) ? 3 : 0),
  ground(ctx, ts) {
    if (G.over.currentZone.id !== 'cave') return;
    if (drumsStep(G.save) === 3) drawPetals(ctx, ts);
    if (crack) drawCrack(ctx, ts);
  },
  over(ctx, ts, view) {
    const now = performance.now() / 1000;
    last = clock;
    clock = now;
    if (G.over.currentZone.id !== 'cave' && dim < 0.01 && Math.max(...cover) < 0.01) return;
    drawCeremony(ctx, ts);
    drawDark(ctx, ts, view);
    if (proc && drumsStep(G.save) === 2 && (proc.phase === 'warn' || proc.phase === 'look')) drawGaze(ctx, ts);
    ripples = ripples.filter((r) => clock - r.t < 1.1);
    for (const r of ripples) drawRipple(ctx, ts, view, r);
  },
};

export const DRUMS: Story = {
  id: 'drums',
  title: 'The Drums in the Dark',
  icon: '🪘',
  available: () => drumsOpen(G.save),
  objs: OBJS,
  layers,

  steps: [
    {
      // Back in Sowerby, Granny comes running.
      id: 'worry', label: 'Granny Clover is beside herself',
      target: () => ({ x: GRANNY_AT.x, y: GRANNY_AT.y + 1 }),
      done: () => inVillage() && near(GRANNY_AT, 2.8),
      async then() {
        await scene(async () => {
          await pan(GRANNY_AT.x - 0.6, GRANNY_AT.y + 0.2, 700);
          bubble(GRANNY_ID, '😰', 4);
          await say(GRANNY, "Oh, there you are! Poppy's gone, dear. Her bed hasn't been slept in.", 'worried');
          await say(GRANNY, 'All night there were drums, echoing up out of Echo Cavern. She only wanted a look, she said.', 'worried');
          await say(GRANNY, 'Please. Bring her home.', 'worried');
        });
      },
    },
    {
      id: 'cave', label: 'Find Poppy in Echo Cavern',
      target: () => MOUTH,
      done: () => G.over.currentZone.id === 'cave' && near(MOUTH, 4.2),
      async then() {
        // A procession, going up into the side tunnels. Poppy went this way.
        proc = new Procession(2.4);
        figure = 'carried';
        intro = true;
        syncStories();
        try {
          await scene(async () => {
            await pan(MOUTH.x, MOUTH.y - 2, 900);
            await narrate('Pebblors, in a slow, quiet line. The front two carry a little stone figure between them.');
            await narrate('A petal on the ground, by the way up. Poppy came this way.');
            await narrate('Follow them, but keep back. Their footsteps echo. Don\'t let them see you.');
          });
        } finally {
          intro = false;
        }
        tip('drums:look', '👀 When the last one turns to look back, duck behind a pillar or round a corner.');
      },
    },
    {
      id: 'tail', label: 'Follow the Pebblors, unseen',
      // In the Cavern you go by their echoes; anywhere else, the arrow takes you back to the tunnels.
      noArrow: () => G.over.currentZone.id === 'cave' && (inSideArea(you()) || near(MOUTH, 5)),
      target: () => MOUTH,
      done: () => proc?.phase === 'arrived' && near(POPPY_AT, 2.4),
      async then() {
        await scene(async () => {
          await pan(LAY_AT.x + 1, LAY_AT.y - 0.6, 900);
          lookAt(POPPY);
          bubble(POPPY, '🤫', 2.4);
          await say(POPPY_TALK, 'Shh! Get down. Look.', 'scared');
          lookAt(POPPY, GOLEMS[0]);
          // The figure laid down in the middle of the ring.
          await wait(600);
          figure = 'laid';
          await wait(900);
          await Promise.all([walk(GOLEMS[0], [RING[1]]), walk(GOLEMS[1], [RING[2]])]);
          for (const id of GOLEMS) lookAt(id, POPPY);
          for (const [i, id] of GOLEMS.entries()) {
            const a = G.over.actors.get(id);
            if (a) a.face = Math.atan2(NEW_TOTEM.y - RING[i].y, NEW_TOTEM.x - RING[i].x);
          }
          await narrate('They lay the little stone figure down. Then, all together, they raise a new totem.');
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
          // They know you're there. And that you didn't fight.
          for (const id of GOLEMS) {
            lookAt(id);
            bubble(id, '❕', 1.4);
            await wait(160);
          }
          await wait(1100);
          const giver = GOLEMS[3], g = G.over.actors.get(giver);
          if (g) {
            const d = Math.hypot(G.over.x - g.x, G.over.y - g.y) || 1;
            await walk(giver, [{ x: G.over.x + ((g.x - G.over.x) / d) * 0.9, y: G.over.y + ((g.y - G.over.y) / d) * 0.9 }], 1.4);
          }
          await narrate('One of them comes over, slow and quiet, and sets a string of tiny drum-stones at your feet.');
          G.save.perks.push('echoanklet');
          persist();
          await G.ui.itemFound('echoanklet', 'Echo Anklet', 'Tiny drum-stones on a string, from the Pebblors. In a fight, you can dodge twice in a row.', '🪘', 'The Pebblors gave you', true);
          void walk(giver, [RING[3]], 1.4);
          await wait(500);
          lookAt(POPPY);
          bubble(POPPY, '🌸', 2.5);
          await say(POPPY_TALK, 'I left a trail of petals on the way in. I can find home all by myself!');
          // Off she goes, along her petals.
          void walk(POPPY, PETALS.slice(1, 4), 4.2);
          await wait(1700);
        });
        rise = -1;
        figure = null;
        proc = null;
        G.over.actors.remove(POPPY);
        syncWorld();
      },
    },
    {
      id: 'home', label: 'Go home to Sowerby',
      target: () => ({ x: GRANNY_AT.x, y: GRANNY_AT.y + 1 }),
      done: () => inVillage() && near(GRANNY_AT, 2.8),
      async then() {
        await scene(async () => {
          await pan(GRANNY_AT.x - 0.8, GRANNY_AT.y + 0.2, 700);
          if (G.over.actors.get('poppy:poppy')) {
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
    if (step === 2) {
      // Hidden behind her rock, watching the ring.
      cast.push({ id: POPPY, look: { kind: 'walker', name: 'poppy' }, ...POPPY_AT, face: Math.PI * 0.85 });
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
    // Nothing jumps out at you in the tunnels, or by the way up while you're following the procession.
    if (inSideArea(me) || (step === 2 && near(MOUTH, 5))) G.over.roamers.calm = Math.max(G.over.roamers.calm, 0.5);
    // The rubble slope at the far end of the pocket climbs back up.
    if (!moving && G.mode === 'world' && !busy() && inPocket(me) && Math.hypot(me.x - CLIMB.x, me.y - CLIMB.y) < 0.75) climb();
    if (step !== 2 || !proc) return;
    const dt = Math.min(0.1, clock - last);
    if (!(intro || (G.mode === 'world' && !busy())) || moving || dt <= 0) return;
    // The opening scene walks them into the tunnels, then they wait for you to follow.
    if (intro && proc.s >= 4.6) return;
    const ev = proc.update(dt, me, G.world, intro);
    if (proc.phase !== 'arrived' || ev.includes('arrived')) {
      proc.members().forEach((m, i) => {
        const a = G.over.actors.get(GOLEMS[i]);
        if (!a || a.path.length) return;
        a.moving = Math.hypot(a.x - m.x, a.y - m.y) > 0.005;
        Object.assign(a, { x: m.x, y: m.y, face: m.face });
      });
    }
    onEvents(ev);
  },
};
