// Draws a fight: the clearing, telegraphs, fighters, shots and effects, and the overlay text. Reads the battle's
// state and never changes the simulation (it only adds cosmetic particles).
import { ARENA_RX, ARENA_RY } from '../arena';
import { drawFrame, drawHero as drawHeroSprite, frame } from '../assets';
import { GEAR, type ZoneId } from '../data';
import { drawMonster, drawPlayer, drawWeapon, rrect, shadow } from '../sprites';
import { SKILL_DATA } from '../weapons';
import { hash2 } from '../world';
import type { Battle } from './battle';
import { BURN_COLOR, ELEMENTS } from './elements';
import { MONSTER_AI, spriteScale } from './monsters';
import { pose } from './pose';
import { TAU, UNIT, ZOOM, ZOOM_T, clamp01, easeOut, rand, type Enemy, type Spark, type Spike, type Swing } from './types';

type Ctx = CanvasRenderingContext2D;

/** Where the arena sits on screen: portrait leaves room for the HUD above and the buttons below. */
function layout(vw: number, vh: number) {
  const sw = ARENA_RX * 2 + 24, sh = ARENA_RY * 2 + 24;
  if (vh > vw * 1.15) {
    const top = 84, bottom = 220;
    const k = Math.min(vw / sw, (vh - top - bottom) / sh);
    return { k, cx: vw / 2, cy: top + (vh - top - bottom) / 2 };
  }
  const top = 64;
  const k = Math.min(vw / sw, (vh - top - 8) / sh);
  return { k, cx: vw / 2, cy: top + (vh - top) / 2 };
}

export function drawBattle(b: Battle, ctx: Ctx, vw: number, vh: number) {
  const th = b.setup.zone.theme;
  const { k: k0, cx, cy } = layout(vw, vh);
  // Swooping in or out: zoom toward you, and fade through white to meet the overworld's own zoom.
  const q = b.swoop;
  const z = 1 + (ZOOM - 1) * q;
  const k = k0 * z * (1 + b.punch);
  ctx.fillStyle = th.outside;
  ctx.fillRect(0, 0, vw, vh);
  const sx = (Math.random() - 0.5) * b.shake, sy = (Math.random() - 0.5) * b.shake;
  ctx.save();
  ctx.translate(cx + sx, cy + sy);
  ctx.scale(k, k);
  ctx.translate(-b.p.x * q, -(b.p.y - 20) * q);
  drawArena(b, ctx, (vw / k) * 1.6, (vh / k) * 1.6);
  drawField(b, ctx);
  drawAmbient(b, ctx);
  ctx.restore();
  if (q > 0) {
    ctx.fillStyle = `rgba(255,250,235,${0.75 * q})`;
    ctx.fillRect(0, 0, vw, vh);
  }
  drawOverlay(b, ctx, vw, vh);
}

