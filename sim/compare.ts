// Lines up a real play report against the simulated player (player.ts) with the same weapon class: quest by quest,
// weapon by weapon, guardian by guardian. Each real number is marked against the simulation's typical range (10th–90th
// percentile): inside it, the model matches your play, and if it still felt wrong, the targets are what's off; outside
// it, the model is off (or the simulated player behaves unlike you: see CAL in player.ts).
//
//   bun sim/compare.ts <report.json> [--class whip] [--runs 30]
import { readFileSync } from 'node:fs';
import { GEAR, type Style } from '../src/data';
import { newState, type SaveState } from '../src/state';
import { summarize, type Stamped } from '../src/stats';
import { VERSION } from '../src/version';
import { arg, q, runs } from './simulate';

type Summary = ReturnType<typeof runs>[number];
type Tables = Record<string, { cols: string[]; rows: unknown[][] }>;
const raw = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Summary & { version?: string; events?: Tables; now: Partial<SaveState> };

// Re-summarize the report's own events with today's code, so older reports get the newer fields (storyline, per-kill
// numbers) too. Without events (a copied summary), use its summary as it is.
const events: Stamped[] = Object.entries(raw.events ?? {}).flatMap(([kind, t]) => t.rows.map((r) => ({ kind, ...Object.fromEntries(t.cols.map((c, i) => [c, r[i]])) }) as Stamped))
  .sort((a, b) => a.play - b.play);
const time = Object.fromEntries(Object.entries(raw.summary.time.byZone).map(([z, acts]) => [z, Object.fromEntries(Object.entries(acts).map(([a, m]) => [a, (m as number) * 60]))]));
const save = { ...newState(), ...raw.now, playtime: raw.playMinutes * 60 } as SaveState;
const report = events.length ? { ...summarize(save, events, time), version: raw.version, playMinutes: raw.playMinutes } : raw;
const s = report.summary;

// The class you played most (not counting the Twig).
const byWeapon = Object.entries(s.fightsByWeapon).filter(([w]) => w !== 'twig').sort((a, b) => b[1].fights - a[1].fights);
const style = (arg('class', '') || GEAR[byWeapon[0]?.[0] ?? 'twig']?.style || 'sword') as Style;
const sims = runs(style, Number(arg('runs', '30')), 1);

console.log(`Your report: ${report.version ? `v${report.version}` : 'unknown version (before 0.3.3)'}, ${report.playMinutes} min, ${s.fights} fights · simulated: v${VERSION}, ${sims.length} runs with ${style}`);
if (report.version !== VERSION) console.log(`⚠ The report is from a different version: balance changes since then show up as "model off".`);

const mark = (real: number, xs: number[], d = 1) => {
  const lo = q(xs, 0.1), mid = q(xs, 0.5), hi = q(xs, 0.9);
  if (!Number.isFinite(real) || !xs.length) return `${'—'.padStart(6)} vs ${xs.length ? mid.toFixed(d).padStart(6) : '—'}`;
  const tag = real < lo ? '▼ below' : real > hi ? '▲ above' : '✓';
  return `${real.toFixed(d).padStart(6)} vs ${mid.toFixed(d).padStart(6)} (${lo.toFixed(d)}–${hi.toFixed(d)}) ${tag}`;
};

if (s.storyline?.length) {
  console.log('\nStory, quest by quest: yours vs simulated median (range)');
  for (const row of s.storyline) {
    const sim = sims.map((x) => x.summary.storyline.find((y) => y.id === row.id)).filter((y) => !!y);
    if (!sim.length) continue;
    console.log(`  ${row.id.padEnd(12)} fights ${mark(row.fights, sim.map((y) => y.fights), 0)}   minutes ${mark(row.minutes, sim.map((y) => y.minutes))}   level ${mark(row.lvTo, sim.map((y) => y.lvTo), 0)}`);
    if ('reachedGuardianAt' in row) console.log(`  ${''.padEnd(12)} reached the guardian at Lv ${row.lvWhenReached}, then ${row.fightsAfterReaching} more fights before beating it`);
  }
}

console.log('\nFights by weapon: yours vs simulated median (range)');
for (const [w, real] of Object.entries(s.fightsByWeapon)) {
  const sim = sims.map((x) => x.summary.fightsByWeapon[w]).filter((y) => !!y);
  if (!sim.length) {
    console.log(`  ${w.padEnd(14)} (the simulated player never used it)`);
    continue;
  }
  console.log(`  ${w.padEnd(14)} strikes/kill ${mark(real.strikesPerKill ?? NaN, sim.map((y) => y.strikesPerKill))}   s/kill ${mark(real.secondsPerKill ?? NaN, sim.map((y) => y.secondsPerKill))}   HP lost % ${mark(real.avgHpLostPct, sim.map((y) => y.avgHpLostPct))}`);
}

console.log('\nGuardians: yours vs simulated median (range)');
for (const [z, real] of Object.entries(s.fightsByZone).filter(([z]) => z.endsWith('(boss)'))) {
  const sim = sims.map((x) => x.summary.fightsByZone[z]).filter((y) => !!y);
  if (!sim.length) continue;
  console.log(`  ${z.padEnd(16)} seconds ${mark(real.avgSeconds, sim.map((y) => y.avgSeconds))}   HP lost % ${mark(real.avgHpLostPct, sim.map((y) => y.avgHpLostPct), 0)}   potions ${mark(real.avgPotions, sim.map((y) => y.avgPotions))}`);
}

console.log('\nTime (minutes): yours vs simulated median (range), over the same stretch of story');
const doneAt = s.storyline?.at(-1)?.doneMinutes;
const simAt = (x: Summary) => (doneAt ? x.summary.storyline.find((y) => y.id === s.storyline.at(-1)!.id)?.doneMinutes : x.playMinutes) ?? NaN;
console.log(`  ${'total'.padEnd(12)} ${mark(doneAt ?? report.playMinutes, sims.map(simAt))}`);
console.log(`  (the simulated split covers the whole game; compare shares, not minutes)`);
for (const a of ['fighting', 'walking', 'gathering', 'menus'] as const) {
  const real = s.time.totalMinutes[a] ?? 0, share = (x: Summary) => (x.summary.time.totalMinutes[a] ?? 0) / Math.max(0.1, x.playMinutes);
  console.log(`  ${a.padEnd(12)} ${(100 * real / Math.max(0.1, report.playMinutes)).toFixed(0).padStart(4)}% of your time vs ${(100 * q(sims.map(share), 0.5)).toFixed(0)}% simulated`);
}
