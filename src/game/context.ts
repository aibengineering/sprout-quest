// The game's shared state, in one place: the save, the map, the current fight, what mode the game is in, and the
// screen transitions. Every flow module (fights, gathering, story…) reads and changes it through `G`.
import { Audio } from '../audio';
import type { Battle } from '../battle/battle';
import { zoneById, type Zone } from '../data';
import { Input } from '../input';
import { Overworld } from '../overworld';
import { loadState, newState, saveState, type SaveState } from '../state';
import type { UI } from '../ui';
import { has } from '../unlocks';
import { World } from '../world';

/**
 * What the game is doing, which decides what takes input and what's drawn:
 * - `title`: the title screen, over the live world
 * - `world`: walking around the map
 * - `gather`: the chop/mine minigame, over the map
 * - `battle`: in a fight
 * - `dialog`: a popup, menu, cutscene or transition is up, and the world waits behind it
 */
export type Mode = 'title' | 'world' | 'gather' | 'battle' | 'dialog';

class GameState {
  readonly audio = new Audio();
  readonly input = new Input(document.getElementById('touch')!, document.getElementById('joy')!, document.getElementById('joy-knob')!);
  readonly world = new World();
  save: SaveState = loadState() ?? newState();
  over = new Overworld(this.world, this.save);
  battle: Battle | null = null;
  mode: Mode = 'title';
  /** Set once at startup (main.ts), since the UI's hooks call back into the flow modules. */
  ui!: UI;
  /** Iris transition: closes to black, runs `mid`, then opens. */
  trans: { t: number; dur: number; mid: () => void; fired: boolean } | null = null;
  /** The overworld half of the zoom into and out of regular fights. */
  swoop: { t: number; dur: number; dir: 'in' | 'out'; then?: () => void } | null = null;

  /** A fresh save and map (new game, or a reset). */
  restart(save: SaveState) {
    this.save = save;
    this.over = new Overworld(this.world, save);
  }
}

export const G = new GameState();

/** Is a screen transition (iris or swoop) running? The world holds still meanwhile. */
export const busy = () => !!G.trans || !!G.swoop;

export function transition(mid: () => void, dur = 0.7) {
  G.trans = { t: 0, dur, mid, fired: false };
}

/**
 * Shows a popup (or anything awaited) with the world waiting behind it, then hands control back to `after`.
 * For flows that go somewhere else afterwards (into a fight, say), set `G.mode` yourself instead.
 */
export async function paused<T>(show: () => Promise<T>, after: Mode = 'world'): Promise<T> {
  G.mode = 'dialog';
  try {
    return await show();
  } finally {
    G.mode = after;
    G.input.reset();
  }
}

/** Saves, with where you're standing. */
export function persist() {
  G.save.pos = { x: G.over.x, y: G.over.y };
  saveState(G.save);
}

/** A one-time hint toast. */
export function tip(id: string, text: string) {
  if (G.save.tips.includes(id)) return;
  G.save.tips.push(id);
  G.ui.toast(text, 4200);
  persist();
}

/** What the menu needs to know about where you are. */
export function menuCtx(atForge = false) {
  return { atForge, inVillage: G.over.currentZone.id === 'village' };
}

export function showZoneBanner(z: Zone) {
  const s = G.save;
  const sub = z.id === 'village' ? 'Safe · Home of Elder Bloom' : z.id === 'glade' ? 'A peaceful clearing' : `Monsters Lv ${z.lv[0]}–${z.lv[1]}${s.lv < z.rec ? ' · ⚠️ Dangerous!' : ''}`;
  G.ui.banner(z.name, sub);
  if (!s.visited.includes(z.id)) {
    s.visited.push(z.id);
    persist();
  }
}

/** Opens gates whose guardians are beaten, lights campfires and reveals building plots as they unlock. */
export function syncWorld() {
  const s = G.save;
  for (const o of G.world.objs) {
    const z = o.zone ? zoneById(o.zone) : null;
    if (o.kind === 'gate' && z?.guardian) o.hidden = s.bosses.includes(z.guardian.kind);
    if (o.kind === 'camp') o.hidden = !s.camps.includes(o.zone!);
    if (o.kind === 'plot') {
      if (o.project === 'garden' || o.project === 'training') o.hidden = !has(s, 'plots');
      if (o.project === 'warp') o.hidden = !has(s, 'warpplot');
      if (o.project === 'home') o.label = has(s, 'village') ? 'Build' : 'Rest';
    }
    if (o.kind === 'forge') o.label = s.build.forge === 0 ? (has(s, 'village') ? 'Repair' : 'Look') : has(s, 'forge') ? 'Forge' : 'Look';
    if (o.kind === 'pickup' || o.kind === 'foe') o.hidden = s.flags.includes(o.flag!);
  }
}

/** Walks you back onto the map after a fight. */
export function backToWorld() {
  G.battle = null;
  G.ui.coach(null);
  G.mode = 'world';
  G.ui.setMode('world');
  G.over.resetGrace(3);
  G.input.reset();
  persist();
}
