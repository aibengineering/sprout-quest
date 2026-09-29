// Starting and finishing fights: field encounters, guardians and scripted prologue fights, rewards, the swoop in and
// out, and the in-battle coaching.
import { Battle, type BattleOutcome, type BattleSetup, type Foe } from '../battle/battle';
import { GEAR, MONSTERS, STYLE_NAMES, ZONES, zoneById, type Zone } from '../data';
import { usingKeyboard } from '../input';
import { recordKills } from '../quests';
import type { Roamer } from '../roamers';
import { gainMastery, gainXp, mergeDrops, playerStats, weightedPick } from '../rules';
import { afterWin, xpBoost } from '../kitchen';
import { logEvent } from '../stats';
import { has } from '../unlocks';
import type { WorldObj } from '../world';
import { G, backToWorld, persist, syncWorld, transition } from './context';
import { cancelGather } from './gathering';
import { celebrate, handlingGain, leveledUp, lootLines, markLevels, type LevelMark } from './rewards';
import { progressQuests } from './story';
import { storyFightExtras } from './stories';
import { faint } from './death';
import { floorSupplies, towerEnd } from './tower';

/** HP when the current fight began, for the play report. */
let fightHp = 0;
/** The story flag a scripted fight sets when won (the prologue's blocking monsters). */
let battleFlag: string | undefined;

/** Regular fights let you run; guardians and scripted fights don't. Battle Tower fights always let you back to the camp. */
export const canRun = (b: Battle) => !!b.setup.tower || (!b.setup.boss && !battleFlag && G.save.flags.includes('village'));

/** A random set of monsters from a zone: `n` of them, or 1–3 (for ambushes in the grass). */
function rollFoes(z: Zone, n?: number): Foe[] {
  const r = Math.random();
  n ??= Math.min(z.maxEnemies, r < 0.5 ? 1 : r < 0.85 ? 2 : 3);
  return Array.from({ length: n }, () => ({
    kind: weightedPick(z.monsters).kind,
    lv: z.lv[0] + Math.floor(Math.random() * (z.lv[1] - z.lv[0] + 1)),
    golden: Math.random() < 0.04,
  }));
}

function begin(zone: Zone, foes: Foe[], boss: boolean, ambush = false, extra: Partial<BattleSetup> = {}) {
  G.battle = new Battle({ zone, foes, boss, ambush, ...extra }, G.save, G.input, G.audio, onBattleEnd);
  // Regular and story fights: loot, the XP fill and any level-ups come the moment the last foe falls, then the swoop
  // out. (Guardians keep their fanfare, and the Battle Tower's fights end on a result screen before the next floor.)
  if (!boss && !extra.tower) G.battle.onWin = quickWin;
  G.mode = 'battle';
  G.ui.setMode('battle');
  G.input.reset();
  coachStep = 0;
  lesson = { step: 0, at: 0, count: 0 };
  if (foes.some((f) => f.golden)) G.ui.toast('✨ A golden monster! Double loot!');
}

/**
 * Regular fights: the monster you bumped into (plus any friends hiding with it), or a random ambush from the grass.
 * No wipe or countdown: the camera swoops in on you, whites out, and the arena swoops in from there.
 */
export function startFieldBattle(r: Roamer | null, ambush: boolean) {
  const zone = r ? zoneById(r.zone) : G.over.currentZone;
  const foes: Foe[] = r
    // A roaming group brings exactly the friends its "×N" promised.
    ? [{ kind: r.kind, lv: r.lv, golden: r.golden }, ...rollFoes(zone, r.extra).map((f) => ({ ...f, golden: false }))]
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
export function startBattle(zone: Zone, foes: Foe[], boss: boolean, flag?: string, extra?: Partial<BattleSetup>) {
  fightHp = Math.round(G.save.hp);
  G.audio.play('encounter');
  G.mode = 'dialog';
  battleFlag = flag;
  transition(() => begin(zone, foes, boss, false, extra), 0.9);
}

/**
 * Monsters blocking the way: walking into them starts a scripted fight that sets their flag when won. The prologue's
 * pair are gentle level-1 foes; a story's group brings its own lineup.
 */
export function challengeFoe(o: WorldObj) {
  if (!G.save.flags.includes('sword')) {
    G.ui.toast('😰 You need something to fight with! Something was glinting back in the clearing…');
    return;
  }
  if (o.foes) {
    startBattle(zoneById(o.zone ?? G.over.currentZone.id), o.foes.map((f) => ({ ...f, golden: false })), !!o.boss, o.flag, storyFightExtras(o));
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
    cooling: Math.round(o.log.cooling * 10) / 10, rested: Math.round(o.log.rested * 10) / 10, handling: b.handling,
    critDealt: o.log.critDealt, kills: o.defeated.length, ...(b.setup.tower ? { tower: b.setup.tower } : {}),
    ...(o.result === 'lose' ? { killedBy: o.log.lastHitBy } : {}),
  });
}

