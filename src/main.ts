// Entry point: owns the game loop, mode switching and glue between world, battles and UI.
import { loadAssets } from './assets';
import { Audio } from './audio';
import { Battle, type BattleOutcome, type Foe } from './battle';
import { GEAR, MAX_POTIONS, MONSTERS, POTION_HEAL, PROJECTS, QUESTS, ZONES, zoneById, type Zone, type ZoneId } from './data';
import { Input } from './input';
import { Overworld } from './overworld';
import { advanceQuests, currentQuest, recordKills } from './quests';
import { checkUnlocks, has } from './unlocks';
import { build, craftGear, craftPotion, equip, gainXp, mergeDrops, playerStats, potionRefill, weightedPick } from './rules';
import { clearState, loadState, newState, saveState, type SaveState } from './state';
import { UI } from './ui';
import { T, World } from './world';

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

const audio = new Audio();
const input = new Input(document.getElementById('touch')!, document.getElementById('joy')!, document.getElementById('joy-knob')!);
const world = new World();
let save: SaveState = loadState() ?? newState();
let over = new Overworld(world, save);
let battle: Battle | null = null;

type Mode = 'title' | 'world' | 'battle' | 'dialog';
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
    if (o.kind === 'forge') o.label = has(save, 'forge') ? 'Forge' : 'Look';
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
      await ui.questIntro(next);
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
  const sub = z.id === 'village' ? 'Safe · Forge & Fountain' : `Monsters Lv ${z.lv[0]}–${z.lv[1]}${save.lv < z.rec ? ' · ⚠️ Dangerous!' : ''}`;
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

function rollFoes(z: Zone): Foe[] {
  // A gentle first fight: one little slime.
  if (save.wins === 0) return [{ kind: 'slime', lv: 1, golden: false }];
  const r = Math.random();
  const n = Math.min(z.maxEnemies, r < 0.5 ? 1 : r < 0.85 ? 2 : 3);
  return Array.from({ length: n }, () => ({
    kind: weightedPick(z.monsters).kind,
    lv: z.lv[0] + Math.floor(Math.random() * (z.lv[1] - z.lv[0] + 1)),
    golden: Math.random() < 0.04,
  }));
}

function startBattle(zone: Zone, foes: Foe[], boss: boolean) {
  audio.play('encounter');
  mode = 'dialog';
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
  if (o.result === 'run') {
    save.hp = o.hp;
    transition(() => backToWorld());
    return;
  }
  if (o.result === 'win') {
    save.hp = o.hp;
    save.wins++;
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
      const p = save.respawn === 'village' ? world.entryPoint('village') : world.campPoint(save.respawn);
      over.teleport(p.x, p.y);
      backToWorld();
      showZoneBanner(over.currentZone);
    });
  }
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
  // Old saves catch up on unlocks quietly; new players get them one at a time.
  const catchUp = save.unlocked.length === 0 && (save.lv > 1 || save.quest > 0);
  unlocks(catchUp);
  syncWorld();
  showZoneBanner(over.currentZone);
  persist();
  void progressQuests();
}

document.getElementById('btn-continue')!.hidden = !loadState();
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
  const center = (o?: { x: number; y: number; w: number; h: number }) => (o ? { x: o.x + o.w / 2, y: o.y + o.h } : null);
  switch (g.type) {
    case 'talk':
      return center(world.obj('elder'));
    case 'craft':
      return has(save, 'forge') ? center(world.obj('forge')) : null;
    case 'build':
      return g.project === 'forge' ? center(world.obj('forge')) : center(world.obj('plot', g.project));
    case 'boss': {
      if (g.kind === 'dragon') return center(world.obj('lair'));
      const zone = ZONES.find((z) => z.guardian?.kind === g.kind);
      return zone ? center(world.obj('gate', zone.id)) : null;
    }
    case 'kills': {
      const z = zoneById(g.zone);
      // Outside the zone: head for its entrance. Inside: point at the nearest tall grass (none needed if standing in it).
      if (over.currentZone.id !== g.zone) return world.entryPoint(g.zone);
      const tx = Math.floor(over.x), ty = Math.floor(over.y - 0.1);
      if (world.tile(tx, ty) === T.GRASS) return null;
      let best: { x: number; y: number } | null = null, bd = Infinity;
      for (let y = 0; y < world.h; y++)
        for (let x = z.x0; x < z.x0 + z.w; x++) {
          if (world.tile(x, y) !== T.GRASS) continue;
          const d = (x + 0.5 - over.x) ** 2 + (y + 0.5 - over.y) ** 2;
          if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.8 }; }
        }
      return best;
    }
  }
}

