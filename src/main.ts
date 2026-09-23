// Entry point: owns the game loop, mode switching and glue between world, battles and UI.
import { loadAssets } from './assets';
import { Audio } from './audio';
import { Battle, type BattleOutcome, type Foe } from './battle';
import { MAX_POTIONS, POTION_HEAL, ZONES, zoneById, type Zone, type ZoneId } from './data';
import { Input } from './input';
import { Overworld } from './overworld';
import { craftGear, craftPotion, equip, gainXp, mergeDrops, playerStats, weightedPick } from './rules';
import { clearState, loadState, newState, saveState, type SaveState } from './state';
import { UI } from './ui';
import { World } from './world';

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
  craftGear(id) {
    const r = craftGear(save, id);
    if (r === 'ok') {
      audio.play('craft');
      ui.toast('✨ Crafted! Equip it from the Gear tab.');
      persist();
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
      const p = world.entryPoint(id);
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
    if (foes.some((f) => f.golden)) ui.toast('✨ A golden monster! Double loot!');
    else if (!save.tips.includes('battle')) tip('battle', 'Tap ⚔️ to attack (it auto-aims). Tap 💨 to dodge!');
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
    const levels = gainXp(save, o.xp);
    mergeDrops(save.mats, o.drops);
    if (boss) save.bossWins++;
    persist();
    if (levels) audio.play('levelup');
    await ui.result({ win: true, xp: o.xp, levels, newLv: save.lv, drops: o.drops, boss });
    transition(() => backToWorld());
  } else {
    await ui.result({ win: false, xp: 0, levels: 0, newLv: save.lv, drops: {}, boss });
    transition(() => {
      save.hp = playerStats(save).maxHp;
      const p = world.entryPoint('village');
      over.teleport(p.x, p.y);
      backToWorld();
      showZoneBanner(over.currentZone);
    });
  }
}

function backToWorld() {
  battle = null;
  mode = 'world';
  ui.setMode('world');
  over.resetGrace(3);
  input.reset();
  persist();
  if (save.lv >= 3 && !save.tips.includes('forge')) tip('forge', '🎒 Got materials? Visit the ⚒ Forge in the village to craft gear!');
}

// ------------------------------------------------------------------ interactions

async function interact() {
  const o = over.nearbyObject();
  if (!o) return;
  audio.play('ui');
  switch (o.kind) {
    case 'forge':
      mode = 'dialog';
      ui.openMenu({ atForge: true, inVillage: true }, 'forge');
      break;
    case 'fountain': {
      const st = playerStats(save);
      save.hp = st.maxHp;
      const potBefore = save.potions;
      // A free potion top-up keeps early game gentle; beyond that you brew your own.
      if (save.potions < 2) save.potions = 2;
      audio.play('heal');
      ui.toast(`💧 Fully healed!${save.potions > potBefore ? ' The fountain filled your potion bottles.' : ''}`);
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
      if (r === 'yes') startBattle(zoneById('peak'), [{ kind: 'dragon', lv: 20 + save.bossWins * 2, golden: false }], true);
      else mode = 'world';
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ title

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
  showZoneBanner(over.currentZone);
  tip('move', '👆 Drag anywhere to move. Head east into the tall grass to find monsters!');
  persist();
}

document.getElementById('btn-continue')!.hidden = !loadState();
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
bind('btn-menu', 'menu');
// Any touch also unlocks audio on iOS.
window.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode !== 'title') persist();
});

// ------------------------------------------------------------------ loop

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
    if (mode === 'battle') {
      ui.battleHud(save.potions, battle.skillFrac, battle.dodgeFrac, battle.moves.skillName, !battle.setup.boss);
    }
  } else {
    const canAct = mode === 'world' && !busy;
    if (canAct && input.consume('menu')) {
      audio.play('ui');
      mode = 'dialog';
      ui.openMenu({ atForge: false, inVillage: over.currentZone.id === 'village' });
    } else if (mode === 'dialog' && ui.isOpen && input.consume('menu')) {
      ui.closeMenu();
    }
    if (canAct && input.consume('act')) void interact();
    if (mode === 'title') over.t += dt;
    else {
      const ev = over.update(dt, input, !canAct);
      if (ev?.type === 'zone') showZoneBanner(ev.zone);
      if (ev?.type === 'encounter') {
        const z = over.currentZone;
        startBattle(z, rollFoes(z), false);
      }
    }
    const near = canAct ? over.nearbyObject() : null;
    ui.setAction(near ? near.label : null);
    over.render(ctx, vw, vh);
    if (mode === 'title') {
      // Soft overlay so the title text pops over the live world behind it.
      ctx.fillStyle = 'rgba(42,26,48,0.15)';
      ctx.fillRect(0, 0, vw, vh);
    }
    if (mode !== 'title') ui.hud(save.hp, over.currentZone.name);
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
    startBattle(over.currentZone.id === 'village' ? ZONES[1] : over.currentZone, Array.from({ length: n }, () => ({ kind, lv, golden: false })), kind === 'dragon');
  },
  warp(id: ZoneId) {
    const p = world.entryPoint(id);
    over.teleport(p.x, p.y);
  },
  give(n = 20) {
    for (const k in save.mats) save.mats[k as keyof typeof save.mats] += n;
    save.potions = MAX_POTIONS;
  },
};
