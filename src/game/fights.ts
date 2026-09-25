// Starting and finishing fights: field encounters, guardians and scripted prologue fights, rewards, the swoop in and
// out, and the in-battle coaching.
import { Battle, type BattleOutcome, type Foe } from '../battle/battle';
import { GEAR, MONSTERS, STYLE_NAMES, ZONES, zoneById, type MonsterKind, type Zone } from '../data';
import { usingKeyboard } from '../input';
import { recordKills } from '../quests';
import type { Roamer } from '../roamers';
import { gainMastery, gainXp, mergeDrops, playerStats, weightedPick } from '../rules';
import { logEvent } from '../stats';
import { has } from '../unlocks';
import { G, backToWorld, persist, showZoneBanner, syncWorld, transition } from './context';
import { cancelGather } from './gathering';
import { celebrate, leveledUp, lootLines, markLevels, type LevelMark } from './rewards';
import { progressQuests } from './story';

/** HP when the current fight began, for the play report. */
let fightHp = 0;
/** The story flag a scripted fight sets when won (the prologue's blocking monsters). */
let battleFlag: string | undefined;

/** Regular fights let you run; guardians and scripted fights don't. */
export const canRun = (b: Battle) => !b.setup.boss && !battleFlag && G.save.flags.includes('village');

/** A random set of monsters from a zone (for ambushes in the grass). */
function rollFoes(z: Zone): Foe[] {
  const r = Math.random();
  const n = Math.min(z.maxEnemies, r < 0.5 ? 1 : r < 0.85 ? 2 : 3);
  return Array.from({ length: n }, () => ({
    kind: weightedPick(z.monsters).kind,
    lv: z.lv[0] + Math.floor(Math.random() * (z.lv[1] - z.lv[0] + 1)),
    golden: Math.random() < 0.04,
  }));
}

function begin(zone: Zone, foes: Foe[], boss: boolean, ambush = false) {
  G.battle = new Battle({ zone, foes, boss, ambush }, G.save, G.input, G.audio, onBattleEnd);
  G.mode = 'battle';
  G.ui.setMode('battle');
  G.input.reset();
  coachStep = 0;
  if (foes.some((f) => f.golden)) G.ui.toast('✨ A golden monster! Double loot!');
}

/**
 * Regular fights: the monster you bumped into (plus any friends hiding with it), or a random ambush from the grass.
 * No wipe or countdown: the camera swoops in on you, whites out, and the arena swoops in from there.
 */
export function startFieldBattle(r: Roamer | null, ambush: boolean) {
  const zone = r ? zoneById(r.zone) : G.over.currentZone;
  const foes: Foe[] = r
    ? [{ kind: r.kind, lv: r.lv, golden: r.golden }, ...rollFoes(zone).slice(0, r.extra).map((f) => ({ ...f, golden: false }))]
    : rollFoes(zone);
  if (r) G.over.roamers.remove(r);
  cancelGather();
  G.audio.play(ambush ? 'crit' : 'encounter');
  battleFlag = undefined;
  fightHp = Math.round(G.save.hp);
  G.mode = 'dialog';
  G.input.reset();
  G.swoop = { t: 0, dur: 0.25, dir: 'in', then: () => begin(zone, foes, false, ambush) };
}

/** Guardians, the dragon and scripted fights: an iris transition and a "Boss battle!" beat. */
export function startBattle(zone: Zone, foes: Foe[], boss: boolean, flag?: string) {
  fightHp = Math.round(G.save.hp);
  G.audio.play('encounter');
  G.mode = 'dialog';
  battleFlag = flag;
  transition(() => begin(zone, foes, boss), 0.9);
}

/** Prologue monsters block the forest path; walking into one starts a scripted fight. */
export function challengeFoe(o: { flag?: string; monster?: MonsterKind }) {
  if (!G.save.flags.includes('sword')) {
    G.ui.toast('😰 You need something to fight with! Something was glinting back in the clearing…');
    return;
  }
  startBattle(zoneById('glade'), [{ kind: o.monster!, lv: 1, golden: false, gentle: true }], false, o.flag);
}

/** Every fight goes in the play report, win, lose or run. */
function logFight(o: BattleOutcome, b: Battle) {
  const s = G.save;
  logEvent(s, {
    kind: 'fight', zone: b.setup.zone.id, foes: b.setup.foes.map((f) => `${f.kind}@${f.lv}${f.golden ? '*' : ''}`), boss: b.setup.boss, ambush: !!b.setup.ambush,
    result: o.result, seconds: Math.round(o.log.time * 10) / 10, swings: o.log.swings, hits: o.log.hits, crits: o.log.crits, skills: o.log.skills,
    dodges: o.log.dodges, potions: o.log.potions, dealt: o.log.dealt, taken: o.log.taken, hpStart: fightHp, hpEnd: Math.max(0, Math.round(o.hp)),
    maxHp: b.stats.maxHp, xp: o.xp, weapon: s.equip.weapon, armor: s.equip.armor,
    emptied: o.log.emptied, starved: Math.round(o.log.starved * 10) / 10, rested: Math.round(o.log.rested * 10) / 10,
    ...(o.result === 'lose' ? { killedBy: o.log.lastHitBy } : {}),
  });
}

