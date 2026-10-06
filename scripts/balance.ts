// One balance entry point: runtime combat comparisons plus the existing economy/progression estimates.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fight, summarize, probe, mechanics, STAGES, WEAPONS, POLICIES, encounters, availability, stageSave, type Summary } from '../tests/balance/combat';
import { killModel, report as estimatedReport } from '../src/balance';
import { playerStats } from '../src/rules';
import { VERSION } from '../src/version';
import { dashboard } from './balance-page';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => args.includes(name) ? args[args.indexOf(name) + 1] ?? fallback : fallback;
const seeds = Number(option('--seeds', '5'));
const fps = Number(option('--fps', '60'));
if (!Number.isInteger(seeds) || seeds < 1 || seeds > 100 || ![20, 30, 60, 120].includes(fps)) throw new Error('Use --seeds 1..100 and --fps 20, 30, 60 or 120');
const out = resolve(option('--out', 'sim/out/balance'));
mkdirSync(out, { recursive: true });
const checks = mechanics(1 / fps);
if (args.includes('--check')) {
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.label}: ${c.observed}`);
  process.exit(checks.every(c => c.ok) ? 0 : 1);
}
const started = performance.now();
const sourceFiles = [...Array.from(new Bun.Glob('src/**/*.ts').scanSync('.')), 'tests/balance/combat.ts', 'scripts/balance.ts', 'scripts/balance-page.ts'];
const sourceHash = () => { const h = createHash('sha256'); for (const f of sourceFiles.sort()) h.update(f).update(readFileSync(f)); return h.digest('hex'); };
const snapshot = sourceHash();
export interface FightRow extends Summary {
  stage: string; stageName: string; playerLv: number; handling: number; weapon: string; weaponName: string; style: string; tier: number;
  availability: string; encounter: string; enemy: string; type: string; mode: string; modeledSeconds: number | null; specialTimePct: number | null;
}
const rows: FightRow[] = [], raw: { stage: string; weapon: string; encounter: string; mode: string; trials: ReturnType<typeof fight>[] }[] = [];
for (const stage of STAGES) {
  for (const w of WEAPONS) for (const encounter of encounters(stage)) for (const mode of POLICIES) {
    const trials = Array.from({ length: seeds }, (_, i) => fight(stage, w.id, encounter, mode, 17 + i * 31, 1 / fps));
    const f = encounter.foes[0];
    const model = encounter.type === 'single' && !f.gentle ? killModel(playerStats(stageSave(stage, w.id)), w.style!, stage.handling, f.kind, f.lv).seconds : null;
    rows.push({ stage: stage.id, stageName: stage.label, playerLv: stage.lv, handling: stage.handling, weapon: w.id, weaponName: w.name, style: w.style!, tier: w.tier ?? 0,
      availability: availability(stage, w.id), encounter: encounter.id, enemy: encounter.label, type: encounter.type, mode, modeledSeconds: model, specialTimePct: null, ...summarize(trials) });
    raw.push({ stage: stage.id, weapon: w.id, encounter: encounter.id, mode, trials });
  }
  console.log(`Measured ${stage.label}: ${rows.filter(r => r.stage === stage.id).length} comparisons`);
}
const normal = new Map(rows.filter(r => r.mode === 'normal').map(r => [`${r.stage}/${r.weapon}/${r.encounter}`, r]));
for (const r of rows) {
  const base = normal.get(`${r.stage}/${r.weapon}/${r.encounter}`)!;
  if (r.mode !== 'normal' && r.winSeconds !== null && base.winSeconds !== null) r.specialTimePct = 100 * (r.winSeconds / base.winSeconds - 1);
}
const probes = WEAPONS.flatMap(w => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap(h => (['slime', 'golem', 'kingslime'] as const).flatMap(k => [40, 70, 130, 220].flatMap(d => (['normal', 'special'] as const).map(m => probe(w.id, h, k, d, m, 1 / fps))))));
const findings: { severity: string; title: string; text: string }[] = checks.filter(c => !c.ok).map(c => ({ severity: 'bug', title: c.label, text: c.observed }));
for (const w of WEAPONS) {
  const a = probes.find(p => p.weapon === w.id && p.handling === 2 && p.monster === 'slime' && p.distance === 70 && p.mode === 'normal')!;
  const b = probes.find(p => p.weapon === w.id && p.handling === 2 && p.monster === 'slime' && p.distance === 70 && p.mode === 'special')!;
  if (a.direct > 0 && b.direct < a.direct * .8) findings.push({ severity: 'review', title: `${w.name}: early special hits softer than normal`, text: `${b.direct} versus ${a.direct} direct damage (${Math.round(100 * b.direct / a.direct)}%). Check area, control and timing benefits before tuning.` });
}
const regressions = rows.filter(r => r.availability === 'stage tier' && r.mode === 'timed-special' && r.specialTimePct !== null && r.specialTimePct > 15 && r.winPct === 100 && normal.get(`${r.stage}/${r.weapon}/${r.encounter}`)!.winPct === 100);
for (const w of WEAPONS) {
  const matches = regressions.filter(r => r.weapon === w.id).sort((a, b) => b.specialTimePct! - a.specialTimePct!);
  if (!matches.length) continue;
  const r = matches[0];
  findings.push({ severity: 'review', title: `${r.weaponName}: specials slower in ${matches.length} matchups`, text: `Largest difference: ${r.stageName} / ${r.enemy}, ${r.specialTimePct!.toFixed(0)}% longer. All matchups remain in the Fights table. Inspect positioning and opportunity cost; this is a controller observation, not a human difficulty verdict.` });
}
if (snapshot !== sourceHash()) throw new Error('Combat sources changed while measuring. Re-run to produce a consistent report.');
const data = { version: VERSION, generated: new Date().toISOString(), sourceHash: snapshot, seeds, fps, stages: STAGES, weapons: WEAPONS.map(w => ({ id: w.id, name: w.name, style: w.style, tier: w.tier ?? 0 })), rows, probes, checks, findings,
  assumptions: [
    'Combat uses Battle.update, real enemy AI, hitboxes, knockback, critical hits, cooldowns, status effects and native rewards. Fixture saves are isolated.',
    'The same seeds, character level, armor, charm, home and training are used for every weapon and policy at a stage. Weapon ATK and effects remain real.',
    'All policies can dodge and drink potions. Normal uses normal attacks only. Frequent special uses the existing playtest controller. Timed special preserves normal windup, permits hammer recovery cancels and releases normal attack when casting.',
    'Five potions per fight, no meal or side-story perks. Potion healing, regeneration and life steal are recorded separately; overhealing is excluded. Effective DPS excludes lethal overkill and helpers disappearing when their guardian dies.',
    'Win time excludes the entrance animation and is computed only from wins. Losses and timeouts remain visible in win rate. Timeouts are capped at 120 seconds.',
    'Stationary probes use neutral rolls and no critical hits, level 10 targets and the same level 10 loadout. Targets cannot die or retaliate. Distances are arena units.',
    'All weapons are included at every stage. Future-tier, handling-locked and dragon-rematch equipment are counterfactuals; the default view filters them out.',
    'Stage handling levels are explicit assumptions, not predicted by this combat runner. Bot outcomes do not establish human difficulty; the separate damage probes help distinguish controller issues.',
    'Formula predictions are reference estimates with movement and specials omitted. Economy/progression estimates retain their existing assumptions below.',
  ], estimates: estimatedReport() };
writeFileSync(`${out}/data.json`, JSON.stringify({ ...data, raw }, null, 2));
const keys = Object.keys(rows[0]);
const csv = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
writeFileSync(`${out}/fights.csv`, [keys.join(','), ...rows.map(r => keys.map(k => csv(r[k as keyof FightRow])).join(','))].join('\n'));
writeFileSync(`${out}/index.html`, dashboard(data));
console.log(`\n${rows.length} comparisons, ${raw.reduce((n, r) => n + r.trials.length, 0)} fights, ${probes.length} attack probes (${((performance.now() - started) / 1000).toFixed(1)}s)`);
console.log(`${checks.filter(c => !c.ok).length} failed mechanics checks; ${findings.filter(f => f.severity === 'review').length} balance/controller review flags`);
console.log(`Open ${out}/index.html\nRaw data: ${out}/data.json\nCSV: ${out}/fights.csv`);
