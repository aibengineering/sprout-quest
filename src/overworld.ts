// Overworld: walking around, tall-grass encounters and drawing the tile map.
import { GEAR, MATS, MONSTERS, NODES, WORLD_H, ZONES, zoneAtX, type Theme, type Zone } from './data';
import { ROUTES } from './routes';
import { currentQuest } from './quests';
import { repelBelow } from './kitchen';
import { gardenOpen, gardenUpdate, growthStage, plotCount, plotSpot, plotTile, PLOTS_BY_LEVEL } from './garden';
import { drawCarried } from './roomArt';
import { Actors, type Actor } from './actors';
import { hasModel, loadModel } from './models';
import { carriedMount, carriedWeapon, heroBody, projectWeaponPoint } from './weaponPose';
import { Vector3 } from 'three';
import { forgeArt } from './ui';
import { drawFrame, drawHero, drawIdler, drawMonsterAt, drawWalker, frame, heroIn3d, monsterReady, slotOf } from './assets';
import { spriteScale } from './battle/monsters';
import { Roamers, type Roamer } from './roamers';
import { MOVESETS } from './weapons';
import { Fx } from './fx';
import type { Input } from './input';
import { drawPlayer, rrect, shadow } from './sprites';
import type { SaveState } from './state';
import { hash2, T, type TileMap, type World, type WorldObj } from './world';
import { WALL_RISE, type Room } from './room';
import { EchoCave, ECHO_OUTSIDE } from './echoCave';
import { SHORTCUTS, shortcutById, shortcutBuilt, shortcutWorldPoint, type Shortcut } from './shortcuts';
import { HOMES, homeLevel } from './housing';
import { drawBubble, drawSpeech } from './bubble';

const TAU = Math.PI * 2;
/** Chip colors when mining each kind of rock. */
const ROCK_CHIPS: Partial<Record<string, string>> = { rock: '#9a9aa8', copper: '#e8904a', iron: '#b8c8e0', obsidian: '#ff8a3a' };
/** The leaves a felled tree sheds on the map (green by default). */
const TREE_LEAVES: Partial<Record<string, string>> = { pine: '#2f7a45', glimwood: '#b8a0ff', emberwood: '#ff7a3a' };
/** Chance per tile walked in tall grass of being ambushed by monsters you didn't see. */
const ENCOUNTER_CHANCE = 0.06;
/** Map tiles are 1.6 Blender units wide. */
const TILE_BU = 1.6;
/** Sprites are rendered looking down at 30°: ground depth shows at half its size. */
const DEPTH = 0.5;

export interface MapLayers {
  ground(ctx: CanvasRenderingContext2D, ts: number): void;
  over(ctx: CanvasRenderingContext2D, ts: number, view: { x: number; y: number; w: number; h: number }): void;
  /** Extra tiles the camera may look past the map's top just now (a story's tunnels up against it, clear of the HUD). */
  headroom(): number;
}

/** `roamer` is the monster that caught you, or null for an ambush from the grass. */
export type WorldEvent = { type: 'encounter'; roamer: Roamer | null } | { type: 'zone'; zone: Zone } | null;

/** How far (in tiles) the camera may look past the map's top and bottom: about the HUD's and the buttons' height. */
const OVERSCROLL = { top: 1.5, bottom: 3 };

/**
 * A room fits on the screen whole, between the HUD (with the hint or what someone's saying under it) and the buttons
 * at the bottom (pixels): nothing's ever cut off at the edges, and nothing needs the camera to follow you.
 */
export const ROOM_BAND = { top: 140, bottom: 136 };

/** A rectangle on the screen, in pixels. */
export interface Rect { x: number; y: number; w: number; h: number }

export class Overworld {
  x: number;
  y: number;
  face = Math.PI / 2;
  moving = false;
  t = 0;
  alert = 0;
  private zone: Zone;
  readonly roamers: Roamers;
  private stepAcc = 0;
  /** Camera zoom (above 1 while swooping into or out of a fight). */
  zoom = 1;
  readonly fx = new Fx();
  ts = 40;
  /** Current goal's location in tiles; drawn as a bouncing waypoint arrow. */
  objective: { x: number; y: number } | null = null;
  /** Show "E" on interaction bubbles when a keyboard is in use. */
  keyHints = false;
  /** Camera position in tiles. It follows the hero, or glides to `camTarget` during cutscenes. */
  camX = 0;
  camY = 0;
  camTarget: { x: number; y: number } | (() => { x: number; y: number }) | null = null;
  /** During scenes: no action prompt or waypoint arrow. */
  quiet = false;
  /** A station is using your hands: no action prompt. */
  busyHands = false;
  /** Something you're carrying about on the map (seeds, the watering can), held up over your head. */
  carried: { icon: string; emoji: string; count?: number } | null = null;
  /** The Garden plot the action button works on just now (ringed on the map). */
  gardenPlot: number | null = null;
  /** The last frame's view (camera top in pixels, tile size, height), to tell where things are on screen. */
  private view = { left: 0, top: 0, ts: 1, vh: 1 };
  /** Inside a room, as last drawn (screen pixels): each station, you, and the feelings over people's heads. */
  roomRects: { stations: (Rect & { id: string })[]; hero: Rect; bubbles: Rect[]; caption?: Rect | null; label?: Rect | null } = { stations: [], hero: { x: 0, y: 0, w: 0, h: 0 }, bubbles: [] };
  /** Where each station's drawing tops out (map pixels), for its label to sit on it. */
  private stationTop = new Map<WorldObj, number>();
  /** Story characters on the map. */
  readonly actors = new Actors();
  readonly echo = new EchoCave();
  /** Separate underground map, with its own collision and cast. */
  underground: EchoCave | null = null;
  /**
   * What the side stories paint onto the map: on the ground (under everyone), and over everything (light and dark,
   * ripples, a gaze on the floor), under the feelings over people's heads. `view` is the screen, in map pixels.
   */
  layers: MapLayers | null = null;
  /** The camera's extra headroom over the map's top (eased toward what the layers ask for). */
  private headroom = 0;
  /** The room you've walked into (Granny's Kitchen, Bram's Sawmill), if any: you walk around it instead of the map. */
  room: Room | null = null;
  /** Where you'll be back outside when you leave the room. */
  private outside = { x: 0, y: 0 };
  /** Tree being chopped, and how long it keeps shaking from the last strike. */
  chopping: WorldObj | null = null;
  private shakeT = 0;
  private crossingRaisedAt: Record<string, number> = {};

  /** A paid crossing assembles on the map; its saved collision already exists if the page is reloaded. */
  raiseShortcut(id: string, reduced = false) {
    const p = shortcutById(id);
    if (!p) return;
    this.crossingRaisedAt[id] = this.t - (reduced ? 10 : 0);
    const at = shortcutWorldPoint(p, { x: p.deck.x + p.deck.w/2, y: p.deck.y + p.deck.h/2 });
    this.fx.burst(at.x * this.ts, at.y * this.ts, this.bridgePalette(p)[0], reduced ? 0 : 12, this.ts, { size: this.ts*.065, life: 1 });
  }

  constructor(private world: World, private save: SaveState) {
    this.x = save.pos.x;
    this.y = save.pos.y;
    // Recover from a stale save position that's now inside a wall.
    if (world.blocked(this.x, this.y, 0.28)) {
      const p = world.entryPoint('village');
      this.x = p.x;
      this.y = p.y;
    }
    this.zone = world.zoneAt(this.x);
    this.camX = this.x;
    this.camY = this.y;
    this.roamers = new Roamers(world);
    this.roamers.populate(this.x, this.y, save.wins === 0);
  }

  get currentZone(): Zone {
    return this.zone;
  }

  /** What you're walking around: the room you're in, or the map. */
  get map(): TileMap {
    return this.underground ?? this.room ?? this.world;
  }

  /** Who's around you: the room's people, or the map's. */
  get cast() {
    return this.underground?.actors ?? this.room?.actors ?? this.actors;
  }

  /** Where your save puts you: outside the door while you're in a room (rooms aren't saved positions). */
  get savedPos() {
    return this.underground ? { ...ECHO_OUTSIDE } : this.room ? { ...this.outside } : { x: this.x, y: this.y };
  }

  /** Steps into a room, from `outside` (where you'll come back out). */
  enterRoom(room: Room, outside: { x: number; y: number }) {
    this.underground = null;
    this.outside = { ...outside };
    this.room = room;
    const p = room.spawn;
    this.x = this.camX = p.x;
    this.y = this.camY = p.y;
    this.face = -Math.PI / 2;
    this.moving = false;
    this.chopping = null;
  }

  /** Back out of the room's door, facing away from it. */
  leaveRoom() {
    if (!this.room) return;
    this.room = null;
    this.teleport(this.outside.x, this.outside.y);
    this.face = Math.PI / 2;
  }

  teleport(x: number, y: number) {
    // Going anywhere else (a warp, a respawn) takes you out of a room first.
    this.room = null;
    this.underground = null;
    this.x = x;
    this.y = y;
    this.camX = x;
    this.camY = y;
    this.roamers.calm = 3;
    this.zone = this.world.zoneAt(x);
    this.actors.regroup(x, y);
  }

  enterCave(at = this.echo.spawn) {
    this.teleport(ECHO_OUTSIDE.x, ECHO_OUTSIDE.y);
    this.underground = this.echo;
    this.relocate(at.x, at.y);
    this.face = -Math.PI / 2;
    this.chopping = null;
  }

  /** Move within the active map (a cave-in or climb), without leaving its instance. */
  relocate(x: number, y: number) {
    this.x = this.camX = x;
    this.y = this.camY = y;
    this.moving = false;
  }

  /** A few seconds where no monster notices you, so you aren't jumped the moment a fight ends. */
  resetGrace(seconds = 2.5) {
    this.roamers.calm = Math.max(this.roamers.calm, seconds);
  }

  /** A campfire catching alight: a burst of flame and sparks, and its glow swelling in. */
  kindle(o: WorldObj) {
    const ts = this.ts, x = (o.x + o.w / 2) * ts, y = (o.y + o.h - 0.3) * ts;
    this.fx.burst(x, y, '#ffb03a', 24, ts * 3.5, { size: ts * 0.1, grav: -ts * 1.2, life: 0.9 });
    this.fx.burst(x, y, '#ff6a2a', 14, ts * 2.5, { size: ts * 0.08, grav: -ts * 2, life: 0.7 });
    this.fx.burst(x, y - ts * 0.3, '#fff6c8', 10, ts * 3, { size: ts * 0.06, star: true, grav: -ts * 0.4, life: 1.1 });
    this.kindledAt[o.zone!] = this.t;
  }
  /** When each campfire was lit (for its glow swelling in). */
  private kindledAt: Record<string, number> = {};

  /** Waking from a faint: a burst of Veyra's light where you stand. */
  revived() {
    const ts = this.ts, x = this.x * ts, y = (this.y - 0.4) * ts;
    this.fx.burst(x, y, '#fff6c8', 18, ts * 3, { size: ts * 0.08, star: true, grav: -ts * 0.5, life: 0.9 });
    this.fx.burst(x, y, '#9ad8ff', 12, ts * 2, { size: ts * 0.06, grav: -ts, life: 1.1 });
  }