/** Everything that happens on the battlefield: telegraphs, fighters, shots and effects. */
function drawField(b: Battle, ctx: Ctx) {
  // Ground cracks from hammer impacts
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const c of b.cracks) {
    ctx.strokeStyle = `rgba(60,35,50,${0.45 * (1 - c.t / 1.2)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    c.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  // Telegraphed danger zones
  for (const h of b.hazards) {
    const prog = Math.min(1, h.t / h.delay);
    ctx.fillStyle = `rgba(255,70,60,${0.12 + prog * 0.12})`;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,70,60,0.25)';
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r * prog, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,90,70,${0.6 + Math.sin(b.t * 30) * 0.3})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.stroke();
  }

  // Burning ground from dragon breath.
  for (const f of b.flames) {
    const k = 1 - f.t / f.life, flick = 0.8 + Math.sin(b.t * 25 + f.x) * 0.2;
    ctx.fillStyle = `rgba(255,110,40,${0.35 * k})`;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, f.r * flick, f.r * 0.55 * flick, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(255,220,120,${0.5 * k})`;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y - 2, f.r * 0.45 * flick, f.r * 0.25 * flick, 0, 0, TAU);
    ctx.fill();
    if (Math.random() < 0.15 * k) b.fx.burst(f.x + rand(-f.r, f.r) * 0.6, f.y - 4, Math.random() < 0.5 ? '#ffb03a' : '#ff5a2a', 1, 30, { size: 4, grav: -110, life: 0.5 });
  }
  // Which way you'll swing: an arrow on the ground ahead of you, and a ring on the enemy you're lined up with.
  if (b.endT < 0 && b.intro <= 0) {
    const p = b.p, a = p.face, d = 30;
    ctx.save();
    ctx.translate(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.62);
    ctx.scale(1, 0.62);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-5, -8);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const tgt = b.endT < 0 ? b.aimTarget() : null;
  if (tgt) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -b.t * 20;
    ctx.beginPath();
    ctx.ellipse(tgt.x, tgt.y, tgt.r * 1.3, tgt.r * 0.5, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Y-sorted actors
  const actors: { y: number; draw: () => void }[] = [];
  for (const e of b.enemies) {
    if (e.dead && e.deathT <= 0) continue;
    actors.push({ y: e.y, draw: () => drawEnemy(b, ctx, e) });
  }
  for (const s of b.spikes) actors.push({ y: s.y, draw: () => drawSpike(b, ctx, s) });
  actors.push({ y: b.p.y, draw: () => drawHero(b, ctx) });
  actors.sort((a, c) => a.y - c.y);
  for (const a of actors) a.draw();

  for (const pr of b.projs) {
    ctx.fillStyle = pr.color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.r * 1.7, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(pr.x - pr.r * 0.3, pr.y - pr.r * 0.3, pr.r * 0.4, 0, TAU);
    ctx.fill();
  }
  for (const r of b.rings) {
    const q = r.t / r.dur;
    const rad = r.r0 + (r.r1 - r.r0) * easeOut(q);
    ctx.strokeStyle = `rgba(${r.color},${1 - q})`;
    ctx.lineWidth = (r.width ?? 6) * (1 - q) + 1;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, rad, rad * 0.62, 0, 0, TAU);
    ctx.stroke();
  }
  for (const s of b.sparks) drawSpark(ctx, s);
  // Chain sparks: a jagged bolt between two foes.
  for (const z of b.zaps) {
    ctx.strokeStyle = `rgba(240,224,255,${1 - z.t / 0.18})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(z.x1, z.y1);
    for (let i = 1; i < 6; i++) {
      const q = i / 6;
      ctx.lineTo(z.x1 + (z.x2 - z.x1) * q + rand(-8, 8), z.y1 + (z.y2 - z.y1) * q + rand(-8, 8));
    }
    ctx.lineTo(z.x2, z.y2);
    ctx.stroke();
  }
  b.fx.draw(ctx);
}

/**
 * A clearing in the area you were in: its trees (or pines, crystals, rocks) crowd around the edge, the floor has
 * soft patches and a few flowers or pebbles, and grass tufts fringe the border. Guardian fights add an old stone ring.
 */
function drawArena(b: Battle, ctx: Ctx, w: number, h: number) {
  const th = b.setup.zone.theme;
  const RX = ARENA_RX, RY = ARENA_RY;
  const SCENERY_UNIT = 29;
  const tuft = frame(`env/grass_${b.setup.zone.id}`) ?? frame('env/grass_meadow');
  // Tufts scattered across the surrounding ground.
  for (let i = 0; i < 110; i++) {
    const x = (hash2(i, 1, 3) - 0.5) * w, y = (hash2(i, 2, 3) - 0.5) * h;
    if (Math.hypot(x / (RX + 40), y / (RY + 40)) < 1) continue;
    if (tuft) drawFrame(ctx, tuft, x, y, 30, { rot: Math.sin(b.t * 2 + i) * 0.04 });
  }
  // Scenery crowding the clearing, back to front. The bottom edge keeps to low tufts so nothing hides the fight.
  const props: { x: number; y: number; v: number }[] = [];
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * TAU + hash2(i, 7, 11) * 0.12;
    if (Math.sin(a) > 0.55) continue;
    const r = 1.1 + hash2(i, 8, 11) * 0.45;
    props.push({ x: Math.cos(a) * RX * r, y: Math.sin(a) * RY * r + 40, v: hash2(i, 9, 11) });
  }
  for (let i = 0; i < 16; i++) {
    // A second, deeper row behind the top half makes it feel like a forest (or cavern, or crag) around you.
    const a = Math.PI + (i / 15) * Math.PI;
    props.push({ x: Math.cos(a) * RX * 1.75, y: Math.sin(a) * RY * 1.5 + 30, v: hash2(i, 10, 11) });
  }
  props.sort((a, c) => a.y - c.y);
  for (const p of props) {
    const f = frame(`env/${th.obstacle}${Math.floor(p.v * 3)}`);
    if (!f) continue;
    shadow(ctx, p.x, p.y, 26);
    drawFrame(ctx, f, p.x, p.y, SCENERY_UNIT * (0.95 + p.v * 0.25), { flip: p.v > 0.5, rot: th.obstacle === 'tree' || th.obstacle === 'pine' ? Math.sin(b.t * 1.2 + p.x) * 0.012 : 0 });
  }
  // Floor: a soft drop shadow, a darker rim, then the clearing with organic lighter patches.
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 12, RX + 18, RY + 14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = th.ground2;
  ctx.beginPath();
  ctx.ellipse(0, 0, RX + 12, RY + 12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = th.ground;
  ctx.beginPath();
  ctx.ellipse(0, 0, RX, RY, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, RX, RY, 0, 0, TAU);
  ctx.clip();
  for (let i = 0; i < 9; i++) {
    const x = (hash2(i, 3, 5) - 0.5) * RX * 1.6, y = (hash2(i, 4, 5) - 0.5) * RY * 1.6;
    ctx.fillStyle = hash2(i, 5, 5) < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.ellipse(x, y, 40 + hash2(i, 6, 5) * 70, 26 + hash2(i, 7, 5) * 40, hash2(i, 8, 5) * 3, 0, TAU);
    ctx.fill();
  }
  // Sunlight pooling in the middle.
  const g = ctx.createRadialGradient(0, -RY * 0.15, 10, 0, 0, RY);
  g.addColorStop(0, 'rgba(255,255,230,0.18)');
  g.addColorStop(1, 'rgba(255,255,230,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-RX, -RY, RX * 2, RY * 2);
  ctx.restore();
  // Decor near the edges (flowers, mushrooms, gems or pebbles depending on the area).
  const names = { flower: ['flower0', 'flower1', 'flower2', 'flower3'], mush: ['mush0', 'mush1'], gem: ['gem0', 'gem1'], pebble: ['pebble0', 'pebble1'] }[th.decor];
  for (let i = 0; i < 26; i++) {
    const a = hash2(i, 5, 9) * TAU, r = 0.55 + hash2(i, 6, 9) * 0.38;
    const f = frame(`env/${names[Math.floor(hash2(i, 12, 9) * names.length)]}`);
    if (f) drawFrame(ctx, f, Math.cos(a) * RX * r, Math.sin(a) * RY * r, SCENERY_UNIT);
  }
  // Guardians fight inside an old ring of standing stones.
  if (b.setup.boss) {
    const stones = 40;
    for (let i = 0; i < stones; i++) {
      const a = (i / stones) * TAU;
      const x = Math.cos(a) * (RX + 6), y = Math.sin(a) * (RY + 6);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(x, y, 11, 8, a, 0, TAU);
      ctx.fill();
    }
  }
  // Grass fringing the border.
  if (tuft) {
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU + hash2(i, 13, 9) * 0.05;
      drawFrame(ctx, tuft, Math.cos(a) * (RX + 4), Math.sin(a) * (RY + 4) + 6, 26 + hash2(i, 14, 9) * 8, { rot: Math.sin(b.t * 2.2 + i) * 0.05, flip: i % 2 === 1 });
    }
  }
}

/** Life in the air over each area's arena (one entry per area). */
const AMBIENT: Partial<Record<ZoneId, (ctx: Ctx, t: number) => void>> = {
  meadow: butterflies,
  glade: butterflies,
  // Falling leaves.
  woods(ctx, t) {
    for (let i = 0; i < 7; i++) {
      const y = ((t * 30 + i * 97) % (ARENA_RY * 2.4)) - ARENA_RY * 1.2, x = (hash2(i, 1, 21) - 0.5) * ARENA_RX * 2 + Math.sin(t * 1.5 + i) * 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 2 + i) * 0.8);
      ctx.fillStyle = i % 2 ? '#e8a040' : '#7ab84a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  },
  // Dust hanging in the lamplight, and the odd drip from the ceiling.
  cave(ctx, t) {
    const RX = ARENA_RX, RY = ARENA_RY;
    for (let i = 0; i < 10; i++) {
      const x = (hash2(i, 5, 24) - 0.5) * RX * 2 + Math.sin(t * 0.4 + i) * 20, y = (hash2(i, 6, 24) - 0.5) * RY * 2 + Math.cos(t * 0.3 + i) * 14;
      ctx.fillStyle = 'rgba(220,220,230,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.7 + i * 0.37) % 1, x = (hash2(i, 7, 24) - 0.5) * RX * 1.6, y = -RY * 0.9 + q * RY * 1.2;
      ctx.fillStyle = `rgba(160,200,255,${0.6 * (1 - q)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 2, 4, 0, 0, TAU);
      ctx.fill();
    }
  },
  // Glowing motes.
  hollow(ctx, t) {
    for (let i = 0; i < 12; i++) {
      const x = (hash2(i, 2, 22) - 0.5) * ARENA_RX * 2, y = (hash2(i, 3, 22) - 0.5) * ARENA_RY * 2 + Math.sin(t + i) * 12;
      ctx.fillStyle = `rgba(190,230,255,${0.3 + Math.sin(t * 2 + i * 1.7) * 0.25})`;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TAU);
      ctx.fill();
    }
  },
  // Rising embers.
  peak(ctx, t) {
    for (let i = 0; i < 12; i++) {
      const y = ARENA_RY * 1.2 - ((t * 40 + i * 71) % (ARENA_RY * 2.4)), x = (hash2(i, 4, 23) - 0.5) * ARENA_RX * 2 + Math.sin(t * 2 + i) * 16;
      ctx.fillStyle = i % 3 ? 'rgba(255,150,60,0.8)' : 'rgba(255,220,120,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, TAU);
      ctx.fill();
    }
  },
};

