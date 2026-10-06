// Balance measurements run Battle itself: no parallel damage, timing, projectile or monster-AI implementation.
// This file is test tooling and is never imported by the game bundle.
import { Battle, type BattleSetup, type Foe } from '../../src/battle/battle';
import type { Audio } from '../../src/audio';
import type { Input, Action } from '../../src/input';
import type { Enemy, Swing } from '../../src/battle/types';
import { AutoInput, combatControls } from '../../src/dev/autoInput';
import { CHECKPOINTS, type Checkpoint } from '../../src/balance';
import { GEAR, MASTERY_FOR_TIER, MONSTERS, ZONES, zoneById, type MonsterKind, type Style } from '../../src/data';
import { newState, type SaveState } from '../../src/state';
import { playerStats } from '../../src/rules';

export const WEAPONS = Object.values(GEAR).filter(g => g.slot === 'weapon');
export const POLICIES = ['normal', 'frequent-special', 'timed-special'] as const;
export type Policy = typeof POLICIES[number];
const quiet = { play() {} } as unknown as Audio;
// Arrival handling is explicit: the old report silently put first-tier weapons at handling 1 while showing a skill.
const HANDLING: Record<string, number> = { prologue: 1, meadow: 1, 'meadow-gear': 2, woods: 3, cave: 4, hollow: 6, peak: 7, dragon: 9 };
export interface Stage extends Checkpoint { handling: number }
export const STAGES: Stage[] = CHECKPOINTS.map(c => ({ ...c, handling: HANDLING[c.id] ?? 1 }));
export interface Encounter { id: string; label: string; type: 'single' | 'crowd' | 'golden' | 'boss'; foes: Foe[] }
export function encounters(stage: Stage): Encounter[] {
  if (stage.foes) return stage.foes.map(f => ({ id: `${f.kind}-${f.lv}`, label: MONSTERS[f.kind].name, type: 'single', foes: [{ ...f, golden: false }] }));
  const zone = zoneById(stage.zone), rows: Encounter[] = [];
  for (const { kind } of zone.monsters) for (let lv = zone.lv[0]; lv <= zone.lv[1]; lv++) {
    rows.push({ id: `${kind}-${lv}`, label: `${MONSTERS[kind].name} Lv${lv}`, type: 'single', foes: [{ kind, lv, golden: false }] });
  }
  if (zone.monsters.length) {
    const lv = Math.max(zone.lv[0], Math.min(zone.lv[1], stage.lv));
    rows.push({ id: 'crowd', label: `${Math.min(3, zone.maxEnemies)} mixed enemies Lv${lv}`, type: 'crowd', foes: Array.from({ length: Math.min(3, zone.maxEnemies) }, (_, i) => ({ kind: zone.monsters[i % zone.monsters.length].kind, lv, golden: false })) });
    for (const { kind } of zone.monsters) rows.push({ id: `golden-${kind}`, label: `Golden ${MONSTERS[kind].name} Lv${lv}`, type: 'golden', foes: [{ kind, lv, golden: true }] });
  }
  const bosses = stage.boss ? [stage.boss] : [];
  if (stage.id === 'meadow-gear') bosses.push({ kind: 'bigbun', lv: 4, hitsToKill: [0, 0], hitsToDie: [0, 0] });
  if (stage.id === 'woods') bosses.push({ kind: 'scarwolf', lv: 6, hitsToKill: [0, 0], hitsToDie: [0, 0] });
  for (const b of bosses) rows.push({ id: b.kind, label: `${MONSTERS[b.kind].name} Lv${b.lv}`, type: 'boss', foes: [{ kind: b.kind, lv: b.lv, golden: false }] });
  return rows;
}

