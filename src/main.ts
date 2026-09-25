// Entry point: owns the game loop, mode switching and glue between world, battles and UI.
import { loadAssets, preloadIcons } from './assets';
import { Audio } from './audio';
import { Battle, type BattleOutcome, type Foe } from './battle';
import { GEAR, GEAR_ORDER, MATS, MAX_POTIONS, MONSTERS, NODES, POTION_HEAL, PROJECTS, QUESTS, SKILL_NAMES, SKILL_VERB, TOOLS, ZONES, forgeLevelFor, zoneById, type MatId, type MonsterKind, type NodeKind, type Recipe, type Zone, type ZoneId } from './data';
import { Chop, GatherView, type Look } from './gather';
import type { Roamer } from './roamers';
import { Input, trackInputDevice, usingKeyboard } from './input';
import { Overworld } from './overworld';
import { advanceQuests, currentQuest, recordKills } from './quests';
import { checkUnlocks, has } from './unlocks';
import { build, canGather, craftGear, craftPotion, craftTool, equip, gainXp, harvest, hasMats, mergeDrops, missingSkill, playerStats, potionRefill, sweetWidth, toolPower, weightedPick } from './rules';
import { clearState, loadState, newState, saveState, type SaveState } from './state';
import { UI, allIconIds } from './ui';
import { World, type WorldObj } from './world';

const canvas = document.getElementById('cv') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let vw = 0, vh = 0;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  vw = window.innerWidth;
  vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

trackInputDevice();
const audio = new Audio();
const input = new Input(document.getElementById('touch')!, document.getElementById('joy')!, document.getElementById('joy-knob')!);
const world = new World();
let save: SaveState = loadState() ?? newState();
let over = new Overworld(world, save);
let battle: Battle | null = null;

type Mode = 'title' | 'world' | 'battle' | 'dialog' | 'gather';
let mode: Mode = 'title';

/** Iris transition: closes to black, runs `mid`, then opens. */
let trans: { t: number; dur: number; mid: () => void; fired: boolean } | null = null;
function transition(mid: () => void, dur = 0.7) {
  trans = { t: 0, dur, mid, fired: false };
}

const ui = new UI({
  save: () => save,
  async craftGear(id) {
    const g = GEAR[id];
    const current = g.slot === 'charm' ? (save.equip.charm ? GEAR[save.equip.charm] : null) : GEAR[save.equip[g.slot]];
    if (craftGear(save, id) !== 'ok') return;
    audio.play('craft');
    persist();
    const choice = await ui.newGear(g, current);
    if (choice === 'equip' && equip(save, id)) audio.play('levelup');
    persist();
    const advanced = await progressQuests();
    if (!advanced) ui.openMenu(menuCtx(true), 'forge');
  },
  build(id) {
    if (build(save, id) === 'ok') {
      audio.play('levelup');
      const lvl = PROJECTS[id].levels[save.build[id] - 1];
      ui.toast(`🏗 Built the ${lvl.name}! ${lvl.perk}`, 3200);
      // Upgrades that raise max HP also top you up.
      save.hp = Math.min(playerStats(save).maxHp, save.hp + 10);
      persist();
      syncWorld();
      void progressQuests();
    }
  },
  async craftTool(id) {
    if (craftTool(save, id) !== 'ok') return;
    const t = TOOLS.find((t) => t.id === id)!;
    audio.play('craft');
    persist();
    ui.closeMenu(true);
    mode = 'dialog';
    await ui.itemFound(t.id, t.name, `${t.desc} Walk up to a tree with a ribbon on it and chop!`, t.icon, 'You crafted');
    mode = 'world';
    input.reset();
  },
  craftPotion(id) {
    if (craftPotion(save, id) === 'ok') {
      audio.play('craft');
      persist();
    }
  },
  equip(id) {
    if (equip(save, id)) {
      audio.play('ui');
      persist();
    }
  },
  drink() {
    const st = playerStats(save);
    if (save.potions <= 0 || save.hp >= st.maxHp) return;
    save.potions--;
    save.hp = Math.min(st.maxHp, save.hp + Math.round(st.maxHp * POTION_HEAL));
    audio.play('heal');
    persist();
  },
  travel(id) {
    ui.closeMenu();
    transition(() => {
      const p = id === 'village' ? world.entryPoint(id) : zoneById(id).guardian ? world.campPoint(id) : world.entryPoint(id);
      over.teleport(p.x, p.y);
      persist();
      showZoneBanner(over.currentZone);
    });
  },
  warpHome() {
    ui.closeMenu();
    transition(() => {
      const p = world.entryPoint('village');
      over.teleport(p.x, p.y);
      persist();
      showZoneBanner(over.currentZone);
    });
  },
  toggleMute() {
    save.muted = !save.muted;
    audio.muted = save.muted;
    persist();
  },
  async resetSave() {
    mode = 'dialog';
    const r = await ui.dialog('<div class="big" style="font-size:24px">Start over?</div><p>All progress will be lost.</p>', [
      ['no', 'Keep playing'],
      ['yes', 'Reset', 'alt'],
    ]);
    if (r === 'yes') {
      clearState();
      save = newState();
      over = new Overworld(world, save);
      ui.setMode('title');
      mode = 'title';
      document.getElementById('btn-continue')!.hidden = true;
    } else mode = 'world';
  },
  menuClosed() {
    if (mode === 'dialog') mode = 'world';
    input.flush();
  },
});