/** Areas under a roof: no drifting cloud shadows. */
const UNDERGROUND: ZoneId[] = ['cave', 'hollow'];

function butterflies(ctx: Ctx, t: number) {
  const cols = ['#ffd35a', '#ff9ab0', '#b0d8ff'];
  for (let i = 0; i < 3; i++) {
    const x = Math.sin(t * 0.5 + i * 2.1) * ARENA_RX * 0.8, y = Math.cos(t * 0.37 + i * 1.7) * ARENA_RY * 0.8 - 30;
    const flap = Math.abs(Math.sin(t * 14 + i));
    ctx.fillStyle = cols[i];
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 5 * flap, y, 5 * flap + 1, 6, s * 0.4, 0, TAU);
      ctx.fill();
    }
  }
}

/** Drifting cloud shadows outdoors, then the area's own ambient life. */
function drawAmbient(b: Battle, ctx: Ctx) {
  const id = b.setup.zone.id, t = b.t;
  if (!UNDERGROUND.includes(id)) {
    ctx.fillStyle = 'rgba(40,30,60,0.06)';
    for (let i = 0; i < 2; i++) {
      const x = ((t * 14 + i * 330) % (ARENA_RX * 3)) - ARENA_RX * 1.5, y = -ARENA_RY * 0.4 + i * ARENA_RY * 0.7;
      ctx.beginPath();
      ctx.ellipse(x, y, 150, 70, 0, 0, TAU);
      ctx.fill();
    }
  }
  AMBIENT[id]?.(ctx, t);
}