/** Randomness is scoped and restored even on failure. Runs are synchronous; never run these concurrently in one JS VM. */
export function seeded<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  let state = seed >>> 0;
  Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  try { return fn(); } finally { Math.random = original; }
}
function input() {
  const presses = new Set<Action>(), held = new Set<Action>();
  const api = { enabled: true, axis: () => ({ x: 0, y: 0 }), consume: (k: Action) => presses.delete(k), isHeld: (k: Action) => held.has(k), peek: (k: Action) => presses.has(k), flush: () => presses.clear(), reset: () => { presses.clear(); held.clear(); } } as unknown as Input;
  return { api, presses, held };
}
export function stageSave(stage: Stage, weapon: string, handling = stage.handling): SaveState {
  const s = newState();
  s.lv = stage.lv; s.equip = { weapon, armor: stage.armor, charm: stage.charm ?? null };
  s.build.training = stage.training ?? 0; s.build.home = stage.home ?? 1;
  s.mastery[GEAR[weapon].style!].lv = handling; s.potions = 5; s.hp = playerStats(s).maxHp;
  return s;
}
export function availability(stage: Stage, weapon: string): string {
  const g = GEAR[weapon];
  if ((g.tier ?? 0) > (GEAR[stage.weapon].tier ?? 0)) return 'future tier';
  if ((MASTERY_FOR_TIER[g.tier ?? 0] ?? 0) > stage.handling) return 'handling locked';
  if (g.recipe?.scale && stage.id !== 'dragon') return 'dragon scales required';
  if (g.recipe?.scale) return 'dragon rematch gear';
  return 'stage tier'; // A tier comparison, not a claim that this individual save has collected the crafting materials.
}
interface Hit { time: number; mult: number; damage: number; target: number; skill: boolean; id: number }
interface Internal {
  updateEnemy(e: Enemy, dt: number): void;
  hitEnemy(e: Enemy, mult: number, ang: number, kb: number, stun?: number, id?: number, hitstop?: number): void;
  startSwing(s: Swing['s'], skill: boolean, finisher: boolean): void;
}
function observe(b: Battle) {
  const internal = b as unknown as Internal, old = internal.hitEnemy.bind(b), hits: Hit[] = [];
  internal.hitEnemy = (e, mult, ang, kb, stun, id = 0, hitstop) => {
    const hp = e.hp; old(e, mult, ang, kb, stun, id, hitstop);
    hits.push({ time: b.t, mult, damage: hp - e.hp, target: b.enemies.indexOf(e), skill: !!b.p.swing?.skill || b.p.whirlT > 0, id });
  };
  return hits;
}
function policy(b: Battle, mode: Policy) {
  const c = combatControls(b);
  if (mode === 'normal') c.press.delete('skill');
  if (mode === 'timed-special' && c.press.has('skill')) {
    const sw = b.p.swing;
    // Finish the damaging part before cancelling recovery. The whip keeps lashing into its recovery: let it finish.
    const landed = sw?.impacted && sw.s.shape === 'circle';
    if (sw && !landed) c.press.delete('skill');
    else c.hold.delete('attack'); // Avoid starting a normal and cancelling it on the same frame.
  }
  return c;
}
export interface Trial {
  seed: number; result: 'win' | 'lose' | 'run' | 'timeout'; seconds: number; activeSeconds: number;
  damage: number; rawDamage: number; damageTaken: number; healing: number; lifeSteal: number; potionHealing: number; regenHealing: number; hpLeftPct: number; potions: number;
  normals: number; skills: number; hits: number; crits: number; dodges: number;
}
export function fight(stage: Stage, weapon: string, encounter: Encounter, mode: Policy, seed: number, dt = 1 / 60, limit = 120): Trial {
  return seeded(seed, () => {
    const s = stageSave(stage, weapon), io = input(), auto = new AutoInput(io.api);
    const setup: BattleSetup = { zone: zoneById(stage.zone), foes: encounter.foes, boss: encounter.type === 'boss' };
    const b = new Battle(setup, s, io.api, quiet, () => {});
    let healing = 0, active = 0, damage = 0, lifeSteal = 0, potionHealing = 0, cleanupDamage = 0, bossDeathDepth = 0;
    const internal = b as unknown as Internal & { drinkPotion(): void };
    const hit = internal.hitEnemy.bind(b), drink = internal.drinkPotion.bind(b);
    internal.hitEnemy = (...a) => { const hp = b.p.hp; hit(...a); lifeSteal += Math.max(0, b.p.hp - hp); };
    internal.drinkPotion = () => { const hp = b.p.hp; drink(); potionHealing += Math.max(0, b.p.hp - hp); };
    const kill = b.kill.bind(b);
    b.kill = e => {
      // Helpers disappear when their guardian dies; their remaining health was not damage dealt by the player.
      if (bossDeathDepth > 0 && e.minion && !e.dead) cleanupDamage += Math.max(0, e.hp);
      if (e.def.boss) bossDeathDepth++;
      try { kill(e); } finally { if (e.def.boss) bossDeathDepth--; }
    };
    for (let t = 0; t < limit && !b.outcome; t += dt) {
      auto.set(policy(b, mode));
      const hp = b.p.hp, taken = b.log.taken, cleanupBefore = cleanupDamage;
      const enemyHp = new Map(b.enemies.map(e => [e, Math.max(0, e.hp)]));
      if (b.intro <= 0) active += dt;
      b.update(dt); io.api.flush();
      healing += Math.max(0, b.p.hp - hp + b.log.taken - taken);
      let removed = 0;
      for (const e of b.enemies) removed += Math.max(0, (enemyHp.get(e) ?? e.maxHp) - Math.max(0, e.hp));
      damage += Math.max(0, removed - (cleanupDamage - cleanupBefore));
    }
    return { seed, result: b.outcome?.result ?? 'timeout', seconds: b.t, activeSeconds: active,
      damage, rawDamage: b.log.dealt, damageTaken: b.log.taken, healing, lifeSteal, potionHealing, regenHealing: Math.max(0, healing - lifeSteal - potionHealing), hpLeftPct: Math.max(0, 100 * b.p.hp / b.stats.maxHp),
      potions: 5 - s.potions, normals: b.log.swings, skills: b.log.skills, hits: b.log.hits, crits: b.log.crits, dodges: b.log.dodges };
  });
}
export interface Summary {
  runs: number; winPct: number; timeoutPct: number; winSeconds: number | null; p10Seconds: number | null; p90Seconds: number | null;
  activeDps: number; taken: number; healing: number; lifeSteal: number; potionHealing: number; regenHealing: number; hpLeftPct: number; potions: number; normals: number; skills: number; hits: number;
}
export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), at = (sorted.length - 1) * q, lo = Math.floor(at), hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}
export function summarize(rows: Trial[]): Summary {
  const mean = (key: keyof Trial) => rows.reduce((n, r) => n + Number(r[key]), 0) / rows.length;
  const wins = rows.filter(r => r.result === 'win').map(r => r.activeSeconds);
  return { runs: rows.length, winPct: 100 * wins.length / rows.length, timeoutPct: 100 * rows.filter(r => r.result === 'timeout').length / rows.length,
    winSeconds: quantile(wins, .5), p10Seconds: quantile(wins, .1), p90Seconds: quantile(wins, .9),
    activeDps: rows.reduce((n, r) => n + r.damage, 0) / rows.reduce((n, r) => n + r.activeSeconds, 0),
    taken: mean('damageTaken'), healing: mean('healing'), lifeSteal: mean('lifeSteal'), potionHealing: mean('potionHealing'), regenHealing: mean('regenHealing'), hpLeftPct: mean('hpLeftPct'), potions: mean('potions'), normals: mean('normals'), skills: mean('skills'), hits: mean('hits') };
}

