// Runs the simulated player (player.ts) many times with one weapon class and prints the typical playthrough: each
// quest's fights, minutes and levels (median, and the 10th–90th percentile range), how each weapon's fights went, and
// where runs got stuck. Writes the first run's full report (the play report's own format) to sim/out/.
//
//   bun sim/simulate.ts [--class whip] [--runs 30] [--seed 1]
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Style } from '../src/data';
import { summarize } from '../src/stats';
import { simulate } from './player';

export const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

export const q = (xs: number[], p: number) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : NaN;
};

/** Many runs' summaries, from seeds seed…seed+runs-1. */
export function runs(style: Style, n: number, seed: number) {
  return Array.from({ length: n }, (_, i) => {
    const r = simulate(style, seed + i);
    return { ...summarize(r.save, r.events, r.time), stuck: r.stuck };
  });
}

if (import.meta.main) {
  const style = arg('class', 'sword') as Style, n = Number(arg('runs', '30')), seed = Number(arg('seed', '1'));
  const all = runs(style, n, seed);
  mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
  writeFileSync(new URL(`./out/sim-${style}-${seed}.json`, import.meta.url), JSON.stringify(all[0], null, 1));
  const stuck = all.filter((x) => x.stuck).map((x) => x.stuck);
  console.log(`Simulated ${n} playthroughs with ${style}${stuck.length ? `, ${stuck.length} stuck (${[...new Set(stuck)].join(', ')})` : ''}\n`);
  const fmt = (xs: number[], d = 0) => `${q(xs, 0.5).toFixed(d)} (${q(xs, 0.1).toFixed(d)}–${q(xs, 0.9).toFixed(d)})`;
  console.log(`${'quest'.padEnd(12)} ${'fights'.padEnd(14)} ${'minutes'.padEnd(18)} ${'lv at end'.padEnd(12)} handling`);
  for (const id of all[0].summary.storyline.map((x) => x.id)) {
    const rows = all.map((x) => x.summary.storyline.find((y) => y.id === id)).filter((y) => !!y);
    const h = rows.map((y) => Math.max(1, ...Object.values(y.handling)));
    console.log(`${id.padEnd(12)} ${fmt(rows.map((y) => y.fights)).padEnd(14)} ${fmt(rows.map((y) => y.minutes), 1).padEnd(18)} ${fmt(rows.map((y) => y.lvTo)).padEnd(12)} ${fmt(h)}`);
  }
  console.log(`\nTotal ${fmt(all.map((x) => x.playMinutes), 1)} minutes`);
  console.log('\nFights by weapon (medians): strikes/kill, seconds/kill, HP lost %');
  const weapons = [...new Set(all.flatMap((x) => Object.keys(x.summary.fightsByWeapon)))];
  for (const w of weapons) {
    const rows = all.map((x) => x.summary.fightsByWeapon[w]).filter((y) => !!y);
    console.log(`  ${w.padEnd(14)} ${q(rows.map((y) => y.strikesPerKill), 0.5).toFixed(1).padStart(5)} ${q(rows.map((y) => y.secondsPerKill), 0.5).toFixed(1).padStart(6)} ${q(rows.map((y) => y.avgHpLostPct), 0.5).toFixed(1).padStart(6)}   (${q(rows.map((y) => y.fights), 0.5)} fights)`);
  }
}