function drawEnemy(b: Battle, ctx: Ctx, e: Enemy) {
  const ai = MONSTER_AI[e.kind];
  const alpha = e.dead ? Math.max(0, e.deathT / 0.45) : 1;
  const fi = Math.floor(b.t * (e.def.boss ? 5 : 7) + e.seed) % 6;
  const f = frame(`mon/${e.kind}${e.golden ? '_gold' : ''}/${fi}`);
  if (f) {
    shadow(ctx, e.x, e.y, e.r * (ai.flies ? 0.7 : 1.05) * (1 - Math.min(0.4, e.z / 60)));
    let sxk = 1, syk = 1;
    if (e.squash > 0) {
      sxk = 1 + e.squash * 1.3;
      syk = 1 - e.squash * 0.9;
    }
    if (e.windup > 0) {
      sxk *= 1 + e.windup * 0.12;
      syk *= 1 - e.windup * 0.1;
    }
    // Small hoppers stretch mid-air (the Slime King's belly-flop stays round).
    if (ai.hops && !e.def.boss && e.z > 2) {
      sxk *= 0.9;
      syk *= 1.12;
    }
    if (e.dead) {
      const s = 1 + (1 - alpha) * 0.5;
      sxk *= s;
      syk /= s;
    }
    const shake = e.windup > 0 ? Math.sin(b.t * 60) * e.r * 0.08 * e.windup : 0;
    const pop = popIn(b, e);
    sxk *= pop;
    syk *= pop;
    drawFrame(ctx, f, e.x + shake, e.y - e.z - (1 - pop) * 14, UNIT * spriteScale(e.kind), {
      flip: e.face < 0, alpha, sx: sxk, sy: syk,
      // Bosses get hit constantly, so their flash is softer to keep them readable.
      flash: e.flash > 0 || (e.dead && alpha > 0.7) ? (e.def.boss && !e.dead ? 0.45 : 1) : 0,
      tint: e.burn > 0 ? e.dotColor : e.slow > 0 ? '#8af09a' : e.windup > 0.5 ? '#ff4a4a' : undefined,
      tintAmount: e.burn > 0 ? 0.25 + Math.sin(b.t * 20) * 0.1 : e.slow > 0 ? 0.3 : (e.windup - 0.5) * 0.5,
    });
  } else {
    ctx.save();
    if (e.dead) {
      const s = 1 + (1 - alpha) * 0.4;
      ctx.translate(e.x, e.y);
      ctx.scale(s, 1 / s);
      ctx.translate(-e.x, -e.y);
    }
    drawMonster(ctx, e.kind, e.x, e.y, e.r, {
      t: b.t, flash: e.flash > 0 || (e.dead && alpha > 0.7), golden: e.golden, dir: e.face,
      z: e.z, windup: e.windup, seed: e.seed, alpha,
    });
    ctx.restore();
  }
  if (e.golden && !e.dead && Math.random() < 0.15) b.fx.burst(e.x + rand(-e.r, e.r), e.y - rand(0, e.r * 2), '#fff6a0', 1, 20, { star: true, size: 3, grav: -20 });
  if (e.burn > 0 && !e.dead && Math.random() < 0.3) {
    const fire = e.dotColor === BURN_COLOR;
    b.fx.burst(e.x + rand(-e.r, e.r) * 0.6, e.y - rand(0, e.r * 1.5) - e.z, fire ? (Math.random() < 0.5 ? '#ffb03a' : '#ff5a2a') : '#9af06a', 1, 30, { size: 4, grav: fire ? -90 : -30, life: 0.5 });
  }
  if (e.stun > 0 && !e.dead) {
    for (let i = 0; i < 3; i++) {
      const a = b.t * 5 + (i / 3) * TAU;
      ctx.fillStyle = '#ffe04a';
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * e.r * 0.8, e.y - e.r * 2.4 - e.z + Math.sin(a) * 4, 3, 0, TAU);
      ctx.fill();
    }
  }
  if (!e.dead && !e.def.boss && e.hp < e.maxHp) {
    const w = Math.max(26, e.r * 2), y = e.y - e.r * 2.6 - e.z - 6;
    ctx.fillStyle = 'rgba(40,20,50,0.7)';
    rrect(ctx, e.x - w / 2 - 1.5, y - 1.5, w + 3, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = e.hp / e.maxHp > 0.3 ? '#7aee8a' : '#ff6a6a';
    rrect(ctx, e.x - w / 2, y, w * (e.hp / e.maxHp), 4, 2);
    ctx.fill();
  }
}