/** Gentle in-battle tutorial: attack first, then dodge, later skills and potions. */
function coachBattle(b: Battle) {
  coachT += 1 / 60;
  if (b.intro > 0) return ui.coach(null);
  if (save.wins === 0) {
    if (coachStep === 0) {
      if (b.hits > 0) { coachStep = 1; coachT = 0; }
      return ui.coach('Tap ⚔️ to attack! It aims for you.', 'btn-attack');
    }
    if (coachStep === 1) {
      if (b.dodgeFrac > 0 || coachT > 5) { coachStep = 2; return ui.coach(null); }
      return ui.coach('Monsters wiggle before they attack. Tap 💨 to dodge!', 'btn-dodge');
    }
    return ui.coach(null);
  }
  if (has(save, 'skill') && !save.tips.includes('coach-skill')) {
    if (b.skillFrac > 0.5) save.tips.push('coach-skill');
    return ui.coach('New! Tap ✨ for your weapon skill.', 'btn-skill');
  }
  if (has(save, 'bag') && save.potions > 0 && b.p.hp < b.stats.maxHp * 0.4 && !save.tips.includes('coach-potion')) {
    if (b.p.potionCd > 0) save.tips.push('coach-potion');
    return ui.coach('Low HP! Tap 🧪 to drink a potion.', 'btn-potion');
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
  const busy = !!trans;

  if (battle) {
    // Keep drawing the arena behind the victory dialog until we transition out.
    battle.update(busy ? 0 : dt);
    battle.render(ctx, vw, vh);
    ui.hud(mode === 'battle' ? battle.p.hp : save.hp, over.currentZone.name);
    ui.questPill(false);
    ui.dock(false);
    ui.dragHint(false);
    ui.battleButtons(has(save, 'skill'), has(save, 'bag'));
    if (mode === 'battle') coachBattle(battle);
    if (mode === 'battle') {
      ui.battleHud(save.potions, battle.skillFrac, battle.dodgeFrac, battle.moves.skillName, !battle.setup.boss && save.wins > 0);
    }
  } else {
    const canAct = mode === 'world' && !busy;
    if (canAct && input.consume('menu') && (has(save, 'bag') || has(save, 'journal'))) {
      audio.play('ui');
      mode = 'dialog';
      ui.openMenu(menuCtx());
    } else if (mode === 'dialog' && ui.isOpen && input.consume('menu')) {
      ui.closeMenu();
    }
    if (canAct && input.consume('act')) void interact();
    if (mode === 'title') over.t += dt;
    else {
      const px = over.x, py = over.y;
      const ev = over.update(dt, input, !canAct);
      if (!save.tips.includes('moved')) {
        movedDist += Math.hypot(over.x - px, over.y - py);
        if (movedDist > 2) save.tips.push('moved');
      }
      if (canAct) maybeAutoTalk();
      if (ev?.type === 'zone') showZoneBanner(ev.zone);
      if (ev?.type === 'encounter') {
        const z = over.currentZone;
        startBattle(z, rollFoes(z), false);
      }
    }
    const near = canAct ? over.nearbyObject() : null;
    ui.setAction(near ? near.label : null);
    over.objective = mode === 'world' ? objective() : null;
    ui.dragHint(mode === 'world' && !trans && !save.tips.includes('moved'));
    ui.dock(mode === 'world');
    over.render(ctx, vw, vh);
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
void loadAssets();
requestAnimationFrame(frame);

// Exposed for quick debugging from the console / automated smoke tests.
(window as unknown as { game: object }).game = {
  get save() { return save; },
  get mode() { return mode; },
  get battle() { return battle; },
  get over() { return over; },
  fight(kind: Foe['kind'] = 'slime', lv = 1, n = 1) {
    startBattle(over.currentZone.id === 'village' ? ZONES[1] : over.currentZone, Array.from({ length: n }, () => ({ kind, lv, golden: false })), !!MONSTERS[kind].boss);
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
