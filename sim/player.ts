// A simulated player: plays the story from a fresh world to the Emberwyrm with one weapon class, using the game's own
// rules (XP, drops, handling, crafting, the strike-by-strike kill model) and a thin layer of player behaviour (how often
// the grass ambushes you, how long walking and menus take, when you're ready for a guardian). It writes the same events
// the game's play report records, so its report and yours can be compared field for field (see compare.ts).
//
// This is test tooling, not the game: it's expected to change quickly and to break when the game changes. Fix it when
// you need it. Everything about player behaviour is in CAL, to be tuned against real play reports.
import { gatherPerSecond, killModel } from '../src/balance';
import {
  GEAR, GEAR_ORDER, MAX_POTIONS, MONSTERS, NODES, POTION_HEAL, PROJECTS, QUESTS, TOOLS, ZONES, forgeLevelFor,
  type Gear, type MatId, type MonsterKind, type ProjectId, type Recipe, type Style, type ZoneId,
} from '../src/data';
import { calcDamage, equip, gainMastery, gainSkillXp, gainXp, hasMats, levelEdge, masteryShort, mergeDrops, missingSkill, playerStats, rollDrops, scaleMonster, spend, toolPower, xpEdge } from '../src/rules';
import { LOGS_PER_PLANK } from '../src/sawmill';
import { newState, type SaveState } from '../src/state';
import type { Stamped, TimeLog } from '../src/stats';

/** How a player behaves, in seconds unless noted. First guesses; tune them against real play reports. */
export const CAL = {
  /** Walking up to each monster in a fight, and the swoop in and out. */
  approachSec: 2.5,
  fightOverheadSec: 3,
  /** Time out in an area (walking, gathering) per grass ambush. */
  ambushEverySec: 30,
  /** Looking for a monster to farm, between fights. */
  searchSec: 6,
  /** A trip out to an area and back to the village. */
  tripSec: 45,
  /** Each craft or build in the menus, and reading each quest's dialogue. */
  menuPerCraftSec: 15,
  menuPerQuestSec: 20,
  /** A monster tries to hit you this often, and this share gets through (dodges, misses, spacing). */
  monsterHitEverySec: 2.5,
  hitChance: 0.35,
  /** Go back and rest below this share of HP. */
  restBelow: 0.4,
  /** Fight a guardian once you're at most this many levels under it. */
  readyMargin: 1,
  /** Side stories (Poppy's, Bram's) on the way. */
  sideStories: true,
};

type Foe = { kind: MonsterKind; lv: number };