/** Opens gates whose guardians are beaten, lights campfires and reveals building plots as they unlock. */
function syncWorld() {
  for (const o of world.objs) {
    const z = o.zone ? zoneById(o.zone) : null;
    if (o.kind === 'gate' && z?.guardian) o.hidden = save.bosses.includes(z.guardian.kind);
    if (o.kind === 'camp') o.hidden = !save.camps.includes(o.zone!);
    if (o.kind === 'plot') {
      if (o.project === 'garden' || o.project === 'training') o.hidden = !has(save, 'plots');
      if (o.project === 'warp') o.hidden = !has(save, 'warpplot');
      if (o.project === 'home') o.label = has(save, 'village') ? 'Build' : 'Rest';
    }
    if (o.kind === 'forge') o.label = save.build.forge === 0 ? (has(save, 'village') ? 'Repair' : 'Look') : has(save, 'forge') ? 'Forge' : 'Look';
    if (o.kind === 'pickup' || o.kind === 'foe') o.hidden = save.flags.includes(o.flag!);
  }
}

/** Reveals newly earned systems with a small card (or silently when catching up an old save). */
function unlocks(silent = false) {
  const fresh = checkUnlocks(save);
  if (silent) save.fresh = [];
  else for (const u of fresh) ui.unlockCard(u);
  if (fresh.length) {
    syncWorld();
    persist();
  }
}

let questBusy = false;
/** Completes finished story steps one by one with a little celebration, then introduces the next. */
async function progressQuests(): Promise<boolean> {
  if (questBusy) return false;
  questBusy = true;
  try {
    const done = advanceQuests(save);
    if (!done.length) {
      unlocks();
      return false;
    }
    persist();
    const prev = mode;
    mode = 'dialog';
    ui.closeMenu(true);
    for (const q of done) {
      if (q.quiet) continue;
      audio.play('victory');
      await ui.questComplete(q);
    }
    const next = currentQuest(save);
    if (next) {
      if (!save.tips.includes(`elder:${next.id}`)) save.tips.push(`elder:${next.id}`);
      if (next.chapter === 'Prologue') await ui.caption(next.text, 'narrator');
      else await ui.questIntro(next);
    } else {
      await ui.message('🌟 The End… for now!', 'Every chapter is complete. Sprout Village is safe, and you are its hero! Keep exploring, crafting and rematching bosses.');
    }
    persist();
    mode = prev === 'battle' ? 'world' : prev === 'dialog' ? 'world' : prev;
    input.reset();
    unlocks();
    return true;
  } finally {
    questBusy = false;
  }
}

function persist() {
  save.pos = { x: over.x, y: over.y };
  saveState(save);
}

function showZoneBanner(z: Zone) {
  const sub = z.id === 'village' ? 'Safe · Home of Elder Bloom' : z.id === 'glade' ? 'A peaceful clearing' : `Monsters Lv ${z.lv[0]}–${z.lv[1]}${save.lv < z.rec ? ' · ⚠️ Dangerous!' : ''}`;
  ui.banner(z.name, sub);
  if (!save.visited.includes(z.id)) {
    save.visited.push(z.id);
    persist();
  }
}

function tip(id: string, text: string) {
  if (save.tips.includes(id)) return;
  save.tips.push(id);
  ui.toast(text, 4200);
  persist();
}

// ------------------------------------------------------------------ battles

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

/**
 * Regular fights: the monster you bumped into (plus any friends hiding with it), or a random ambush from the grass.
 * No wipe or countdown: the camera swoops in on you, whites out, and the arena swoops in from there.
 */
function startFieldBattle(r: Roamer | null, ambush: boolean) {
  const zone = r ? zoneById(r.zone) : over.currentZone;
  const foes: Foe[] = r
    ? [{ kind: r.kind, lv: r.lv, golden: r.golden }, ...rollFoes(zone).slice(0, r.extra).map((f) => ({ ...f, golden: false }))]
    : rollFoes(zone);
  if (r) over.roamers.remove(r);
  if (chop) {
    chop = null;
    over.chopping = null;
  }
  audio.play(ambush ? 'crit' : 'encounter');
  battleFlag = undefined;
  mode = 'dialog';
  input.reset();
  swoop = {
    t: 0, dur: 0.25, dir: 'in',
    then: () => {
      battle = new Battle({ zone, foes, boss: false, ambush }, save, input, audio, onBattleEnd);
      mode = 'battle';
      ui.setMode('battle');
      input.reset();
      coachStep = 0;
      if (foes.some((f) => f.golden)) ui.toast('✨ A golden monster! Double loot!');
    },
  };
}

/** The overworld half of the zoom into and out of regular fights. */
let swoop: { t: number; dur: number; dir: 'in' | 'out'; then?: () => void } | null = null;

function startBattle(zone: Zone, foes: Foe[], boss: boolean, flag?: string) {
  audio.play('encounter');
  mode = 'dialog';
  battleFlag = flag;
  transition(() => {
    battle = new Battle({ zone, foes, boss }, save, input, audio, onBattleEnd);
    mode = 'battle';
    ui.setMode('battle');
    input.reset();
    coachStep = 0;
    if (foes.some((f) => f.golden)) ui.toast('✨ A golden monster! Double loot!');
  }, 0.9);
}

