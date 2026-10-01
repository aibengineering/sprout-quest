// Bram's Sawmill, walked into: pick up an armful of logs from a wood's pile (hold the button to keep picking up),
// carry them to the saw bench, and pull the lever. The blade spins while it works through what you gave it, the sawn
// planks stack up by the door, and you take them from the stack. Underneath it's the same real-time saw as handing
// Bram your logs (sawmill.ts): the same queue, timing and planks. Bram keeps the place running, grumbling about the
// workload, and asking him still brings up his bench, for when you'd rather just hand them over.
import { MATS, PROJECTS } from '../data';
import { ARMFUL, benchTotal, canCarry, nextPlankIn, pullLever, SAW, SAW_LOGS, SAW_MAX, sawCollect, sawLogs, sawReady, sawSeconds, sawUpdate, type Bench, type SawLog } from '../sawmill';
import { drawFrame, frame } from '../assets';
import type { Room } from '../room';
import { crate, drawCarried, drawProp, hintPill, paintShell, paintWindow, PROP_SCALE, propRise, propUnit } from '../roomArt';
import { rrect } from '../sprites';
import type { WorldObj } from '../world';
import { G, persist } from './context';
import type { RoomPlay } from './rooms';
import { openSawmill } from './stories/bram';

const BRAM = 'room:bram';
/** Where he stands, by the bench, keeping an eye on the blade. */
const BRAM_AT = { x: 3.3, y: 4.7 };
const TAU = Math.PI * 2;

/** An armful of one wood, carried to the bench. */
let carrying: { log: SawLog; n: number } | null = null;
/** Logs on the bench, waiting for the lever. */
let bench: Bench = {};
/** The blade's angle and speed (it spins up while there's sawing to do, and slows to a stop after). */
let blade = 0, spin = 0;
/** The lever's last pull (it stays down while the blade runs). */
let pulled = -9;
let t = 0;
/** What Bram's said about this load, so he doesn't repeat himself every armful. */
let grumbled = false;

const ENTER_LINES = ['Mind the sawdust.', 'Logs on the bench, then the lever. I keep her running.', 'More logs? This blade never gets a day off.', 'Sawdust in my beard again. Every day.'];
let enterLine = 0;

const say = (text: string, secs = 3) => G.over.room?.actors.say(BRAM, text, secs);
const feel = (emoji: string) => G.over.room?.actors.bubble(BRAM, emoji);
const woodName = (log: SawLog) => MATS[log].name.replace(' Log', '');

function reset() {
  carrying = null;
  bench = {};
  grumbled = false;
}

const running = () => sawUpdate(G.save).queue.length > 0;

