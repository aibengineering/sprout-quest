// The edit itself: every frame is a pure function of time, renderAt(t), so the live page (driven by the audio
// clock) and the frame-by-frame video capture draw exactly the same thing.
import * as A from './art.js';
import { SCENES, BEAT, STEP, bar, punches, COMBO_HITS, KO, END } from './score.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 1080, H = 1920;
const Y = '#ffe14d', PINK = '#ff9ad5', ORANGE = '#ffa53a', CYAN = '#7fe8ff', GREEN = '#8ef06a', RED = '#ff5a5a', BLUE = '#8fc0ff', GOLD = '#ffd23f';
const DARK = '#1d1024';

// --- Small helpers ---------------------------------------------------------------------------------------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - clamp(k)) ** 3;
const easeIn = (k) => clamp(k) ** 3;
const back = (k) => { k = clamp(k); const c = 2.2; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
const pop = (dt, d = 0.13) => (dt < 0 ? 0 : dt >= d ? 1 : back(dt / d));
const decay = (dt, k) => (dt < 0 ? 0 : Math.exp(-dt * k));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function add(parent, markup) { parent.insertAdjacentHTML('beforeend', markup); return parent.lastElementChild; }
const group = (parent, attrs = '') => add(parent, `<g ${attrs}></g>`);
const part = (el, name) => el.querySelector(`[data-p="${name}"]`);
function T(el, x = 0, y = 0, s = 1, r = 0, sy = null) {
  el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(2)}) scale(${s.toFixed(3)}${sy === null ? '' : ' ' + sy.toFixed(3)})`);
}
const R = (el, r) => el.setAttribute('transform', `rotate(${r.toFixed(2)})`);
const show = (el, on) => { el.style.display = on ? '' : 'none'; };
const op = (el, v) => el.setAttribute('opacity', clamp(v).toFixed(3));
/** The most recent time in `times` at or before t, or -Infinity. */
function last(times, t) { let r = -Infinity; for (const x of times) if (x <= t) r = x; return r; }

function textEl(s, size, fill = '#fff', { stroke = DARK, sw = size * 0.2, anchor = 'middle', weight = 700 } = {}) {
  const t = document.createElementNS(NS, 'text');
  t.textContent = s;
  for (const [k, v] of Object.entries({ 'text-anchor': anchor, 'font-family': 'Fredoka, sans-serif', 'font-weight': weight, 'font-size': size, fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round', 'paint-order': 'stroke' })) t.setAttribute(k, v);
  return t;
}
/** Chunky outlined text with a drop shadow, centred on (0, 0). */
function label(parent, s, size, fill = '#fff', opts = {}) {
  const g = document.createElementNS(NS, 'g');
  const sh = textEl(s, size, DARK, { ...opts, stroke: DARK });
  sh.setAttribute('y', size * 0.36 + size * 0.09);
  const t = textEl(s, size, fill, opts);
  t.setAttribute('y', size * 0.36);
  g.append(sh, t);
  parent.append(g);
  return g;
}

/** A burst of particles, deterministic in time since the burst. */
function burst(parent, n, make, o = {}) {
  const { seed = 1, speed = [500, 1000], ang = [-160, -20], g = 1800, spin = [-500, 500], life = 1, scale = [0.8, 1.2], grow = 0 } = o;
  const r = rng(seed), ps = [];
  for (let i = 0; i < n; i++) {
    const el = add(parent, `<g>${make(i, r)}</g>`);
    const a = (ang[0] + r() * (ang[1] - ang[0])) * Math.PI / 180, v = speed[0] + r() * (speed[1] - speed[0]);
    ps.push({ el, vx: Math.cos(a) * v, vy: Math.sin(a) * v, sp: spin[0] + r() * (spin[1] - spin[0]), s: scale[0] + r() * (scale[1] - scale[0]), r0: r() * 360 });
    show(el, false);
  }
  return (dt, x, y) => {
    for (const p of ps) {
      const on = dt >= 0 && dt < life;
      show(p.el, on);
      if (!on) continue;
      const k = dt / life;
      T(p.el, x + p.vx * dt, y + p.vy * dt + 0.5 * g * dt * dt, p.s * Math.min(1, dt * 14 + 0.3) * (1 + grow * dt), p.r0 + p.sp * dt);
      op(p.el, k > 0.7 ? (1 - k) / 0.3 : 1);
    }
  };
}

/** A word that pops up and floats away, in world space. */
function popup(parent, s, size, fill) {
  const g = group(parent);
  label(g, s, size, fill);
  show(g, false);
  return (dt, x, y, life = 0.7) => {
    const on = dt >= 0 && dt < life;
    show(g, on);
    if (!on) return;
    T(g, x, y - 140 * easeOut(dt / life), pop(dt, 0.12) * (1 + 0.1 * Math.sin(dt * 30)), -6 + 8 * Math.sin(dt * 9));
    op(g, dt > life - 0.15 ? (life - dt) / 0.15 : 1);
  };
}

function sunburst(parent, c1, c2, n = 18) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2, Rr = 1800;
    d += `M0 0 L${(Math.cos(a0) * Rr).toFixed(0)} ${(Math.sin(a0) * Rr).toFixed(0)} L${(Math.cos(a1) * Rr).toFixed(0)} ${(Math.sin(a1) * Rr).toFixed(0)}Z`;
  }
  const g = add(parent, `<g><rect x="-2000" y="-2000" width="4000" height="4000" fill="${c1}"/><g><path d="${d}" fill="${c2}"/></g></g>`);
  const spin = g.lastElementChild;
  return (t, x = W / 2, y = H / 2, speed = 20) => { T(g, x, y); R(spin, t * speed); };
}

/** Camera shots: [start, x, y, zoom, rot, zoomDrift/s, dx/s, dy/s]; cuts are instant. */
function shots(list) {
  return (lt) => {
    let i = 0;
    for (let j = 0; j < list.length; j++) if (lt >= list[j][0]) i = j;
    const [t0, x, y, z, r = 0, dz = 0, dx = 0, dy = 0] = list[i];
    const d = lt - t0;
    return { i, d, x: x + dx * d, y: y + dy * d, z: z * (1 + dz * d), r };
  };
}
const camTf = (el, c) => el.setAttribute('transform', `translate(${W / 2} ${H / 2}) rotate(${c.r.toFixed(2)}) scale(${c.z.toFixed(4)}) translate(${(-c.x).toFixed(1)} ${(-c.y).toFixed(1)})`);

/** The hero's tool arm: wind up before each hit, strike on it, ease back. Returns the arm angle. */
function swingAngle(hits, t, { rest = -40, wind = -150, strike = 8 } = {}) {
  let a = rest;
  for (const h of hits) {
    const dt = t - h;
    if (dt >= -0.12 && dt < 0) a = lerp(rest, wind, easeOut((dt + 0.12) / 0.12));
    else if (dt >= 0 && dt < 0.06) a = lerp(wind, strike, easeOut(dt / 0.04));
    else if (dt >= 0.06 && dt < 0.3) a = lerp(strike, rest, easeOut((dt - 0.06) / 0.24));
  }
  return a;
}

/** Looping particles (sawdust, embers): each has a phase, so the stream is continuous and deterministic. */
function stream(parent, n, make, o = {}) {
  const { seed = 5, life = 0.6, speed = [400, 800], ang = [-120, -60], g = 900, scale = [0.6, 1.2] } = o;
  const r = rng(seed), ps = [];
  for (let i = 0; i < n; i++) {
    const el = add(parent, `<g>${make(i, r)}</g>`);
    const a = (ang[0] + r() * (ang[1] - ang[0])) * Math.PI / 180, v = speed[0] + r() * (speed[1] - speed[0]);
    ps.push({ el, ph: r(), vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: scale[0] + r() * (scale[1] - scale[0]), sp: (r() - 0.5) * 900 });
  }
  return (t, x, y, on = true) => {
    for (const p of ps) {
      show(p.el, on);
      if (!on) continue;
      const k = ((t / life + p.ph) % 1), dt = k * life;
      T(p.el, x + p.vx * dt, y + p.vy * dt + 0.5 * g * dt * dt, p.s * (1 - k * 0.5), p.sp * dt);
      op(p.el, k > 0.7 ? (1 - k) / 0.3 : 1);
    }
  };
}

// --- The stage ---------------------------------------------------------------------------------------------
let svg, base, fxwrap, cam, sceneLayer, lines, hlines, flash, hud, caps, stickerLayer;
const scenes = [];
const PUNCH = punches();

function scene(name, build) {
  const [t0, t1] = SCENES[name];
  const root = group(sceneLayer, `data-scene="${name}"`);
  const sbg = group(root), world = group(root), sfg = group(root);
  const bg = group(world), fg = group(world);
  const update = build({ sbg, world, bg, fg, sfg, t0, t1 });
  scenes.push({ name, t0, t1, root, sbg, bg, update });
  show(root, false);
}

function buildScenes() {
  // 1. A cosy village. Then a record scratch freezes the frame.
  scene('intro', ({ bg, fg, world }) => {
    add(bg, A.meadow(-700, -700, 2480, 3400, 11));
    add(bg, `<path d="M330 760 C300 1000 600 1060 560 1400 S 500 1900 600 2600" stroke="#d9c08a" stroke-width="190" fill="none" stroke-linecap="round"/>
      <path d="M330 760 C300 1000 600 1060 560 1400 S 500 1900 600 2600" stroke="#ecd9a8" stroke-width="160" fill="none" stroke-linecap="round"/>`);
    add(fg, `<g transform="translate(830 600) scale(.75)">${A.house({ roof: '#7ab8e8', wall: '#fff6e6' })}</g>`);
    add(fg, A.res('pine', 1010, 820, 1.4));
    add(fg, `<g transform="translate(330 760) scale(1.05)">${A.house()}</g>`);
    add(fg, A.res('oak-v0', 70, 1000, 1.6));
    const granny = add(fg, `<g>${A.granny()}</g>`);
    const poppyEl = add(fg, `<g>${A.poppy()}</g>`);
    add(fg, A.res('oak-v1', 990, 1260, 1.6));
    const hero = add(fg, `<g>${A.hero({ face: 'joy' })}</g>`);
    add(fg, A.res('oak', 120, 1720, 1.9));
    add(fg, A.res('oak-v2', 1000, 1900, 2.0));
    const hearts = [0, 1, 2, 3].map(() => add(fg, `<g>${A.heart()}</g>`));
    const flies = [0, 1].map((i) => add(fg, `<g><g data-p="w"><path d="M0 0 C-30 -30 -40 0 -20 14 C-10 20 0 10 0 0Z M0 0 C30 -30 40 0 20 14 C10 20 0 10 0 0Z" fill="${i ? '#ffd23f' : '#ff9ad5'}" stroke="${A.INK}" stroke-width="4"/></g></g>`));
    const cam = shots([[0, 540, 1080, 1.0, 0, 0.05], [bar(1), 640, 1200, 1.45, 3, 0.05], [bar(1, 11), 560, 1180, 2.2, -6]]);
    const freeze = bar(1, 11);
    return (lt) => {
      const c = cam(lt);
      camTf(world, c);
      const t = Math.min(lt, freeze);
      const b = Math.abs(Math.sin((t / BEAT) * Math.PI));
      T(hero, 540, 1400, 2.1, 0, 2.1 * (1 - 0.03 * b));
      R(part(hero, 'armL'), 150 + 22 * Math.sin(t * 14));
      R(part(hero, 'head'), 4 * Math.sin(t * 5));
      T(poppyEl, 800, 1180 - 22 * b, 1.15);
      T(granny, 220, 980, 1.05);
      R(part(granny, 'head'), 5 * Math.sin(t * 4));
      hearts.forEach((h, i) => {
        const k = ((t + i * 0.6) % 2.4) / 2.4;
        T(h, 540 + 170 * Math.sin(i * 2.1 + k * 4), 900 - k * 380, 0.8 + 0.3 * Math.sin(k * 3.14), 10 * Math.sin(t * 3 + i));
        op(h, k < 0.15 ? k / 0.15 : 1 - k);
      });
      flies.forEach((f, i) => {
        T(f, 300 + i * 420 + 120 * Math.sin(t * 1.3 + i), 1150 - i * 300 + 60 * Math.sin(t * 2.2 + i), 1.1);
        T(part(f, 'w'), 0, 0, 1, 0, 0.3 + 0.7 * Math.abs(Math.cos(t * 16 + i)));
      });
    };
  });

  // 2. Chop: four axe hits, TIMBER, logs and coins.
  scene('chop', ({ bg, fg, sfg, world }) => {
    add(bg, A.meadow(-700, -700, 2480, 3400, 22));
    add(fg, A.res('pine', 140, 960, 1.3));
    add(fg, A.res('oak-v1', 980, 900, 1.25));
    const TX = 650, TY = 1250, TS = 2.6, CUT = TY - 30 * TS;
    const stump = add(fg, A.res('oak-stump', TX, TY, TS));
    const tree = add(fg, `<g>${A.res('oak', TX, TY, TS, `clip-path="url(#cutclip)"`)}</g>`);
    add(fg, `<clipPath id="cutclip"><rect x="0" y="-2000" width="2000" height="${2000 + CUT}"/></clipPath>`);
    const hero = add(fg, `<g>${A.hero({ tool: 'axe', face: 'determined' })}</g>`);
    const heroShout = add(fg, `<g>${A.hero({ tool: 'axe', face: 'shout' })}</g>`);
    const fx = group(fg);
    const hits = [0, 0.375, 0.75, 1.125, 1.5];
    const chips = hits.map((h, i) => burst(fx, 7, (j, r) => `<rect x="-12" y="-7" width="24" height="14" rx="4" fill="${j % 2 ? '#efcf96' : '#9f6c46'}" stroke="${A.INK}" stroke-width="3"/>`, { seed: 10 + i, ang: [-170, -100], speed: [500, 1000], life: 0.55 }));
    const bangs = hits.map(() => add(fx, `<g>${A.bang(80)}</g>`));
    const FALL = 1.5, LAND = bar(3, 6) - bar(2);
    const dust = burst(fx, 14, () => `<circle r="40" fill="#e8dcc0" stroke="${A.INK}" stroke-width="4"/>`, { seed: 3, ang: [-180, 0], speed: [300, 700], g: -200, life: 0.6, scale: [0.8, 1.6], grow: 1.5 });
    const logs = [0, 1, 2].map((i) => burst(fx, 1, () => A.log(), { seed: 40 + i, ang: [-110 + i * 20, -100 + i * 20], speed: [1300, 1500], g: 2600, life: 0.8, scale: [1.6, 1.8], grow: 1.2, spin: [-300, 300] }));
    const coins = burst(fx, 10, () => A.coin(), { seed: 8, ang: [-150, -30], speed: [700, 1300], g: 2400, life: 0.9, scale: [1.1, 1.5] });
    const wood = popup(sfg, '+3 WOOD', 96, GREEN);
    const gold = popup(sfg, '+15 GOLD', 96, GOLD);
    const cam = shots([[0, 520, 1020, 1.0, 0], [0.375, 610, 1060, 1.9, 7], [0.75, 400, 1030, 2.2, -6], [1.125, 540, 1040, 1.2, 4],
      [FALL, 720, 980, 0.84, 0, 0.1], [LAND, 760, 1060, 1.0, -3], [bar(3, 9) - bar(2), 600, 1000, 1.15, 3]]);
    return (lt) => {
      const c = cam(lt);
      camTf(world, c);
      const shout = c.i === 2;
      show(hero, !shout); show(heroShout, shout);
      const h = shout ? heroShout : hero;
      T(h, 380, 1330, 2.0);
      R(part(h, 'armR'), swingAngle(hits, lt));
      const lh = last(hits, lt), sh = decay(lt - lh, 10);
      let ang = 2.5 * sh * Math.sin((lt - lh) * 50);
      if (lt >= FALL) {
        const k = (lt - FALL) / (LAND - FALL);
        ang = k < 1 ? 92 * easeIn(k) : 92 - 6 * Math.sin((lt - LAND) * 18) * decay(lt - LAND, 6);
      }
      tree.setAttribute('transform', `rotate(${ang.toFixed(2)} ${TX} ${CUT})`);
      show(stump, lt >= FALL - 0.01);
      hits.forEach((t0, i) => {
        chips[i](lt - t0, TX - 40, TY - 90);
        const d = lt - t0;
        show(bangs[i], d >= 0 && d < 0.09);
        T(bangs[i], TX - 50, TY - 100, 1 + d * 6, i * 25);
      });
      dust(lt - LAND, TX + 420, CUT + 20);
      [0, 1, 2].forEach((i) => logs[i](lt - (bar(3, 9 + i) - bar(2)), TX + 40, TY - 80));
      coins(lt - (bar(3, 13) - bar(2)), TX, TY - 100);
      wood(lt - (bar(3, 9) - bar(2)), 300, 1560, 0.65);
      gold(lt - (bar(3, 13) - bar(2)), 770, 1600, 0.5);
    };
  });

  // 3. Mine: copper, a crystal shatters, +99999 aura, rapid clinks.
  scene('mine', ({ sbg, bg, fg, sfg, world }) => {
    const burstBg = sunburst(sbg, '#4a1f7a', '#6a34a8');
    const quickBg = sunburst(sbg, '#2a1838', '#3a2450', 12);
    add(bg, A.caveFloor(-700, -700, 2480, 3400, 7));
    const rocks = group(fg), aura = group(fg), quick = group(fg);
    const copper = add(rocks, A.res('copper', 640, 1270, 2.7));
    const crystal = add(rocks, A.res('crystal', 620, 1260, 2.9));
    const rubble = add(rocks, A.res('crystal-rubble', 620, 1260, 2.9));
    const hero = add(rocks, `<g>${A.hero({ tool: 'pick', face: 'determined' })}</g>`);
    const fx = group(rocks);
    const hits = [0, 0.375, 0.75];
    const nug = [0, 1].map((i) => burst(fx, 6, () => A.nugget(), { seed: 60 + i, ang: [-160, -40], speed: [600, 1100], life: 0.7, scale: [1.2, 1.8] }));
    const sparks = hits.map(() => add(fx, `<g>${A.bang(70, '#ffe46a')}</g>`));
    const shards = burst(fx, 14, (i) => A.gem(i % 2 ? '#8fe8ff' : '#d8b8ff'), { seed: 71, ang: [-180, 0], speed: [700, 1500], g: 900, life: 0.8, scale: [1.2, 2], grow: 2.2 });
    const cu = popup(sfg, '+2 COPPER', 92, ORANGE);
    const cr = popup(sfg, '+4 CRYSTAL', 92, CYAN);
    // The aura shot.
    const flames = add(aura, `<g><ellipse cx="0" cy="-120" rx="170" ry="190" fill="${A.glow('auraglow', [[0, '#fff3a0', 0.7], [0.6, '#ffd23f', 0.35], [1, '#c89aff', 0]])}"/>
      ${Array.from({ length: 9 }, (_, i) => `<path data-p="f${i}" d="M0 0 C-44 -50 -34 -130 0 -210 C34 -130 44 -50 0 0Z" fill="${i % 2 ? '#ffd23f' : '#d8b0ff'}" opacity=".9" stroke="${A.INK}" stroke-width="5"/>`).join('')}</g>`);
    const auraHero = add(aura, `<g>${A.hero({ tool: 'pick', face: 'smug' })}</g>`);
    const orbit = [0, 1, 2, 3, 4, 5].map((i) => add(aura, `<g>${i % 3 === 2 ? A.nugget() : A.gem(i % 2 ? '#8fe8ff' : '#d8b8ff')}</g>`));
    const iron = add(quick, A.res('iron', 540, 1300, 3.6));
    const obs = add(quick, A.res('obsidian', 540, 1300, 3.3));
    const qb = add(quick, `<g>${A.bang(110, '#ffffff')}</g>`);
    const AURA = 1.5, QUICK = bar(5, 12) - bar(4);
    const cam = shots([[0, 470, 1100, 1.05, 0], [0.375, 610, 1110, 2.0, -6], [0.75, 580, 1060, 1.35, 4, 0.25], [AURA, 540, 1000, 1.0, 0, 0.05], [QUICK, 540, 1150, 1.0, -5], [QUICK + STEP * 2, 540, 1150, 1.0, 6]]);
    return (lt) => {
      const c = cam(lt);
      camTf(world, c);
      const mode = lt < AURA ? 0 : lt < QUICK ? 1 : 2;
      cu(lt - 0.42, 300, 1580, 0.5);
      cr(lt - 0.84, 700, 1600, 0.62);
      show(rocks, mode === 0); show(aura, mode === 1); show(quick, mode === 2); show(bg, mode === 0);
      burstBg(lt, 540, 960, 30); show(sbg.firstElementChild, mode === 1); show(sbg.lastElementChild, mode === 2);
      quickBg(lt, 540, 960, -40);
      if (mode === 0) {
        show(copper, lt < 0.75); show(crystal, lt >= 0.75 && lt < 0.8); show(rubble, lt >= 0.8);
        T(hero, 360, 1350, 2.0);
        R(part(hero, 'armR'), swingAngle(hits, lt, { strike: 20 }));
        const lh = last(hits, lt), k = decay(lt - lh, 12);
        const rock = lt < 0.75 ? copper : crystal;
        rock.setAttribute('transform', `translate(${(10 * k * Math.sin(lt * 80)).toFixed(1)} 0)`);
        nug.forEach((f, i) => f(lt - hits[i], 600, 1180));
        hits.forEach((h, i) => { const d = lt - h; show(sparks[i], d >= 0 && d < 0.08); T(sparks[i], 590, 1170, 1 + d * 8, i * 30); });
        shards(lt - 0.75, 620, 1100);
      } else if (mode === 1) {
        const d = lt - AURA;
        T(auraHero, 540, 1420, 2.8 * pop(d, 0.15));
        R(part(auraHero, 'armR'), -60 + 6 * Math.sin(d * 12));
        T(flames, 540, 1420, 2.8 * pop(d, 0.2));
        for (let i = 0; i < 9; i++) {
          const f = part(flames, 'f' + i), c = i - 4;
          const h = (1.35 - Math.abs(c) * 0.12) * (1 + 0.22 * Math.sin(d * 19 + i * 1.9));
          f.setAttribute('transform', `translate(${c * 30} ${-30 + Math.abs(c) * 8}) rotate(${(c * 9 + 5 * Math.sin(d * 13 + i)).toFixed(1)}) scale(${(0.85 + 0.15 * Math.sin(d * 23 + i)).toFixed(3)} ${h.toFixed(3)})`);
        }
        orbit.forEach((o, i) => {
          const a = d * 4 + (i / 6) * Math.PI * 2;
          T(o, 540 + Math.cos(a) * 430, 1310 + Math.sin(a) * 110, 2.0 + Math.sin(a) * 0.5, d * 200 + i * 40);
        });
      } else {
        const second = lt >= QUICK + STEP * 2;
        show(iron, !second); show(obs, second);
        const d = lt - (second ? QUICK + STEP * 2 : QUICK);
        (second ? obs : iron).setAttribute('transform', `translate(540 1300) scale(${(1 + 0.15 * decay(d, 14)).toFixed(3)}) translate(-540 -1300)`);
        show(qb, d < 0.07); T(qb, 560, 1150, 1.4 + d * 6);
      }
    };
  });

  // 4. Slime fight: a VS card, slashes, a combo into a KO.
  scene('fight', ({ sbg, bg, fg, sfg, world }) => {
    const orange = sunburst(sbg, '#ff8a3a', '#ffb24a', 20);
    add(bg, A.meadow(-700, -700, 2480, 3400, 33));
    const vs = group(sfg), vsBg = group(sbg);
    add(vsBg, `<path d="M0 0 L700 0 L380 1920 L0 1920Z" fill="#4a7ae8"/><path d="M700 0 L1080 0 L1080 1920 L380 1920Z" fill="#e84a6a"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M${-200 + i * 90} 0 L${-520 + i * 90} 1920" stroke="#fff" stroke-width="18" opacity=".12"/>`).join('')}
      <path d="M700 0 L380 1920" stroke="#fff" stroke-width="26"/><path d="M700 0 L380 1920" stroke="${A.INK}" stroke-width="10"/>`);
    const vsHero = add(vs, `<g>${A.hero({ tool: 'sword', face: 'determined' })}</g>`);
    const vsSlime = add(vs, `<g>${A.slime({ angry: true })}</g>`);
    const vsWord = group(vs); label(vsWord, 'VS', 300, Y, { sw: 50 });
    const you = group(vs); label(you, 'YOU', 110, '#fff');
    const sl = group(vs); label(sl, 'SLIME', 110, '#fff');
    const field = group(fg);
    const slime = add(field, `<g>${A.slime({ angry: true })}</g>`);
    const goo = add(field, `<ellipse cx="0" cy="0" rx="180" ry="40" fill="#55c46c" stroke="${A.INK}" stroke-width="6"/>`);
    const hero = add(field, `<g>${A.hero({ tool: 'sword', face: 'shout' })}</g>`);
    const fx = group(field);
    const slashes = [0.75, 1.125];
    const arcs = slashes.map(() => add(fx, `<path d="M-160 -120 C-40 -40 40 40 60 200 C80 40 0 -60 -160 -120Z" fill="#fff" stroke="${A.INK}" stroke-width="6"/>`));
    const hitT = COMBO_HITS.map((t) => t - bar(6));
    const KOt = KO - bar(6);
    const allHits = [...slashes, ...hitT];
    const bangs = allHits.map((_, i) => add(fx, `<g>${A.bang(70 + (i % 3) * 14, i % 2 ? '#fff6a0' : '#ffffff')}</g>`));
    const nums = allHits.map((_, i) => popup(fx, i === 0 ? '12' : i === 1 ? 'CRIT 34' : String(7 + Math.floor(hash(i) * 92)), i < 2 ? 100 : 76, i === 1 ? Y : i % 3 === 0 ? RED : '#fff'));
    const coins = burst(fx, 14, () => A.coin(), { seed: 90, ang: [-170, -10], speed: [800, 1500], g: 2400, life: 1, scale: [1.2, 1.6] });
    const xp = burst(fx, 12, () => `<circle r="22" fill="#8ef06a" stroke="${A.INK}" stroke-width="4"/><circle cx="-6" cy="-6" r="6" fill="#fff" opacity=".7"/>`, { seed: 91, ang: [-180, 0], speed: [600, 1400], g: 1500, life: 1, scale: [1, 1.4] });
    const koWord = group(fx); label(koWord, 'K.O.!', 220, Y, { sw: 40 });
    const cam = shots([[0, 540, 960, 1, 0], [0.75, 560, 1100, 1.1, 3], [1.125, 590, 1110, 1.25, -4], [1.5, 600, 1120, 1.3, -6], [1.875, 590, 1110, 1.4, 6],
      [2.25, 600, 1120, 1.25, -8, 0.1], [2.625, 595, 1130, 1.45, 7], [3.0, 605, 1120, 1.3, -5, 0.12], [3.375, 600, 1140, 1.5, 8], [KOt, 640, 1150, 1.15, 0, 0.05]]);
    return (lt) => {
      const c = cam(lt);
      camTf(world, c);
      const isVs = lt < 0.75;
      show(vs, isVs); show(vsBg, isVs); show(field, !isVs); show(bg, !isVs);
      const hype = lt >= 2.25 && lt < KOt;
      orange(lt, 540, 960, 50); show(sbg.firstElementChild, hype); if (hype) show(bg, false);
      if (isVs) {
        const k = easeOut(lt / 0.14);
        T(vsHero, lerp(150, 290, k), 1420, 2.6);
        T(vsSlime, lerp(960, 800, k), 1180, 2.8 * (1 + 0.06 * Math.sin(lt * 30)), 0, 2.8 * (1 - 0.06 * Math.sin(lt * 30)));
        T(vsWord, 540 + 6 * Math.sin(lt * 70), 900, pop(lt - 0.1, 0.15) * (1 + 0.05 * Math.sin(lt * 25)), -10);
        T(you, lerp(100, 270, k), 1620, 1); T(sl, lerp(1000, 800, k), 1380, 1);
        return;
      }
      // Hero lunges in for the first slash, then stays in range.
      const dash = clamp((lt - 0.68) / 0.07);
      const lh = last(allHits, lt), since = lt - lh;
      T(hero, lerp(300, 480, dash) - 30 * decay(since, 12), 1330, 2.1);
      R(part(hero, 'armR'), swingAngle(allHits, lt, { rest: -60, wind: -140, strike: allHits.indexOf(lh) % 2 ? 30 : -10 }));
      const sq = decay(since, 14);
      const ko = lt >= KOt;
      if (!ko) T(slime, 730 + 30 * sq, 1290, 2.4 * (1 + 0.28 * sq), 4 * sq, 2.4 * (1 - 0.28 * sq));
      else T(slime, 740, 1290, 2.4 * (1 + 0.6 * easeOut((lt - KOt) / 0.1)), 0, 2.4 * Math.max(0.05, 1 - easeOut((lt - KOt) / 0.12)));
      show(slime, !ko || lt < KOt + 0.12);
      show(goo, ko && lt >= KOt + 0.1); T(goo, 740, 1290, 1 + 0.2 * decay(lt - KOt - 0.1, 8));
      slashes.forEach((s, i) => { const d = lt - s; show(arcs[i], d >= 0 && d < 0.1); T(arcs[i], 720, 1100, 1.6 + d * 3, i ? 180 : 0, i ? -1.6 - d * 3 : null); });
      allHits.forEach((h, i) => {
        const d = lt - h; show(bangs[i], d >= 0 && d < 0.07);
        T(bangs[i], 700 + (hash(i * 3) - 0.5) * 120, 1150 + (hash(i * 7) - 0.5) * 140, 1.2 + d * 8, i * 37);
        nums[i](d, 760 + (hash(i * 5) - 0.5) * 300, 1060 + (hash(i * 11) - 0.5) * 160, 0.4);
      });
      coins(lt - KOt - 0.05, 740, 1200); xp(lt - KOt - 0.05, 740, 1200);
      const kd = lt - KOt;
      show(koWord, kd >= 0 && kd < 0.3); T(koWord, 640, 920, pop(kd, 0.14) * (1.1 + 0.04 * Math.sin(kd * 30)), -8);
    };
  });

  // 5. Forge: hammer the plate, it flies onto the hero, drip check.
  scene('forge', ({ sbg, bg, fg, sfg, world }) => {
    const gold = sunburst(sbg, '#ffb43a', '#ffd86a', 18);
    add(bg, A.cobbles(-700, -700, 2480, 3400));
    const yard = group(fg), drip = group(fg);
    add(yard, `<g transform="translate(540 1000) scale(1.3)">${A.forge()}</g>`);
    add(yard, `<g transform="translate(590 1330) scale(1.2)">${A.anvil()}</g>`);
    const plate = add(yard, `<g>${A.chestplate({ hot: true })}</g>`);
    const hero = add(yard, `<g>${A.hero({ tool: 'hammer', face: 'determined' })}</g>`);
    const heroUp = add(yard, `<g>${A.hero({ tool: 'hammer', face: 'shock' })}</g>`);
    const flames = yard.querySelector('[data-p="flames"]');
    const fx = group(yard);
    const hits = [0, 0.375, 0.75, 1.125];
    const sparks = hits.map((_, i) => burst(fx, 12, () => `<path d="M-14 0 L14 0" stroke="#ffd23f" stroke-width="7" stroke-linecap="round"/><path d="M-14 0 L14 0" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`, { seed: 100 + i, ang: [-170, -10], speed: [700, 1400], g: 2000, life: 0.45, spin: [0, 0] }));
    const bangs = hits.map(() => add(fx, `<g>${A.bang(80, '#ffe46a')}</g>`));
    const clang = popup(sfg, 'CLANG!', 110, ORANGE);
    const trail = [0, 1, 2, 3, 4, 5].map(() => add(fx, `<g>${A.sparkle(22)}</g>`));
    const dripHero = add(drip, `<g>${A.hero({ armor: 'copper', tool: 'sword', face: 'cool' })}</g>`);
    const twinkles = [0, 1, 2, 3, 4, 5, 6, 7].map(() => add(drip, `<g>${A.sparkle(30)}</g>`));
    const FLY = 1.5, EQUIP = bar(10, 6) - bar(9);
    const cam = shots([[0, 500, 1080, 1.0, 0], [0.375, 540, 1150, 1.4, -4], [0.75, 590, 1190, 2.3, 5], [1.125, 520, 1150, 1.6, -5], [FLY, 470, 1130, 1.25, 0], [EQUIP, 540, 1000, 1.0, 0, 0.05]]);
    return (lt) => {
      const c = cam(lt);
      camTf(world, c);
      const isDrip = lt >= EQUIP;
      clang(lt - 0.75, 760, 1580, 0.6);
      show(yard, !isDrip); show(drip, isDrip); show(bg, !isDrip); show(sbg.firstElementChild, isDrip);
      gold(lt, 540, 1000, 40);
      if (!isDrip) {
        const up = lt >= FLY;
        show(hero, !up); show(heroUp, up);
        T(hero, 330, 1420, 2.0); T(heroUp, 330, 1420, 2.0);
        R(part(hero, 'armR'), swingAngle(hits, lt, { rest: -70, wind: -160, strike: 20 }));
        R(part(heroUp, 'armR'), -40);
        flames.setAttribute('transform', `translate(0 ${(-4 * Math.sin(lt * 30)).toFixed(1)}) scale(1 ${(1 + 0.1 * Math.sin(lt * 23)).toFixed(3)})`);
        hits.forEach((h, i) => { const d = lt - h; sparks[i](d, 600, 1190); show(bangs[i], d >= 0 && d < 0.08); T(bangs[i], 600, 1190, 1 + d * 7, i * 40); });
        // The plate sits on the anvil, then arcs onto the hero.
        if (lt < FLY) T(plate, 600, 1175, 0.95, 0, 0.95 * (1 - 0.08 * decay(lt - last(hits, lt), 14)));
        else {
          const k = clamp((lt - FLY) / (EQUIP - FLY - 0.03));
          const x = lerp(600, 330, k), y = lerp(1175, 1300, k) - 520 * Math.sin(k * Math.PI);
          T(plate, x, y, 1.1 + 0.5 * Math.sin(k * Math.PI), k * 720);
          trail.forEach((s, i) => { const kk = clamp(k - (i + 1) * 0.06); T(s, lerp(600, 330, kk), lerp(1175, 1300, kk) - 520 * Math.sin(kk * Math.PI), 1 - i * 0.12, lt * 300); show(s, kk > 0); });
        }
        show(plate, lt < EQUIP - 0.03);
      } else {
        const d = lt - EQUIP;
        const flip = Math.floor(d / BEAT) % 2 ? -1 : 1;
        T(dripHero, 540, 1480, 3.2 * flip * pop(d, 0.12), 0, 3.2 * pop(d, 0.12));
        R(part(dripHero, 'armR'), -100 + 8 * Math.sin(d * 10));
        twinkles.forEach((s, i) => {
          const k = ((d * 2 + i / 8) % 1);
          T(s, 540 + Math.cos(i * 0.8) * (300 + 80 * (i % 3)), 1000 + Math.sin(i * 1.7) * 360, 1.6 * Math.sin(k * Math.PI), d * 180);
        });
      }
    };
  });

  // 6. Sawmill: the blade goes brrr, planks fly, Bram approves.
  scene('saw', ({ bg, fg, sfg, world }) => {
    add(bg, A.meadow(-700, -700, 2480, 3400, 44));
    add(fg, A.res('oak-v2', 120, 830, 1.3)); add(fg, A.res('pine', 980, 800, 1.3));
    const SX = 540, SY = 1330, SS = 1.25;
    const mill = add(fg, `<g transform="translate(${SX} ${SY}) scale(${SS})">${A.sawmill()}</g>`);
    const bladeEl = part(mill, 'blade'), logEl = part(mill, 'log');
    const bram = add(fg, `<g>${A.bram()}</g>`);
    const bramUp = add(fg, `<g>${A.bram({ thumbs: true })}</g>`);
    const hero = add(fg, `<g>${A.hero({ armor: 'copper', face: 'joy' })}</g>`);
    const fx = group(fg);
    const BX = SX + 60 * SS, BY = SY - 170 * SS;
    const dust = stream(fx, 26, (i) => `<circle r="${6 + (i % 3) * 3}" fill="${i % 2 ? '#efcf96' : '#d9b278'}" stroke="${A.INK}" stroke-width="2.5"/>`, { seed: 12, life: 0.5, speed: [500, 1000], ang: [-170, -110], g: 1400 });
    const planks = [0, 1, 2].map((i) => burst(fx, 1, () => A.plank(), { seed: 120 + i, ang: [-120 + i * 25, -110 + i * 25], speed: [1300, 1500], g: 2300, life: 0.8, scale: [1.6, 1.8], grow: 1.3, spin: [-400, 400] }));
    const plus = popup(sfg, '+3 PLANKS', 100, '#ffe9b0');
    const stars = [0, 1, 2, 3, 4].map(() => add(fx, `<g>${A.sparkle(24)}</g>`));
    const BRR = 0.75, PL = 1.5, BRAM = 2.25;
    const cam = shots([[0, 540, 1230, 1.12, 0], [BRR, BX, BY, 3.0, -8], [PL, 560, 1100, 1.3, 4], [BRAM, 920, 1250, 2.3, -4]]);
    return (lt, t) => {
      const c = cam(lt);
      const brr = c.i === 1;
      if (brr) { c.x += (hash(Math.floor(t * 40)) - 0.5) * 14; c.y += (hash(Math.floor(t * 40) + 9) - 0.5) * 14; }
      camTf(world, c);
      R(bladeEl, lt * (brr ? 1500 : 800));
      logEl.setAttribute('transform', `translate(${(Math.min(lt, 2.2) * 40).toFixed(1)} 0)`);
      dust(lt, BX - 40, BY + 10, true);
      const thumbs = lt >= BRAM;
      show(bram, !thumbs); show(bramUp, thumbs);
      const nod = Math.abs(Math.sin((lt / BEAT) * Math.PI));
      T(bram, 930, 1520, 1.6); T(bramUp, 930, 1520, 1.6 * (1 + 0.04 * nod));
      R(part(bram, 'head'), -6 + 10 * nod);
      R(part(bramUp, 'head'), -4 + 3 * nod);
      T(hero, 170, 1530, 1.5, 0, 1.5 * (1 - 0.04 * nod));
      R(part(hero, 'armL'), 150 + 20 * Math.sin(lt * 14));
      [0, 3, 6].forEach((s, i) => planks[i](lt - (bar(12, s) - bar(11)), BX, BY));
      plus(lt - PL, 540, 1600, 0.75);
      stars.forEach((s, i) => { const k = ((lt * 1.6 + i / 5) % 1); show(s, thumbs); T(s, 960 + Math.cos(i * 1.3) * 170, 1150 + Math.sin(i * 2.1) * 170, 1.4 * Math.sin(k * Math.PI), lt * 200); });
    };
  });

  // 7. Farm with Poppy and Mr. Floppers; Granny's cookies.
  scene('farm', ({ sbg, bg, fg, sfg, world }) => {
    const pink = sunburst(sbg, '#ff9ac8', '#ffc0dc', 18);
    add(bg, A.meadow(-700, -700, 2480, 3400, 55));
    const field = group(fg), cookies = group(fg);
    [1100, 1290, 1480].forEach((y) => add(field, `<g transform="translate(520 ${y})">${A.plotBed(520, 110)}</g>`));
    const spots = [[360, 1090], [520, 1100], [680, 1090], [380, 1280], [560, 1290], [700, 1280], [450, 1475]];
    const colors = [['#ff8fb8', '#ffd23f'], ['#ffd23f', '#ff8a3a'], ['#ffffff', '#ffd23f'], ['#c8b0ff', '#fff6a0'], ['#ff6b6b', '#ffd23f'], ['#8fc0ff', '#ffffff'], ['#ff8fb8', '#ffffff']];
    const sprouts = spots.map(([x, y]) => add(field, `<g transform="translate(${x} ${y}) scale(1.3)">${A.sprout()}</g>`));
    const flowers = spots.map((_, i) => add(field, `<g>${A.flower(...colors[i])}</g>`));
    const hero = add(field, `<g>${A.hero({ armor: 'copper', tool: 'can', face: 'joy' })}</g>`);
    const poppy = add(field, `<g>${A.poppy()}</g>`);
    const fx = group(field);
    const drops = stream(fx, 14, () => `<path d="M0 -12 C6 -2 8 4 0 10 C-8 4 -6 -2 0 -12Z" fill="#7fd0ff" stroke="${A.INK}" stroke-width="3"/>`, { seed: 3, life: 0.45, speed: [300, 500], ang: [-40, 10], g: 2000 });
    const popTimes = [6, 8, 10, 12, 13, 14, 15].map((s) => bar(13, s) - bar(13));
    const petals = popTimes.map((_, i) => burst(fx, 6, () => `<ellipse rx="10" ry="14" fill="${colors[i][0]}" stroke="${A.INK}" stroke-width="3"/>`, { seed: 140 + i, speed: [300, 600], life: 0.5, g: 800 }));
    const hearts = [0, 1].map((i) => burst(fx, 7, () => A.heart(), { seed: 150 + i, ang: [-150, -30], speed: [500, 900], g: 600, life: 0.8, scale: [0.8, 1.2] }));
    const JUMPS = [1.5, 1.875];
    // Granny's shot.
    const granny = add(cookies, `<g>${A.granny()}</g>`);
    const p2 = add(cookies, `<g>${A.poppy()}</g>`);
    const h2 = add(cookies, `<g>${A.hero({ armor: 'copper', face: 'joy' })}</g>`);
    const cfx = group(cookies);
    const ch = burst(cfx, 10, () => A.heart(), { seed: 160, ang: [-160, -20], speed: [500, 1000], g: 500, life: 1, scale: [0.8, 1.3] });
    const cookie = popup(sfg, '+1 COOKIE', 100, '#ffe0b0');
    const GR = bar(14, 6) - bar(13);
    const cam = shots([[0, 540, 1290, 1.2, 0], [popTimes[0], 540, 1290, 1.5, -4, 0.1], [popTimes[3], 540, 1250, 1.8, 5], [JUMPS[0], 870, 1090, 1.8, -5], [JUMPS[1], 870, 1070, 2.0, 6], [GR, 540, 1150, 1.0, 0, 0.06]]);
    return (lt) => {
      const c = cam(lt);
      camTf(world, c);
      const g = lt >= GR;
      cookie(lt - (bar(14, 12) - bar(13)), 540, 1640, 0.6);
      show(field, !g); show(cookies, g); show(bg, !g); show(sbg.firstElementChild, g);
      pink(lt, 540, 1100, 30);
      const nod = Math.abs(Math.sin((lt / BEAT) * Math.PI));
      if (!g) {
        T(hero, 190, 1420, 1.6, 0, 1.6 * (1 - 0.04 * nod));
        R(part(hero, 'armR'), -35 + 8 * Math.sin(lt * 9));
        drops(lt, 190 + 1.6 * 150, 1420 - 1.6 * 160, true);
        spots.forEach(([x, y], i) => {
          const d = lt - popTimes[i];
          show(sprouts[i], d < 0.04); show(flowers[i], d >= 0);
          T(flowers[i], x, y, 1.6 * pop(d, 0.18), 6 * Math.sin(lt * 8 + i));
          R(part(flowers[i], 'petals'), lt * 60);
          petals[i](d, x, y - 80);
        });
        let jy = 0;
        for (const j of JUMPS) { const d = lt - j; if (d >= 0 && d < 0.34) jy = -130 * 4 * (d / 0.34) * (1 - d / 0.34); }
        T(poppy, 880, 1300 + jy, 1.7, jy ? 8 * Math.sin(lt * 20) : 0);
        JUMPS.forEach((j, i) => hearts[i](lt - j, 880, 1100 + jy));
      } else {
        const d = lt - GR;
        T(granny, 540, 1460, 2.6 * pop(d, 0.14), 3 * Math.sin(d * 8));
        R(part(granny, 'head'), 6 * Math.sin(d * 10));
        T(p2, 870, 1520 - 40 * nod, 1.5); T(h2, 210, 1530 - 30 * nod, 1.5);
        R(part(h2, 'armL'), 150 + 20 * Math.sin(d * 14));
        ch(d - 0.05, 540, 1150);
      }
    };
  });

  // 8. The breakdown: the music drops out, something wakes up in the dark.
  scene('dark', ({ sbg, bg, fg, world }) => {
    add(sbg, `<rect x="-100" y="-100" width="1280" height="2120" fill="#0b0610"/>`);
    add(bg, `<rect x="-600" y="1300" width="2280" height="1200" fill="${A.glow('lava', [[0, '#ff7a2a', 0.8], [0.6, '#a8201a', 0.35], [1, '#0b0610', 0]])}"/>
      <path d="M-400 1700 L120 900 L330 1150 L540 700 L760 1100 L960 880 L1500 1700Z" fill="#170c1c" stroke="#3a1a2a" stroke-width="6"/>
      <path d="M380 1500 L460 1300 L430 1200 M640 1600 L600 1380 L660 1240 M200 1650 L260 1500" stroke="#ff6a2a" stroke-width="8" fill="none" stroke-linecap="round" opacity=".8"/>`);
    const embers = stream(fg, 30, () => `<circle r="6" fill="#ffb03a"/>`, { seed: 21, life: 1.6, speed: [120, 300], ang: [-110, -70], g: -40 });
    const eyes = add(fg, `<g><circle r="300" fill="${A.glow('eyeglow', [[0, '#ffcc3a', 0.55], [1, '#ff6a2a', 0]])}"/>
      ${[-110, 110].map((x) => `<g transform="translate(${x} 0)"><path d="M-70 0 Q0 -46 70 0 Q0 46 -70 0Z" fill="#ffe46a" stroke="#ff8a2a" stroke-width="6"/><ellipse rx="10" ry="38" fill="#1a0a10"/></g>`).join('')}</g>`);
    const cam = shots([[0, 540, 960, 1.0, 0], [0.75, 540, 920, 1.25, 0, 0.6]]);
    return (lt) => {
      camTf(world, cam(lt));
      embers(lt, 540, 1700, true);
      const open = clamp((lt - 0.75) / 0.12);
      show(eyes, lt >= 0.75 && lt < 1.38);
      T(eyes, 540, 920, 1, 0, Math.max(0.02, open));
    };
  });

  // 9. The Emberwyrm roars.
  scene('dragon', ({ sbg, bg, fg, sfg, world }) => {
    add(bg, `<rect x="-700" y="-700" width="2480" height="3400" fill="${A.glow('volcano', [[0, '#ff8a3a'], [0.45, '#b8301a'], [1, '#2a0f1a']])}"/>
      <path d="M-700 1900 L-100 1500 L200 1700 L540 1550 L900 1680 L1300 1450 L1780 1900 L1780 2700 L-700 2700Z" fill="#3a1a22" stroke="${A.INK}" stroke-width="8"/>`);
    const embers = stream(bg, 34, () => `<circle r="7" fill="#ffd23f"/>`, { seed: 31, life: 1.2, speed: [200, 500], ang: [-120, -60], g: -60 });
    const dragon = add(fg, `<g>${A.dragon({ roar: true })}</g>`);
    const fire = group(fg);
    add(fire, `<defs><linearGradient id="breath" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset=".3" stop-color="#ffd23f"/>
      <stop offset=".65" stop-color="#ff7a2a" stop-opacity=".9"/><stop offset="1" stop-color="#e8283a" stop-opacity="0"/></linearGradient></defs>
      <path d="M-46 0 C-110 180 -300 480 -420 860 L420 860 C300 480 110 180 46 0Z" fill="url(#breath)" transform="translate(540 1270)"/>`);
    const flames = Array.from({ length: 18 }, (_, i) => add(fire, `<g><path d="M0 40 C-44 20 -46 -30 0 -90 C46 -30 44 20 0 40Z" fill="${['#ffd23f', '#ff8a3a', '#ff5a2a', '#fff3a0'][i % 4]}" stroke="${A.INK}" stroke-width="6"/></g>`));
    const hero = add(fg, `<g>${A.hero({ armor: 'copper', tool: 'sword', face: 'shock' })}</g>`);
    const heroLeap = add(fg, `<g>${A.hero({ armor: 'copper', tool: 'sword', face: 'shout' })}</g>`);
    const banner = group(sfg);
    add(banner, `<path d="M-40 1400 L1120 1330 L1120 1590 L-40 1660Z" fill="#1a0a12" stroke="${Y}" stroke-width="10"/>`);
    const bn = group(banner); label(bn, 'EMBERWYRM', 150, '#ff6a3a', { sw: 26 });
    const bs = group(banner); label(bs, 'the final boss', 64, Y, { sw: 14 });
    const swish = add(fg, `<path d="M-200 -40 C-60 -160 120 -160 220 -20 C100 -100 -60 -100 -200 -40Z" fill="#fff" stroke="${A.INK}" stroke-width="6"/>`);
    const L = bar(17) - bar(16);
    const cam = shots([[0, 540, 1150, 1.0, 0, 0.08], [0.75, 540, 1300, 0.78, 0], [L, 540, 1060, 1.8, -8], [L + STEP * 2, 540, 1500, 1.3, 6], [L + STEP * 4, 540, 960, 2.4, 5],
      [L + STEP * 6, 540, 1300, 1.0, -4], [L + STEP * 8, 540, 1250, 1.1, 0, 0.12]]);
    return (lt, t) => {
      const c = cam(lt);
      if (lt < 0.75) { c.x += (hash(Math.floor(t * 50)) - 0.5) * 30 * decay(lt, 2); c.y += (hash(Math.floor(t * 50) + 3) - 0.5) * 30 * decay(lt, 2); }
      camTf(world, c);
      embers(lt, 540, 1900, true);
      const breath = Math.sin(lt * 6);
      T(dragon, 540, 1680, 1.9, 0, 1.9 * (1 + 0.02 * breath));
      R(part(dragon, 'wingL'), -6 * Math.sin(lt * 8)); R(part(dragon, 'wingR'), 6 * Math.sin(lt * 8));
      R(part(dragon, 'head'), 3 * Math.sin(lt * 23));
      // Fire pours out of the mouth toward the camera while it roars.
      const roaring = lt < 0.75 || (lt >= L && lt < L + STEP * 2) || (lt >= L + STEP * 4 && lt < L + STEP * 6);
      show(fire, roaring);
      flames.forEach((f, i) => {
        const k = ((lt * 2.2 + i / 18) % 1), dx = Math.sin(i * 2.3) * 300, dy = 560 + Math.cos(i * 1.7) * 80;
        T(f, 540 + dx * k, 1270 + dy * k, 0.5 + 2.4 * k, (Math.atan2(dy, dx) * 180) / Math.PI + 90 + 10 * Math.sin(lt * 20 + i));
        op(f, k > 0.8 ? (1 - k) / 0.2 : 1);
      });
      const mid = c.i === 1 || c.i === 3 || c.i === 5;
      const leap = c.i === 6;
      show(hero, mid); show(heroLeap, leap);
      if (c.i === 1) T(hero, 540, 1860, 1.4);
      if (c.i === 3) T(hero, 760, 1800 - 120 * Math.sin(clamp(c.d / 0.18) * Math.PI), 1.4, 12);
      if (c.i === 5) T(hero, 380, 1860, 1.4);
      R(part(hero, 'armR'), -110);
      if (leap) {
        const k = easeOut(Math.min(c.d, 0.35) / 0.35);
        T(heroLeap, lerp(260, 470, k), lerp(1900, 1420, k), 1.9, -15);
        R(part(heroLeap, 'armR'), -105);
      }
      show(swish, c.i === 3); T(swish, 700, 1760, 1.5);
      show(banner, lt > 0.05 && lt < 0.75);
      const bk = easeOut((lt - 0.05) / 0.12);
      T(bn, lerp(-600, 540, bk), 1460, 1, -3.5); T(bs, lerp(1600, 600, bk), 1570, 1, -3.5);
    };
  });

  // 10. Title card.
  scene('title', ({ sbg, fg, sfg, world }) => {
    const green = sunburst(sbg, '#6cc0ee', '#8fd3f6', 20);
    add(sbg, `<rect x="0" y="0" width="1080" height="1920" fill="${A.glow('titlelight', [[0, '#fffbe0', 0.6], [0.6, '#fffbe0', 0], [1, '#fffbe0', 0]])}"/>`);
    const back = group(fg), cast = group(fg);
    const dragon = add(back, `<g>${A.dragon()}</g>`);
    const castList = [[A.granny(), 130, 1370, 1.3], [A.poppy(), 312, 1390, 1.4], [A.bram({ thumbs: true }), 772, 1380, 1.25], [A.slime(), 952, 1390, 1.1],
      [A.hero({ armor: 'copper', tool: 'sword', face: 'cool' }), 545, 1420, 1.9]].map(([m, x, y, s]) => ({ el: add(cast, `<g>${m}</g>`), x, y, s }));
    const heroEl = castList[4].el;
    // The logo, letter by letter.
    const logo = group(sfg);
    const sprout = add(logo, `<g>${A.sprout()}</g>`);
    const word = (s, size) => [...s].map((ch) => { const g = group(logo); label(g, ch, size, '#9be07a', { sw: size * 0.16 }); return g; });
    const L1 = word('SPROUT', 230), L2 = word('QUEST', 230);
    const stamp = add(sfg, `<g><g transform="rotate(-12)"><rect x="-190" y="-70" width="380" height="140" rx="22" fill="#e83a4a" stroke="#fff" stroke-width="12"/><rect x="-190" y="-70" width="380" height="140" rx="22" fill="none" stroke="${A.INK}" stroke-width="5"/></g></g>`);
    const st = group(stamp.firstElementChild); label(st, 'W GAME', 100, '#fff', { sw: 18 });
    const cta = add(sfg, `<g><rect x="-390" y="-80" width="780" height="160" rx="80" fill="${A.toon('#ffd23f')}" stroke="${A.INK}" stroke-width="10"/><path d="M-312 -38 L-254 0 L-312 38Z" fill="${A.INK}" stroke="${A.INK}" stroke-width="12" stroke-linejoin="round"/></g>`);
    const ct = group(cta); label(ct, 'PLAY NOW', 110, '#fff', { sw: 22 }); ct.setAttribute('transform', 'translate(36 0)');
    const url = group(sfg); label(url, 'aibengineering.github.io/sprout-quest', 54, '#fff', { sw: 13 });
    const sub = group(sfg); label(sub, 'plays right in your browser', 46, Y, { sw: 11 });
    const confetti = burst(sfg, 40, (i) => `<rect x="-10" y="-16" width="20" height="32" rx="4" fill="${['#ff6b9a', '#ffd23f', '#7fe8ff', '#8ef06a', '#c8b0ff'][i % 5]}" stroke="${A.INK}" stroke-width="3"/>`, { seed: 200, ang: [-160, -20], speed: [900, 1900], g: 1600, life: 2.4, scale: [1, 1.6] });
    const widths = { S: 150, P: 145, R: 145, O: 160, U: 150, T: 135, Q: 165, E: 135 };
    const layout = (ws, s) => { const tot = [...s].reduce((a, ch) => a + widths[ch], 0); let x = 540 - tot / 2; return ws.map((g, i) => { const cx = x + widths[s[i]] / 2; x += widths[s[i]]; return cx; }); };
    const X1 = layout(L1, 'SPROUT'), X2 = layout(L2, 'QUEST');
    const FIN = bar(20) - bar(18);
    return (lt, t) => {
      camTf(world, { x: 540, y: 960, z: 1, r: 0 });
      green(lt, 540, 900, 18);
      const kick = decay(lt - Math.floor(lt / BEAT) * BEAT, 9) * (lt < FIN + 0.75 ? 1 : 0.35);
      [...L1, ...L2].forEach((g, i) => {
        const at = 0.375 + i * STEP, d = lt - at;
        const x = i < 6 ? X1[i] : X2[i - 6], y = i < 6 ? 440 : 650;
        show(g, d >= 0);
        const bob = Math.sin((lt - at) * 7 + i * 0.7) * 10;
        T(g, x, y - 90 * (1 - easeOut(d / 0.12)) + bob - 14 * kick * (i % 2 ? 1 : -1), pop(d, 0.16), Math.sin(i * 1.9) * 5);
      });
      const sd = lt - 0.375;
      show(sprout, sd >= 0); T(sprout, 540, 250, 3.0 * pop(sd, 0.2), 6 * Math.sin(lt * 5));
      const sdt = lt - 1.5;
      show(stamp, sdt >= 0); T(stamp, 790, 830, sdt < 0.1 ? 2.5 - 1.5 * easeOut(sdt / 0.1) : 1 + 0.04 * kick, 0);
      castList.forEach(({ el, x, y, s }, i) => {
        const d = lt - (0.1 + i * 0.06);
        T(el, x, y - 26 * kick * (i % 2 ? 1 : 0.6), s * pop(d, 0.18), 0, s * pop(d, 0.18) * (1 - 0.05 * kick));
      });
      R(part(heroEl, 'armR'), -75 + 8 * Math.sin(lt * 8));
      T(dragon, 930, 1090, 0.55, 0, 0.55);
      R(part(dragon, 'wingL'), -8 * Math.sin(lt * 6)); R(part(dragon, 'wingR'), 8 * Math.sin(lt * 6));
      const cd = lt - 2.25;
      show(cta, cd >= 0); T(cta, 540, 1560, pop(cd, 0.16) * (1 + 0.06 * Math.abs(Math.sin(lt * Math.PI / BEAT))));
      show(url, cd >= 0.1); T(url, 540, 1700, pop(cd - 0.1, 0.16));
      show(sub, cd >= 0.2); T(sub, 540, 1775, pop(cd - 0.2, 0.16));
      confetti(lt - FIN, 540, 1000);
    };
  });
}

// --- Captions -----------------------------------------------------------------------------------------------
// Each word pops in on the beat. '/' breaks the line. Stickers sit after the last word (or below it if it won't fit).
const CAPS = [
  { t: [0.02, bar(1, 11)], w: [['me:', 0.02, Y], ['i', 0.375], ['just', 0.5625], ['want', 0.75], '/', ['a', 1.125], ['cozy', 1.3125, PINK], ['game', 1.6875]], st: ['heart', 1.875] },
  { t: [bar(1, 11), bar(2)], size: 140, w: [['the', bar(1, 11) + 0.03], ['game:', bar(1, 12.5), Y]], st: ['skull', bar(1, 14)] },
  { t: [bar(2), bar(3)], w: [['bro', bar(2)], ['said', bar(2, 2)], '/', ['"one', bar(2, 4), Y], ['more', bar(2, 6), Y], ['tree"', bar(2, 8), Y]] },
  { t: [bar(3), bar(4)], size: 150, w: [['TIMBERRR', bar(3), ORANGE, 'buzz']], st: ['laugh', bar(3, 6)] },
  { t: [bar(4), bar(5)], w: [['mining', bar(4)], ['arc', bar(4, 2)], '/', ['UNLOCKED', bar(4, 4), CYAN]] },
  { t: [bar(5), bar(6)], size: 150, y: 380, w: [['+99999', bar(5), GOLD], '/', ['AURA', bar(5, 2), GOLD, 'buzz']], st: ['fire', bar(5, 4)] },
  { t: [bar(6, 8), bar(7, 4)], w: [['the', bar(6, 8)], ['slime', bar(6, 9), GREEN], ['was', bar(6, 10)], '/', ['NOT', bar(6, 12), RED], ['ready', bar(6, 14)]], st: ['skull', bar(7)] },
  { t: [bar(7, 4), bar(8, 8)], w: [['bro', bar(7, 4)], ['is', bar(7, 5)], '/', ['COOKING', bar(7, 6), ORANGE, 'buzz']], st: ['fire', bar(7, 10)] },
  { t: [bar(9), bar(10, 6)], w: [['craft', bar(9)], ['your', bar(9, 2)], '/', ['own', bar(9, 4)], ['GEAR', bar(9, 6), ORANGE]] },
  { t: [bar(10, 6), bar(11)], size: 140, w: [['DRIP', bar(10, 6), Y], ['CHECK', bar(10, 8), Y]], st: ['check', bar(10, 10)] },
  { t: [bar(11), bar(12)], w: [['the', bar(11)], ['sawmill', bar(11, 2)], ['goes', bar(11, 4)], '/', ['BRRRRRRR', bar(11, 8), ORANGE, 'buzz']] },
  { t: [bar(12, 8), bar(13)], w: [['bram', bar(12, 8), GREEN], ['is', bar(12, 9)], ['lowkey', bar(12, 10)], '/', ['PROUD', bar(12, 12), Y]] },
  { t: [bar(13), bar(14)], w: [['touching', bar(13), GREEN], ['grass', bar(13, 2), GREEN], '/', ['(literally)', bar(13, 4)]], st: ['laugh', bar(13, 8)] },
  { t: [bar(14), bar(14, 6)], w: [['Mr.', bar(14), BLUE], ['Floppers', bar(14, 1), BLUE], '/', ['approves', bar(14, 2)]], st: ['heart', bar(14, 4)] },
  { t: [bar(14, 6), bar(15)], w: [["granny's", bar(14, 6), PINK], ['cookies', bar(14, 7), PINK], '/', ['hit', bar(14, 8)], ['different', bar(14, 9), Y]] },
  { t: [bar(15) + 0.03, bar(15, 12)], w: [['chat...', bar(15) + 0.03], '/', ['is', bar(15, 4)], ['this', bar(15, 5)], ['real?', bar(15, 6), RED]] },
  { t: [bar(16, 8), bar(17)], w: [['"cozy', bar(16, 8), PINK], ['game"', bar(16, 9), PINK], '/', ['they', bar(16, 10)], ['said', bar(16, 11)]], st: ['skull', bar(16, 13)] },
  { t: [bar(17, 8), bar(18)], w: [['will', bar(17, 8)], ['YOU', bar(17, 9), Y], '/', ['beat', bar(17, 10)], ['it?', bar(17, 11), Y]] },
];

const capEls = [];
function buildCaptions() {
  for (const cap of CAPS) {
    const size = cap.size ?? 124, y0 = cap.y ?? 330;
    const g = group(caps);
    const lines = [[]];
    for (const w of cap.w) if (w === '/') lines.push([]); else lines[lines.length - 1].push(w);
    // Measure, then shrink to fit 1000px if a line is too long.
    let k = 1;
    const words = [];
    const measured = lines.map((ln) => ln.map(([s, at, color = '#fff', fx]) => {
      const el = group(g);
      const lab = label(el, s, size, color);
      const width = lab.lastElementChild.getComputedTextLength();
      const w = { el, s, at, fx, width };
      words.push(w);
      return w;
    }));
    const gap = size * 0.42;
    for (const ln of measured) k = Math.min(k, 1000 / (ln.reduce((a, w) => a + w.width, 0) + gap * (ln.length - 1)));
    const lh = size * 1.08 * k;
    let lastEnd = 0, lastY = 0;
    measured.forEach((ln, li) => {
      const tot = ln.reduce((a, w) => a + w.width, 0) * k + gap * k * (ln.length - 1);
      let x = 540 - tot / 2;
      const y = y0 + (li - (measured.length - 1) / 2) * lh;
      for (const w of ln) { w.x = x + (w.width * k) / 2; w.y = y; w.k = k; x += w.width * k + gap * k; }
      lastEnd = x - gap * k; lastY = y;
    });
    let sticker = null;
    if (cap.st) {
      const [kind, at] = cap.st;
      const el = add(stickerLayer, `<g>${A.STICKERS[kind]()}</g>`);
      const fits = lastEnd <= 900;
      sticker = { el, at, x: fits ? lastEnd + 85 : Math.min(970, lastEnd - 40), y: fits ? lastY : lastY + size * 0.95 * k, t1: cap.t[1] };
    }
    capEls.push({ g, t: cap.t, words, sticker });
  }
}

function updateCaptions(t) {
  for (const c of capEls) {
    const on = t >= c.t[0] && t < c.t[1];
    show(c.g, on);
    if (c.sticker) show(c.sticker.el, on && t >= c.sticker.at);
    if (!on) continue;
    const beat = decay((t % BEAT), 10);
    c.words.forEach((w, i) => {
      const d = t - w.at;
      show(w.el, d >= 0);
      if (d < 0) return;
      let x = w.x, y = w.y, r = Math.sin(i * 2.7) * 4 + 2.5 * Math.sin(t * 8 + i);
      if (w.fx === 'buzz') { x += (hash(Math.floor(t * 40) + i) - 0.5) * 16; y += (hash(Math.floor(t * 40) + i + 50) - 0.5) * 16; r += (hash(Math.floor(t * 40)) - 0.5) * 6; }
      T(w.el, x, y, w.k * pop(d, 0.12) * (1 + 0.05 * beat));
      w.el.firstElementChild.setAttribute('transform', `rotate(${r.toFixed(2)})`);
    });
    if (c.sticker && t >= c.sticker.at) {
      const d = t - c.sticker.at;
      T(c.sticker.el, c.sticker.x, c.sticker.y + (-14 * decay(t % BEAT, 9)), 1.15 * pop(d, 0.18), -200 * (1 - easeOut(d / 0.2)) + 10 * Math.sin(t * 6));
    }
  }
}

// --- HUD: level badge, XP bar, combo counter, LEVEL UP ------------------------------------------------------
let hudEls;
const XP = [[bar(2), 1, 0.05], [bar(3, 9), 1, 0.55], [bar(3, 13), 1, 0.95], [bar(4) - 0.01, 1, 1], [bar(4), 2, 0.1], [bar(4, 9), 2, 0.6], [bar(5) - 0.01, 2, 1], [bar(5), 3, 0.15],
  [bar(7), 3, 0.3], [KO, 3, 0.95], [KO + 0.3, 3, 1]];
const LVUP = bar(9) - STEP * 2;
function xpAt(t) {
  if (t >= LVUP) return { lv: 99, frac: 1 };
  let a = XP[0];
  for (const k of XP) if (k[0] <= t) a = k;
  const i = XP.indexOf(a), b = XP[i + 1];
  if (!b || b[1] !== a[1]) return { lv: a[1], frac: a[2] };
  return { lv: a[1], frac: lerp(a[2], b[2], clamp((t - a[0]) / (b[0] - a[0]))) };
}
const COMBO_VALS = COMBO_HITS.map((_, i) => Math.max(1, Math.round(1 + 98 * (i / (COMBO_HITS.length - 1)) ** 1.8)));

function buildHud() {
  const top = group(hud);
  add(top, `<rect x="150" y="76" width="420" height="44" rx="22" fill="#2a1a36" stroke="${A.INK}" stroke-width="8"/>`);
  const fill = add(top, `<rect x="156" y="82" width="0" height="32" rx="16" fill="#8ef06a"/>`);
  add(top, `<rect x="166" y="86" width="380" height="8" rx="4" fill="#fff" opacity=".25"/>`);
  const xpl = group(top); label(xpl, 'XP', 40, '#fff', { sw: 9 }); xpl.setAttribute('transform', 'translate(610 98)');
  const badge = add(top, `<g><circle r="70" fill="${A.toon('#ffd23f')}" stroke="${A.INK}" stroke-width="9"/></g>`);
  const lvSmall = group(badge); label(lvSmall, 'Lv', 30, '#fff', { sw: 8 }); lvSmall.setAttribute('transform', 'translate(0 -36)');
  const lvNum = group(badge); lvNum.setAttribute('transform', 'translate(0 14)');
  const lvText = label(lvNum, '1', 62, '#fff', { sw: 13 });
  const combo = group(hud);
  add(combo, `<rect x="-170" y="-120" width="340" height="230" rx="34" fill="#1d1024" opacity=".78" stroke="${Y}" stroke-width="8"/>`);
  const cn = group(combo); const cnText = label(cn, 'x1', 130, Y, { sw: 24 });
  const cl = group(combo); label(cl, 'COMBO', 56, '#fff', { sw: 12 }); cl.setAttribute('transform', 'translate(0 70)');
  const lv = group(hud);
  const rays = sunburst(lv, 'none', '#ffe46a', 16);
  lv.firstElementChild.setAttribute('opacity', '.55');
  const lu = group(lv); label(lu, 'LEVEL UP!', 170, Y, { sw: 30 });
  const lvn = group(lv); const lvnText = label(lvn, 'Lv 3 → 4', 110, '#fff', { sw: 20 });
  hudEls = { top, fill, badge, lvText, combo, cn, cnText, lv, rays, lu, lvn, lvnText };
}

function setLabel(lab, s) { for (const t of lab.children) t.textContent = s; }

function updateHud(t) {
  const h = hudEls;
  const on = t >= bar(2) && t < bar(15);
  show(h.top, on);
  if (on) {
    const { lv, frac } = xpAt(t);
    h.fill.setAttribute('width', (408 * frac).toFixed(1));
    setLabel(h.lvText, String(lv));
    const lvChange = [bar(4), bar(5), LVUP].find((x) => t >= x && t - x < 0.3);
    T(h.badge, 110, 100, 1 + (lvChange !== undefined ? 0.35 * decay(t - lvChange, 8) : 0), lvChange !== undefined ? 20 * Math.sin((t - lvChange) * 30) * decay(t - lvChange, 6) : 0);
  }
  const cOn = t >= COMBO_HITS[0] && t < KO + 0.3;
  show(h.combo, cOn);
  if (cOn) {
    const lh = last(COMBO_HITS, t), i = COMBO_HITS.indexOf(lh);
    const v = t >= KO ? 99 : COMBO_VALS[i];
    setLabel(h.cnText, 'x' + v);
    T(h.combo, 540, 1650, 1, -4);
    T(h.cn, 0, -30, 1 + 0.35 * decay(t - (t >= KO ? KO : lh), 14), 0);
  }
  const lOn = t >= KO + 0.3 && t < bar(9);
  show(h.lv, lOn);
  if (lOn) {
    const d = t - (KO + 0.3);
    h.rays(t, 540, 960, 90);
    T(h.lu, 540, 900, pop(d, 0.12) * (1 + 0.05 * Math.sin(d * 30)), -6);
    const roll = clamp((t - (KO + 0.36)) / (LVUP - KO - 0.36));
    setLabel(h.lvnText, t < KO + 0.36 ? 'Lv 3 → 4' : `Lv ${Math.round(lerp(4, 99, roll ** 2))}${roll >= 1 ? ' MAX' : ''}`);
    T(h.lvn, 540, 1070, pop(d - 0.05, 0.12) * (1 + 0.25 * decay(t - LVUP, 10)));
  }
}

// --- Global effects ---------------------------------------------------------------------------------------
const IMPACTS = [[bar(2), 'w'], [bar(6), 'w'], [KO, 'b'], [bar(16), 'r'], [bar(17), 'b'], [bar(17, 4), 'w'], [bar(18), 'w']];
const FLASHES = [bar(4), bar(5), bar(5, 12), bar(5, 14), bar(9), bar(10, 6), bar(11), bar(13), bar(14, 6), bar(20)];
const GLITCH = [[bar(1, 11), bar(1, 12.5)], [bar(15), bar(15, 1.5)], [bar(16) - 0.07, bar(16)], [bar(5, 12), bar(5, 13)]];
const RADIAL = [[bar(2), bar(2, 4), '#ffffff'], [bar(5), bar(5, 6), '#ffe9a0'], [bar(6), bar(6, 8), '#ffffff'], [KO, KO + 0.4, '#ffffff'], [bar(16), bar(16, 8), '#1a0a12'],
  [bar(17), bar(17, 8), '#ffffff'], [bar(17, 8), bar(18), '#ffe9a0'], [bar(18), bar(18, 4), '#ffffff'], [bar(20), bar(20, 6), '#ffffff']];
const HLINES = [[bar(6, 7), bar(6, 9)], [bar(17, 2), bar(17, 4)]];

function radial(t, color) {
  const r = rng(Math.floor(t * 24) + 7);
  let d = '';
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, w = 0.004 + r() * 0.014, r0 = 420 + r() * 380, Rr = 1600, cx = 540, cy = 960;
    d += `M${(cx + Math.cos(a - w) * Rr).toFixed(0)} ${(cy + Math.sin(a - w) * Rr).toFixed(0)}L${(cx + Math.cos(a) * r0).toFixed(0)} ${(cy + Math.sin(a) * r0).toFixed(0)}L${(cx + Math.cos(a + w) * Rr).toFixed(0)} ${(cy + Math.sin(a + w) * Rr).toFixed(0)}Z`;
  }
  lines.setAttribute('d', d);
  lines.setAttribute('fill', color);
}
function horizontal(t) {
  const r = rng(Math.floor(t * 30) + 3);
  let d = '';
  for (let i = 0; i < 26; i++) { const y = r() * 1920, x = r() * 1080 - 300, l = 300 + r() * 600, hh = 4 + r() * 10; d += `M${x.toFixed(0)} ${y.toFixed(0)}h${l.toFixed(0)}v${hh.toFixed(0)}h${(-l).toFixed(0)}Z`; }
  hlines.setAttribute('d', d);
}

export function renderAt(tIn) {
  const t = clamp(tIn, 0, END - 0.001);
  let active = null;
  for (const sc of scenes) {
    const on = t >= sc.t0 && t < sc.t1;
    show(sc.root, on);
    if (on) { active = sc; show(sc.sbg, true); show(sc.bg, true); sc.update(t - sc.t0, t); }
  }
  // Camera punch on every kick and boom, shake on the booms.
  let z = 1, sh = 0;
  for (const p of PUNCH) {
    const d = t - p.t;
    if (d < 0 || d > 0.8) continue;
    z += p.amt * decay(d, 11);
    sh = Math.max(sh, p.shake * decay(d, 9));
  }
  if (t >= bar(11, 8) && t < bar(12)) sh = Math.max(sh, 7);
  if (t >= bar(16) && t < bar(16, 8)) sh = Math.max(sh, 22);
  const n = Math.floor(t * 45);
  const sx = (hash(n) - 0.5) * 2 * sh, sy = (hash(n + 17) - 0.5) * 2 * sh, sr = (hash(n + 33) - 0.5) * sh * 0.08;
  cam.setAttribute('transform', `translate(${(540 + sx).toFixed(1)} ${(960 + sy).toFixed(1)}) rotate(${sr.toFixed(2)}) scale(${z.toFixed(4)}) translate(-540 -960)`);
  caps.setAttribute('transform', `translate(${(sx * 0.4).toFixed(1)} ${(sy * 0.4).toFixed(1)})`);
  stickerLayer.setAttribute('transform', caps.getAttribute('transform'));

  // Impact frames: silhouettes on white, black or red for a few frames.
  const imp = IMPACTS.find(([x]) => t >= x && t - x < 0.11);
  let filter = '';
  base.setAttribute('fill', '#000');
  if (imp && active) {
    const second = t - imp[0] >= 0.055;
    const kind = imp[1] === 'r' ? (second ? 'b' : 'r') : second ? (imp[1] === 'w' ? 'b' : 'w') : imp[1];
    base.setAttribute('fill', { w: '#ffffff', b: '#0a0510', r: '#e8283a' }[kind]);
    show(active.sbg, false); show(active.bg, false);
    filter = kind === 'b' ? 'url(#silW)' : 'url(#silB)';
  } else if (GLITCH.some(([a, b]) => t >= a && t < b)) filter = 'url(#rgb)';
  else if (t >= bar(1, 12.5) && t < bar(2)) filter = 'url(#desat)';
  if (filter) fxwrap.setAttribute('filter', filter); else fxwrap.removeAttribute('filter');

  const rad = RADIAL.find(([a, b]) => t >= a && t < b);
  show(lines, !!rad);
  if (rad) radial(t, imp ? (base.getAttribute('fill') === '#ffffff' ? '#0a0510' : '#ffffff') : rad[2]);
  const hl = HLINES.some(([a, b]) => t >= a && t < b);
  show(hlines, hl);
  if (hl) horizontal(t);

  const lf = last(FLASHES, t);
  op(flash, 0.75 * decay(t - lf, 22));
  updateHud(t);
  updateCaptions(t);
}

export async function init(svgEl) {
  svg = svgEl;
  svg.innerHTML = `<defs>${A.PLAID}
    <filter id="silB" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.04  0 0 0 0 0.02  0 0 0 0 0.06  0 0 0 1 0"/></filter>
    <filter id="silW" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
    <filter id="desat" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feColorMatrix type="saturate" values="0.1"/></filter>
    <filter id="rgb" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
      <feOffset in="SourceGraphic" dx="-18" dy="4" result="a"/><feColorMatrix in="a" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
      <feOffset in="SourceGraphic" dx="18" dy="-4" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb"/>
      <feBlend in="r" in2="gb" mode="screen"/></filter>
    <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#1a0a24" stop-opacity="0"/><stop offset="1" stop-color="#1a0a24" stop-opacity=".5"/></radialGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
  <rect id="base" width="${W}" height="${H}" fill="#000"/>
  <g id="fxwrap"><g id="cam"><g id="scenes"></g></g></g>
  <g id="overlay"><path id="lines" fill="#fff" stroke="${A.INK}" stroke-width="2"/><path id="hlines" fill="#fff" opacity=".85"/>
    <rect width="${W}" height="${H}" fill="url(#vig)"/></g>
  <g id="hud"></g><g id="stickers"></g><g id="caps"></g>
  <rect id="flash" width="${W}" height="${H}" fill="#fff" opacity="0" pointer-events="none"/></g>`;
  const $ = (id) => svg.querySelector('#' + id);
  base = $('base'); fxwrap = $('fxwrap'); cam = $('cam'); sceneLayer = $('scenes'); lines = $('lines'); hlines = $('hlines');
  flash = $('flash'); hud = $('hud'); caps = $('caps'); stickerLayer = $('stickers');
  await document.fonts.load('700 100px Fredoka');
  await document.fonts.ready;
  buildScenes();
  buildHud();
  buildCaptions();
  svg.querySelector('defs').insertAdjacentHTML('beforeend', A.defsMarkup());
  // Warm every image so the first frames of each scene never draw half-loaded.
  const hrefs = [...new Set([...svg.querySelectorAll('image')].map((i) => i.getAttribute('href')))];
  await Promise.all(hrefs.map((h) => { const im = new Image(); im.src = h; return im.decode().catch(() => {}); }));
  for (const sc of scenes) renderAt(sc.t0 + 0.2);
  renderAt(0);
}