async function onBattleEnd(o: BattleOutcome) {
  const b = battle!;
  const boss = b.setup.boss;
  mode = 'dialog';
  // Regular fights swoop straight back out to the map; guardians, the dragon and the prologue keep their fanfare.
  const quick = !boss && !battleFlag;
  if (o.result === 'run') {
    save.hp = o.hp;
    if (quick) swoopOut();
    else transition(() => backToWorld());
    return;
  }
  if (o.result === 'win' && quick) {
    save.hp = o.hp;
    save.wins++;
    const levels = gainXp(save, o.xp);
    mergeDrops(save.mats, o.drops);
    recordKills(save, b.setup.zone.id, o.defeated.length);
    swoopOut();
    const loot = Object.entries(o.drops).map(([m, n]) => `${MATS[m as MatId].icon}×${n}`).join(' ');
    ui.toast(`Victory! +${o.xp} XP${loot ? `  ${loot}` : ''}`, 2400);
    if (levels) {
      audio.play('levelup');
      ui.banner(`Level ${save.lv}!`, 'Stronger, and fully healed');
    }
    void progressQuests();
    return;
  }
  if (o.result === 'win') {
    save.hp = o.hp;
    save.wins++;
    if (battleFlag && !save.flags.includes(battleFlag)) {
      save.flags.push(battleFlag);
      syncWorld();
    }
    const levels = gainXp(save, o.xp);
    mergeDrops(save.mats, o.drops);
    if (!boss) recordKills(save, b.setup.zone.id, o.defeated.length);
    const bossKind = b.setup.foes[0]?.kind;
    const firstClear = boss && bossKind && !save.bosses.includes(bossKind);
    if (boss && bossKind === 'dragon') save.bossWins++;
    if (firstClear) {
      save.bosses.push(bossKind);
      // Beating a guardian opens its road and lights the campfire checkpoint beyond it.
      const gz = ZONES.find((z) => z.guardian?.kind === bossKind);
      if (gz && !save.camps.includes(gz.id)) {
        save.camps.push(gz.id);
        save.respawn = gz.id;
      }
      syncWorld();
    }
    persist();
    if (levels) audio.play('levelup');
    await ui.result({ win: true, xp: o.xp, levels, newLv: save.lv, drops: o.drops, boss });
    if (firstClear) {
      const gz = ZONES.find((z) => z.guardian?.kind === bossKind);
      if (gz) await ui.roadOpened(MONSTERS[bossKind].name, gz.name, bossKind);
    }
    transition(() => {
      backToWorld();
      void progressQuests();
    });
  } else {
    await ui.result({ win: false, xp: 0, levels: 0, newLv: save.lv, drops: {}, boss, respawn: save.respawn });
    transition(() => {
      save.hp = playerStats(save).maxHp;
      const p = save.respawn === 'village' || save.respawn === 'glade' ? world.entryPoint(save.respawn) : world.campPoint(save.respawn);
      over.teleport(p.x, p.y);
      backToWorld();
      showZoneBanner(over.currentZone);
    });
  }
}

/** Back to the map from a regular fight: it zooms out from close on you as the white fades. */
function swoopOut() {
  backToWorld();
  swoop = { t: 0, dur: 0.3, dir: 'out' };
}

function backToWorld() {
  battle = null;
  ui.coach(null);
  mode = 'world';
  ui.setMode('world');
  over.resetGrace(3);
  input.reset();
  persist();

}

// ------------------------------------------------------------------ interactions

/** Prologue monsters block the forest path; walking into one starts a scripted fight. */
function challengeFoe(o: { flag?: string; monster?: MonsterKind }) {
  if (!save.flags.includes('sword')) {
    ui.toast('😰 You need something to fight with! Something was glinting back in the clearing…');
    return;
  }
  startBattle(zoneById('glade'), [{ kind: o.monster!, lv: 1, golden: false, gentle: true }], false, o.flag);
}

/** Letterboxed camera tour with captions. */
async function cutscene(shots: { x: number; y: number; text: string; speaker?: 'elder' | 'narrator' }[]) {
  mode = 'dialog';
  ui.cinema(true);
  input.reset();
  for (const shot of shots) {
    over.camTarget = { x: shot.x, y: shot.y };
    await new Promise((r) => setTimeout(r, 700));
    await ui.caption(shot.text, shot.speaker ?? 'elder');
  }
  over.camTarget = null;
  ui.cinema(false);
  await new Promise((r) => setTimeout(r, 400));
  mode = 'world';
  input.reset();
}

/** The first time you walk into Sprout Village, Elder Bloom shows you around. */
async function arriveAtVillage() {
  const elder = world.obj('elder')!, forge = world.obj('forge')!, home = world.obj('plot', 'home')!, sign = world.objs.find((o) => o.kind === 'sign' && o.x > elder.x)!;
  await cutscene([
    { x: elder.x + 0.4, y: elder.y + 1, text: 'Oh my! A traveler, and you made it through the glade all by yourself? Welcome to Sprout Village, little sprout!' },
    { x: home.x + 3, y: home.y + 1.5, text: "It isn't much right now. A tent, a dry garden patch and a lot of empty ground…" },
    { x: forge.x + 2, y: forge.y + 2, text: 'Even our old forge has crumbled. Ever since smoke started drifting from Ember Peak, the monsters have been grumpy and nobody dares travel.' },
    { x: sign.x + 3, y: sign.y + 2, text: 'Out east, big guardians now block every road. We are cut off from the rest of the world.' },
    { x: over.x, y: over.y, text: "But I have a feeling about you. With your help, this little village could grow into something wonderful. Will you stay and help us?" },
  ]);
  save.flags.push('village');
  save.respawn = 'village';
  if (!save.visited.includes('village')) save.visited.push('village');
  persist();
  await progressQuests();
}