/** Regular monsters spring up out of the grass as the camera swoops in. */
function popIn(b: Battle, e: Enemy): number {
  if (b.setup.boss || b.intro <= 0 || e.minion) return 1;
  return Math.max(0.05, easeOut(clamp01(1 - b.intro / (ZOOM_T + 0.1))));
}

function drawSpike(b: Battle, ctx: Ctx, s: Spike) {
  const el = ELEMENTS[b.element];
  const grow = s.t < 0.07 ? s.t / 0.07 : s.t > s.life - 0.18 ? Math.max(0, (s.life - s.t) / 0.18) : 1;
  const h = s.size * 1.5 * easeOut(grow), w = s.size * 0.55;
  const [light, dark] = el.spike ?? ['#d8c8b0', '#9a8a78'];
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.tilt);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(0, -h);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(0, -h);
  ctx.lineTo(w * 0.1, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,36,72,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(0, -h);
  ctx.lineTo(w, 0);
  ctx.stroke();
  if (el.hot) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,150,50,0.35)';
    ctx.beginPath();
    ctx.arc(0, -h * 0.4, w * 1.2, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function drawSpark(ctx: Ctx, s: Spark) {
  const q = s.t / 0.22;
  const r = s.size * (0.5 + easeOut(q) * 0.8);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.globalAlpha = 1 - q;
  for (const [col, k] of [[s.color, 1], ['#ffffff', 0.55]] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = (i % 2 ? r * 0.18 : r) * k;
      const a = (i / 8) * TAU;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.fill();
  }
  ctx.restore();
}

/** Crescent slash trail following the recorded weapon angles. */
function drawArcTrail(b: Battle, ctx: Ctx, sw: Swing) {
  if (sw.trail.length < 2) return;
  const p = b.p;
  const cx = p.x, cy = p.y - 10;
  const R = sw.s.range * b.reach + 4;
  const Ri = R * 0.3;
  const pts: { a: number; k: number }[] = [];
  for (let i = 0; i < sw.trail.length - 1; i++) {
    const a0 = sw.trail[i].ang, a1 = sw.trail[i + 1].ang;
    for (let j = 0; j < 4; j++) pts.push({ a: a0 + ((a1 - a0) * j) / 4, k: (i + j / 4) / (sw.trail.length - 1) });
  }
  pts.push({ a: sw.trail[sw.trail.length - 1].ang, k: 1 });
  const col = b.weapon.trail ?? '#ffffff';
  const layers = b.tier >= 3 ? 2 : 1;
  for (let L = 0; L < layers; L++) {
    ctx.save();
    if (L === 1) ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = L === 1 ? 0.35 : 0.75;
    ctx.fillStyle = col;
    ctx.beginPath();
    const grow = L === 1 ? 1.12 : 1;
    for (const { a } of pts) ctx.lineTo(cx + Math.cos(a) * R * grow, cy + Math.sin(a) * R * grow * 0.9);
    for (let i = pts.length - 1; i >= 0; i--) {
      const { a, k } = pts[i];
      const r = R - (R - Ri) * (0.25 + 0.75 * k);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2 + b.tier * 0.4;
  ctx.beginPath();
  for (const { a } of pts.slice(Math.floor(pts.length * 0.4))) ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9);
  ctx.stroke();
}

function drawThrustTrail(b: Battle, ctx: Ctx, sw: Swing) {
  const s = sw.s, p = b.p;
  const q = (sw.t - s.windup) / s.active;
  if (q < 0 || q > 1.8) return;
  const fade = q > 1 ? 1 - (q - 1) / 0.8 : 1;
  const reach = s.range * b.reach * easeOut(Math.min(1, q));
  const w = s.size * b.reach * 0.5;
  const cx = p.x, cy = p.y - 10, dx = Math.cos(sw.aim), dy = Math.sin(sw.aim);
  ctx.save();
  ctx.globalAlpha = 0.7 * fade;
  ctx.fillStyle = b.weapon.trail ?? '#fff';
  ctx.beginPath();
  ctx.moveTo(cx - dy * w, cy + dx * w);
  ctx.lineTo(cx + dx * reach, cy + dy * reach);
  ctx.lineTo(cx + dy * w, cy - dx * w);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.9 * fade;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - dy * w * 0.3, cy + dx * w * 0.3);
  ctx.lineTo(cx + dx * reach, cy + dy * reach);
  ctx.lineTo(cx + dy * w * 0.3, cy - dx * w * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHero(b: Battle, ctx: Ctx) {
  const p = b.p;
  const style = b.weapon.style ?? 'sword';
  const blink = p.iframes > 0 && p.dodgeT <= 0 && Math.floor(b.t * 20) % 2 === 0;
  const alpha = blink ? 0.35 : 1;
  const cosF = Math.cos(p.face), sinF = Math.sin(p.face);
  const heavy = style === 'hammer';
  // At rest the weapon hangs from your sword hand, blade down and out: on your right when facing away, your left
  // when facing the camera, and in front in profile.
  const side = sinF < -0.5 ? 1 : sinF > 0.5 ? -1 : cosF >= 0 ? 1 : -1;
  let ang = side > 0 ? (heavy ? 0.5 : 0.75) : Math.PI - (heavy ? 0.5 : 0.75);
  let off = 0, scale = 1, flipY = side > 0 ? 1 : -1;
  const sw = p.swing;
  const idle = !sw && p.whirlT <= 0;
  if (sw) {
    ({ ang, off, scale } = pose(sw, b.reach));
    if (sw.s.shape === 'arc') {
      const d = sw.s.anim === 'slashL' || sw.s.anim === 'backchop' ? -1 : 1;
      flipY = d > 0 ? -1 : 1;
      if (sw.s.anim === 'spin') flipY = -1;
    } else flipY = Math.cos(ang) >= 0 ? 1 : -1;
    if (sw.s.shape === 'arc') drawArcTrail(b, ctx, sw);
    if (sw.s.shape === 'line') drawThrustTrail(b, ctx, sw);
  } else if (p.whirlT > 0) {
    ang = p.whirlAng;
    flipY = -1;
    scale = 1.05;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = b.weapon.trail ?? '#fff';
    ctx.lineWidth = 16;
    const R = SKILL_DATA.whirl.radius * b.reach;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 10, R, R * 0.8, 0, ang - 1.4 + (k * TAU) / 3, ang + (k * TAU) / 3);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Swings pivot around the same point the hitboxes use (p.y - 10); at rest the hand sits at your side, by the hip.
  const handX = idle ? p.x + side * (Math.abs(sinF) > 0.5 ? 10 : 6) : p.x + Math.cos(ang) * (7 + off);
  const handY = idle ? p.y - 8 : p.y - 10 + Math.sin(ang) * (4 + off * 0.8);
  const behind = idle ? sinF < -0.5 : Math.sin(ang) < -0.35 && !(sw && sw.s.anim === 'slam' && sw.t > sw.s.windup);
  const wf = frame(`wpn/${b.weapon.id}`);
  const weaponUnit = 34 * b.moves.size * scale;
  const drawW = () => {
    if (style === 'whip') drawLash(b, ctx, handX, handY, ang, sw, idle, side);
    if (wf) drawFrame(ctx, wf, handX, handY, weaponUnit, { rot: ang, sy: flipY, alpha });
    else drawWeapon(ctx, style === 'whip' ? 'sword' : style, handX, handY, ang, 12 * scale, b.weapon.color ?? '#ccc');
  };
  shadow(ctx, p.x, p.y, 14);
  if (behind) drawW();
  const armor = b.save.equip.armor;
  const ok = drawHeroSprite(ctx, armor, p.x, p.y, UNIT, p.face, p.moving && !sw, b.t, {
    alpha, flash: p.hurtT > 0 ? 0.7 : 0, sx: p.dodgeT > 0 ? 1.2 : 1, sy: p.dodgeT > 0 ? 0.82 : 1,
  });
  if (!ok) {
    drawPlayer(ctx, p.x, p.y, 12, {
      t: b.t, moving: p.moving, face: p.face, armor: GEAR[armor]?.color ?? '#6fa8ff', hurt: p.hurtT > 0,
      squash: p.dodgeT > 0 ? 1.25 : 1, alpha,
    });
  }
  if (!behind) drawW();
}

/**
 * A whip's rope: coiled and dangling at rest; during a lash it snaps out to its full reach along the swing, bowed
 * against the direction it's moving so it reads as a crack of the whip.
 */
function drawLash(b: Battle, ctx: Ctx, hx: number, hy: number, ang: number, sw: Swing | null, idle: boolean, side: number) {
  let len = 18, bow = 10;
  let dir = idle ? (side > 0 ? 1.2 : Math.PI - 1.2) : ang;
  if (sw) {
    const q = clamp01((sw.t - sw.s.windup) / sw.s.active);
    const reach = sw.s.range * b.reach;
    len = sw.t < sw.s.windup ? 22 : 22 + (reach - 22) * easeOut(Math.min(1, q * 1.3)) * (1 - Math.max(0, q - 1) * 0.6);
    bow = sw.s.shape === 'arc' ? (sw.s.anim === 'slashL' ? -1 : 1) * len * 0.22 : len * 0.06;
    dir = ang;
  } else if (b.p.whirlT > 0) {
    len = SKILL_DATA.whirl.radius * b.reach;
    bow = len * 0.3;
  }
  const ex = hx + Math.cos(dir) * len, ey = hy + Math.sin(dir) * len;
  const mx = (hx + ex) / 2 - Math.sin(dir) * bow, my = (hy + ey) / 2 + Math.cos(dir) * bow;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(40,20,50,0.55)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.stroke();
  ctx.strokeStyle = b.weapon.color ?? '#ccc';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.stroke();
  // A bright popper at the tip.
  ctx.fillStyle = b.weapon.trail ?? '#fff';
  ctx.beginPath();
  ctx.arc(ex, ey, sw && sw.t > sw.s.windup ? 4 : 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** The guardian's health bar, and the big "Boss battle!" / "Victory!" text. */
function drawOverlay(b: Battle, ctx: Ctx, vw: number, vh: number) {
  const boss = b.boss;
  if (boss) {
    const w = Math.min(420, vw * 0.8), x = (vw - w) / 2, y = vh > vw * 1.15 ? 92 : 70;
    ctx.fillStyle = 'rgba(40,20,50,0.75)';
    rrect(ctx, x - 3, y - 3, w + 6, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#ff6a4a';
    rrect(ctx, x, y, w * Math.max(0, boss.hp / boss.maxHp), 10, 5);
    ctx.fill();
    ctx.font = '800 13px ui-rounded, "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${boss.def.name}  Lv ${boss.lv}`, vw / 2, y + 28);
  }
  let text = '';
  let size = 44;
  if (b.intro > 0 && b.dramatic) {
    text = b.intro > 0.55 ? (b.setup.boss ? 'Boss battle!' : 'Ready…') : 'Fight!';
  } else if (b.endT >= 0 && b.outcome) {
    text = b.outcome.result === 'win' ? 'Victory!' : b.outcome.result === 'lose' ? 'Oh no…' : '';
    size = 48;
  }
  if (!text) return;
  ctx.save();
  ctx.translate(vw / 2, vh * 0.38);
  const pop = 1 + Math.max(0, Math.sin(b.t * 8)) * 0.05;
  ctx.scale(pop, pop);
  ctx.font = `900 ${size}px ui-rounded, "Nunito", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#4a2a5a';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#fff6d0';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