/** Rewards for a win: XP (combat and weapon handling), loot, kills toward the story. */
function grantWin(o: BattleOutcome, b: Battle): LevelMark {
  const s = G.save;
  const mark = markLevels(GEAR[s.equip.weapon]?.style ?? 'sword');
  s.hp = o.hp;
  s.wins++;
  // Granny's cooking: Fluff Pancakes add XP, Clover Tea heals a little after the win.
  o.xp = Math.round(o.xp * xpBoost(s) * G.xpRate);
  const healed = afterWin(s, playerStats(s).maxHp);
  if (healed > 0) G.ui.toast(`🍵 Clover Tea: +${healed} HP`);
  gainXp(s, o.xp);
  mergeDrops(s.mats, o.drops);
  gainMastery(s, mark.style, o.xp);
  if (!b.setup.boss && !b.setup.tower) recordKills(s, b.setup.zone.id, o.defeated.length);
  return mark;
}

/** A regular win, while "Victory!" is up: loot, the XP bar filling, and any level-up screens. */
async function quickWin(o: BattleOutcome) {
  const b = G.battle!, s = G.save;
  G.mode = 'dialog';
  logFight(o, b);
  const mark = grantWin(o, b);
  // A story fight (the prologue's, a pack in a side story) clears its way.
  if (battleFlag && !s.flags.includes(battleFlag)) {
    s.flags.push(battleFlag);
    syncWorld();
  }
  G.ui.loot(lootLines(o.drops, [{ n: o.xp, what: STYLE_NAMES[mark.style], emo: '⚔️' }]));
  persist();
  await G.ui.xpGain({ lv: mark.fromLv, xp: mark.fromXp }, { lv: s.lv, xp: s.xp }, o.xp, handlingGain(mark));
  if (leveledUp(mark)) await celebrate(mark);
}

async function onBattleEnd(o: BattleOutcome) {
  const b = G.battle!, s = G.save;
  const boss = b.setup.boss;
  // Regular and story fights swoop straight back out to the map; guardians and the dragon keep their fanfare.
  const quick = !boss && !b.setup.tower;
  if (o.result === 'win' && quick) {
    // quickWin has handed out the rewards already.
    swoopOut();
    G.input.reset();
    void progressQuests();
    return;
  }
  G.mode = 'dialog';
  logFight(o, b);
  if (b.setup.tower) return towerFight(o, b);
  if (o.result === 'run') {
    s.hp = o.hp;
    if (quick) swoopOut();
    else transition(() => backToWorld());
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
      // Beating a guardian opens its road; the old campfire past the gate is yours to light (interact.ts).
      syncWorld();
    }
    persist();
    await G.ui.result({ win: true, xp: o.xp, levels: s.lv - mark.fromLv, newLv: s.lv, drops: o.drops, boss });
    await G.ui.xpGain({ lv: mark.fromLv, xp: mark.fromXp }, { lv: s.lv, xp: s.xp }, o.xp, handlingGain(mark));
    await celebrate(mark);
    if (firstClear && gz) await G.ui.roadOpened(MONSTERS[bossKind].name, gz.name, bossKind);
    transition(() => {
      backToWorld();
      void progressQuests();
    });
  } else {
    // You wake as a spirit at your last checkpoint, and walk back to your body (death.ts).
    faint();
  }
}

/** A Battle Tower fight: its rewards and result screens, but no story (no guardian beaten, no road opened). */
async function towerFight(o: BattleOutcome, b: Battle) {
  const s = G.save;
  if (o.result === 'win') {
    // There's nothing to gather in the tower, so each floor hands over some of its tier's wood, stone and ore.
    mergeDrops(o.drops, floorSupplies(b.setup.tower!));
    const mark = grantWin(o, b);
    persist();
    await G.ui.result({ win: true, xp: o.xp, levels: s.lv - mark.fromLv, newLv: s.lv, drops: o.drops, boss: b.setup.boss });
    await G.ui.xpGain({ lv: mark.fromLv, xp: mark.fromXp }, { lv: s.lv, xp: s.xp }, o.xp, handlingGain(mark));
    await celebrate(mark);
  } else if (o.result === 'lose') {
    await G.ui.result({ win: false, xp: 0, levels: 0, newLv: s.lv, drops: {}, boss: b.setup.boss, tower: true });
  }
  await towerEnd(o, b.setup.tower!);
}

/** Back to the map from a regular fight: it zooms out from close on you as the white fades. */
function swoopOut() {
  backToWorld();
  G.swoop = { t: 0, dur: 0.3, dir: 'out' };
}

// ------------------------------------------------------------------ coaching

