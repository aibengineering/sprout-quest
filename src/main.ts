// Entry point: the canvas, the frame loop, and wiring the page's buttons to the game. The flows themselves live in
// game/: fights, gathering, story, interactions, the menu's actions and the title screen, sharing state through `G`.
import type { Battle } from './battle/battle';
import { drawBattle } from './battle/render';
import { MAX_POTIONS, MONSTERS, QUESTS, ZONES, zoneById, type MonsterKind, type ZoneId } from './data';
import { G, busy, menuCtx, persist, showZoneBanner, syncWorld } from './game/context';
import { canRun, challengeFoe, coachBattle, startBattle, startFieldBattle } from './game/fights';
import { chop, drawGather, gatherVerb, syncNodes, updateGather } from './game/gathering';
import { interact } from './game/interact';
import { menuHooks } from './game/menu';
import { arriveAtVillage, maybeAutoTalk, progressQuests } from './game/story';
import { boot, setUpTitle } from './game/title';
import { objective } from './game/waypoint';
import { trackInputDevice, usingKeyboard, type Input } from './input';
import { UI } from './ui';
import { flushTime, trackTime, type Activity } from './stats';
import { has } from './unlocks';

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
G.ui = new UI(menuHooks);
setUpTitle();

// ------------------------------------------------------------------ page buttons

const openFromHud = (tab: 'journey' | 'items') => {
  if (G.mode !== 'world' || G.trans) return;
  G.audio.play('ui');
  G.mode = 'dialog';
  G.ui.openMenu(menuCtx(), tab);
};
document.getElementById('quest-pill')!.addEventListener('click', () => has(G.save, 'journal') && openFromHud('journey'));
document.getElementById('btn-journal')!.addEventListener('click', () => openFromHud('journey'));
document.getElementById('btn-bag')!.addEventListener('click', () => openFromHud('items'));

const bind = (id: string, a: Parameters<Input['bindButton']>[1]) => G.input.bindButton(document.getElementById(id)!, a);
bind('btn-attack', 'attack');
bind('btn-skill', 'skill');
bind('btn-dodge', 'dodge');
bind('btn-potion', 'potion');
bind('btn-run', 'run');
bind('btn-act', 'act');
// Any touch also unlocks audio on iOS.
window.addEventListener('pointerdown', () => G.audio.unlock(), { passive: true });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || G.mode === 'title') return;
  persist();
  flushTime();
});

// ------------------------------------------------------------------ loop

let movedDist = 0;
/** Console-only camera zoom override (window.game.zoom = 0.3 shows a whole area). */
let debugZoom = 0;
let nodeSync = 1;
let saveTimer = 0;

/** A fight's frame. It keeps drawing behind the victory popup until the transition out. */
function battleFrame(b: Battle, dt: number) {
  const s = G.save, ui = G.ui;
  b.update(busy() ? 0 : dt);
  drawBattle(b, ctx, vw, vh);
  ui.hud(G.mode === 'battle' ? b.p.hp : s.hp, G.over.currentZone.name);
  ui.questPill(false);
  ui.dock(false);
  ui.dragHint(false);
  ui.battleButtons(has(s, 'skill'), has(s, 'bag') && s.flags.includes('village'));
  if (G.mode === 'battle') {
    coachBattle(b);
    ui.battleHud(s.potions, b.skillFrac, b.dodgeFrac, b.moves.skillName, canRun(b), b.attackFrac, b.clip);
  }
}