async function talkToElder() {
  mode = 'dialog';
  const q = currentQuest(save);
  if (q?.goal.type === 'talk') save.talked = true;
  if (q && !save.tips.includes(`elder:${q.id}`)) save.tips.push(`elder:${q.id}`);
  await ui.elderSays(q ? q.text : 'The skies are clear thanks to you! Why not build up the village, or give the Emberwyrm a friendly rematch?', q?.hint);
  mode = 'world';
  input.reset();
  persist();
  void progressQuests();
}

async function interact() {
  const o = over.nearbyObject();
  if (!o) return;
  audio.play('ui');
  switch (o.kind) {
    case 'forge':
      if (save.build.forge === 0) {
        if (!has(save, 'village')) {
          ui.toast('🏚 The old forge has fallen to pieces. Maybe someone in the village knows how to fix it…');
          break;
        }
        mode = 'dialog';
        ui.openMenu(menuCtx(), 'village', 'forge');
        break;
      }
      if (!has(save, 'forge')) {
        ui.toast('🔒 The forge is cold. Elder Bloom will light it when you are ready.');
        break;
      }
      mode = 'dialog';
      ui.openMenu(menuCtx(true), 'forge');
      break;
    case 'plot':
      if (!has(save, 'village')) {
        save.hp = playerStats(save).maxHp;
        audio.play('heal');
        ui.toast('🏕 Your cozy tent. You feel rested!');
        persist();
        break;
      }
      mode = 'dialog';
      ui.openMenu(menuCtx(), 'village', o.project);
      break;
    case 'elder':
      await talkToElder();
      break;
    case 'pickup': {
      mode = 'dialog';
      audio.play('levelup');
      await ui.itemFound('twig', 'Twig Sword', "It's just a stick… but it feels right in your hand.");
      save.flags.push('sword');
      syncWorld();
      mode = 'world';
      input.reset();
      persist();
      void progressQuests();
      break;
    }
    case 'foe':
      challengeFoe(o);
      break;
    case 'gate': {
      const z = zoneById(o.zone!);
      const g = z.guardian!;
      const m = MONSTERS[g.kind];
      mode = 'dialog';
      const r = await ui.challenge(g.kind, m.name, m.title ?? '', g.lv, save.lv, z.name);
      input.reset();
      const here = ZONES[ZONES.indexOf(z) - 1];
      if (r === 'yes') startBattle(here, [{ kind: g.kind, lv: g.lv, golden: false }], true);
      else mode = 'world';
      break;
    }
    case 'camp': {
      save.hp = playerStats(save).maxHp;
      save.respawn = o.zone!;
      audio.play('heal');
      persist();
      if (save.build.warp) {
        mode = 'dialog';
        ui.toast('🔥 Rested. Checkpoint saved!');
        ui.openMenu(menuCtx(), 'journey');
      } else ui.toast('🔥 Rested by the fire. Checkpoint saved!');
      break;
    }
    case 'fountain': {
      const st = playerStats(save);
      save.hp = st.maxHp;
      save.respawn = 'village';
      const potBefore = save.potions;
      // A free potion top-up keeps things gentle; the Garden raises how many you get.
      save.potions = Math.max(save.potions, potionRefill(save));
      audio.play('heal');
      ui.toast(`💧 Fully healed!${save.potions > potBefore ? ` Potions refilled to ${save.potions}.` : ''}`);
      persist();
      break;
    }
    case 'sign':
      mode = 'dialog';
      await ui.message('📜 Sign', o.text ?? '');
      mode = 'world';
      input.reset();
      break;
    case 'node':
      tryGather(o);
      break;
    case 'lair': {
      mode = 'dialog';
      const r = await ui.dialog(
        `<div class="big" style="font-size:26px">🐉 Emberwyrm's Lair</div><p>A huge dragon snores inside. It's Lv 20 and very, very grumpy.${
          save.lv < 16 ? '<br><b>You might want to get stronger first!</b>' : ''
        }</p>`,
        [['no', 'Not yet'], ['yes', 'Fight!', 'alt']],
      );
      input.reset();
      if (r === 'yes') startBattle(zoneById('peak'), [{ kind: 'dragon', lv: 20 + Math.max(0, save.bossWins) * 2, golden: false }], true);
      else mode = 'world';
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ gathering

let chop: { game: Chop; obj: WorldObj; view: GatherView } | null = null;

/** Colors for each kind of rock face in the mining minigame. */
const ROCK_LOOKS: Partial<Record<NodeKind, Look>> = {
  rock: { kind: 'mine', rock: '#9a9aa8', dark: '#6a6a78', fleck: '#d8d8e0' },
  copper: { kind: 'mine', rock: '#8a7a6a', dark: '#5e5048', fleck: '#ff9a4a' },
  iron: { kind: 'mine', rock: '#5e6272', dark: '#40434f', fleck: '#c8d8f0' },
};

const timeLeft = (ms: number) => {
  const secs = Math.ceil(ms / 1000);
  return secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
};

/** Walk up to a tree or rock and start the timing minigame, if you have the tool for it. */
function tryGather(o: WorldObj) {
  const n = NODES[o.node!];
  const why = canGather(save, o.node!, o.id!);
  if (why === 'tool') {
    const t = TOOLS.find((t) => t.skill === n.skill && t.tier === n.tier)!;
    const what = n.skill === 'wood' ? 'chop trees' : 'break rocks';
    ui.toast(save.tools[n.skill] === 0
      ? `${t.icon} You need a ${t.name} to ${what}. Craft one at the Forge (Tools)!`
      : `${t.icon} ${n.name} is too tough for your ${n.skill === 'wood' ? 'axe' : 'pick'}. Craft a ${t.name} (${SKILL_NAMES[n.skill]} ${t.level}).`, 3200);
    return;
  }
  if (why === 'regrowing') {
    ui.toast(n.skill === 'wood' ? `🌱 Regrowing… back in ${timeLeft((save.nodes[o.id!] ?? 0) - Date.now())}.` : `🪨 Nothing left to break… it builds back up in ${timeLeft((save.nodes[o.id!] ?? 0) - Date.now())}.`);
    return;
  }
  const lv = save.skills[n.skill].lv;
  const look: Look = n.skill === 'mine' ? ROCK_LOOKS[o.node!]! : { kind: 'wood', pine: o.node === 'pine' };
  chop = { game: new Chop(n.hp, toolPower(save.tools[n.skill], n.tier), sweetWidth(lv)), obj: o, view: new GatherView(look) };
  over.startChop(o);
  mode = 'gather';
  input.reset();
}

function updateChop(dt: number) {
  const c = chop!;
  c.game.update(dt);
  c.view.update(dt, c.game);
  // Once it gives way, let the tree topple (or the rock split) before paying out.
  if (c.game.done) {
    input.flush();
    if (c.view.finished) finishChop();
    return;
  }
  const a = input.axis();
  // Walking away (or Esc) cancels; the node stays as it was.
  if (Math.hypot(a.x, a.y) > 0.6 || input.consume('menu')) {
    chop = null;
    over.chopping = null;
    mode = 'world';
    input.reset();
    return;
  }
  if (input.consume('act') || input.consume('attack') || input.consume('tap')) {
    const r = c.game.strike();
    if (r) {
      audio.play(r === 'perfect' ? 'crit' : r === 'hit' ? 'hit' : 'dodge');
      over.chopHit(r === 'perfect' ? 2 : r === 'hit' ? 1 : 0.3);
      const tip = NODES[c.obj.node!].skill === 'wood' ? 'chopped' : 'mined';
      if (!save.tips.includes(tip)) save.tips.push(tip);
    }
  }
}

function finishChop() {
  const { game, obj } = chop!;
  chop = null;
  const n = NODES[obj.node!];
  const r = harvest(save, obj.node!, obj.id!, !!obj.grass, game.flawless);
  audio.play(n.skill === 'mine' ? 'boom' : 'kill');
  over.felled();
  const got = Object.entries(r.drops).map(([m, k]) => `+${k} ${MATS[m as MatId].icon} ${MATS[m as MatId].name}`).join('  ');
  const tool = TOOLS.find((t) => t.skill === n.skill)!.icon;
  ui.toast(`${game.flawless ? '✨ Flawless! ' : ''}${got}  ·  ${tool} +${r.xp} XP`, 2600);
  if (r.levels) {
    audio.play('levelup');
    setTimeout(() => ui.toast(`🎉 ${SKILL_NAMES[n.skill]} Lv ${save.skills[n.skill].lv}! The sweet spot grows.`, 3200), 1400);
  }
  mode = 'world';
  input.reset();
  persist();
  void progressQuests();
}

/** Nodes say "Chop" or "Mine" when ready, and what they're doing while they come back. */
function syncNodes() {
  const now = Date.now();
  for (const o of world.objs) {
    if (o.kind !== 'node') continue;
    const skill = NODES[o.node!].skill;
    o.label = (save.nodes[o.id!] ?? 0) <= now ? SKILL_VERB[skill] : skill === 'wood' ? 'Regrowing' : 'Rubble';
  }
}

/** Nearest ready node that gives `mat` and that you can gather. */
function nearestNode(mat: MatId): WorldObj | null {
  let best: WorldObj | null = null, bd = Infinity;
  for (const o of world.objs) {
    if (o.kind !== 'node' || NODES[o.node!].mat !== mat || canGather(save, o.node!, o.id!) !== 'ok') continue;
    const d = (o.x - over.x) ** 2 + (o.y - over.y) ** 2;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

/**
 * Where to go for a recipe's missing gathered material: the Forge if you still need the tool, otherwise the nearest
 * ready tree or rock. Null if nothing gathered is missing.
 */
function gatherPointer(cost: Recipe): { x: number; y: number } | null {
  const mat = (Object.keys(cost) as MatId[]).find((m) => save.mats[m] < (cost[m] ?? 0) && Object.values(NODES).some((n) => n.mat === m));
  if (!mat) return null;
  const n = Object.values(NODES).find((n) => n.mat === mat)!;
  const forge = world.obj('forge')!;
  if (save.tools[n.skill] < n.tier) return has(save, 'forge') ? { x: forge.x + forge.w / 2, y: forge.y + forge.h + 0.7 } : null;
  const node = nearestNode(mat);
  return node ? { x: node.x + node.w / 2, y: node.y + node.h + 0.5 } : null;
}

// ------------------------------------------------------------------ title

function menuCtx(atForge = false) {
  return { atForge, inVillage: over.currentZone.id === 'village' };
}

function startGame(fresh: boolean) {
  audio.unlock();
  if (fresh) {
    clearState();
    save = newState();
    save.hp = playerStats(save).maxHp;
    over = new Overworld(world, save);
  }
  audio.muted = save.muted;
  mode = 'world';
  ui.setMode('world');
  input.reset();
  if (fresh) {
    // Waking up in the glade.
    mode = 'dialog';
    void ui.caption(QUESTS[0].text, 'narrator').then(() => {
      mode = 'world';
      input.reset();
    });
  }
  // Old saves catch up on unlocks quietly; new players get them one at a time.
  const catchUp = save.unlocked.length === 0 && (save.lv > 1 || save.quest > 0);
  unlocks(catchUp);
  syncWorld();
  showZoneBanner(over.currentZone);
  persist();
  void progressQuests();
}

/** Set once the sprites and icons are in; the title's buttons only exist from then on. */
let booted = false;

/**
 * Title screen loading: the HTML shows an animated bar from the first paint; here it becomes real progress
 * (sprite bytes, then menu icons), and only then do Continue / New Game appear, so nothing starts half-drawn.
 */
async function boot() {
  const fill = document.getElementById('load-fill')!, text = document.getElementById('load-text')!;
  const show = (frac: number, msg: string) => {
    fill.style.width = `${Math.round(Math.min(1, frac) * 100)}%`;
    text.textContent = msg;
  };
  fill.parentElement!.classList.remove('waiting');
  show(0.03, 'Fetching monsters and scenery…');
  const mb = (n: number) => (n / 1048576).toFixed(1);
  const ok = await loadAssets((p) => show(0.05 + 0.8 * (p.total ? p.done / p.total : 0), `Fetching monsters and scenery… ${mb(p.done)} / ${mb(p.total)} MB`));
  if (!ok) show(0.85, 'Sprites unavailable: using simple drawings');
  await preloadIcons(allIconIds(), (p) => show(0.85 + 0.15 * (p.done / p.total), `Unpacking menu icons… ${p.done} / ${p.total}`));
  show(1, 'Ready!');
  const saved = !!loadState();
  document.getElementById('btn-continue')!.hidden = !saved;
  document.getElementById('new-key')!.textContent = saved ? 'N' : 'Enter';
  const btns = document.querySelector('.title-btns') as HTMLElement;
  btns.hidden = false;
  btns.classList.add('appear');
  const loading = document.getElementById('loading')!;
  loading.classList.add('done');
  setTimeout(() => (loading.hidden = true), 300);
  booted = true;
}

// Title screen: Enter continues (or starts), N starts a new game.
window.addEventListener('keydown', (e) => {
  if (mode !== 'title' || ui.isOpen || e.repeat || !booted) return;
  const cont = document.getElementById('btn-continue')!;
  if (e.code === 'Enter' || e.code === 'Space') (cont.hidden ? document.getElementById('btn-new')! : cont).click();
  else if (e.code === 'KeyN') document.getElementById('btn-new')!.click();
});

const openFromHud = (tab: 'journey' | 'items') => {
  if (mode !== 'world' || trans) return;
  audio.play('ui');
  mode = 'dialog';
  ui.openMenu(menuCtx(), tab);
};
document.getElementById('quest-pill')!.addEventListener('click', () => has(save, 'journal') && openFromHud('journey'));
document.getElementById('btn-journal')!.addEventListener('click', () => openFromHud('journey'));
document.getElementById('btn-bag')!.addEventListener('click', () => openFromHud('items'));
document.getElementById('btn-continue')!.addEventListener('click', () => startGame(false));
document.getElementById('btn-new')!.addEventListener('click', async () => {
  if (loadState()) {
    const r = await ui.dialog('<div class="big" style="font-size:24px">New game?</div><p>This replaces your current save.</p>', [
      ['no', 'Cancel'],
      ['yes', 'New Game', 'alt'],
    ]);
    if (r !== 'yes') return;
  }
  startGame(true);
});

const bind = (id: string, a: Parameters<Input['bindButton']>[1]) => input.bindButton(document.getElementById(id)!, a);
bind('btn-attack', 'attack');
bind('btn-skill', 'skill');
bind('btn-dodge', 'dodge');
bind('btn-potion', 'potion');
bind('btn-run', 'run');
bind('btn-act', 'act');
// Any touch also unlocks audio on iOS.
window.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode !== 'title') persist();
});

// ------------------------------------------------------------------ loop

let movedDist = 0;
/** Console-only camera zoom override (window.game.zoom = 0.3 shows a whole area). */
let debugZoom = 0;
let treeSync = 1;
let battleFlag: string | undefined;
let autoTalked = false;
let coachStep = 0;
let coachT = 0;

/** Elder Bloom calls you over the first time you walk up to her. */
function maybeAutoTalk() {
  const q = currentQuest(save);
  const elder = world.obj('elder');
  if (!elder || q?.goal.type !== 'talk') return;
  const d = Math.hypot(over.x - (elder.x + elder.w / 2), over.y - (elder.y + elder.h));
  if (d > 3.2) autoTalked = false;
  else if (d < 2.2 && !autoTalked) {
    autoTalked = true;
    void talkToElder();
  }
}

/** Where the waypoint arrow should point for the current goal. */
function objective(): { x: number; y: number } | null {
  const q = currentQuest(save);
  if (!q) return null;
  const g = q.goal;
  // Point at the spot in front of the object, where the player actually stands to interact.
  const center = (o?: { x: number; y: number; w: number; h: number }) => (o ? { x: o.x + o.w / 2, y: o.y + o.h + 0.7 } : null);
  switch (g.type) {
    case 'talk':
      return center(world.obj('elder'));
    case 'flag': {
      if (g.flag === 'sword') return center(world.objs.find((o) => o.kind === 'pickup'));
      if (g.flag === 'village') return world.entryPoint('village');
      const foe = world.objs.find((o) => o.kind === 'foe' && o.flag === g.flag);
      return foe ? { x: foe.x + 0.5, y: foe.y + 2.7 } : null;
    }
    case 'craft': {
      if (!has(save, 'forge')) return null;
      // Aim for the gear that's closest to craftable; if it's short on stone or wood, send you to gather it.
      const options = GEAR_ORDER.map((id) => GEAR[id]).filter((g) => g.recipe && !save.owned.includes(g.id) && forgeLevelFor(g) <= save.build.forge && !missingSkill(save, g.needs));
      const short = (g: typeof options[number]) => Object.entries(g.recipe!).reduce((a, [m, n]) => a + Math.max(0, (n ?? 0) - save.mats[m as MatId]), 0);
      const target = options.sort((a, b) => short(a) - short(b))[0];
      return (target && gatherPointer(target.recipe!)) ?? center(world.obj('forge'));
    }
    case 'build': {
      const lvl = PROJECTS[g.project].levels[save.build[g.project]];
      const gather = lvl && gatherPointer(lvl.cost);
      if (gather) return gather;
      return g.project === 'forge' ? center(world.obj('forge')) : center(world.obj('plot', g.project));
    }
    case 'boss': {
      if (g.kind === 'dragon') return center(world.obj('lair'));
      const gate = world.obj('gate', ZONES.find((z) => z.guardian?.kind === g.kind)?.id);
      // The guardian stands on the path just west of its gate.
      return gate ? { x: gate.x - 0.8, y: gate.y + 2.6 } : null;
    }
    case 'mats':
    case 'kills': {
      const z = zoneById(g.zone);
      // Outside the zone: head for its entrance. Inside: point at the nearest tall grass (none needed if standing in it).
      // Outside the zone: head for its entrance. Inside: point at the nearest monster.
      if (over.currentZone.id !== g.zone) return world.entryPoint(z.id);
      const m = over.roamers.nearestIn(z.id, over.x, over.y);
      return m && Math.hypot(m.x - over.x, m.y - over.y) > 2.5 ? { x: m.x, y: m.y } : null;
    }
  }
}

/** "Tap ⚔️" on touch screens, "Press J" with a keyboard. */
const press = (key: string, emoji: string) => (usingKeyboard() ? `Press ${key}` : `Tap ${emoji}`);

/** Gentle in-battle tutorial: attack first, then dodge, later skills and potions. */
function coachBattle(b: Battle) {
  coachT += 1 / 60;
  if (b.intro > 0) return ui.coach(null);
  if (save.wins === 0) {
    if (coachStep === 0) {
      if (b.hits > 0) { coachStep = 1; coachT = 0; }
      return ui.coach(`Walk toward it, then ${press('J', '⚔️')}: you swing the way you're facing.`, 'btn-attack');
    }
    return ui.coach(null);
  }
  if (save.wins === 1) {
    // The Hopbun fight: its charge is the perfect thing to dodge.
    if (coachStep === 0) {
      if (b.dodgeFrac > 0) { coachStep = 1; return ui.coach(null); }
      const winding = b.enemies.some((e) => !e.dead && e.windup > 0.2);
      return ui.coach(winding ? `It's winding up! ${press('K', '💨')} NOW!` : `Hopbuns wiggle, then charge. ${press('K', '💨')} to dodge through them!`, 'btn-dodge');
    }
    return ui.coach(null);
  }
  if (has(save, 'skill') && !save.tips.includes('coach-skill')) {
    if (b.skillFrac > 0.5) save.tips.push('coach-skill');
    return ui.coach(`New! ${press('L', '✨')} for your weapon skill.`, 'btn-skill');
  }
  if (has(save, 'bag') && save.potions > 0 && b.p.hp < b.stats.maxHp * 0.4 && !save.tips.includes('coach-potion')) {
    if (b.p.potionCd > 0) save.tips.push('coach-potion');
    return ui.coach(`Low HP! ${press('H', '🧪')} to drink a potion.`, 'btn-potion');
  }
  ui.coach(null);
}

let last = performance.now();
let saveTimer = 0;

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (trans) {
    trans.t += dt;
    if (!trans.fired && trans.t >= trans.dur / 2) {
      trans.fired = true;
      trans.mid();
    }
    if (trans.t >= trans.dur) trans = null;
  }
  if (swoop) {
    swoop.t += dt;
    if (swoop.t >= swoop.dur) {
      const done = swoop;
      swoop = null;
      done.then?.();
    }
  }
  const busy = !!trans || !!swoop;

  // A fight on the map can end inside update() and hand straight back to the overworld, so hold on to it for this frame.
  const b = battle;
  if (b) {
    // Keep drawing the arena behind the victory dialog until we transition out.
    b.update(busy ? 0 : dt);
    b.render(ctx, vw, vh);
    ui.hud(mode === 'battle' ? b.p.hp : save.hp, over.currentZone.name);
    ui.questPill(false);
    ui.dock(false);
    ui.dragHint(false);
    ui.battleButtons(has(save, 'skill'), has(save, 'bag') && save.flags.includes('village'));
    if (mode === 'battle') coachBattle(b);
    if (mode === 'battle') {
      ui.battleHud(save.potions, b.skillFrac, b.dodgeFrac, b.moves.skillName, !b.setup.boss && !battleFlag && save.flags.includes('village'));
    }
  } else {
    if (mode === 'gather' && chop && !busy) updateChop(dt);
    treeSync += dt;
    if (treeSync > 0.5) {
      treeSync = 0;
      syncNodes();
    }
    const canAct = mode === 'world' && !busy;
    if (canAct && input.consume('bag') && has(save, 'bag')) openFromHud('items');
    if (canAct && input.consume('journal') && has(save, 'journal')) openFromHud('journey');
    if (canAct && input.consume('menu') && (has(save, 'bag') || has(save, 'journal'))) {
      audio.play('ui');
      mode = 'dialog';
      ui.openMenu(menuCtx());
    } else if (mode === 'dialog' && ui.isOpen && input.consume('menu')) {
      ui.closeMenu();
    }
    // Strike a monster that hasn't spotted you yet for a surprise attack.
    const prey = canAct ? over.roamers.unaware(over.x, over.y) : null;
    if (prey && (input.consume('act') || input.consume('attack'))) startFieldBattle(prey, true);
    else if (canAct && input.consume('act')) void interact();
    if (mode === 'title') over.t += dt;
    else {
      const px = over.x, py = over.y;
      const ev = over.update(dt, input, !canAct, !busy && (mode === 'world' || mode === 'gather'));
      if (!save.tips.includes('moved')) {
        movedDist += Math.hypot(over.x - px, over.y - py);
        if (movedDist > 2) save.tips.push('moved');
      }
      if (canAct) maybeAutoTalk();
      if (ev?.type === 'zone') {
        showZoneBanner(ev.zone);
        if (ev.zone.id === 'village' && !save.flags.includes('village')) void arriveAtVillage();
      }
      if (canAct && save.flags.includes('sword')) {
        // Bumping into the monster's blocking box starts the fight.
        const foe = world.objs.find((o) => o.kind === 'foe' && !o.hidden && over.x > o.x - 1.1 && over.x < o.x + o.w + 1.1 && over.y > o.y && over.y < o.y + o.h + 0.4);
        if (foe) challengeFoe(foe);
      }
      if (ev?.type === 'encounter') startFieldBattle(ev.roamer, false);
    }
    const near = canAct ? over.nearbyObject() : null;
    ui.setAction(mode === 'gather' && chop ? `${SKILL_VERB[NODES[chop.obj.node!].skill]}!` : prey ? 'Attack!' : near ? near.label : null);
    over.objective = mode === 'world' ? objective() : null;
    over.keyHints = usingKeyboard();
    ui.dragHint(mode === 'world' && !trans && !save.tips.includes('moved'));
    ui.dock(mode === 'world');
    const sq = swoop ? (swoop.dir === 'in' ? swoop.t / swoop.dur : 1 - swoop.t / swoop.dur) : 0;
    const ease = sq * sq * (3 - 2 * sq);
    over.zoom = debugZoom || 1 + ease;
    over.render(ctx, vw, vh);
    if (swoop) {
      ctx.fillStyle = `rgba(255,250,235,${0.75 * ease})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    if (mode === 'gather' && chop) {
      const n = NODES[chop.obj.node!];
      const mine = n.skill === 'mine';
      const seen = save.tips.includes(mine ? 'mined' : 'chopped');
      const how = mine ? 'when the pick lines up with the seam!' : 'in the green!';
      const tip = seen ? 'Walk away to stop' : usingKeyboard() ? `Press E or Space ${how}` : `Tap ${how}`;
      const icon = TOOLS.find((t) => t.skill === n.skill)!.icon;
      chop.view.draw(ctx, chop.game, vw, vh, `${icon} ${chop.obj.grass ? 'Wild ' : ''}${n.name}`, tip);
    }
    if (mode === 'title') {
      // Soft overlay so the title text pops over the live world behind it.
      ctx.fillStyle = 'rgba(42,26,48,0.15)';
      ctx.fillRect(0, 0, vw, vh);
    }
    if (mode !== 'title') {
      ui.hud(save.hp, over.currentZone.name);
      ui.questPill(mode === 'world' || mode === 'dialog');
    }
    saveTimer += dt;
    if (saveTimer > 5 && mode === 'world') {
      saveTimer = 0;
      persist();
    }
  }
  input.flush();

  if (trans) drawIris(trans.t / trans.dur);
  requestAnimationFrame(frame);
}

function drawIris(q: number) {
  const k = q < 0.5 ? 1 - q * 2 : (q - 0.5) * 2;
  const r = Math.hypot(vw, vh) * 0.6 * k * k;
  ctx.save();
  ctx.fillStyle = '#2a1a30';
  ctx.beginPath();
  ctx.rect(0, 0, vw, vh);
  ctx.arc(vw / 2, vh / 2, Math.max(0.1, r), 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.restore();
}

ui.setMode('title');
void boot();
requestAnimationFrame(frame);

// Exposed for quick debugging from the console / automated smoke tests.
(window as unknown as { game: object }).game = {
  get save() { return save; },
  get mode() { return mode; },
  get battle() { return battle; },
  get over() { return over; },
  get chop() { return chop; },
  set zoom(z: number) { debugZoom = z; },
  /** A regular grass encounter right here (or in `zone`). */
  encounter(zone?: ZoneId) {
    if (zone) { const p = world.entryPoint(zone); over.teleport(p.x, p.y); }
    startFieldBattle(null, false);
  },
  fight(kind: Foe['kind'] = 'slime', lv = 1, n = 1) {
    startBattle(over.currentZone.monsters.length ? over.currentZone : zoneById('meadow'), Array.from({ length: n }, () => ({ kind, lv, golden: false })), !!MONSTERS[kind].boss);
  },
  warp(id: ZoneId) {
    const p = world.entryPoint(id);
    over.teleport(p.x, p.y);
  },
  beat(kind: string) {
    if (!save.bosses.includes(kind)) save.bosses.push(kind);
    const gz = ZONES.find((z) => z.guardian?.kind === kind);
    if (gz && !save.camps.includes(gz.id)) save.camps.push(gz.id);
    syncWorld();
    void progressQuests();
  },
  quests: QUESTS,
  give(n = 20) {
    for (const k in save.mats) save.mats[k as keyof typeof save.mats] += n;
    save.potions = MAX_POTIONS;
  },
};
