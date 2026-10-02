// Walking into Granny's Kitchen and Bram's Sawmill: through the iris from their doors, around the room, working the
// stations by hand, and back out. Each room's own play (what its stations do, who's in it, how it's painted) lives in
// kitchenRoom.ts and sawmillRoom.ts; this is what they share.
import { drawCaption } from '../bubble';
import { HINT_Y } from '../roomArt';
import { kitchenOpen } from '../kitchen';
import { poppyAway } from '../procession';
import { Room, ROOMS, type RoomId } from '../room';
import type { WorldObj } from '../world';
import { G, persist, transition } from './context';
import { KITCHEN_PLAY } from './kitchenRoom';
import { SAWMILL_PLAY } from './sawmillRoom';
import { sawmillBuilt } from './stories/bram';

export interface RoomPlay {
  /** Builds the room's cast and its painter, once. */
  setup(room: Room): void;
  /**
   * On coming in: a fresh start (whatever you were carrying last time went back where it came from, however you
   * left: out of the door, fast travel or fainting) and a greeting.
   */
  enter?(room: Room): void;
  /** The action button at one of its stations. */
  act(o: WorldObj, room: Room): void | Promise<void>;
  /** Holding the action button down at this station keeps doing it (carrying armful after armful). */
  repeats?(o: WorldObj): boolean;
  /** Every frame while you're in it (labels, guidance and work); true while it's using the action button itself. */
  tick(dt: number, room: Room): boolean;
  /** Drawn over the screen (what to do next). */
  hud?(ctx: CanvasRenderingContext2D, vw: number, vh: number, room: Room): void;
  /** Screen-space effects, including pickups flying to the Bag, even while someone is speaking. */
  effects?(ctx: CanvasRenderingContext2D, vw: number, vh: number): void;
}

/** Each room's play (looked up when needed: they import from here too). */
const play = (id: RoomId): RoomPlay => ({ kitchen: KITCHEN_PLAY, sawmill: SAWMILL_PLAY })[id];
const built: Partial<Record<RoomId, Room>> = {};

function room(id: RoomId): Room {
  let r = built[id];
  if (!r) {
    r = built[id] = new Room(ROOMS[id]);
    play(id).setup(r);
  }
  return r;
}

/** Each room's doorway on the map: the foot of its building's front door, in the middle of its front. */
function doorway(id: RoomId): { x: number; y: number } | null {
  const o = id === 'kitchen' ? G.world.obj('house') : G.world.objs.find((o) => o.project === 'sawmill');
  return o ? { x: o.x + o.w / 2, y: o.y + o.h } : null;
}

/** Where you come back out of each room: just in front of its door on the map. */
export function doorstep(id: RoomId): { x: number; y: number } {
  const d = doorway(id);
  return d ? { x: d.x, y: d.y + 0.7 } : { x: G.over.x, y: G.over.y };
}

/** The rooms whose doors are open just now: Granny's once she cooks (not while Poppy's away), Bram's once he's in. */
const open = (id: RoomId) => (id === 'kitchen' ? kitchenOpen(G.save) && !poppyAway(G.save) : sawmillBuilt());

/** Walking up into an open door on the map takes you in, like the action button at it. */
export function doorwayTick() {
  if (G.trans || G.over.room || G.input.axis().y > -0.5) return;
  for (const id of ['kitchen', 'sawmill'] as RoomId[]) {
    const d = doorway(id);
    if (d && open(id) && Math.abs(G.over.x - d.x) < 0.5 && G.over.y > d.y && G.over.y < d.y + 0.6) return enterRoom(id);
  }
}

function go(id: RoomId) {
  const r = room(id);
  G.over.enterRoom(r, doorstep(id));
  G.input.reset();
  play(id).enter?.(r);
  persist();
}

/** In through the door, with the iris. */
export function enterRoom(id: RoomId) {
  if (G.trans || G.over.room) return;
  G.audio.play('step');
  transition(() => go(id));
}

/** Back out of the door, with the iris. */
export function leaveRoom() {
  const r = G.over.room;
  if (!r || G.trans) return;
  G.audio.play('step');
  transition(() => {
    G.over.leaveRoom();
    G.input.reset();
    persist();
  });
}

/** A save made inside a room carries on in there (just inside its door). */
export function restoreRoom() {
  const id = G.save.room;
  if (id && ROOMS[id]) go(id);
}

/** The action button at a room's station, or its doormat. */
export function roomAct(o: WorldObj) {
  const r = G.over.room;
  if (!r) return;
  if (o.kind === 'door') return leaveRoom();
  lastActed = o;
  repeatIn = 0.35;
  return play(r.id).act(o, r);
}

let lastActed: WorldObj | null = null;
let repeatIn = 0;

/**
 * Every frame you're free to act in a room: walking out of the door, the room's own goings-on, and holding the action
 * button to keep going. True while a station is using the action button itself.
 */
export function roomTick(dt: number): boolean {
  const r = G.over.room;
  if (!r) return false;
  if (r.outAt(G.over.x, G.over.y)) {
    leaveRoom();
    return true;
  }
  const p = play(r.id);
  if (p.tick(dt, r)) return true;
  if (!G.input.isHeld('act')) {
    lastActed = null;
    return false;
  }
  const near = G.over.nearbyObject();
  if (!lastActed || near !== lastActed || !p.repeats?.(near)) return false;
  repeatIn -= dt;
  if (repeatIn <= 0) {
    repeatIn = 0.22;
    void p.act(near, r);
  }
  return false;
}

/** Over the room: what someone's saying (where the hint goes, so it never covers the room), or else the hint. */
export function drawRoomHud(ctx: CanvasRenderingContext2D, vw: number, vh: number) {
  const r = G.over.room;
  if (!r) return;
  const a = r.actors.list.find((a) => a.speech);
  const box = a?.speech ? drawCaption(ctx, vw, HINT_Y, a.name ?? '', a.speech.text, a.bubble?.emoji ?? a.mood, a.speech.t, a.speech.hold) : null;
  G.over.roomRects.caption = box;
  if (!box) play(r.id).hud?.(ctx, vw, vh, r);
  play(r.id).effects?.(ctx, vw, vh);
  return box ? box.y + box.h : HINT_Y + 30;
}