let coachStep = 0;

/** Where the current lesson has got to, and when that step began (reset with each fight). */
let lesson = { step: 0, at: 0, count: 0 };

/**
 * The first fight after a move unlocks teaches it, once: when the moment's right, the fight stops, the coach says what
 * to press, and it carries on when you do. Then it watches for the move landing; if it didn't (a dodge that missed
 * the attack, say), it waits for the next chance. Specials first, then each class's ability. Returns whether a lesson
 * is running (so no other tip shows).
 */
function teach(b: Battle): boolean {
  const s = G.save, ui = G.ui, style = b.weapon.style ?? 'sword';
  const done = (tip: string) => {
    s.tips.push(tip);
    lesson = { step: 0, at: 0, count: 0 };
    ui.coach(null);
    return false;
  };
  const near = (lo: number, hi: number, winding: boolean) =>
    b.enemies.some((e) => !e.dead && (!winding || e.windup > 0.3) && Math.hypot(e.x - b.p.x, e.y - b.p.y) - e.r >= lo && Math.hypot(e.x - b.p.x, e.y - b.p.y) - e.r <= hi);
  // Stop the fight and say what to press; `step` moves on once it's pressed.
  const pause = (what: 'attack' | 'dodge' | 'skill', text: string, button: string) => {
    if (lesson.step % 2 === 0) {
      b.lesson = what;
      lesson.step++;
    }
    if (b.lesson) {
      ui.coach(text, button);
      return true;
    }
    lesson.step++;
    lesson.at = b.t;
    ui.coach(null);
    return true;
  };

  // The weapon's special, the first fight after it unlocks.
  const skillTip = `teach:skill:${style}`;
  if (b.skillNow && !s.tips.includes(skillTip)) {
    if (lesson.step === 0 && (b.t < 0.8 || b.skillFrac > 0)) return false;
    if (lesson.step <= 1) return pause('skill', `New! ${press('L', '✨')} for ${b.skillNow.name}: ${b.skillNow.note.charAt(0).toLowerCase()}${b.skillNow.note.slice(1)}.`, 'btn-skill');
    return done(skillTip);
  }

  const trick = b.trick;
  if (!trick || s.tips.includes(`teach:${trick}`)) return false;
  const tip = `teach:${trick}`;
  switch (trick) {
    case 'riposte':
      // Dodge through an attack, then strike while the Riposte is ready.
      if (lesson.step === 0 && !near(0, 150, true)) return false;
      if (lesson.step <= 1) return pause('dodge', `It's about to attack! ${press('K', '💨')} to dodge right through it.`, 'btn-dodge');
      if (lesson.step === 2) {
        if (b.p.riposte > 0 && b.canStrike) return pause('attack', `Riposte ready! ${press('J', '⚔️')} now for a sure critical hit.`, 'btn-attack');
        if (b.t - lesson.at > 1.2) lesson.step = 0;
        return false;
      }
      if (lesson.step === 3) return pause('attack', `Riposte ready! ${press('J', '⚔️')} now for a sure critical hit.`, 'btn-attack');
      if (b.ripostes > 0) return done(tip);
      if (b.t - lesson.at > 1.5) lesson.step = 0;
      return false;
    case 'stagger':
    case 'snare': {
      // Stagger: slam a monster as it winds up. Snare: crack one at the tip of your reach.
      const ready = trick === 'stagger' ? near(0, 95, true) : near(80, 125, false);
      const count = trick === 'stagger' ? b.staggers : b.snares;
      if (lesson.step === 0) {
        if (!ready || !b.canStrike) return false;
        lesson.count = count;
      }
      if (lesson.step <= 1) {
        return pause('attack', trick === 'stagger'
          ? `It's winding up! ${press('J', '⚔️')}: slam it now to Stagger it out of its attack.`
          : `It's right at the tip of your whip. ${press('J', '⚔️')}: a crack at the tip Snares it in.`, 'btn-attack');
      }
      if (count > lesson.count) return done(tip);
      if (b.t - lesson.at > 1.5) lesson.step = 0;
      return false;
    }
    case 'blink':
      if (lesson.step === 0 && !near(0, 150, true)) return false;
      if (lesson.step <= 1) return pause('dodge', `Incoming! ${press('K', '💨')}: Magic's dodge is a Blink, a short teleport.`, 'btn-dodge');
      return done(tip);
  }
  return false;
}

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
  if (teach(b)) return;
  if (has(s, 'bag') && s.potions > 0 && b.p.hp < b.stats.maxHp * 0.4 && !s.tips.includes('coach-potion')) {
    if (b.p.potionCd > 0) s.tips.push('coach-potion');
    return ui.coach(`Low HP! ${press('H', '🧪')} to drink a potion.`, 'btn-potion');
  }
  ui.coach(null);
}