/** A small seeded random number generator, so runs repeat exactly. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AREAS = ZONES.filter((z) => z.monsters.length);
const zone = (id: ZoneId) => ZONES.find((z) => z.id === id)!;
const gathered = (m: string) => Object.values(NODES).some((n) => n.mat === m);
const trophy = (m: string) => m === 'royaljelly' || m === 'alphapelt' || m === 'echowing' || m === 'kingcrystal' || m === 'scale';
const weaponOf = (style: Style, tier: number) => GEAR_ORDER.map((id) => GEAR[id]).find((g) => g.slot === 'weapon' && g.style === style && g.tier === tier);
const hunter = (g: Gear) => Object.keys(g.recipe ?? {}).every((m) => !gathered(m));

export interface SimResult { save: SaveState; events: Stamped[]; time: TimeLog; stuck?: string }

/** Plays the story with one class of weapon. */
export function simulate(style: Style, seed = 1, cal = CAL): SimResult {
  const r = rng(seed);
  const s = newState();
  const events: Stamped[] = [];
  const time: TimeLog = {};
  let clock = 0;
  let here: ZoneId = 'glade';
  const unlocked: ZoneId[] = [];

  const log = (e: Record<string, unknown>) => events.push({ at: 0, play: Math.round(clock), lv: s.lv, ...e } as Stamped);
  const spendTime = (secs: number, what: string, where: string = here) => {
    clock += secs;
    s.playtime = clock;
    const z = (time[where] ??= {});
    z[what] = (z[what] ?? 0) + secs;
  };
  const menus = (secs: number) => spendTime(secs, 'menus', 'village');
  const stats = () => playerStats(s);
  const myStyle = () => GEAR[s.equip.weapon]?.style ?? 'sword';

  /** Back to Sowerby's spring: full HP and potions. */
  const rest = () => {
    spendTime(cal.tripSec, 'walking');
    s.hp = stats().maxHp;
    s.potions = MAX_POTIONS;
  };

  /** One fight, played out with the kill model; the monsters hit back while they're standing. */
  function fight(z: ZoneId, foes: Foe[], opts: { boss?: boolean; ambush?: boolean } = {}): boolean {
    const p = stats(), st = myStyle(), h = s.mastery[st].lv;
    let t = 0, strikes = 0, taken = 0, dealt = 0, xp = 0, potions = 0;
    const hpStart = Math.round(s.hp);
    for (const f of foes) {
      const k = killModel(p, st, h, f.kind, f.lv);
      t += k.seconds + cal.approachSec;
      strikes += k.strikes;
      dealt += Math.round(k.perStrike * k.strikes);
      // Every foe still standing takes swings at you until it falls.
      const m = scaleMonster(MONSTERS[f.kind], f.lv, false);
      const hit = calcDamage(m.atk * levelEdge(f.lv, p.lv), p.def, MONSTERS[f.kind].boss ? 0.8 : 1, 0, () => 0.5).dmg;
      taken += (t / cal.monsterHitEverySec) * cal.hitChance * hit;
      xp += Math.round(m.xp * xpEdge(p.lv, f.lv));
    }
    // Potions when it gets dangerous (you can drink up to what you carry).
    let hp = s.hp - taken;
    while (hp < p.maxHp * 0.3 && s.potions > 0 && taken > 0) {
      hp += p.maxHp * POTION_HEAL;
      s.potions--;
      potions++;
    }
    const win = hp > 0;
    spendTime(t + cal.fightOverheadSec, 'fighting', z);
    const drops: Partial<Record<MatId, number>> = {};
    if (win) for (const f of foes) mergeDrops(drops, rollDrops(MONSTERS[f.kind], p.luck, false, r));
    log({
      kind: 'fight', zone: z, foes: foes.map((f) => `${f.kind}@${f.lv}`), boss: !!opts.boss, ambush: !!opts.ambush, result: win ? 'win' : 'lose',
      seconds: Math.round(t * 10) / 10, swings: strikes, hits: strikes, crits: Math.round(strikes * 0.08), skills: 0, dodges: Math.round(t / 4), potions,
      dealt, taken: Math.round(Math.min(taken, hpStart + potions * p.maxHp * POTION_HEAL)), hpStart, hpEnd: Math.max(0, Math.round(hp)), maxHp: p.maxHp,
      xp: win ? xp : 0, weapon: s.equip.weapon, armor: s.equip.armor, cooling: 0, rested: 0, handling: h, critDealt: Math.round(dealt * 0.08 * 0.6 / 1.05), kills: win ? foes.length : 0,
    });
    if (!win) {
      rest();
      return false;
    }
    s.hp = Math.max(1, hp);
    mergeDrops(s.mats, drops);
    const lvBefore = s.lv, hBefore = s.mastery[st].lv;
    gainXp(s, xp);
    gainMastery(s, st, xp);
    if (s.lv > lvBefore) log({ kind: 'level', track: 'combat', lv: s.lv });
    if (s.mastery[st].lv > hBefore) log({ kind: 'level', track: `handling:${st}`, lv: s.mastery[st].lv });
    if (s.hp < stats().maxHp * cal.restBelow) rest();
    return true;
  }

  /** Some of a zone's monsters, the way the grass throws them at you. */
  function rollFoes(z: ZoneId): Foe[] {
    const zz = zone(z), x = r();
    const n = Math.min(zz.maxEnemies, x < 0.5 ? 1 : x < 0.85 ? 2 : 3);
    const total = zz.monsters.reduce((a, m) => a + m.w, 0);
    return Array.from({ length: n }, () => {
      let y = r() * total;
      const m = zz.monsters.find((m) => (y -= m.w) < 0) ?? zz.monsters[0];
      return { kind: m.kind, lv: zz.lv[0] + Math.floor(r() * (zz.lv[1] - zz.lv[0] + 1)) };
    });
  }

  /** Time out in an area: the grass ambushes you now and then. */
  let ambushDue = cal.ambushEverySec;
  function outIn(z: ZoneId, secs: number, what: string) {
    spendTime(secs, what, z);
    ambushDue -= secs;
    while (ambushDue <= 0) {
      ambushDue += cal.ambushEverySec;
      fight(z, rollFoes(z), { ambush: true });
    }
  }

  const bestZone = (rates: Partial<Record<ZoneId, number>>) =>
    (Object.entries(rates) as [ZoneId, number][]).filter(([z]) => unlocked.includes(z)).sort((a, b) => b[1] - a[1])[0];

  /** Gets `n` more of a material: gathering it, or farming the monsters that drop it, wherever it comes fastest. */
  function get(mat: MatId, n: number): boolean {
    if (n <= 0) return true;
    const target = s.mats[mat] + n;
    if (gathered(mat)) {
      const node = Object.values(NODES).find((x) => x.mat === mat)!;
      if (!toolFor(node.skill, node.tier - 1)) return false;
      const tool = s.tools[node.skill];
      const best = bestZone(gatherPerSecond(mat));
      if (!best) return false;
      const rate = best[1] * (tool >= node.tier ? 1 : toolPower(tool, node.tier));
      trip(best[0]);
      const secs = n / rate;
      outIn(best[0], secs, 'gathering');
      s.mats[mat] += n;
      const perUnit = (node.grass.xp / node.grass.yield + node.safe.xp) / 2;
      const before = s.skills[node.skill].lv;
      gainSkillXp(s, node.skill, Math.round(perUnit * n));
      if (s.skills[node.skill].lv > before) log({ kind: 'level', track: node.skill, lv: s.skills[node.skill].lv });
      const kind = Object.entries(NODES).find(([, x]) => x.mat === mat)![0];
      for (let i = 0; i < Math.ceil(n / 1.5); i++) log({ kind: 'gather', node: kind, grass: i % 2 === 0, seconds: Math.round((secs / Math.ceil(n / 1.5)) * 10) / 10, strikes: 3, misses: 0, perfects: 2, tool, skillLv: s.skills[node.skill].lv, got: { [mat]: 1 } });
      return true;
    }
    // Farm the area whose monsters drop it best.
    const drops = AREAS.filter((z) => unlocked.includes(z.id) && z.monsters.some((m) => MONSTERS[m.kind].drops.some((d) => d.mat === mat)));
    if (!drops.length) return false;
    const z = drops[drops.length - 1].id;
    trip(z);
    for (let i = 0; i < 400 && s.mats[mat] < target; i++) {
      outIn(z, cal.searchSec, 'walking');
      fight(z, rollFoes(z));
    }
    return s.mats[mat] >= target;
  }

  /** Works your tools up to a tier: gathering what you can to level the skill, then crafting the next tool. */
  function toolFor(skill: 'wood' | 'mine', tier: number): boolean {
    for (let guard = 0; guard < 40 && s.tools[skill] < tier; guard++) {
      const next = TOOLS.find((t) => t.skill === skill && t.tier === s.tools[skill] + 1);
      if (!next) return false;
      if (s.skills[skill].lv < next.level) {
        // Gather the best node you can work to level up.
        const node = Object.values(NODES).filter((x) => x.skill === skill && x.tier <= s.tools[skill] + 1).sort((a, b) => b.tier - a.tier)[0];
        if (!node || !get(node.mat, 6)) return false;
        continue;
      }
      if (!acquire(next.recipe)) return false;
      spend(s, next.recipe);
      s.tools[skill] = next.tier;
      menus(cal.menuPerCraftSec);
      log({ kind: 'craft', id: next.id });
    }
    return s.tools[skill] >= tier;
  }

  function trip(z: ZoneId) {
    if (here === z) return;
    here = z;
    spendTime(cal.tripSec, 'walking', z);
  }

  /** Everything a recipe needs (planks as logs, sawn at Bram's mill). Trophies come from guardians, not farming. */
  function acquire(recipe: Recipe): boolean {
    const need: Partial<Record<MatId, number>> = {};
    for (const [m, n] of Object.entries(recipe) as [MatId, number][]) {
      if (m === 'plank') need.bark = (need.bark ?? 0) + n * LOGS_PER_PLANK;
      else need[m] = (need[m] ?? 0) + n;
    }
    for (const [m, n] of Object.entries(need) as [MatId, number][]) {
      if (s.mats[m] >= n) continue;
      if (trophy(m)) return false;
      if (!get(m, n - s.mats[m])) return false;
    }
    // Saw the planks.
    const planks = recipe.plank ?? 0;
    if (planks) {
      s.mats.bark -= planks * LOGS_PER_PLANK;
      s.mats.plank += planks;
    }
    return hasMats(s, recipe);
  }

  function buildTo(p: ProjectId, level: number) {
    while (s.build[p] < level) {
      const cost = PROJECTS[p].levels[s.build[p]].cost;
      if (!acquire(cost)) return false;
      spend(s, cost);
      s.build[p]++;
      menus(cal.menuPerCraftSec);
      log({ kind: 'build', id: p, lv: s.build[p] });
    }
    return true;
  }

  function craft(g: Gear): boolean {
    if (s.owned.includes(g.id)) return true;
    if (masteryShort(s, g)) return false;
    // Gatherer gear needs a gathering skill level: gather until you have it.
    for (let guard = 0; guard < 40 && missingSkill(s, g.needs); guard++) {
      const m = missingSkill(s, g.needs)!;
      const node = Object.values(NODES).filter((x) => x.skill === m.skill && x.tier <= s.tools[m.skill] + 1).sort((a, b) => b.tier - a.tier)[0];
      if (!node || !get(node.mat, 6)) return false;
    }
    if (missingSkill(s, g.needs)) return false;
    const forge = forgeLevelFor(g);
    // The Forge's middle levels (Iron Smithy, Crystal Kiln) are built when your gear needs them.
    if (s.build.forge < forge && (forge === 3 || forge === 4) && s.build.forge >= forge - 1) buildTo('forge', forge);
    if (s.build.forge < forge) return false;
    if (!acquire(g.recipe!)) return false;
    spend(s, g.recipe!);
    s.owned.push(g.id);
    equip(s, g.id);
    menus(cal.menuPerCraftSec);
    log({ kind: 'craft', id: g.id });
    return true;
  }

  /** Tools you can already make (your skill's there): craft them. */
  function tools() {
    for (const t of TOOLS) {
      if (s.tools[t.skill] !== t.tier - 1 || s.skills[t.skill].lv < t.level) continue;
      if (!acquire(t.recipe)) continue;
      spend(s, t.recipe);
      s.tools[t.skill] = t.tier;
      menus(cal.menuPerCraftSec);
      log({ kind: 'craft', id: t.id });
    }
  }

  /** The best weapon of your class, and armor of your track, for how far you've got. */
  function gearUp() {
    tools();
    const tier = unlocked.length;
    for (let t = tier; t >= 1; t--) {
      const w = weaponOf(style, t);
      if (w && ((GEAR[s.equip.weapon].tier ?? 0) >= t || craft(w))) break;
    }
    const w = GEAR[s.equip.weapon], mine = hunter(w);
    for (let t = tier; t >= 1; t--) {
      if ((GEAR[s.equip.armor]?.tier ?? 0) >= t) break;
      const options = Object.values(GEAR).filter((g) => g.slot === 'armor' && g.tier === t && g.recipe).sort((a, b) => Number(hunter(b) === mine) - Number(hunter(a) === mine));
      if (options.some((a) => craft(a))) break;
    }
  }

  /** Grinds in the newest area until you're ready for a guardian, then fights it (grinding more after a loss). */
  function guardian(kind: MonsterKind, lv: number, z: ZoneId) {
    log({ kind: 'reached', id: kind });
    for (let tries = 0; tries < 30; tries++) {
      const farm = unlocked[unlocked.length - 1];
      for (let i = 0; i < 300 && s.lv < lv - cal.readyMargin + tries; i++) {
        outIn(farm, cal.searchSec, 'walking');
        fight(farm, rollFoes(farm));
      }
      gearUp();
      if (s.hp < stats().maxHp) rest();
      trip(farm);
      // (Logged in the area you set out from, as the game does: the guardian stands at its gate.)
      void z;
      if (fight(farm, [{ kind, lv }], { boss: true })) return true;
    }
    return false;
  }

  const story = (list: [MonsterKind, number][][], z: ZoneId) => {
    trip(z);
    for (const foes of list) {
      const boss = foes.some(([k]) => MONSTERS[k].boss);
      while (!fight(z, foes.map(([kind, lv]) => ({ kind, lv })), { boss })) trip(z);
    }
  };

  // ---------------------------------------------------------------- the story

  // The prologue: the Twig, a slime and a Hopbun (gentle), then Sowerby.
  for (const [q, kind] of [['firstfight', 'slime'], ['dodge', 'bunny']] as const) {
    const m = scaleMonster(MONSTERS[kind], 1, false);
    spendTime(5, 'fighting', 'glade');
    log({
      kind: 'fight', zone: 'glade', foes: [`${kind}@1`], boss: false, ambush: false, result: 'win', seconds: 5, swings: 4, hits: 4, crits: 0, skills: 0,
      dodges: 0, potions: 0, dealt: m.hp, taken: 0, hpStart: s.hp, hpEnd: s.hp, maxHp: stats().maxHp, xp: m.xp, weapon: 'twig', armor: 'tunic',
      cooling: 0, rested: 0, handling: 1, critDealt: 0, kills: 1,
    });
    gainXp(s, m.xp);
    gainMastery(s, 'sword', m.xp);
    log({ kind: 'quest', id: q });
  }
  spendTime(40, 'walking', 'glade');
  s.flags.push('sword', 'glade1', 'glade2', 'village', 'oldtools');
  log({ kind: 'quest', id: 'village' });
  here = 'village';
  unlocked.push('meadow');

  for (const q of QUESTS.slice(QUESTS.findIndex((q) => q.id === 'meadow'))) {
    menus(cal.menuPerQuestSec);
    const g = q.goal;
    let ok = true;
    if (g.type === 'mend') {
      for (const t of TOOLS.filter((t) => t.tier === 1)) {
        ok &&= acquire(t.recipe);
        if (ok) {
          spend(s, t.recipe);
          s.tools[t.skill] = 1;
          log({ kind: 'craft', id: t.id });
        }
      }
    } else if (g.type === 'build') ok = buildTo(g.project, g.level);
    else if (g.type === 'craft') {
      ok = craft(weaponOf(style, 1)!);
    } else if (g.type === 'mats') ok = acquire(g.need);
    else if (g.type === 'boss') {
      // Side stories on the way: Poppy's in the meadow before the Slime King, Bram's in the Woods before the Alpha Woolf.
      if (cal.sideStories && g.kind === 'kingslime') story([[['bunny', 4], ['bunny', 4]], [['slime', 5], ['bunny', 4], ['slime', 4]], [['bigbun', 4]]], 'meadow');
      if (cal.sideStories && g.kind === 'alphawolf') story([[['wolf', 5], ['wolf', 5]], [['wolf', 6], ['wolf', 5], ['shroom', 5]], [['scarwolf', 6]], [['wolf', 5], ['shroom', 5]], [['wolf', 6], ['wolf', 5]]], 'woods');
      const gz = ZONES.find((z) => z.guardian?.kind === g.kind);
      ok = g.kind === 'dragon' ? guardian('dragon', 20, 'peak') : guardian(g.kind, gz!.guardian!.lv, gz!.id);
      if (ok) {
        s.bosses.push(g.kind);
        const next = gz?.id;
        if (next && !unlocked.includes(next)) unlocked.push(next);
      }
    }
    if (!ok) return { save: s, events, time, stuck: q.id };
    log({ kind: 'quest', id: q.id });
    s.quest++;
    gearUp();
    if (g.type === 'boss' && g.kind === 'dragon') break;
  }
  return { save: s, events, time };
}