  /** Turn to face a tree and start chopping it. */
  startChop(o: WorldObj) {
    this.chopping = o;
    this.face = Math.atan2(o.y + o.h / 2 - this.y, o.x + o.w / 2 - this.x);
    this.moving = false;
  }

  /** Wood chips (or rock chips and sparks) fly and the node shakes; bigger for better strikes. */
  chopHit(strength: number) {
    const o = this.chopping;
    if (!o) return;
    this.shakeT = 0.25;
    const ts = this.ts, x = (o.x + o.w / 2) * ts, y = (o.y + o.h / 2 - 0.3) * ts;
    const rock = NODES[o.node!].skill === 'mine';
    this.fx.burst(x, y, rock ? ROCK_CHIPS[o.node!] ?? '#9a9aa8' : '#c89a6a', 3 + Math.round(strength * 4), ts * 2.2, { size: ts * 0.07, life: 0.5 });
    if (rock) this.fx.burst(x, y - ts * 0.2, '#fff6c8', 2 + Math.round(strength * 2), ts * 2.6, { size: ts * 0.04, life: 0.25 });
    if (strength > 1) this.fx.burst(x, y - ts * 0.5, '#fff6a0', 4, ts * 1.6, { star: true, size: ts * 0.08, life: 0.5 });
  }

  /** The tree comes down in a burst of leaves, or the rock bursts into chunks. */
  felled() {
    const o = this.chopping;
    if (o) {
      const ts = this.ts, x = (o.x + o.w / 2) * ts, y = (o.y - 0.6) * ts;
      if (NODES[o.node!].skill === 'mine') {
        this.fx.burst(x, y + ts * 0.4, ROCK_CHIPS[o.node!] ?? '#9a9aa8', 20, ts * 3, { size: ts * 0.1, life: 0.8 });
        this.fx.burst(x, y + ts * 0.4, '#e8e0d8', 10, ts * 2, { size: ts * 0.12, life: 0.9, grav: -ts * 0.5 });
      } else {
        this.fx.burst(x, y, TREE_LEAVES[o.node!] ?? '#5ab85a', 22, ts * 3, { size: ts * 0.1, life: 0.9 });
        this.fx.burst(x, y + ts * 0.6, '#c89a6a', 8, ts * 2, { size: ts * 0.07, life: 0.6 });
      }
    }
    this.chopping = null;
  }