/** Walking the map (or the title screen over it, or gathering): input, the overworld, and what's drawn on top. */
function worldFrame(dt: number) {
  const s = G.save, over = G.over, input = G.input, ui = G.ui, mode = G.mode;
  if (mode === 'gather' && chop && !busy()) updateGather(dt);
  nodeSync += dt;
  if (nodeSync > 0.5) {
    nodeSync = 0;
    syncNodes();
  }
  const canAct = G.mode === 'world' && !busy();
  if (canAct && input.consume('bag') && has(s, 'bag')) openFromHud('items');
  if (canAct && input.consume('journal') && has(s, 'journal')) openFromHud('journey');
  if (canAct && input.consume('menu') && (has(s, 'bag') || has(s, 'journal'))) {
    G.audio.play('ui');
    G.mode = 'dialog';
    ui.openMenu(menuCtx());
  } else if (G.mode === 'dialog' && ui.isOpen && input.consume('menu')) {
    ui.closeMenu();
  }
  // Strike a monster that hasn't spotted you yet for a surprise attack.
  const prey = canAct ? over.roamers.unaware(over.x, over.y) : null;
  if (prey && (input.consume('act') || input.consume('attack'))) startFieldBattle(prey, true);
  else if (canAct && input.consume('act')) void interact();
  if (G.mode === 'title') over.t += dt;
  else {
    const px = over.x, py = over.y;
    const ev = over.update(dt, input, !canAct, !busy() && (G.mode === 'world' || G.mode === 'gather'));
    if (!s.tips.includes('moved')) {
      movedDist += Math.hypot(over.x - px, over.y - py);
      if (movedDist > 2) s.tips.push('moved');
    }
    if (canAct) maybeAutoTalk();
    if (ev?.type === 'zone') {
      showZoneBanner(ev.zone);
      if (ev.zone.id === 'village' && !s.flags.includes('village')) void arriveAtVillage();
    }
    if (canAct && s.flags.includes('sword')) {
      // Bumping into the monster's blocking box starts the fight.
      const foe = G.world.objs.find((o) => o.kind === 'foe' && !o.hidden && over.x > o.x - 1.1 && over.x < o.x + o.w + 1.1 && over.y > o.y && over.y < o.y + o.h + 0.4);
      if (foe) challengeFoe(foe);
    }
    if (ev?.type === 'encounter') startFieldBattle(ev.roamer, false);
  }
  const near = canAct ? over.nearbyObject() : null;
  ui.setAction(G.mode === 'gather' && chop ? gatherVerb() : prey ? 'Attack!' : near ? near.label : null);
  over.objective = G.mode === 'world' ? objective() : null;
  over.keyHints = usingKeyboard();
  ui.dragHint(G.mode === 'world' && !G.trans && !s.tips.includes('moved'));
  ui.dock(G.mode === 'world');

  // The overworld half of the swoop into and out of fights: zoom in on you, fading through white.
  const sw = G.swoop;
  const sq = sw ? (sw.dir === 'in' ? sw.t / sw.dur : 1 - sw.t / sw.dur) : 0;
  const ease = sq * sq * (3 - 2 * sq);
  over.zoom = debugZoom || 1 + ease;
  over.render(ctx, vw, vh);
  if (sw) {
    ctx.fillStyle = `rgba(255,250,235,${0.75 * ease})`;
    ctx.fillRect(0, 0, vw, vh);
  }
  if (G.mode === 'gather') drawGather(ctx, vw, vh);
  if (G.mode === 'title') {
    // Soft overlay so the title text pops over the live world behind it.
    ctx.fillStyle = 'rgba(42,26,48,0.15)';
    ctx.fillRect(0, 0, vw, vh);
  } else {
    ui.hud(s.hp, over.currentZone.name);
    ui.questPill(G.mode === 'world' || G.mode === 'dialog');
  }
  saveTimer += dt;
  if (saveTimer > 5 && G.mode === 'world') {
    saveTimer = 0;
    persist();
  }
}

/** Advances the iris transition and the swoop, firing their callbacks at the right moment. */
function updateTransitions(dt: number) {
  const tr = G.trans;
  if (tr) {
    tr.t += dt;
    if (!tr.fired && tr.t >= tr.dur / 2) {
      tr.fired = true;
      tr.mid();
    }
    if (tr.t >= tr.dur) G.trans = null;
  }
  const sw = G.swoop;
  if (sw) {
    sw.t += dt;
    if (sw.t >= sw.dur) {
      G.swoop = null;
      sw.then?.();
    }
  }
}

/** How each mode counts in the play report's time split (popups, menus and cutscenes all count as menus). */
const ACTIVITY: Record<Exclude<typeof G.mode, 'title'>, Activity> = { world: 'walking', battle: 'fighting', gather: 'gathering', dialog: 'menus' };

let last = performance.now();

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updateTransitions(dt);
  if (G.mode !== 'title') {
    G.save.playtime += dt;
    trackTime(G.battle?.setup.zone.id ?? G.over.currentZone.id, ACTIVITY[G.mode], dt);
  }
  // A fight on the map can end inside update() and hand straight back to the overworld, so hold on to it for this frame.
  const b = G.battle;
  if (b) battleFrame(b, dt);
  else worldFrame(dt);
  G.input.flush();
  if (G.trans) drawIris(G.trans.t / G.trans.dur);
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

G.ui.setMode('title');
void boot();
requestAnimationFrame(frame);

// Exposed for quick debugging from the console, and for the e2e smoke test.
(window as unknown as { game: object }).game = {
  get save() { return G.save; },
  get mode() { return G.mode; },
  get battle() { return G.battle; },
  get over() { return G.over; },
  get chop() { return chop; },
  set zoom(z: number) { debugZoom = z; },
  /** A regular grass encounter right here (or in `zone`). */
  encounter(zone?: ZoneId) {
    if (zone) { const p = G.world.entryPoint(zone); G.over.teleport(p.x, p.y); }
    startFieldBattle(null, false);
  },
  fight(kind: MonsterKind = 'slime', lv = 1, n = 1) {
    const zone = G.over.currentZone.monsters.length ? G.over.currentZone : zoneById('meadow');
    startBattle(zone, Array.from({ length: n }, () => ({ kind, lv, golden: false })), !!MONSTERS[kind].boss);
  },
  warp(id: ZoneId) {
    const p = G.world.entryPoint(id);
    G.over.teleport(p.x, p.y);
  },
  beat(kind: string) {
    const s = G.save;
    if (!s.bosses.includes(kind)) s.bosses.push(kind);
    const gz = ZONES.find((z) => z.guardian?.kind === kind);
    if (gz && !s.camps.includes(gz.id)) s.camps.push(gz.id);
    syncWorld();
    void progressQuests();
  },
  quests: QUESTS,
  give(n = 20) {
    for (const k in G.save.mats) G.save.mats[k as keyof typeof G.save.mats] += n;
    G.save.potions = MAX_POTIONS;
  },
};