/** Rewards for a win: XP (combat and weapon handling), loot, kills toward the story. */
function grantWin(o: BattleOutcome, b: Battle): LevelMark {
  const s = G.save;
  const mark = markLevels(GEAR[s.equip.weapon]?.style ?? 'sword');
  s.hp = o.hp;
  s.wins++;
  gainXp(s, o.xp);
  mergeDrops(s.mats, o.drops);
  gainMastery(s, mark.style, o.xp);
  if (!b.setup.boss) recordKills(s, b.setup.zone.id, o.defeated.length);
  return mark;
}

async function onBattleEnd(o: BattleOutcome) {
  const b = G.battle!, s = G.save;
  const boss = b.setup.boss;
  G.mode = 'dialog';
  logFight(o, b);
  // Regular fights swoop straight back out to the map; guardians, the dragon and the prologue keep their fanfare.
  const quick = !boss && !battleFlag;
  if (o.result === 'run') {
    s.hp = o.hp;
    if (quick) swoopOut();
    else transition(() => backToWorld());
    return;
  }
  if (o.result === 'win' && quick) {
    const mark = grantWin(o, b);
    swoopOut();
    G.ui.loot(lootLines(o.drops, [{ n: o.xp }, { n: o.xp, what: STYLE_NAMES[mark.style], emo: '⚔️' }]));
    persist();
    if (leveledUp(mark)) {
      await new Promise((r) => setTimeout(r, 380));
      G.mode = 'dialog';
      await celebrate(mark);
      G.mode = 'world';
      G.input.reset();
    }
    void progressQuests();
    return;
  }
  if (o.result === 'win') {
    const mark = grantWin(o, b);
    if (battleFlag && !s.flags.includes(battleFlag)) {
      s.flags.push(battleFlag);
      syncWorld();
    }
    const bossKind = b.setup.foes[0]?.kind;
    const firstClear = boss && bossKind && !s.bosses.includes(bossKind);
    if (boss && bossKind === 'dragon') s.bossWins++;
    const gz = ZONES.find((z) => z.guardian?.kind === bossKind);
    if (firstClear) {
      s.bosses.push(bossKind);
      // Beating a guardian opens its road and lights the campfire checkpoint beyond it.
      if (gz && !s.camps.includes(gz.id)) {
        s.camps.push(gz.id);
        s.respawn = gz.id;
      }
      syncWorld();
    }
    persist();
    await G.ui.result({ win: true, xp: o.xp, levels: s.lv - mark.fromLv, newLv: s.lv, drops: o.drops, boss });
    await celebrate(mark);
    if (firstClear && gz) await G.ui.roadOpened(MONSTERS[bossKind].name, gz.name, bossKind);
    transition(() => {
      backToWorld();
      void progressQuests();
    });
  } else {
    await G.ui.result({ win: false, xp: 0, levels: 0, newLv: s.lv, drops: {}, boss, respawn: s.respawn });
    transition(() => {
      s.hp = playerStats(s).maxHp;
      const p = s.respawn === 'village' || s.respawn === 'glade' ? G.world.entryPoint(s.respawn) : G.world.campPoint(s.respawn);
      G.over.teleport(p.x, p.y);
      backToWorld();
      showZoneBanner(G.over.currentZone);
    });
  }
}

/** Back to the map from a regular fight: it zooms out from close on you as the white fades. */
function swoopOut() {
  backToWorld();
  G.swoop = { t: 0, dur: 0.3, dir: 'out' };
}

// ------------------------------------------------------------------ coaching

let coachStep = 0;

/** "Tap ⚔️" on touch screens, "Press J" with a keyboard. */
const press = (key: string, emoji: string) => (usingKeyboard() ? `Press ${key}` : `Tap ${emoji}`);

/** Gentle in-battle tutorial: attack first, then dodge, later skills and potions. */
export function coachBattle(b: Battle) {
  const s = G.save, ui = G.ui;
  if (b.intro > 0) return ui.coach(null);
  if (s.wins === 0) {
    if (coachStep === 0) {
      if (b.hits > 0) coachStep = 1;
      return ui.coach(`Walk toward it, then ${press('J', '⚔️')}: you swing the way you're facing.`, 'btn-attack');
    }
    return ui.coach(null);
  }
  if (s.wins === 1) {
    // The Hopbun fight: its charge is the perfect thing to dodge.
    if (coachStep === 0) {
      if (b.dodgeFrac > 0) { coachStep = 1; return ui.coach(null); }
      const winding = b.enemies.some((e) => !e.dead && e.windup > 0.2);
      return ui.coach(winding ? `It's winding up! ${press('K', '💨')} NOW!` : `Hopbuns wiggle, then charge. ${press('K', '💨')} to dodge through them!`, 'btn-dodge');
    }
    return ui.coach(null);
  }
  if (has(s, 'skill') && !s.tips.includes('coach-skill')) {
    if (b.skillFrac > 0.5) s.tips.push('coach-skill');
    return ui.coach(`New! ${press('L', '✨')} for your weapon skill.`, 'btn-skill');
  }
  if (has(s, 'bag') && s.potions > 0 && b.p.hp < b.stats.maxHp * 0.4 && !s.tips.includes('coach-potion')) {
    if (b.p.potionCd > 0) s.tips.push('coach-potion');
    return ui.coach(`Low HP! ${press('H', '🧪')} to drink a potion.`, 'btn-potion');
  }
  ui.coach(null);
}