  /**
   * What the action button would use: a character you're facing (so someone following you, or standing beside a tree,
   * doesn't get in the way of chopping), or the nearest object.
   */
  nearbyObject(): WorldObj | null {
    const facing = (a: { x: number; y: number }) => {
      const turn = Math.abs(((Math.atan2(a.y - this.y, a.x - this.x) - this.face + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      return turn < Math.PI / 3;
    };
    const talk = this.cast.list.find((a) => a.label && Math.hypot(a.x - this.x, a.y - (this.y - 0.2)) < 1.4 && facing(a));
    if (talk) return { kind: 'npc', id: talk.id, x: talk.x - 0.35, y: talk.y - 0.45, w: 0.7, h: 0.45, label: talk.label! };
    return this.map.nearestObj(this.x, this.y - 0.2, 1.4);
  }

  /** `roam`: monsters keep moving (and can catch you) even while you can't walk, e.g. while chopping. */
  update(dt: number, input: Input, frozen: boolean, roam = !frozen): WorldEvent {
    this.t += dt;
    // A spirit walks unseen: nothing notices it, chases it or jumps out at it.
    if (this.save.spirit) this.roamers.calm = Math.max(this.roamers.calm, 0.5);
    if (roam && this.alert <= 0 && !this.room && !this.underground) {
      const caught = this.roamers.update(dt, this.x, this.y, this.save.wins === 0, repelBelow(this.save));
      if (caught) {
        this.alert = 0.3;
        this.moving = false;
        return { type: 'encounter', roamer: caught };
      }
    }
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.fx.update(dt);
    this.cast.update(dt, this);
    this.headroom += ((this.layers?.headroom() ?? 0) - this.headroom) * (1 - Math.exp(-dt * 3));
    const target = (typeof this.camTarget === 'function' ? this.camTarget() : this.camTarget) ?? { x: this.x, y: this.y };
    const k = 1 - Math.exp(-dt * (this.camTarget ? 2.2 : 12));
    this.camX += (target.x - this.camX) * k;
    this.camY += (target.y - this.camY) * k;
    if (this.alert > 0) {
      this.alert -= dt;
      this.moving = false;
      return null;
    }
    if (frozen) {
      this.moving = false;
      return null;
    }
    const a = input.axis();
    const mag = Math.hypot(a.x, a.y);
    this.moving = mag > 0.1;
    if (!this.moving) return null;
    this.face = Math.atan2(a.y, a.x);
    const spdBonus = (GEAR[this.save.equip.armor]?.spd ?? 0) + (this.save.equip.charm ? GEAR[this.save.equip.charm]?.spd ?? 0 : 0);
    const speed = 5 * (1 + spdBonus / 100) * (this.save.perks.includes('trailboots') ? 1.25 : 1);
    const dx = a.x * speed * dt, dy = a.y * speed * dt;
    const r = 0.28;
    const ox = this.x, oy = this.y;
    if (!this.map.blocked(this.x + dx, this.y, r)) this.x += dx;
    if (!this.map.blocked(this.x, this.y + dy, r)) this.y += dy;
    const moved = Math.hypot(this.x - ox, this.y - oy);
    if (this.room || this.underground) return null;

    let ev: WorldEvent = null;
    const z = this.world.zoneAt(this.x);
    if (z !== this.zone) {
      this.zone = z;
      ev = { type: 'zone', zone: z };
    }

    const onGrass = this.world.tile(Math.floor(this.x), Math.floor(this.y - 0.1)) === T.GRASS;
    if (onGrass && moved > 0) {
      if (Math.random() < 0.25) this.fx.burst(this.x * this.ts, (this.y - 0.1) * this.ts, this.zone.theme.grassTip, 2, this.ts * 1.5, { size: this.ts * 0.06, life: 0.4 });
      // Tall grass is never quite safe: something you didn't see can jump out.
      this.stepAcc += moved;
      while (this.stepAcc >= 1) {
        this.stepAcc -= 1;
        // Goo Jelly: grass whose monsters are all well below you stays quiet.
        const rep = repelBelow(this.save), quiet = rep !== null && this.zone.lv[1] <= rep;
        if (this.roamers.calm <= 0 && !this.save.spirit && this.zone.monsters.length && !quiet && Math.random() < ENCOUNTER_CHANCE) {
          this.alert = 0.4;
          this.moving = false;
          this.stepAcc = 0;
          return { type: 'encounter', roamer: null };
        }
      }
    }
    return ev;
  }

  /** How far down the screen a map row is (0 top, 1 bottom), as of the last frame. */
  screenY(y: number) {
    return (y * this.view.ts - this.view.top) / this.view.vh;
  }

  /** The map spot (in tiles) under a point on the screen, as of the last frame. */
  toMap(px: number, py: number) {
    return { x: (px + this.view.left) / this.view.ts, y: (py + this.view.top) / this.view.ts };
  }

  /** A map spot in screen pixels, for effects travelling from a station to the HUD. */
  toScreen(x: number, y: number) {
    return { x: x * this.view.ts - this.view.left, y: y * this.view.ts - this.view.top };
  }

  /** Tile size in pixels for this screen (fights on the map zoom in from this). */
  static tileSize(vw: number, vh: number) {
    return Math.round(Math.max(32, Math.min(60, Math.min(vw, vh) / 9.5)));
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
    const W = this.map;
    // Rooms are seen a little closer up than the map, but always whole: as big as fits between the HUD and the buttons,
    // from the top of the back wall to the front wall.
    const R = this.room?.spec;
    const roomRows = R ? R.h + WALL_RISE - 0.1 : 0;
    const ts = (this.ts = R
      ? Math.round(Math.min(Overworld.tileSize(vw, vh) * 1.25, vw / (R.w - 0.3), (vh - ROOM_BAND.top - ROOM_BAND.bottom) / roomRows) * this.zoom)
      : Math.round(Overworld.tileSize(vw, vh) * this.zoom));
    const mapW = W.w * ts, mapH = (!this.room && !this.underground ? ROUTES[this.zone.id]?.length ?? WORLD_H : W.h) * ts;
    let camX = this.camX * ts - vw / 2;
    let camY = (this.camY - 0.5) * ts - vh / 2;
    const mapLeft = W.x0 * ts, mapTop = W.y0 * ts;
    camX = mapW <= vw ? mapLeft + (mapW - vw) / 2 : Math.max(mapLeft, Math.min(mapLeft + mapW - vw, camX));
    // The camera can look a little past the top and bottom of the map (the forest carries on out there), so nothing
    // on the edge rows hides under the HUD or the buttons.
    const overTop = ts * (OVERSCROLL.top + this.headroom), overBottom = ts * OVERSCROLL.bottom;
    // A room sits in the middle of the band between the HUD and the buttons, its back wall rising above its top row.
    if (R) camY = (-WALL_RISE - 0.25 + roomRows / 2) * ts - (ROOM_BAND.top + (vh - ROOM_BAND.bottom)) / 2;
    else if (mapH + overTop + overBottom <= vh) camY = mapTop + (mapH - vh) / 2;
    else camY = Math.max(mapTop - overTop, Math.min(mapTop + mapH - vh + overBottom, camY));
    camX = Math.round(camX);
    camY = Math.round(camY);
    this.view = { left: camX, top: camY, ts, vh };
    if (this.room) this.drawRoom(ctx, this.room, camX, camY, ts, vw, vh);
    else this.drawScene(ctx, camX / ts, camY / ts, ts, vw, vh);

    ctx.save();
    ctx.translate(-camX, -camY);
    if (this.objective && !this.quiet && !this.room) this.drawObjective(ctx, camX, camY, vw, vh, ts);

    // Interaction hint bubble (not while chopping or mining: the minigame's card is up)
    const near = this.quiet || this.chopping || this.busyHands ? null : this.nearbyObject();
    this.roomRects.label = null;
    if (near && this.alert <= 0) {
      // A room's doormat says "Leave" under it, not over you standing on it, and its stations wear theirs on top of
      // what's drawn (not over your head as you stand in front). In the Garden's field it's over the plot you'd work on.
      const bed = near.project === 'garden' && this.gardenPlot !== null ? plotSpot(near, this.gardenPlot) : null;
      const top = this.room && near.kind === 'station' ? this.stationTop.get(near) : undefined;
      let bx = (bed ? bed.x : near.x + near.w / 2) * ts;
      const by = (top !== undefined ? top / ts + 0.15 : bed ? bed.y - 0.55 : near.kind === 'door' ? near.y + near.h + 0.75 : near.y) * ts - ts * 0.3 + Math.sin(this.t * 4) * 3;
      ctx.font = `900 ${Math.round(ts * 0.4)}px ui-rounded, "Nunito", system-ui, sans-serif`;
      const label = this.keyHints ? `[E] ${near.label}` : near.label;
      const tw = ctx.measureText(label).width + ts * 0.4;
      if (this.room) bx = Math.max(camX + tw / 2 + 4, Math.min(camX + vw - tw / 2 - 4, bx));
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      rrect(ctx, bx - tw / 2, by - ts * 0.5, tw, ts * 0.55, ts * 0.2);
      if (this.room) this.roomRects.label = { x: bx - tw / 2 - camX, y: by - ts * 0.5 - camY, w: tw, h: ts * 0.55 };
      ctx.fill();
      ctx.fillStyle = '#5a3a6a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx, by - ts * 0.22);
    }
    ctx.restore();
  }

  /** The map itself: ground, scenery, buildings, monsters and the hero. `left`/`top` are the camera's corner in tiles. */
  private drawScene(ctx: CanvasRenderingContext2D, left: number, top: number, ts: number, vw: number, vh: number) {
    const W = this.map;
    const camX = Math.round(left * ts), camY = Math.round(top * ts);
    ctx.fillStyle = this.zone.theme.outside;
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-camX, -camY);

    const x0 = Math.max(W.x0, Math.floor(camX / ts) - 1), x1 = Math.min(W.x0 + W.w - 1, Math.ceil((camX + vw) / ts) + 1);
    // Rows past the map's edges are forest (World.tile calls them obstacles).
    const y0 = Math.max(W.y0 - Math.ceil(OVERSCROLL.top + this.headroom) - 1, Math.floor(camY / ts) - 1), y1 = Math.min(W.y0 + W.h + Math.ceil(OVERSCROLL.bottom), Math.ceil((camY + vh) / ts) + 2);

    // Ground layer
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const th = zoneAtX(x).theme;
        const t = W.tile(x, y);
        const px = x * ts, py = y * ts;
        ctx.fillStyle = hash2(x, y, 1) < 0.5 ? th.ground : th.ground2;
        ctx.fillRect(px, py, ts + 1, ts + 1);
        if (t === T.PATH) this.drawPath(ctx, x, y, px, py, ts, th);
        else if (t === T.POOL) this.drawPool(ctx, x, y, px, py, ts, th);
        else if (t === T.CHASM) this.drawChasm(ctx, x, y, px, py, ts);
        else if (t === T.BRIDGE) {
          const p = this.crossingAt(x, y);
          if (p?.gap === 'chasm') this.drawChasm(ctx, x, y, px, py, ts);
          else this.drawPool(ctx, x, y, px, py, ts, th);
          this.drawBridge(ctx, x, y, px, py, ts);
        }
        else if (t === T.GRASS) this.drawGrass(ctx, x, y, px, py, ts, th);
        else if (t === T.DECOR) this.drawDecor(ctx, x, y, px, py, ts, th);
      }
    }

    if (!this.underground) this.drawFieldGround(ctx, ts);
    this.layers?.ground(ctx, ts);

    // Y-sorted: obstacles, buildings and the hero
    const items: { y: number; draw: () => void }[] = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (W.tile(x, y) === T.OBST) {
          const th = zoneAtX(x).theme;
          items.push({ y: y + 0.9, draw: () => this.drawObstacle(ctx, x, y, ts, th) });
        }
    for (const o of W.objs) {
      // A crossing's far landing can be visible while its construction stake is off screen.
      const crossing = o.kind === 'bridge' ? shortcutById(o.id!) : null;
      const deck = crossing && shortcutWorldPoint(crossing, crossing.deck);
      const left = deck ? Math.min(o.x, deck.x - .45) : o.x;
      const right = deck ? Math.max(o.x + o.w, deck.x + crossing!.deck.w + .45) : o.x + o.w;
      if (right < x0 - 2 || left > x1 + 2) continue;
      if (o.kind === 'fence') this.fenceItems(ctx, o, ts, items);
      else if (o.kind === 'plot' && o.project === 'garden') this.fieldItems(ctx, o, ts, items);
      else items.push({ y: o.y + o.h, draw: () => this.drawObj(ctx, o, ts) });
    }
    for (const r of this.underground ? [] : this.roamers.list) {
      if (r.x < x0 - 2 || r.x > x1 + 2) continue;
      items.push({ y: r.y, draw: () => this.drawRoamer(ctx, r, ts) });
    }
    for (const a of this.cast.list) {
      if (a.x < x0 - 2 || a.x > x1 + 2) continue;
      items.push({ y: a.y, draw: () => this.drawActor(ctx, a, ts) });
    }
    items.push({ y: this.y, draw: () => this.drawHero(ctx, ts) });
    const body = this.save.spirit;
    if (body) items.push({ y: body.y, draw: () => this.drawBody(ctx, body, ts) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    if (this.carried) drawCarried(ctx, this.x * ts, this.y * ts, ts, this.carried.icon, this.carried.emoji, this.carried.count, this.t);
    this.fx.draw(ctx);
    this.layers?.over(ctx, ts, { x: camX, y: camY, w: vw, h: vh });
    // Feelings float above everything, so you can read them from across the screen.
    for (const a of this.cast.list) {
      const emoji = a.bubble?.emoji ?? a.mood;
      if (!emoji || a.x < x0 - 2 || a.x > x1 + 2) continue;
      drawBubble(ctx, a.x * ts, (a.y - this.actorHeight(a)) * ts, emoji, ts * 0.62, a.bubble ? a.bubble.t : 1 + this.t, a.bubble?.hold ?? Infinity);
    }
    this.drawSpeeches(ctx, this.cast.list, ts, camX, vw);
    for (const o of W.objs) {
      if (o.hidden || !o.foes || o.x + o.w < x0 - 2 || o.x > x1 + 2) continue;
      drawBubble(ctx, (o.x + o.w / 2) * ts, (o.y + o.h / 2 - (o.boss ? 1.9 : 1.2)) * ts, o.boss ? '😠' : '❗', ts * 0.55, 1 + this.t);
    }
    ctx.restore();
  }

  /** What people are saying, over their heads (and over their feelings), kept on screen. */
  private drawSpeeches(ctx: CanvasRenderingContext2D, list: Actor[], ts: number, camX: number, vw: number) {
    for (const a of list) {
      if (!a.speech) continue;
      const lift = this.actorHeight(a) + (a.bubble || a.mood ? 0.75 : 0);
      drawSpeech(ctx, a.x * ts, (a.y - lift) * ts, a.speech.text, Math.max(26, ts * 0.55), a.speech.t, a.speech.hold, camX + 8, camX + vw - 8);
    }
  }

  /**
   * Inside a room: its floor and walls, then its stations, its people and you in depth order, then whatever floats
   * over it all (what you're carrying, a pot's steam, people's feelings and what they say).
   */
  private drawRoom(ctx: CanvasRenderingContext2D, R: Room, camX: number, camY: number, ts: number, vw: number, vh: number) {
    ctx.fillStyle = R.spec.bg;
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-camX, -camY);
    R.painter?.floor(ctx, ts);
    const items: { y: number; draw: () => void }[] = [];
    const rects: Overworld['roomRects'] = (this.roomRects = { caption: this.roomRects.caption, stations: [], hero: { x: this.x * ts - ts * 0.4 - camX, y: (this.y - 1.4) * ts - camY, w: ts * 0.8, h: ts * 1.4 }, bubbles: [] });
    for (const o of R.objs) {
      if (o.hidden || o.kind !== 'station') continue;
      items.push({ y: o.y + o.h, draw: () => {
        const top = Math.min(o.y * ts, R.painter?.obj(ctx, o, ts) ?? Infinity);
        this.stationTop.set(o, top);
        rects.stations.push({ id: o.id!, x: o.x * ts - camX, y: top - camY, w: o.w * ts, h: (o.y + o.h) * ts - top });
      } });
    }
    for (const a of R.actors.list) items.push({ y: a.y, draw: () => this.drawActor(ctx, a, ts) });
    items.push({ y: this.y, draw: () => this.drawHero(ctx, ts) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    this.fx.draw(ctx);
    R.painter?.over(ctx, ts);
    // How people feel, over their heads; what they say shows at the top of the screen, with their feeling beside it
    // (see drawRoomHud), never over the room.
    for (const a of R.actors.list) {
      const emoji = a.bubble?.emoji ?? a.mood, s = ts * 0.62, x = a.x * ts, y = (a.y - this.actorHeight(a)) * ts;
      if (!emoji || a.speech) continue;
      drawBubble(ctx, x, y, emoji, s, a.bubble ? a.bubble.t : 1 + this.t, a.bubble?.hold ?? Infinity);
      rects.bubbles.push({ x: x - s * 0.58 - camX, y: y - s * 1.22 - camY, w: s * 1.16, h: s * 1.22 });
    }
    ctx.restore();
  }

  /** A monster out in the grass: hops about, shows "!" when it spots you, and a badge if friends are hiding with it. */
  private drawRoamer(ctx: CanvasRenderingContext2D, r: Roamer, ts: number) {
    const px = r.x * ts, py = r.y * ts;
    const hop = r.moving || r.state === 'notice' ? Math.abs(Math.sin(this.t * (r.state === 'chase' ? 12 : 7) + r.seed)) * ts * 0.14 : 0;
    const flying = r.kind === 'bat' || r.kind === 'imp';
    const lift = flying ? ts * (0.35 + Math.sin(this.t * 3 + r.seed) * 0.06) : hop;
    // Nothing at all until it can be drawn (no lone shadow or badge floating in the grass).
    if (!monsterReady(r.kind)) return;
    shadow(ctx, px, py, ts * 0.28 * (flying ? 0.7 : 1));
    // Same size relative to the hero as in battle.
    drawMonsterAt(ctx, slotOf(r, 'roamer'), r.kind, r.golden, (this.t * 7 + r.seed) / 6, r.face < 0, px, py - lift, ts * 0.74 * spriteScale(r.kind));
    if (r.golden && Math.random() < 0.1) this.fx.burst(px + (Math.random() - 0.5) * ts * 0.6, py - Math.random() * ts * 0.8, '#fff6a0', 1, ts * 0.3, { star: true, size: ts * 0.07, grav: -ts * 0.4, life: 0.6 });
    // Tall grass hides their feet, like yours.
    if (this.world.tile(Math.floor(r.x), Math.floor(r.y - 0.1)) === T.GRASS && !flying) {
      ctx.fillStyle = zoneAtX(Math.floor(r.x)).theme.grass;
      for (let i = -2; i <= 2; i++) {
        const bx = px + i * ts * 0.12, sway = Math.sin(this.t * 6 + i + r.seed) * ts * 0.03;
        ctx.beginPath();
        ctx.moveTo(bx - ts * 0.07, py + 1);
        ctx.lineTo(bx + sway, py - ts * (0.22 + (i & 1) * 0.06));
        ctx.lineTo(bx + ts * 0.07, py + 1);
        ctx.fill();
      }
    }
    const top = py - ts * 1.05 - lift;
    if (r.state === 'notice' || r.state === 'chase') {
      const s = r.state === 'notice' ? 1 + Math.max(0, r.t) * 0.8 : 1;
      ctx.save();
      ctx.translate(px, top - ts * 0.15);
      ctx.scale(s, s);
      ctx.fillStyle = '#fff';
      rrect(ctx, -ts * 0.16, -ts * 0.46, ts * 0.32, ts * 0.46, ts * 0.12);
      ctx.fill();
      ctx.fillStyle = '#ff4a5a';
      ctx.font = `900 ${Math.round(ts * 0.38)}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, -ts * 0.22);
      ctx.restore();
    } else if (r.extra > 0) {
      ctx.font = `900 ${Math.round(ts * 0.26)}px ui-rounded, "Nunito", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = `×${r.extra + 1}`;
      const w = ctx.measureText(label).width + ts * 0.18;
      ctx.fillStyle = 'rgba(74,42,90,0.85)';
      rrect(ctx, px + ts * 0.18, top, w, ts * 0.32, ts * 0.14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, px + ts * 0.18 + w / 2, top + ts * 0.165);
    }
  }


  /** A golden arrow over the goal, or pinned to the screen edge pointing toward it when it's off-screen. */
  private drawObjective(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number, ts: number) {
    const o = this.objective!;
    const wx = o.x * ts, wy = o.y * ts;
    const sx = wx - camX, sy = wy - camY;
    const top = 130, bottom = vh - 150, left = 30, right = vw - 30;
    const bounce = Math.abs(Math.sin(this.t * 4)) * ts * 0.18;
    const arrow = (x: number, y: number, ang: number, size: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(size * 0.6, 0);
      ctx.lineTo(-size * 0.4, -size * 0.5);
      ctx.lineTo(-size * 0.2, 0);
      ctx.lineTo(-size * 0.4, size * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#ffd35a';
      ctx.strokeStyle = '#6a3a5a';
      ctx.lineWidth = size * 0.1;
      ctx.lineJoin = 'round';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    if (sx > left && sx < right && sy > top - ts && sy < bottom) {
      // On screen: bob above the target.
      const ay = wy - ts * 1.1 - bounce;
      ctx.fillStyle = 'rgba(255,211,90,0.25)';
      ctx.beginPath();
      ctx.ellipse(wx, wy, ts * (0.5 + 0.1 * Math.sin(this.t * 4)), ts * 0.22, 0, 0, TAU);
      ctx.fill();
      arrow(wx, ay, Math.PI / 2, ts * 0.7);
      return;
    }
    // Off screen: pin to the edge, pointing the way.
    const cx = vw / 2, cy = (top + bottom) / 2;
    const dx = sx - cx, dy = sy - cy;
    const k = Math.min((dx > 0 ? right - cx : left - cx) / (dx || 1e-6), (dy > 0 ? bottom - cy : top - cy) / (dy || 1e-6));
    const ex = cx + dx * Math.abs(k), ey = cy + dy * Math.abs(k);
    const ang = Math.atan2(dy, dx);
    const pulse = 1 + Math.sin(this.t * 5) * 0.08;
    ctx.fillStyle = 'rgba(74,42,90,0.55)';
    ctx.beginPath();
    ctx.arc(camX + ex, camY + ey, ts * 0.55 * pulse, 0, TAU);
    ctx.fill();
    arrow(camX + ex, camY + ey, ang, ts * 0.75 * pulse);
  }

  /** Your body where you fainted: lying on its side, greyed, with a faint glow so you can spot it from afar. */
  private drawBody(ctx: CanvasRenderingContext2D, b: { x: number; y: number }, ts: number) {
    const px = b.x * ts, py = b.y * ts, pulse = 0.5 + 0.5 * Math.sin(this.t * 2.5);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.2 * pulse;
    ctx.fillStyle = '#fff6c8';
    ctx.beginPath();
    ctx.ellipse(px, py, ts * 0.7, ts * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    shadow(ctx, px, py, ts * 0.35);
    drawHero(ctx, this.save.equip.armor, px + ts * 0.3, py - ts * 0.05, ts / 1.2, Math.PI / 2, false, 0, { rot: -Math.PI / 2, tint: '#8a90a8', tintAmount: 0.45 }, 'hero-body');
  }

  private drawHero(ctx: CanvasRenderingContext2D, ts: number) {
    const spirit = !!this.save.spirit;
    // As a spirit you float a little, see-through and pale blue.
    const px = this.x * ts, py = this.y * ts - (spirit ? ts * (0.12 + 0.05 * Math.sin(this.t * 3)) : 0);
    shadow(ctx, px, this.y * ts, ts * (spirit ? 0.18 : 0.27));
    // Your weapon rides on you: swords and hammers strapped across your back, whips and wands at your hip. In 3D it's
    // part of the model (it turns with you); with sprites it's drawn peeking over a shoulder.
    const wpn = GEAR[this.save.equip.weapon];
    const style = wpn?.style ?? 'sword';
    const size = MOVESETS[style]?.size ?? 1;
    const held = wpn && carriedWeapon(wpn, size);
    // New gear was not owned at startup. Request it even while its sprite is still being drawn.
    if (held && !hasModel(held.id)) void loadModel(held.id);
    const in3d = !!wpn && hasModel(`wpn_${wpn.id}`) && heroIn3d(this.save.equip.armor);
    const wf = !in3d && wpn && frame(`wpn/${wpn.id}`);
    const away = Math.sin(this.face) < -0.5;
    const back = () => {
      if (wf && held) {
        const mount = carriedMount(held), body = heroBody(this.face, this.moving, this.t);
        const origin = projectWeaponPoint(mount.position.clone().applyMatrix4(body), ts / 1.2);
        const end = projectWeaponPoint(mount.position.clone().add(new Vector3(1, 0, 0).applyQuaternion(mount.rotation)).applyMatrix4(body), ts / 1.2);
        drawFrame(ctx, wf, px + origin.x, py + origin.y, held.scale * Math.hypot(end.x - origin.x, end.y - origin.y), { rot: Math.atan2(end.y - origin.y, end.x - origin.x) });
      }
    };
    if (!away) back();
    const look = spirit ? { alpha: 0.55, tint: '#bfe6ff', tintAmount: 0.6 } : {};
    if (!drawHero(ctx, this.save.equip.armor, px, py, ts / 1.2, this.face, this.moving, this.t, look, 'hero', in3d && !spirit ? held : undefined)) {
      drawPlayer(ctx, px, py, ts * 0.3, {
        t: this.t, moving: this.moving, face: this.face,
        armor: GEAR[this.save.equip.armor]?.color ?? '#6fa8ff',
      });
    }
    if (away) back();
    // Tall grass hides your feet — cute and tells you you're in encounter territory.
    if (this.map.tile(Math.floor(this.x), Math.floor(this.y - 0.1)) === T.GRASS) {
      const th = this.zone.theme;
      ctx.fillStyle = th.grass;
      for (let i = -2; i <= 2; i++) {
        const bx = px + i * ts * 0.12, sway = Math.sin(this.t * 6 + i) * ts * 0.03;
        ctx.beginPath();
        ctx.moveTo(bx - ts * 0.07, py + 1);
        ctx.lineTo(bx + sway, py - ts * (0.22 + (i & 1) * 0.06));
        ctx.lineTo(bx + ts * 0.07, py + 1);
        ctx.fill();
      }
    }
    if (this.alert > 0) {
      const s = 1 + Math.max(0, 0.55 - this.alert) * 0.6;
      ctx.save();
      ctx.translate(px, py - ts * 1.3);
      ctx.scale(s, s);
      ctx.fillStyle = '#fff';
      rrect(ctx, -ts * 0.2, -ts * 0.55, ts * 0.4, ts * 0.55, ts * 0.15);
      ctx.fill();
      ctx.fillStyle = '#ff4a5a';
      ctx.font = `900 ${Math.round(ts * 0.45)}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, -ts * 0.27);
      ctx.restore();
    }
  }

  /** A gathering node: a ribboned tree or an ore-flecked rock when ready, a stump or rubble while it comes back. */
  private drawTree(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
    const ready = (this.save.nodes[o.id!] ?? 0) <= Date.now();
    const rock = NODES[o.node!].skill === 'mine';
    // Rocks have no drawn fallback: skip them (glow and all) until the sprites are in.
    if (rock && !frame(`env/${o.node}_node`)) return;
    const shake = o === this.chopping && this.shakeT > 0 ? Math.sin(this.shakeT * 70) * this.shakeT * 0.25 : 0;
    const cx = (o.x + o.w / 2) * ts, by = (o.y + o.h - 0.08) * ts;
    if (ready) {
      // A soft glow on the ground marks trees you can chop (gold out in the grass).
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = o.grass ? `rgba(255,210,90,${0.22 + Math.sin(this.t * 3 + o.x) * 0.07})` : `rgba(255,255,230,${0.16 + Math.sin(this.t * 3 + o.x) * 0.05})`;
      ctx.beginPath();
      ctx.ellipse(cx, by - ts * 0.02, ts * 0.62, ts * 0.26, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    shadow(ctx, cx, by, ts * (ready ? 0.42 : 0.3));
    const sprite = frame(`env/${o.node}_${ready ? 'node' : rock ? 'rubble' : 'stump'}`) ?? (ready && !rock ? frame(o.node === 'pine' ? 'env/pine0' : 'env/tree1') : null);
    // A touch bigger than the scenery trees so they stand out.
    if (sprite) drawFrame(ctx, sprite, cx, by, (ts / TILE_BU) * (ready ? 1.12 : 1), { rot: ready ? shake + Math.sin(this.t * 1.2 + o.x) * 0.012 : 0 });
    else if (!ready) {
      ctx.fillStyle = '#9a6a44';
      ctx.beginPath();
      ctx.ellipse(cx, by - ts * 0.12, ts * 0.2, ts * 0.14, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8c890';
      ctx.beginPath();
      ctx.ellipse(cx, by - ts * 0.2, ts * 0.17, ts * 0.08, 0, 0, TAU);
      ctx.fill();
    }
    // A glint now and then marks trees you can chop; golden ones out in the grass hide rarer finds.
    if (ready && Math.random() < 0.04) {
      this.fx.burst(cx + (Math.random() - 0.5) * ts * 0.8, by - ts * (0.6 + Math.random() * 0.8), o.grass ? '#ffd35a' : '#ffffff', 1, ts * 0.3, { star: true, size: ts * 0.07, grav: -ts * 0.4, life: 0.8 });
    }
  }

  /** A guardian's roadblock: a barrier on each blocked tile and the boss standing watch in front of it. */
  private drawGate(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number): boolean {
    const zone = ZONES.find((z) => z.id === o.zone);
    const g = zone?.guardian;
    const barrier = g && frame(`env/gate_${g.gate}`);
    if (!g || !barrier) return false;
    const unit = ts / TILE_BU;
    for (let i = 0; i < o.h; i++) {
      const bx = (o.x + 0.5) * ts, by = (o.y + i + 0.92) * ts;
      shadow(ctx, bx, by, ts * 0.45, 0.2);
      drawFrame(ctx, barrier, bx, by, unit, { flip: i % 2 === 1 });
    }
    const gx = (o.x - 0.8) * ts, gy = (o.y + 2.6) * ts;
    if (monsterReady(g.kind)) {
      shadow(ctx, gx, gy, ts * 0.6, 0.25);
      drawMonsterAt(ctx, `guardian:${g.kind}`, g.kind, false, (this.t * 5) / 6, true, gx, gy, unit * 0.8);
    }
    const m = MONSTERS[g.kind];
    const text = `👑 ${m.name} · Lv ${g.lv}`;
    ctx.font = `900 ${Math.round(ts * 0.3)}px ui-rounded, "Nunito", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width + ts * 0.4;
    const ty = gy - ts * 2.1 + Math.sin(this.t * 2) * 3;
    ctx.fillStyle = this.save.lv >= g.lv ? 'rgba(90,60,110,0.9)' : 'rgba(200,60,70,0.92)';
    rrect(ctx, gx - tw / 2, ty - ts * 0.24, tw, ts * 0.48, ts * 0.2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(text, gx, ty);
    return true;
  }

  private drawPath(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number, th: Theme) {
    ctx.fillStyle = th.path;
    const up = this.map.tile(x, y - 1) === T.PATH, down = this.map.tile(x, y + 1) === T.PATH;
    const inset = ts * 0.12;
    ctx.fillRect(px, py + (up ? 0 : inset), ts + 1, ts - (up ? 0 : inset) - (down ? 0 : inset) + 1);
    if (hash2(x, y, 4) < 0.4) {
      ctx.fillStyle = 'rgba(120,90,60,0.18)';
      ctx.beginPath();
      ctx.ellipse(px + hash2(x, y, 5) * ts, py + ts * 0.5, ts * 0.08, ts * 0.05, 0, 0, TAU);
      ctx.fill();
    }
  }

  private crossingAt(x: number, y: number) {
    return SHORTCUTS.find((p) => {
      const d = p.deck, x0 = shortcutWorldPoint(p, d).x;
      return x >= x0 && x < x0+d.w && y >= d.y && y < d.y+d.h;
    });
  }

  private bridgePalette(p?: Shortcut): [string, string, string] {
    return p?.cost.emberplank ? ['#68483f','#4e3532','#eea25c'] : p?.cost.glimplank ? ['#e6dcf6','#c4b3dc','#8c78b3'] : p?.cost.pineplank ? ['#e0be80','#c79d60','#79583c'] : ['#d8a868','#c8965a','#7a5232'];
  }

  private drawChasm(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number) {
    const cleft = (dx: number, dy: number) => {
      const t = this.map.tile(x+dx,y+dy);
      return t === T.CHASM || t === T.BRIDGE && this.crossingAt(x+dx,y+dy)?.gap === 'chasm';
    };
    ctx.fillStyle = '#282139'; ctx.fillRect(px,py,ts+1,ts+1);
    ctx.fillStyle = '#52455f';
    if (!cleft(-1,0)) ctx.fillRect(px,py,ts*.13,ts);
    if (!cleft(1,0)) ctx.fillRect(px+ts*.87,py,ts*.13,ts);
    if (!cleft(0,-1)) ctx.fillRect(px,py,ts,ts*.12);
    if (!cleft(0,1)) ctx.fillRect(px,py+ts*.88,ts,ts*.12);
    ctx.fillStyle = '#8c71ba';
    if (hash2(x,y,41) > .55) {
      ctx.beginPath(); ctx.moveTo(px+ts*.31,py+ts*.59);ctx.lineTo(px+ts*.43,py+ts*.35);ctx.lineTo(px+ts*.48,py+ts*.65);ctx.closePath();ctx.fill();
    }
  }

  /** Timber colours, deck direction and outside rails follow the crossing's actual material and footprint. */
  private drawBridge(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number) {
    const W = this.map, p = this.crossingAt(x,y), vertical = p ? p.deck.h >= p.deck.w : true;
    const colours = this.bridgePalette(p), boards = 4, bh = ts / boards;
    const began = p && this.crossingRaisedAt[p.id];
    const progress = began === undefined ? 1 : Math.max(0, Math.min(1, (this.t-began-(vertical ? y-p!.deck.y : x-shortcutWorldPoint(p!,p!.deck).x)*.12)/.35));
    if (!progress) return;
    ctx.save(); ctx.globalAlpha = progress;
    ctx.translate(0,-ts*.25*(1-progress));
    for (let i = 0; i < boards; i++) {
      ctx.fillStyle = colours[(i+x+y)%2];
      if (vertical) ctx.fillRect(px-1,py+i*bh+1,ts+2,bh-2);
      else ctx.fillRect(px+i*bh+1,py-1,bh-2,ts+2);
      ctx.fillStyle = 'rgba(90, 58, 34, 0.45)';
      if (vertical) ctx.fillRect(px+ts*(.3+hash2(x,y+i,7)*.4),py+i*bh+bh*.35,ts*.05,bh*.3);
      else ctx.fillRect(px+i*bh+bh*.35,py+ts*(.3+hash2(x+i,y,7)*.4),bh*.3,ts*.05);
    }
    ctx.fillStyle = colours[2];
    for (const side of [-1, 1]) {
      if (W.tile(x+(vertical ? side : 0),y+(vertical ? 0 : side)) === T.BRIDGE) continue;
      if (vertical) {
        const rx = side < 0 ? px-ts*.04 : px+ts*.92;
        ctx.fillRect(rx,py,ts*.12,ts);ctx.fillRect(rx-ts*.02,py+ts*.08,ts*.16,ts*.14);
      } else {
        const ry = side < 0 ? py-ts*.04 : py+ts*.92;
        ctx.fillRect(px,ry,ts,ts*.12);ctx.fillRect(px+ts*.08,ry-ts*.02,ts*.14,ts*.16);
      }
    }
    ctx.restore();
  }

  private drawPool(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number, th: Theme) {
    const lava = th.pool === 'lava';
    const W = this.map;
    const inset = ts * 0.14;
    const pool = (dx: number, dy: number) => W.tile(x + dx, y + dy) === T.POOL || W.tile(x + dx, y + dy) === T.BRIDGE;
    const l = pool(-1, 0) ? 0 : inset, r = pool(1, 0) ? 0 : inset;
    const u = pool(0, -1) ? 0 : inset, d = pool(0, 1) ? 0 : inset;
    // Only round the corners that sit on the pool's outer edge so neighbouring tiles merge seamlessly.
    const rad = ts * 0.3;
    const x0 = px + l, y0 = py + u, x1 = px + ts - r + 0.5, y1 = py + ts - d + 0.5;
    const tl = !pool(-1, 0) && !pool(0, -1) ? rad : 0, tr = !pool(1, 0) && !pool(0, -1) ? rad : 0;
    const br = !pool(1, 0) && !pool(0, 1) ? rad : 0, bl = !pool(-1, 0) && !pool(0, 1) ? rad : 0;
    ctx.fillStyle = lava ? '#ff7a2a' : '#6ac8f0';
    ctx.beginPath();
    ctx.moveTo(x0 + tl, y0);
    ctx.arcTo(x1, y0, x1, y1, tr);
    ctx.arcTo(x1, y1, x0, y1, br);
    ctx.arcTo(x0, y1, x0, y0, bl);
    ctx.arcTo(x0, y0, x1, y0, tl);
    ctx.fill();
    const k = Math.sin(this.t * 2 + x * 1.3 + y * 0.7);
    ctx.fillStyle = lava ? `rgba(255,220,90,${0.5 + k * 0.3})` : `rgba(255,255,255,${0.35 + k * 0.2})`;
    if (lava) {
      ctx.beginPath();
      ctx.arc(px + ts * (0.3 + hash2(x, y, 6) * 0.4), py + ts * 0.5, ts * (0.06 + 0.04 * k), 0, TAU);
      ctx.fill();
    } else {
      ctx.fillRect(px + ts * 0.25 + k * ts * 0.05, py + ts * 0.4, ts * 0.3, ts * 0.05);
    }
  }

  private drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number, th: Theme) {
    ctx.fillStyle = th.grass;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(px, py, ts + 1, ts + 1);
    ctx.globalAlpha = 1;
    const tuft = frame(`env/grass_${zoneAtX(x).id}`);
    if (tuft) {
      for (let i = 0; i < 2; i++) {
        const sway = Math.sin(this.t * 2.2 + x * 0.8 + y * 0.5 + i) * 0.08;
        drawFrame(ctx, tuft, px + ts * (0.28 + i * 0.44), py + ts * (0.55 + i * 0.4), ts / TILE_BU, { rot: sway, flip: ((x + y + i) & 1) === 1 });
      }
      return;
    }
    for (let i = 0; i < 2; i++) {
      const cx = px + ts * (0.28 + i * 0.44), by = py + ts * (0.55 + i * 0.4);
      const sway = Math.sin(this.t * 2.2 + x * 0.8 + y * 0.5 + i) * ts * 0.06;
      ctx.fillStyle = th.grass;
      ctx.beginPath();
      ctx.moveTo(cx - ts * 0.24, by);
      ctx.lineTo(cx - ts * 0.14 + sway, by - ts * 0.42);
      ctx.lineTo(cx - ts * 0.04, by - ts * 0.08);
      ctx.lineTo(cx + sway, by - ts * 0.55);
      ctx.lineTo(cx + ts * 0.06, by - ts * 0.08);
      ctx.lineTo(cx + ts * 0.16 + sway, by - ts * 0.4);
      ctx.lineTo(cx + ts * 0.24, by);
      ctx.fill();
      ctx.fillStyle = th.grassTip;
      ctx.beginPath();
      ctx.moveTo(cx - ts * 0.03, by - ts * 0.1);
      ctx.lineTo(cx + sway, by - ts * 0.55);
      ctx.lineTo(cx + ts * 0.04, by - ts * 0.1);
      ctx.fill();
    }
  }

  private drawDecor(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, ts: number, th: Theme) {
    const cx = px + ts * (0.25 + hash2(x, y, 7) * 0.5), cy = py + ts * (0.3 + hash2(x, y, 8) * 0.5);
    const h = hash2(x, y, 9);
    const names = { flower: ['flower0', 'flower1', 'flower2', 'flower3'], mush: ['mush0', 'mush1'], gem: ['gem0', 'gem1'], pebble: ['pebble0', 'pebble1'] }[th.decor];
    const deco = frame(`env/${names[Math.floor(h * names.length)]}`);
    if (deco) {
      drawFrame(ctx, deco, cx, cy + ts * 0.1, ts / TILE_BU);
      return;
    }
    switch (th.decor) {
      case 'flower': {
        const cols = ['#ff8ab0', '#ffd35a', '#ffffff', '#b08aff'];
        ctx.fillStyle = cols[Math.floor(h * cols.length)];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * ts * 0.07, cy + Math.sin(a) * ts * 0.07, ts * 0.06, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ffb03a';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.04, 0, TAU);
        ctx.fill();
        break;
      }
      case 'mush': {
        ctx.fillStyle = '#fff0d8';
        ctx.fillRect(cx - ts * 0.04, cy - ts * 0.08, ts * 0.08, ts * 0.12);
        ctx.fillStyle = h < 0.5 ? '#e8505a' : '#d8a060';
        ctx.beginPath();
        ctx.ellipse(cx, cy - ts * 0.08, ts * 0.12, ts * 0.09, 0, Math.PI, TAU);
        ctx.fill();
        break;
      }
      case 'gem': {
        ctx.fillStyle = h < 0.5 ? '#a8f0ff' : '#e0b0ff';
        ctx.globalAlpha = 0.6 + Math.sin(this.t * 3 + x) * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - ts * 0.16);
        ctx.lineTo(cx + ts * 0.08, cy);
        ctx.lineTo(cx, cy + ts * 0.06);
        ctx.lineTo(cx - ts * 0.08, cy);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'pebble': {
        ctx.fillStyle = h < 0.3 ? '#ff9a4a' : '#8a6a5a';
        ctx.beginPath();
        ctx.ellipse(cx, cy, ts * 0.09, ts * 0.06, 0, 0, TAU);
        ctx.fill();
        break;
      }
    }
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, th: Theme) {
    if (zoneAtX(x).id === 'cave') {
      // Joined rock faces enclose the tunnels; individual boulders still mark mineable cover.
      const px = x * ts, py = y * ts;
      ctx.fillStyle = '#303247';
      ctx.fillRect(px, py - ts * .28, ts + 1, ts * 1.28 + 1);
      const open = (dx: number, dy: number) => this.map.tile(x + dx, y + dy) !== T.OBST;
      ctx.strokeStyle = '#51536d'; ctx.lineWidth = ts * .065;
      ctx.beginPath();
      if (open(-1, 0)) { ctx.moveTo(px + ts * .04, py); ctx.lineTo(px + ts * .04, py + ts); }
      if (open(1, 0)) { ctx.moveTo(px + ts * .96, py); ctx.lineTo(px + ts * .96, py + ts); }
      if (open(0, 1)) { ctx.moveTo(px, py + ts * .92); ctx.lineTo(px + ts, py + ts * .92); }
      ctx.stroke();
      if (hash2(x, y, 12) > .6) {
        ctx.strokeStyle = '#242639'; ctx.lineWidth = ts * .035;
        ctx.beginPath(); ctx.moveTo(px + ts * .3, py + ts * .15);
        ctx.lineTo(px + ts * .55, py + ts * .38); ctx.lineTo(px + ts * .47, py + ts * .7); ctx.stroke();
      }
      return;
    }
    const cx = (x + 0.5) * ts + (hash2(x, y, 12) - 0.5) * ts * 0.15;
    const by = (y + 0.92) * ts;
    const v = hash2(x, y, 13);
    const sprite = frame(`env/${th.obstacle}${Math.floor(v * 3)}`);
    if (sprite) {
      shadow(ctx, cx, by - ts * 0.05, ts * 0.42);
      drawFrame(ctx, sprite, cx, by - ts * 0.05, ts / TILE_BU, { flip: v > 0.5, rot: th.obstacle === 'tree' || th.obstacle === 'pine' ? Math.sin(this.t * 1.2 + x) * 0.012 : 0 });
      return;
    }
    switch (th.obstacle) {
      case 'tree': {
        shadow(ctx, cx, by, ts * 0.42);
        ctx.fillStyle = '#8a5a3a';
        rrect(ctx, cx - ts * 0.09, by - ts * 0.45, ts * 0.18, ts * 0.45, ts * 0.05);
        ctx.fill();
        const cy = by - ts * 0.8;
        const sway = Math.sin(this.t * 1.5 + x) * ts * 0.015;
        ctx.fillStyle = v < 0.5 ? '#3f9a45' : '#48a84a';
        ctx.beginPath();
        ctx.arc(cx - ts * 0.22 + sway, cy + ts * 0.08, ts * 0.32, 0, TAU);
        ctx.arc(cx + ts * 0.22 + sway, cy + ts * 0.08, ts * 0.32, 0, TAU);
        ctx.fill();
        ctx.fillStyle = v < 0.5 ? '#5ab85a' : '#62c060';
        ctx.beginPath();
        ctx.arc(cx + sway, cy - ts * 0.12, ts * 0.38, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(cx - ts * 0.12 + sway, cy - ts * 0.24, ts * 0.13, 0, TAU);
        ctx.fill();
        if (v > 0.85) {
          ctx.fillStyle = '#ff6a6a';
          for (const [ox, oy] of [[-0.2, 0], [0.15, -0.15], [0.2, 0.12]]) {
            ctx.beginPath();
            ctx.arc(cx + ox * ts, cy + oy * ts, ts * 0.05, 0, TAU);
            ctx.fill();
          }
        }
        break;
      }
      case 'pine': {
        shadow(ctx, cx, by, ts * 0.38);
        ctx.fillStyle = '#6a4a30';
        ctx.fillRect(cx - ts * 0.07, by - ts * 0.3, ts * 0.14, ts * 0.3);
        const layers = 3;
        for (let i = 0; i < layers; i++) {
          const w = ts * (0.5 - i * 0.1), top = by - ts * (0.55 + i * 0.32);
          ctx.fillStyle = i % 2 ? '#2f7a45' : '#27693c';
          ctx.beginPath();
          ctx.moveTo(cx - w, top + ts * 0.35);
          ctx.lineTo(cx, top - ts * 0.2);
          ctx.lineTo(cx + w, top + ts * 0.35);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'crystal': {
        shadow(ctx, cx, by, ts * 0.38);
        const cols = v < 0.5 ? ['#b8a0ff', '#8a70e0'] : ['#8ae8ff', '#50b8e0'];
        const shards = [[-0.18, 0.55, -0.25], [0.15, 0.7, 0.2], [0, 0.95, 0]];
        for (const [ox, h, tilt] of shards) {
          ctx.save();
          ctx.translate(cx + ox * ts, by - ts * 0.05);
          ctx.rotate(tilt);
          ctx.fillStyle = cols[1];
          ctx.beginPath();
          ctx.moveTo(-ts * 0.12, 0);
          ctx.lineTo(-ts * 0.12, -h * ts * 0.7);
          ctx.lineTo(0, -h * ts);
          ctx.lineTo(ts * 0.12, -h * ts * 0.7);
          ctx.lineTo(ts * 0.12, 0);
          ctx.fill();
          ctx.fillStyle = cols[0];
          ctx.beginPath();
          ctx.moveTo(-ts * 0.12, 0);
          ctx.lineTo(-ts * 0.12, -h * ts * 0.7);
          ctx.lineTo(0, -h * ts);
          ctx.lineTo(0, 0);
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'rock': {
        shadow(ctx, cx, by, ts * 0.45);
        ctx.fillStyle = v < 0.5 ? '#7a5a50' : '#6a4a44';
        ctx.beginPath();
        ctx.ellipse(cx, by - ts * 0.3, ts * 0.46, ts * 0.38, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.ellipse(cx - ts * 0.12, by - ts * 0.45, ts * 0.18, ts * 0.1, -0.3, 0, TAU);
        ctx.fill();
        if (v > 0.7) {
          ctx.strokeStyle = '#ff8a3a';
          ctx.lineWidth = ts * 0.04;
          ctx.beginPath();
          ctx.moveTo(cx + ts * 0.1, by - ts * 0.55);
          ctx.lineTo(cx, by - ts * 0.35);
          ctx.lineTo(cx + ts * 0.12, by - ts * 0.15);
          ctx.stroke();
        }
        break;
      }
    }
  }

  /** Draws something on the map: a sprite if the art is loaded, otherwise a simple canvas drawing. */
  private drawObj(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
    if (o.hidden) return;
    switch (o.kind) {
      case 'gate':
        if (this.drawGate(ctx, o, ts)) return;
        break;
      case 'elder':
        if (this.drawElder(ctx, o, ts)) return;
        break;
      case 'pickup':
        return this.drawPickup(ctx, o, ts);
      case 'node':
        return this.drawTree(ctx, o, ts);
      case 'bridge':
        return this.drawShortcutSite(ctx, o, ts);
      case 'foe':
        return this.drawFoe(ctx, o, ts);
      case 'station': {
        // The Garden's water butt and seed basket (from the rooms' props), and the sign at its gate.
        const f = frame(o.id === 'garden:butt' ? 'room/g_butt' : o.id === 'garden:sign' ? 'env/field_sign' : 'room/g_basket');
        const ax = (o.x + o.w / 2) * ts, ay = (o.y + o.h - 0.08) * ts;
        shadow(ctx, ax, ay, o.w * ts * 0.55, 0.2);
        if (f) drawFrame(ctx, f, ax, ay, (ts / TILE_BU) * 1.15);
        return;
      }
    }
    if (!this.drawBuilding(ctx, o, ts)) this.drawBuildingFallback(ctx, o, ts);
  }

  private drawShortcutSite(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
    const p = shortcutById(o.id!);
    if (!p || shortcutBuilt(this.save,p)) return;
    const d = p.deck, at = shortcutWorldPoint(p,d), vertical = d.h >= d.w, colours = this.bridgePalette(p);
    // Broken landing boards on both banks make the missing connection legible before the player reads the plans.
    for (const far of [false,true]) {
      const x = at.x + (vertical ? 0 : far ? d.w : -.45), y = d.y + (vertical ? far ? d.h : -.45 : 0);
      ctx.fillStyle = colours[1];
      ctx.fillRect(x*ts,y*ts,(vertical ? d.w : .45)*ts,(vertical ? .45 : d.h)*ts);
      ctx.fillStyle = colours[2];
      for (const side of [0,1]) {
        const sx = vertical ? (at.x+side*(d.w-.12))*ts : (x+.12)*ts;
        const sy = vertical ? (y+.12)*ts : (d.y+side*(d.h-.12))*ts;
        ctx.fillRect(sx,sy-ts*.35,ts*.12,ts*.48);
      }
    }
    const sprite = frame('env/sign');
    const ax = (o.x+o.w/2)*ts, ay = (o.y+o.h)*ts;
    if (sprite) drawFrame(ctx,sprite,ax,ay,ts/TILE_BU);
    if (Math.hypot(this.x-(o.x+.3),this.y-(o.y+.5)) < 4.5) this.nameTag(ctx, `🌉 ${p.name}`, ax, ay-ts*.8, ts);
  }

  /** A white name tag centered over an object whose top is at `top`. */
  private nameTag(ctx: CanvasRenderingContext2D, text: string, cx: number, top: number, ts: number) {
    ctx.font = `900 ${Math.round(ts * 0.34)}px ui-rounded, "Nunito", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = ts * 0.1;
    ctx.strokeStyle = 'rgba(60,30,60,0.8)';
    ctx.strokeText(text, cx, top - ts * 0.25);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, cx, top - ts * 0.25);
  }

  /** Elder Oswin, with a bouncing "!" when she has something new to say. False if her sprite isn't loaded. */
  private drawElder(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number): boolean {
    const ax = (o.x + o.w / 2) * ts, ay = (o.y + o.h) * ts;
    shadow(ctx, ax, ay, ts * 0.27);
    if (!drawIdler(ctx, 'elder', 'elder', (this.t * 3) / 4, ax, ay, ts / 1.35)) return false;
    const q = currentQuest(this.save);
    // The top of his hat.
    const top = ay - ts * 1.25;
    if (q?.goal.type === 'talk' || (q && !this.save.tips.includes(`elder:${q.id}`))) {
      const by = top - ts * 0.35 + Math.abs(Math.sin(this.t * 4)) * -ts * 0.12;
      ctx.fillStyle = '#ffd35a';
      rrect(ctx, ax - ts * 0.17, by - ts * 0.46, ts * 0.34, ts * 0.46, ts * 0.12);
      ctx.fill();
      ctx.fillStyle = '#5a3a6a';
      ctx.font = `900 ${Math.round(ts * 0.36)}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', ax, by - ts * 0.22);
    }
    return true;
  }

  /** The Twig Sword in the glade: stuck in the ground, blade down, glowing and gently wobbling. */
  private drawPickup(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
    const f = frame('wpn/twig');
    const ax = (o.x + o.w / 2) * ts, ay = (o.y + o.h) * ts;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,230,120,${0.25 + Math.sin(this.t * 4) * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(ax, ay, ts * 0.6, ts * 0.25, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (f) drawFrame(ctx, f, ax + ts * 0.05, ay - ts * 0.75, ts / TILE_BU * 1.2, { rot: Math.PI / 2 + 0.2 + Math.sin(this.t * 2) * 0.04 });
    if (Math.random() < 0.12) this.fx.burst(ax + (Math.random() - 0.5) * ts * 0.5, ay - Math.random() * ts, '#fff6a0', 1, ts * 0.3, { star: true, size: ts * 0.07, grav: -ts * 0.6, life: 0.8 });
  }

  /** How tall an actor stands, in tiles (where their bubble goes). */
  private actorHeight(a: Actor) {
    const k = a.scale ?? 1;
    return a.look.kind === 'monster' ? 0.95 * spriteScale(a.look.name) * k : 1.15 * k;
  }

  /** A story character: walking like the hero, idling in place, or a scripted monster hopping along. */
  private drawActor(ctx: CanvasRenderingContext2D, a: Actor, ts: number) {
    const px = a.x * ts, py = a.y * ts, k = a.scale ?? 1;
    const L = a.look;
    if (L.kind === 'monster') {
      if (!monsterReady(L.name)) return;
      const hop = a.moving ? Math.abs(Math.sin(this.t * 12)) * ts * 0.16 : 0;
      shadow(ctx, px, py, ts * 0.28 * k);
      drawMonsterAt(ctx, a.id, L.name, false, (this.t * 7) / 6, Math.cos(a.face) < 0, px, py - hop, ts * 0.74 * spriteScale(L.name) * k, {}, a.id.startsWith('drums:') ? a.face : undefined);
      return;
    }
    shadow(ctx, px, py, ts * 0.24 * k);
    if (L.kind === 'walker') drawWalker(ctx, `npc/${L.name}`, px, py, (ts / 1.2) * k, a.face, a.moving, this.t, {}, a.id);
    else drawIdler(ctx, a.id, L.name, (this.t * 3) / 4, px, py, (ts / 1.2) * k);
  }

  /** A prologue monster standing in the path (or a story's group). */
  private drawFoe(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
    if (o.foes) return this.drawFoePack(ctx, o, ts);
    const ax = (o.x + o.w / 2) * ts, ay = o.y * ts + ts * 2.7;
    shadow(ctx, ax, ay, ts * 0.45, 0.25);
    drawMonsterAt(ctx, slotOf(o, 'foe'), o.monster!, false, this.t, true, ax, ay, (ts / TILE_BU) * 1.5);
  }

  /** A story's monster group, in a huddle filling its box (two ranks if it's tall), all looking one way if it says. */
  private drawFoePack(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
    const n = o.foes!.length, rise = Math.max(0.25, o.h - 1);
    const spots = o.foes!.map((m, i) => ({
      m, i,
      x: o.x + o.w / 2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.min(o.w, 1.6)),
      y: o.y + o.h - 0.1 - (i % 2) * rise,
    }));
    for (const { m, i, x, y } of spots.sort((a, b) => a.y - b.y)) {
      if (!monsterReady(m.kind)) continue;
      shadow(ctx, x * ts, y * ts, ts * 0.28 * spriteScale(m.kind));
      drawMonsterAt(ctx, `${slotOf(o, 'pack')}:${i}`, m.kind, false, this.t + i / 3, o.facing ? o.facing < 0 : i % 2 === 0, x * ts, y * ts, ts * 0.74 * spriteScale(m.kind));
    }
  }

  /** A building's sprite (by its upgrade level) and how far to push it back so its front meets the collision box. */
  private buildingSprite(o: WorldObj): { name: string; back: number } | null {
    const lv = (id: keyof SaveState['build']) => this.save.build[id];
    switch (o.kind) {
      case 'forge': return { name: forgeArt(lv('forge')), back: 0.42 };
      case 'house': return { name: 'house_blue', back: 0.42 };
      case 'fountain': return { name: 'fountain', back: 0.45 };
      case 'sign': return { name: 'sign', back: 0.05 };
      case 'lair': return { name: 'lair', back: 0.4 };
      case 'camp': return { name: 'campfire', back: 0.05 };
      case 'statue': return { name: `statue_${o.id}`, back: 0.1 };
      case 'prop': return { name: o.id!, back: 0.2 };
      case 'residence': {
        const l = homeLevel(this.save, o.home!);
        return { name: l ? HOMES[o.home!].plans[l - 1].art : 'plot', back: .28 };
      }
      case 'bridge': return { name: 'sign', back: 0.05 };
      case 'plot': {
        const p = o.project!, l = lv(p);
        if (p === 'home') return { name: `home${l}`, back: 0.42 };
        if (p === 'warp') return { name: `warp${l}`, back: 0.1 };
        if (p === 'sawmill') return { name: `sawmill${l}`, back: 0.3 };
        if (p === 'cottage') return { name: homeLevel(this.save, 'pip') >= 2 ? 'res_pip2' : l ? 'cottage1' : 'plot', back: .28 };
        return { name: l ? `${p}${l}` : 'plot', back: 0.28 };
      }
      default: return null;
    }
  }

  /** Buildings, plots, signs and the campfire from their sprites, with their name tags and little effects. False if the art isn't loaded. */
  private drawBuilding(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number): boolean {
    const spec = this.buildingSprite(o);
    const sprite = spec && frame(`env/${spec.name}`);
    if (!spec || !sprite) return false;
    const w = o.w * ts, unit = ts / TILE_BU;
    // Model origins sit in the middle of their footprint; push them back so their fronts line up with the collision box.
    const ax = o.x * ts + w / 2, ay = (o.y + o.h) * ts - spec.back * ts;
    if (o.kind !== 'sign' && o.kind !== 'camp') shadow(ctx, ax, ay, w * (o.kind === 'statue' ? 0.6 : 0.52), 0.2);
    // A campfire you haven't lit yet is a cold pile of logs: no glow, no embers.
    const cold = o.kind === 'camp' && !this.save.camps.includes(o.zone!);
    if (o.kind === 'camp' && !cold) {
      const swell = Math.min(1, (this.t - (this.kindledAt[o.zone!] ?? -9)) / 1.2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,150,60,${(0.16 + Math.sin(this.t * 9) * 0.04) * swell})`;
      ctx.beginPath();
      ctx.ellipse(ax, ay - ts * 0.1, ts * 1.1, ts * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // Each campfire has one of Veyra's little shrine stones beside it (the Waystone answers them).
    const stone = o.kind === 'camp' && frame('env/waystone');
    if (stone) drawFrame(ctx, stone, ax + ts * 0.75, ay - ts * 0.25, unit);
    drawFrame(ctx, sprite, ax, ay, unit, cold ? { tint: '#4a4058', tintAmount: 0.55 } : {});
    const top = ay - sprite.ay * (unit / sprite.ppu);
    switch (o.kind) {
      case 'residence': {
        const who = HOMES[o.home!];
        this.nameTag(ctx, `${who.icon} ${who.name}’s home`, ax, top, ts);
        break;
      }
      case 'forge': {
        const lit = this.save.build.forge > 0;
        if (lit && Math.random() < 0.08) this.fx.burst(ax + w * 0.3, top + ts * 0.3, 'rgba(220,220,230,0.8)', 1, ts * 0.6, { size: ts * 0.12, grav: -ts * 0.8, life: 1.2 });
        this.nameTag(ctx, lit ? '⚒ Forge' : '⚒ Old Forge', ax, top, ts);
        break;
      }
      case 'prop':
        if (o.id === 'prop_cavemouth') this.nameTag(ctx, 'Pebbler Hollow', ax, top, ts);
        break;
      case 'fountain':
        for (let i = 0; i < 3; i++) {
          const q = (this.t * 1.5 + i / 3) % 1;
          ctx.fillStyle = `rgba(190,240,255,${1 - q})`;
          ctx.beginPath();
          ctx.arc(ax + (i - 1) * q * ts * 0.5, top + ts * 0.15 - Math.sin(q * Math.PI) * ts * 0.4 + q * ts * 0.5, ts * 0.07, 0, TAU);
          ctx.fill();
        }
        this.nameTag(ctx, "💧 Veyra's Spring", ax, top, ts);
        break;
      case 'camp':
        // Cold: a faint glint now and then, to draw you over to light it.
        if (cold) {
          if (Math.random() < 0.04) this.fx.burst(ax + (Math.random() - 0.5) * ts * 0.4, ay - ts * 0.3, '#fff6c8', 1, ts * 0.3, { size: ts * 0.05, star: true, grav: -ts * 0.3, life: 0.8 });
          this.nameTag(ctx, '🔥 Old campfire', ax, top, ts);
          break;
        }
        if (Math.random() < 0.3) this.fx.burst(ax + (Math.random() - 0.5) * ts * 0.3, ay - ts * 0.35, Math.random() < 0.5 ? '#ffb03a' : '#ff7a2a', 1, ts * 0.4, { size: ts * 0.06, grav: -ts * 1.5, life: 0.7 });
        break;
      case 'plot': {
        // Empty plots (and your home, always) say what goes there.
        const p = o.project!;
        const name = ({ home: '🏠 Home', garden: '🌱 Garden', training: '🎯 Training', warp: '🔮 Waystone', sawmill: '🪚 Sawmill', cottage: '🏡 Guest Cottage' } as Record<string, string>)[p] ?? '';
        if (!this.save.build[p] || p === 'home' || p === 'sawmill') this.nameTag(ctx, name, ax, top, ts);
        break;
      }
      case 'lair':
        this.nameTag(ctx, this.save.bosses.includes('dragon') ? '🐉 Lair (rematch)' : '🐉 Dragon Lair', ax, top, ts);
        break;
    }
    return true;
  }

  /**
   * Poppy's field, on the ground: tilled soil on each plot the Garden has (pale and cracked when thirsty), pegged-out
   * string where the next level's plots will go, and a ring round the plot the action button works on.
   */
  private drawFieldGround(ctx: CanvasRenderingContext2D, ts: number) {
    const o = this.world.objs.find((f) => f.kind === 'plot' && f.project === 'garden');
    if (!o || o.hidden) return;
    const lv = this.save.build.garden, n = plotCount(this.save), next = PLOTS_BY_LEVEL[Math.min(lv + 1, PLOTS_BY_LEVEL.length - 1)];
    const plots = n ? gardenUpdate(this.save).plots : [], unit = ts / TILE_BU;
    for (let i = 0; i < next; i++) {
      const t = plotTile(o, i), px = t.x * ts, py = t.y * ts;
      if (i >= n) {
        ctx.save();
        ctx.strokeStyle = 'rgba(120, 84, 50, 0.45)';
        ctx.lineWidth = Math.max(1.5, ts * 0.035);
        ctx.setLineDash([ts * 0.12, ts * 0.1]);
        rrect(ctx, px + ts * 0.1, py + ts * 0.1, ts * 0.8, ts * 0.8, ts * 0.12);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      const soil = frame(plots[i]?.thirsty ? 'env/till_dry' : 'env/till');
      if (soil) drawFrame(ctx, soil, px + ts / 2, py + ts * 0.96, unit);
      else {
        ctx.fillStyle = plots[i]?.thirsty ? '#c8a476' : '#7a5236';
        rrect(ctx, px + ts * 0.06, py + ts * 0.06, ts * 0.88, ts * 0.88, ts * 0.14);
        ctx.fill();
      }
    }
    if (this.gardenPlot !== null) {
      const t = plotTile(o, this.gardenPlot);
      ctx.save();
      ctx.strokeStyle = `rgba(255,236,140,${0.75 + Math.sin(this.t * 6) * 0.2})`;
      ctx.lineWidth = Math.max(2, ts * 0.06);
      rrect(ctx, t.x * ts + ts * 0.05, t.y * ts + ts * 0.05, ts * 0.9, ts * 0.9, ts * 0.16);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Poppy's field, standing up: whatever's growing on each plot at its stage, weeds on top, and a drop or a sparkle to
   * say it needs water or picking, each sorted with you (you walk in front of the row behind and behind the row in
   * front). Its name over the gate.
   */
  private fieldItems(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number, items: { y: number; draw: () => void }[]) {
    if (o.hidden) return;
    const unit = ts / TILE_BU, n = plotCount(this.save), plots = n ? gardenUpdate(this.save).plots : [];
    const tag = gardenOpen(this.save) ? "🌷 Poppy's Garden" : this.save.build.garden ? '' : '🌱 Garden';
    if (tag) items.push({ y: o.y - 1, draw: () => this.nameTag(ctx, tag, (o.x + o.w / 2) * ts, (o.y - 1.6) * ts, ts) });
    for (let i = 0; i < n; i++) {
      const p = plots[i];
      if (!p) continue;
      const at = plotSpot(o, i), st = growthStage(p);
      items.push({
        y: at.y, draw: () => {
          const x = at.x * ts, y = at.y * ts, k = unit * 1.15;
          const crop = frame(`env/crop_${p.crop}_${st}`);
          // Thirsty plants droop and fade a little; ripe ones sway.
          if (crop) drawFrame(ctx, crop, x, y, k, p.thirsty ? { tint: '#c8a868', tintAmount: 0.35, sy: 0.9 } : { rot: st === 3 ? Math.sin(this.t * 2 + i) * 0.03 : 0 });
          else {
            ctx.font = `${Math.round(ts * 0.5)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(st === 3 ? MATS[p.crop].icon : '🌱', x, y - ts * 0.1);
          }
          const weeds = p.weeds && frame('env/weeds');
          if (weeds) drawFrame(ctx, weeds, x, y, k, { rot: Math.sin(this.t * 1.5 + i) * 0.02 });
          if (p.thirsty) {
            ctx.font = `${Math.round(ts * 0.36)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('💧', x, y - ts * (0.75 + Math.sin(this.t * 3 + i) * 0.06));
          } else if (st === 3 && Math.random() < 0.02) {
            this.fx.burst(x + (Math.random() - 0.5) * ts * 0.5, y - ts * 0.45, '#fff6c8', 1, ts * 0.3, { size: ts * 0.05, star: true, grav: -ts * 0.3, life: 0.8 });
          }
        },
      });
    }
  }

  /**
   * A run of the field's fence (its `o` box straddles the line): a picket section per tile along the top and bottom, a
   * post per tile down the sides, each sorted with you on its own row.
   */
  private fenceItems(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number, items: { y: number; draw: () => void }[]) {
    if (o.hidden) return;
    const unit = ts / TILE_BU, across = o.w > o.h, x = o.x + o.w / 2, y = o.y + o.h / 2;
    const len = Math.round(across ? o.w : o.h);
    // Side sprites extend one tile back from their post. Include the final
    // post at the bottom corner so that last section reaches the bottom rail.
    for (let k = across ? 0 : 1; k < len + (across ? 0 : 1); k++) {
      const at = across ? { x: o.x + 0.12 + k + 0.5, y } : { x, y: o.y + 0.12 + k };
      items.push({
        y: at.y, draw: () => {
          const f = frame(across ? 'env/fence' : 'env/fence_post');
          if (f) drawFrame(ctx, f, at.x * ts, at.y * ts, unit);
          else {
            ctx.fillStyle = '#fff4e2';
            if (across) ctx.fillRect((at.x - 0.5) * ts, (at.y - 0.4) * ts, ts, ts * 0.1);
            else ctx.fillRect(at.x * ts - ts * 0.025, (at.y - 1.4) * ts, ts * 0.05, ts);
            ctx.fillRect(at.x * ts - ts * 0.05, (at.y - 0.5) * ts, ts * 0.1, ts * 0.5);
          }
        },
      });
    }
  }

  /** Simple canvas drawings for buildings, used only if the sprites failed to load. */
  private drawBuildingFallback(ctx: CanvasRenderingContext2D, o: WorldObj, ts: number) {
    const x = o.x * ts, y = o.y * ts, w = o.w * ts, h = o.h * ts;
    const tag = (text: string) => this.nameTag(ctx, text, x + w / 2, y - ts * 0.65, ts);
    switch (o.kind) {
      case 'forge':
      case 'house': {
        const forge = o.kind === 'forge';
        shadow(ctx, x + w / 2, y + h, w * 0.55, 0.25);
        ctx.fillStyle = forge ? '#b8a8a0' : '#fff0dc';
        rrect(ctx, x + ts * 0.1, y + h * 0.3, w - ts * 0.2, h * 0.7, ts * 0.12);
        ctx.fill();
        // Roof
        ctx.fillStyle = forge ? '#c8503a' : o.x < 10 ? '#6a9ae0' : '#e88ab0';
        ctx.beginPath();
        ctx.moveTo(x - ts * 0.15, y + h * 0.4);
        ctx.lineTo(x + w / 2, y - h * 0.25);
        ctx.lineTo(x + w + ts * 0.15, y + h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.moveTo(x - ts * 0.15, y + h * 0.4);
        ctx.lineTo(x + w / 2, y - h * 0.25);
        ctx.lineTo(x + w / 2, y - h * 0.1);
        ctx.lineTo(x + ts * 0.3, y + h * 0.4);
        ctx.fill();
        // Door
        ctx.fillStyle = '#8a5a3a';
        rrect(ctx, x + w / 2 - ts * 0.3, y + h - ts * 0.9, ts * 0.6, ts * 0.9, ts * 0.25);
        ctx.fill();
        // Window
        ctx.fillStyle = forge ? '#ffb03a' : '#bfe8ff';
        rrect(ctx, x + ts * 0.4, y + h * 0.5, ts * 0.5, ts * 0.45, ts * 0.08);
        ctx.fill();
        if (forge) {
          ctx.fillStyle = '#8a8090';
          ctx.fillRect(x + w - ts * 0.9, y - h * 0.15, ts * 0.4, ts * 0.8);
          if (Math.random() < 0.08) this.fx.burst(x + w - ts * 0.7, y - h * 0.2, 'rgba(220,220,230,0.8)', 1, ts * 0.6, { size: ts * 0.12, grav: -ts * 0.8, life: 1.2 });
          // Anvil
          ctx.fillStyle = '#5a5a6a';
          rrect(ctx, x + w - ts * 0.95, y + h - ts * 0.45, ts * 0.6, ts * 0.22, ts * 0.06);
          ctx.fill();
          ctx.fillRect(x + w - ts * 0.75, y + h - ts * 0.25, ts * 0.2, ts * 0.25);
          tag('⚒ Forge');
        }
        break;
      }
      case 'fountain': {
        shadow(ctx, x + w / 2, y + h, w * 0.6, 0.25);
        ctx.fillStyle = '#b8b0c8';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.6, w * 0.55, h * 0.4, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#6ac8f0';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h * 0.55, w * 0.44, h * 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#d0c8e0';
        ctx.fillRect(x + w / 2 - ts * 0.1, y + h * 0.1, ts * 0.2, h * 0.45);
        for (let i = 0; i < 3; i++) {
          const q = (this.t * 1.5 + i / 3) % 1;
          ctx.fillStyle = `rgba(170,230,255,${1 - q})`;
          ctx.beginPath();
          ctx.arc(x + w / 2 + (i - 1) * q * ts * 0.5, y + h * 0.1 - Math.sin(q * Math.PI) * ts * 0.4 + q * ts * 0.3, ts * 0.07, 0, TAU);
          ctx.fill();
        }
        tag('💧 Fountain');
        break;
      }
      case 'sign': {
        const cx = x + w / 2;
        shadow(ctx, cx, y + h, ts * 0.3);
        ctx.fillStyle = '#8a5a3a';
        ctx.fillRect(cx - ts * 0.05, y - ts * 0.1, ts * 0.1, h + ts * 0.1);
        ctx.fillStyle = '#c89a6a';
        rrect(ctx, cx - ts * 0.4, y - ts * 0.55, ts * 0.8, ts * 0.5, ts * 0.08);
        ctx.fill();
        ctx.fillStyle = '#8a5a3a';
        ctx.fillRect(cx - ts * 0.25, y - ts * 0.42, ts * 0.5, ts * 0.05);
        ctx.fillRect(cx - ts * 0.25, y - ts * 0.3, ts * 0.35, ts * 0.05);
        break;
      }
      case 'lair': {
        shadow(ctx, x + w / 2, y + h, w * 0.6, 0.3);
        ctx.fillStyle = '#6a3a30';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h, w * 0.6, h * 1.1, 0, Math.PI, TAU);
        ctx.fill();
        ctx.fillStyle = '#1a0a14';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h, w * 0.28, h * 0.6, 0, Math.PI, TAU);
        ctx.fill();
        if ((this.t % 4) > 0.15) {
          ctx.fillStyle = '#ffb03a';
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x + w / 2 + s * ts * 0.18, y + h - ts * 0.55, ts * 0.08, ts * 0.05, 0, 0, TAU);
            ctx.fill();
          }
        }
        tag(this.save.bosses.includes('dragon') ? '🐉 Lair (rematch)' : '🐉 Dragon Lair');
        break;
      }
    }
  }
}