function pile(o: WorldObj) {
  const s = G.save, log = o.id!.slice(5) as SawLog;
  if (!sawLogs(s).includes(log)) {
    const lv = SAW[log].level, next = PROJECTS.sawmill.levels[lv - 1]?.name;
    return say(`${woodName(log)}'s too tough for this blade. ${next ? `Build the ${next} and I'll cut it.` : 'Needs a better blade.'}`);
  }
  if (carrying && carrying.log !== log) return say('One wood at a time, kid. Bench those first.');
  const n = canCarry(s, log, carrying?.n ?? 0, bench);
  if (n <= 0) {
    if (s.mats[log] - (bench[log] ?? 0) - (carrying?.n ?? 0) <= 0) return say(carrying ? "That's the last of them." : `No ${woodName(log)} logs left. Fell some and bring 'em by.`);
    return say("Bench can't take more. Let her chew through that lot first.");
  }
  carrying = { log, n: (carrying?.n ?? 0) + n };
  G.audio.play('thud', 0.6);
  const ts = G.over.ts;
  G.over.fx.burst((o.x + o.w / 2) * ts, (o.y + 0.2) * ts, '#c89a6a', 5, ts * 1.2, { size: ts * 0.06, life: 0.4 });
}

function loadBench(o: WorldObj) {
  if (!carrying) {
    const on = benchTotal(bench);
    return say(on ? 'Lever, kid. On the wall.' : running() ? 'She\'s cutting. Bring more if you like.' : 'Bench is empty. Logs are on the piles.');
  }
  bench[carrying.log] = (bench[carrying.log] ?? 0) + carrying.n;
  carrying = null;
  G.audio.play('chop', 0.7);
  const ts = G.over.ts;
  G.over.fx.burst((o.x + o.w / 2) * ts, (o.y + 0.1) * ts, '#e8c890', 8, ts * 1.4, { size: ts * 0.06, life: 0.5 });
}

function lever() {
  const s = G.save, on = benchTotal(bench);
  if (!on) return say(running() ? "She's already running." : 'Nothing on the bench to cut.');
  const n = pullLever(s, bench);
  pulled = t;
  persist();
  G.audio.play('clink');
  if (!n) return;
  const planks = n * 2;
  say(planks >= 40 ? `${planks} planks. That's a morning's work, that is.` : planks >= 10 ? `Right. ${planks} planks coming up.` : 'There she goes.');
  feel(planks >= 40 ? '😮‍💨' : '💪');
}

function takePlanks(o: WorldObj) {
  const got = Object.entries(sawCollect(G.save)) as [keyof typeof MATS, number][];
  if (!got.length) return say(running() ? `Next one's ${nextPlankIn(G.save)}s off. Blade's doing what it can.` : 'Nothing sawn yet.');
  persist();
  G.audio.play('pickup');
  G.ui.toast(got.map(([p, n]) => `${MATS[p].icon} +${n} ${MATS[p].name}${n > 1 ? 's' : ''}`).join(' · '));
  const ts = G.over.ts;
  G.over.fx.burst((o.x + o.w / 2) * ts, (o.y - 0.3) * ts, '#fff6c8', 10, ts * 1.6, { star: true, size: ts * 0.07, life: 0.6 });
  if (!grumbled) {
    grumbled = true;
    say('Straight and true. Mind the splinters.');
  }
}

function tick(dt: number, room: Room): boolean {
  t += dt;
  const s = G.save, w = sawUpdate(s), ready = sawReady(s);
  const go = w.queue.length > 0;
  spin += ((go ? 14 : 0) - spin) * (1 - Math.exp(-dt * (go ? 2 : 0.8)));
  blade = (blade + spin * dt) % TAU;
  // Sawdust off the blade while it cuts.
  const b = room.station('bench')!;
  if (go && Math.random() < dt * 14) {
    const ts = G.over.ts, at = bladeAt(b, ts);
    G.over.fx.burst(at.x, at.y - ts * 0.3, Math.random() < 0.5 ? '#f0d8a0' : '#e8c890', 1, ts * 1.4, { size: ts * 0.05, grav: ts * 2, life: 0.6 });
  }
  for (const o of room.objs) {
    if (o.kind !== 'station') continue;
    if (o.id!.startsWith('pile:')) {
      const log = o.id!.slice(5) as SawLog;
      o.label = !sawLogs(s).includes(log) ? `${woodName(log)} 🔒` : carrying?.log === log ? `Take more (${carrying.n})` : `Take ${woodName(log)}`;
    }
    if (o.id === 'bench') o.label = carrying ? `Load ${carrying.n} log${carrying.n > 1 ? 's' : ''}` : 'Saw bench';
    if (o.id === 'lever') o.label = benchTotal(bench) ? 'Pull lever' : 'Lever';
    if (o.id === 'planks') o.label = ready ? `Take ${ready} plank${ready > 1 ? 's' : ''}` : 'Planks';
  }
  // Bram frets about the pile-up, quietly.
  const a = room.actors.get(BRAM);
  if (a && !a.bubble) a.mood = w.queue.length >= SAW_MAX * 0.75 ? '😮‍💨' : go ? '🪚' : undefined;
  return false;
}

// ---------------------------------------------------------------- drawing

/** Where the blade's middle shows, standing in the bench's slot (about 0.75 Blender units up, seen at 30°). */
const BENCH_BACK = 0.2;
const bladeAt = (o: WorldObj, ts: number) => ({ x: (o.x + o.w / 2) * ts, y: benchBase(o, ts) - propRise(0.95, ts) });
const benchBase = (o: WorldObj, ts: number) => (o.y + o.h - BENCH_BACK * PROP_SCALE) * ts;

function floor(ctx: CanvasRenderingContext2D, ts: number) {
  const room = G.over.room!;
  paintShell(ctx, room, ts, { boards: ['#b8946a', '#ad8960', 'rgba(70,40,20,0.35)'], board: 0.6, wall: '#9a6a44', stripe: null, wainscot: '#7a4a30', wood: '#5a3424', logs: true });
  paintWindow(ctx, 5.3, -0.95, 1.3, 1.0, ts, '#5a3424');
  // A bow saw and an axe hung on the wall, and sawdust swept into the corners.
  ctx.save();
  ctx.strokeStyle = '#5a3424';
  ctx.lineWidth = ts * 0.07;
  ctx.beginPath();
  ctx.moveTo(1.4 * ts, -0.3 * ts);
  ctx.quadraticCurveTo(2.2 * ts, -1.3 * ts, 3.0 * ts, -0.3 * ts);
  ctx.stroke();
  ctx.strokeStyle = '#c8d0dc';
  ctx.lineWidth = ts * 0.05;
  ctx.beginPath();
  ctx.moveTo(1.4 * ts, -0.3 * ts);
  ctx.lineTo(3.0 * ts, -0.3 * ts);
  ctx.stroke();
  ctx.fillStyle = '#8a5a3a';
  ctx.fillRect(7.6 * ts, -1.2 * ts, 0.1 * ts, 1.1 * ts);
  ctx.fillStyle = '#c8d0dc';
  ctx.beginPath();
  ctx.moveTo(7.7 * ts, -1.15 * ts);
  ctx.lineTo(8.05 * ts, -1.25 * ts);
  ctx.lineTo(8.05 * ts, -0.85 * ts);
  ctx.lineTo(7.7 * ts, -0.9 * ts);
  ctx.fill();
  ctx.fillStyle = 'rgba(240,216,160,0.55)';
  for (const [x, y, r] of [[1.3, 6.6, 0.5], [8.4, 2.6, 0.45], [6.3, 4.2, 0.6], [2.9, 4.6, 0.35]]) {
    ctx.beginPath();
    ctx.ellipse(x * ts, y * ts, r * ts, r * 0.4 * ts, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** How many of a wood are still on its pile: in your bag, less what you're carrying and what's on the bench. */
const onPile = (log: SawLog) => Math.max(0, G.save.mats[log] - (bench[log] ?? 0) - (carrying?.log === log ? carrying.n : 0));

function obj(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
  const s = G.save;
  if (o.id!.startsWith('pile:')) {
    const log = o.id!.slice(5) as SawLog, n = onPile(log), open = sawLogs(s).includes(log);
    const look = open ? {} : { tint: '#4a4058', tintAmount: 0.5 };
    if (n > 0) drawProp(ctx, n >= 10 ? `s_pile_${log}` : `s_pilelow_${log}`, o, ts, 0.17, (x, y, w, h) => crate(ctx, x, y, w, h, '#8a5a3a', '#e8c890', ts * 0.6), look);
    else {
      ctx.fillStyle = 'rgba(60,30,20,0.18)';
      ctx.beginPath();
      ctx.ellipse((o.x + o.w / 2) * ts, (o.y + o.h - 0.2) * ts, o.w * 0.45 * ts, 0.18 * ts, 0, 0, TAU);
      ctx.fill();
    }
    tag(ctx, (o.x + o.w / 2) * ts, (o.y + o.h - 0.05) * ts, ts, open ? `${n}` : '🔒', open ? MATS[log].name : '');
    return;
  }
  switch (o.id) {
    case 'bench': {
      drawProp(ctx, 's_bench', o, ts, BENCH_BACK, (x, y, w, h) => crate(ctx, x, y, w, h, '#d8a878', '#e8c098', ts * 0.4));
      const at = bladeAt(o, ts), unit = propUnit(ts);
      // The next log being cut, or the ones waiting for the lever, lying along the bench.
      const w = sawUpdate(s), next = w.queue[0] ?? (SAW_LOGS.find((l) => bench[l]) as SawLog | undefined);
      const lf = next && frame(`room/s_benchlog_${next}`);
      if (lf) {
        // While it's cutting, the log slides into the blade.
        const q = w.queue.length ? Math.min(1, (Date.now() - w.since) / 1000 / sawSeconds(s)) : 0;
        drawFrame(ctx, lf, at.x - unit * (1.6 - Math.min(1, q) * 0.9), benchBase(o, ts) - propRise(0.95, ts), unit);
      }
      const bf = frame('room/s_blade');
      if (bf) drawFrame(ctx, bf, at.x, at.y, unit, { rot: blade });
      else {
        ctx.fillStyle = '#c8d0dc';
        ctx.beginPath();
        ctx.arc(at.x, at.y, ts * 0.32, 0, TAU);
        ctx.fill();
      }
      if (spin > 4) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = ts * 0.04;
        ctx.beginPath();
        ctx.arc(at.x, at.y, ts * 0.36, blade, blade + 1.4);
        ctx.stroke();
        ctx.restore();
      }
      const waiting = benchTotal(bench);
      if (waiting) tag(ctx, (o.x + 0.55) * ts, (o.y - 0.15) * ts, ts, `${waiting}`, 'on the bench');
      if (w.queue.length) tag(ctx, (o.x + o.w - 0.55) * ts, (o.y - 0.15) * ts, ts, `${w.queue.length}`, 'to saw');
      break;
    }
    case 'lever': {
      const down = running() || t - pulled < 0.8;
      drawProp(ctx, down ? 's_lever1' : 's_lever0', o, ts, 0.1, (x, y, w, h) => {
        crate(ctx, x, y, w, h, '#4a4652', '#5a5662', ts * 0.3);
        ctx.fillStyle = '#e8584a';
        ctx.beginPath();
        ctx.arc(x + w * (down ? 0.85 : 0.2), y - ts * (down ? 0.25 : 0.75), ts * 0.12, 0, TAU);
        ctx.fill();
      });
      break;
    }
    case 'planks': {
      const ready = sawReady(s);
      if (ready) drawProp(ctx, `s_planks${ready >= 30 ? 3 : ready >= 10 ? 2 : 1}`, o, ts, 0.15, (x, y, w, h) => crate(ctx, x, y, w, h, '#dcb880', '#e8c890', ts * Math.min(0.8, 0.1 + ready * 0.02)));
      else {
        ctx.fillStyle = 'rgba(60,30,20,0.18)';
        rrect(ctx, (o.x + 0.1) * ts, (o.y + 0.2) * ts, (o.w - 0.2) * ts, (o.h - 0.25) * ts, ts * 0.1);
        ctx.fill();
      }
      tag(ctx, (o.x + o.w / 2) * ts, (o.y + o.h - 0.05) * ts, ts, `${ready}`, 'planks');
      break;
    }
  }
}

/** A small count under (or over) something: how many are on a pile, on the bench, in the stack. */
function tag(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, text: string, what: string) {
  ctx.save();
  ctx.font = `900 ${Math.round(ts * 0.3)}px ui-rounded, "Nunito", system-ui, sans-serif`;
  const w = ctx.measureText(text).width + ts * 0.26, h = ts * 0.36;
  ctx.fillStyle = 'rgba(42,26,48,0.72)';
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#fff8e8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  void what;
  ctx.restore();
}

function over(ctx: CanvasRenderingContext2D, ts: number) {
  if (carrying) drawCarried(ctx, G.over.x * ts, G.over.y * ts, ts, carrying.log, MATS[carrying.log].icon, carrying.n, t);
}

function hud(ctx: CanvasRenderingContext2D, vw: number) {
  const ready = sawReady(G.save);
  const text = carrying ? `🪵 Carry them to the saw bench${carrying.n < ARMFUL * 2 ? ' (or grab more)' : ''}`
    : benchTotal(bench) ? '⚙️ Pull the lever to start the blade'
    : ready ? '🪵 Take the sawn planks by the door'
    : running() ? `🪚 Sawing… next plank in ${nextPlankIn(G.save)}s`
    : '🪵 Pick up logs from a pile (hold to grab more)';
  hintPill(ctx, vw, text);
}

export const SAWMILL_PLAY: RoomPlay = {
  setup(room) {
    room.painter = { floor, obj, over };
    room.actors.add({ id: BRAM, look: { kind: 'walker', name: 'bram' }, ...BRAM_AT, face: Math.PI / 2, label: 'Ask Bram', talk: () => openSawmill() });
  },
  enter() {
    reset();
    say(ENTER_LINES[enterLine++ % ENTER_LINES.length], 3);
  },
  leave: reset,
  act(o) {
    if (o.id!.startsWith('pile:')) return pile(o);
    if (o.id === 'bench') return loadBench(o);
    if (o.id === 'lever') return lever();
    if (o.id === 'planks') return takePlanks(o);
  },
  repeats: (o) => !!o.id?.startsWith('pile:'),
  tick,
  hud: (ctx, vw) => hud(ctx, vw),
};

/** For tests and the console: what's going on in the mill. */
export const sawmillDebug = () => ({ carrying, bench, spin });