/** Stationary targets establish what actually lands, separately from a bot's ability to reach and dodge a monster. */
export interface Probe {
  weapon: string; handling: number; monster: MonsterKind; distance: number; mode: 'normal' | 'special';
  direct: number; total: number; secondary: number; hits: number; firstHit: number | null; hitMultipliers: number[]; chains: number; bursts: number;
}
export function probe(weapon: string, handling: number, kind: MonsterKind, distance: number, mode: 'normal' | 'special', dt = 1 / 60): Probe {
  const original = Math.random; Math.random = () => .5; // No crits; neutral damage roll.
  try {
    const stage = { ...STAGES.find(s => s.id === 'hollow')!, lv: 10, training: 0, home: 1 };
    const s = stageSave(stage, weapon, handling), io = input();
    const b = new Battle({ zone: zoneById('woods'), foes: [{ kind, lv: 10, golden: false }, { kind, lv: 10, golden: false }], boss: false }, s, io.api, quiet, () => {});
    b.intro = 0; b.p.x = b.p.y = 0; b.p.face = 0; b.p.skillCd = 0;
    const [e, second] = b.enemies;
    e.x = distance; e.y = 0; second.x = distance; second.y = 60;
    for (const target of b.enemies) { target.hp = target.maxHp = 1e9; target.stun = 1e9; }
    const internal = b as unknown as Internal, update = internal.updateEnemy.bind(b);
    const positions = new Map(b.enemies.map(e => [e, { x: e.x, y: e.y }]));
    internal.updateEnemy = (e, dt) => {
      // Keep native poison/burn ticking while stopping target movement, knockback and retaliation.
      Object.assign(e, positions.get(e)); e.kx = e.ky = 0; e.stun = 1e9; b.p.iframes = 1e9;
      update(e, dt);
      Object.assign(e, positions.get(e)); e.kx = e.ky = 0;
    };
    const hits = observe(b);
    let chains = 0, bursts = 0;
    const chain = b.chain.bind(b), burst = b.dragonBurst.bind(b);
    b.chain = e => { chains++; chain(e); };
    b.dragonBurst = (x, y, e) => { bursts++; burst(x, y, e); };
    io.presses.add(mode === 'normal' ? 'attack' : 'skill');
    for (let t = 0; t < 3; t += dt) b.update(dt);
    const primary = hits.filter(h => h.target === 0);
    return { weapon, handling, monster: kind, distance, mode, direct: primary.reduce((n, h) => n + h.damage, 0), total: 1e9 - e.hp,
      secondary: 1e9 - second.hp, hits: primary.length, firstHit: primary[0]?.time ?? null, hitMultipliers: primary.map(h => h.mult), chains, bursts };
  } finally { Math.random = original; }
}
export interface MechanicalCheck { id: string; label: string; ok: boolean; observed: string }
export function mechanics(dt = 1 / 60): MechanicalCheck[] {
  const glimmer = probe('glimmerwand', 8, 'slime', 100, 'normal', dt);
  const dragon = probe('wyrmfire', 8, 'slime', 100, 'normal', dt);
  const hammer = probe('stonehammer', 10, 'kingslime', 70, 'special', dt);
  return [
    { id: 'glimmer-chain', label: 'Glimmer Wand chains to a nearby second enemy', ok: glimmer.chains > 0 && glimmer.secondary > 0, observed: `${glimmer.chains} chains, ${glimmer.secondary} secondary damage` },
    { id: 'dragon-splash', label: 'Wyrmfire bursts onto a nearby second enemy', ok: dragon.bursts > 0 && dragon.secondary > 0, observed: `${dragon.bursts} bursts, ${dragon.secondary} secondary damage` },
    { id: 'fracture-fan', label: 'Fracture hits a large enemy once across its impact and fan', ok: hammer.hits === 1, observed: `${hammer.hits} hits, multipliers ${hammer.hitMultipliers.join(' + ')}` },
  ];
}
