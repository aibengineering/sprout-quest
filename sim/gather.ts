// Chopping and mining, measured: simulated players drive the real minigame (Chop in src/gather.ts) on every node with
// its own tool and with the tool a tier above, and we report the seconds from the first frame to the node giving way.
//
// - good: sees a new sweet spot after 120–220 ms, then aims for the middle of the next perfect moment ±50 ms (on a
//   tempo node, the pulse).
// - casual: slower to react (200–350 ms), sloppier (±110 ms), and aims for the middle of the zone.
// - masher: taps about eight times a second without looking.
//
// The player plans by running a copy of the minigame forward, so every pattern (drifting spots, beats) is aimed at the
// same way. A spot the card already showed (a double's second zone) needs no reaction time.
//
//   bun sim/gather.ts [--runs 300] [--lv 5] [--hp 5,8,…]   (--hp tries other toughnesses, in NODES order)
import { NODES, type NodeKind } from '../src/data';
import { Chop, PATTERNS, TEMPO, type Pattern } from '../src/gather';
import { sweetWidth, toolPower } from '../src/rules';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const RUNS = Number(arg('runs', '300')), LV = Number(arg('lv', '5'));
const DT = 1 / 120;
if (process.argv.includes('--tempo')) Object.assign(TEMPO, JSON.parse(arg('tempo', '{}')));
if (process.argv.includes('--hp')) arg('hp', '').split(',').forEach((v, i) => (Object.values(NODES)[i].hp = Number(v)));

type Who = { name: string; react: [number, number]; jitter: number; mash?: number; zone?: boolean };
export const PLAYERS: Who[] = [
  { name: 'good', react: [0.12, 0.22], jitter: 0.05 },
  { name: 'casual', react: [0.2, 0.35], jitter: 0.11, zone: true },
  { name: 'masher', react: [0, 0], jitter: 0, mash: 0.125 },
];

let seed = 1;
const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const between = ([a, b]: [number, number]) => a + rng() * (b - a);

type Judged = 'perfect' | 'hit' | 'miss';
/** What a strike right now would be (without striking). */
function judge(c: Chop): Judged {
  const j = (c as unknown as { judge?: () => Judged }).judge;
  if (j) return j.call(c);
  const off = Math.abs(c.pos - c.center);
  return off <= c.width / 2 ? (off <= (c.width * 0.36) / 2 ? 'perfect' : 'hit') : 'miss';
}

const copy = (c: Chop): Chop => Object.assign(Object.create(Object.getPrototypeOf(c)), structuredClone({ ...c, rng: undefined }), { rng: () => 0.5 });

/** The middle of the next moment a strike would be perfect (or failing that, clean; or just in the zone), seconds from now. */
function plan(c: Chop, from: number, zone = false): number {
  for (const want of zone ? ['zone'] : ['perfect', 'hit']) {
    const g = copy(c);
    let start = -1;
    for (let t = 0; t < 4; t += DT) {
      const j = judge(g), ok = t >= from && g.lock <= 0 && (want === 'zone' ? j !== 'miss' : j === want);
      if (ok && start < 0) start = t;
      if (!ok && start >= 0) return (start + t - DT) / 2;
      g.update(DT);
    }
  }
  return from;
}

/** Seconds to fell one node, or Infinity. `carry` starts with a streak (momentum from the last node). */
export function play(who: Who, hp: number, power: number, width: number, pattern: Pattern = 'sweep', carry = 0): { secs: number; clean: boolean; streak: number } {
  const c = new Chop(hp, power, width, rng, 0, carry, pattern);
  let t = 0, at = who.mash ? 0 : between(who.react) + 0.3;
  // First look: you see the bar as the card opens.
  if (!who.mash) at = plan(c, at, who.zone) + (rng() * 2 - 1) * who.jitter;
  while (!c.done && t < 120) {
    c.update(DT);
    t += DT;
    if (t < at) continue;
    if (who.mash) { c.strike(); at = t + who.mash; continue; }
    const shown = (c as unknown as { next?: number }).next;
    const r = c.strike();
    if (!r) { at = t + DT; continue; }
    if (c.done) break;
    // A zone that was already showing needs no reaction, just a quick second tap.
    const known = shown !== undefined && shown === c.center;
    const from = known ? 0.1 : between(who.react);
    at = t + plan(c, from, who.zone) + (rng() * 2 - 1) * who.jitter;
  }
  return { secs: t, clean: !!(c as unknown as { clean?: boolean }).clean, streak: c.streak };
}

const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];

if (import.meta.main) {
  const width = sweetWidth(LV);
  console.log(`Seconds to fell a node at skill Lv ${LV} (median, 10th–90th), ${RUNS} runs each; clean = share finished by a clean cut\n`);
  console.log(`${'node'.padEnd(10)} ${'tool'.padEnd(5)} ${PLAYERS.map((p) => p.name.padEnd(22)).join('')}`);
  for (const kind of Object.keys(NODES) as NodeKind[]) {
    const n = NODES[kind];
    for (const tool of [n.tier, n.tier + 1].filter((t) => t <= 4)) {
      const cells = PLAYERS.map((who) => {
        const rs = Array.from({ length: RUNS }, () => play(who, n.hp, toolPower(tool, n.tier), width, PATTERNS[n.tier]));
        const s = rs.map((r) => r.secs), clean = rs.filter((r) => r.clean).length / RUNS;
        return `${q(s, 0.5).toFixed(1)} (${q(s, 0.1).toFixed(1)}–${q(s, 0.9).toFixed(1)})${clean >= 0.005 ? ` ${Math.round(clean * 100)}%` : ''}`.padEnd(22);
      });
      console.log(`${kind.padEnd(10)} ${String(tool).padEnd(5)} ${cells.join('')}`);
    }
  }
}
