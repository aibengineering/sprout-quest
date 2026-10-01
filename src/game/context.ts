// The game's shared state, in one place: the save, the map, the current fight, what mode the game is in, and the
// screen transitions. Every flow module (fights, gathering, story…) reads and changes it through `G`.
import { Audio } from '../audio';
import type { Battle } from '../battle/battle';
import { zoneById, type Zone } from '../data';
import { Input } from '../input';
import { Music } from '../music/player';
import { Overworld } from '../overworld';
import { loadState, newState, saveState, type SaveState } from '../state';
import { loadSound, saveSound, type SoundSettings } from '../sound';
import type { UI } from '../ui';
import { has } from '../unlocks';
import { plotOpen } from '../rules';
import { gardenOpen } from '../garden';
import { kitchenOpen } from '../kitchen';
import { poppyAway } from '../procession';
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
  readonly music = new Music(this.audio);
  readonly input = new Input(document.getElementById('touch')!, document.getElementById('joy')!, document.getElementById('joy-knob')!);
  readonly world = new World();
  save: SaveState = loadState() ?? newState();
  /** Mute and volumes: the device's, shared by every save slot. */
  sound: SoundSettings = loadSound(this.save.muted);
  over = new Overworld(this.world, this.save);
  battle: Battle | null = null;
  mode: Mode = 'title';
  /** Set once at startup (main.ts), since the UI's hooks call back into the flow modules. */
  ui!: UI;
  /** Every fight's XP is multiplied by this (dev builds can raise it, to try later stages quickly). */
  xpRate = 1;
  /** Runs once when the menu next closes (the Battle Tower's camp comes back after its Forge and Bag). */
  afterMenu: (() => void) | null = null;
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
  G.save.pos = G.over.savedPos;
  if (G.over.room) G.save.room = G.over.room.id;
  else delete G.save.room;
  saveState(G.save);
}

/** Applies the sound settings to the effects and the music, and keeps them. */
export function applySound(keep = true) {
  const { muted, music, effects } = G.sound;
  G.audio.muted = muted;
  G.audio.effects = effects;
  G.music.volume = music;
  if (keep) saveSound(G.sound);
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
  const sub = z.id === 'village' ? 'Safe · Home of Elder Oswin' : z.id === 'glade' ? 'A peaceful clearing' : `Monsters Lv ${z.lv[0]}–${z.lv[1]}${s.lv < z.rec ? ' · ⚠️ Dangerous!' : ''}`;
  G.ui.banner(z.name, sub);
  if (!s.visited.includes(z.id)) {
    s.visited.push(z.id);
    persist();
  }
}

/** Opens gates whose guardians are beaten, lights campfires and reveals building plots as they unlock. */
export function syncWorld() {
  const s = G.save;
  G.world.setBridge(s.flags.includes('bridge:woods'));
  for (const o of G.world.objs) {
    const z = o.zone ? zoneById(o.zone) : null;
    if (o.kind === 'gate' && z?.guardian) o.hidden = s.bosses.includes(z.guardian.kind);
    // A campfire is there once its road is open, cold until you light it.
    if (o.kind === 'camp') {
      o.hidden = !!z?.guardian && !s.bosses.includes(z.guardian.kind);
      o.label = s.camps.includes(o.zone!) ? 'Rest' : 'Light';
    }
    if (o.kind === 'plot') {
      o.hidden = !plotOpen(s, o.project!);
      if (o.project === 'home') o.label = has(s, 'village') ? 'Build' : 'Rest';
      if (o.project === 'sawmill') o.label = s.build.sawmill ? 'Sawmill' : 'Build';
      if (o.project === 'cottage') o.label = s.build.cottage ? 'Visit' : 'Build';
      if (o.project === 'garden') o.label = gardenOpen(s) ? 'Garden' : 'Build';
    }
    if (o.kind === 'station' && o.id?.startsWith('garden:')) o.hidden = !gardenOpen(s);
    if (o.kind === 'house') o.label = kitchenOpen(s) && !poppyAway(s) ? 'Kitchen' : '';
    if (o.kind === 'forge') o.label = s.build.forge === 0 ? (has(s, 'village') ? 'Repair' : 'Look') : has(s, 'forge') ? 'Forge' : 'Look';
    if (o.kind === 'pickup' || o.kind === 'foe') o.hidden = s.flags.includes(o.flag!);
    if (o.kind === 'bridge') o.hidden = s.flags.includes('bridge:woods');
    // Bram's cabin goes up at the end of his story.
    if (o.kind === 'prop' && o.id === 'bramhut') o.hidden = !s.flags.includes('bram:hut');
    if (o.shown) o.hidden = !o.shown(s);
    // A story's monsters are only there at their step.
    if (o.story) o.hidden ||= (s.stories[o.story.id] ?? 0) !== o.story.step;
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
