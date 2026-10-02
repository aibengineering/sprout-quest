// Characters on the map: story people (and the odd scripted monster) who walk set paths, follow you, show how they
// feel with an emoji bubble you can read from across the screen, and can be talked to up close.
import type { MonsterKind } from './data';

/** How an actor is drawn: a walker (npc/<name>/<dir>/<frame>, like the hero), a 4-frame idle loop, or a monster. */
export type Look =
  | { kind: 'walker'; name: string }
  | { kind: 'idle'; name: string }
  | { kind: 'monster'; name: MonsterKind };

export interface Bubble { emoji: string; t: number; hold: number }

export interface Actor {
  id: string;
  look: Look;
  x: number;
  y: number;
  face: number;
  moving: boolean;
  /** Tiles per second along a path. */
  speed: number;
  path: { x: number; y: number }[];
  /** Trails a step behind you. */
  follow: boolean;
  /** A passing feeling (pops up, then fades). */
  bubble: Bubble | null;
  /** A few words said aloud while you get on with things (no popup: the game carries on). */
  speech?: Bubble & { text: string };
  /** How they feel the rest of the time, shown whenever no passing bubble is up. */
  mood?: string;
  /** What they're called, for what they say to show who's saying it. */
  name?: string;
  /** Up close: the action button's label, and what talking to them does. */
  label?: string;
  talk?: () => Promise<void> | void;
  /** Drawn bigger or smaller than usual. */
  scale?: number;
  arrived?: () => void;
}

export type ActorSpec = Partial<Actor> & Pick<Actor, 'id' | 'look' | 'x' | 'y'>;

export class Actors {
  list: Actor[] = [];
  /** Where you've walked recently, for followers to trace. */
  private trail: { x: number; y: number }[] = [];

  get(id: string) {
    return this.list.find((a) => a.id === id);
  }

  /** Adds an actor (replacing any with the same id). */
  add(spec: ActorSpec): Actor {
    this.remove(spec.id);
    const a: Actor = { face: Math.PI / 2, moving: false, speed: 3.2, path: [], follow: false, bubble: null, ...spec };
    this.list.push(a);
    return a;
  }

  remove(id: string) {
    this.list = this.list.filter((a) => a.id !== id);
  }

  /** A passing emoji over an actor's head, for `secs` (Infinity keeps it up until replaced). */
  bubble(id: string, emoji: string, secs = 1.8) {
    const a = this.get(id);
    if (a) a.bubble = { emoji, t: 0, hold: secs };
  }

  /** A line said aloud over an actor's head for `secs` (it never pauses the game). */
  say(id: string, text: string, secs = 3) {
    const a = this.get(id);
    if (a) a.speech = { emoji: '', text, t: 0, hold: secs };
  }

  /** Walks an actor along `path`; resolves when they get there. */
  walk(id: string, path: { x: number; y: number }[], speed?: number): Promise<void> {
    const a = this.get(id);
    if (!a || !path.length) return Promise.resolve();
    a.path = [...path];
    if (speed) a.speed = speed;
    return new Promise((ok) => (a.arrived = ok));
  }

  /** Snaps followers to just behind you (after a teleport or warp). */
  regroup(x: number, y: number) {
    this.trail = [{ x, y }];
    for (const a of this.list) if (a.follow) { a.x = x - 0.6; a.y = y + 0.2; }
  }

  update(dt: number, hero: { x: number; y: number }) {
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(hero.x - last.x, hero.y - last.y) > 0.12) {
      this.trail.push({ x: hero.x, y: hero.y });
      if (this.trail.length > 80) this.trail.shift();
    }
    for (const a of this.list) {
      if (a.bubble) {
        a.bubble.t += dt;
        if (a.bubble.t > a.bubble.hold) a.bubble = null;
      }
      if (a.speech) {
        a.speech.t += dt;
        if (a.speech.t > a.speech.hold) a.speech = undefined;
      }
      let target: { x: number; y: number } | null = null, speed = a.speed;
      if (a.path.length) target = a.path[0];
      else if (a.follow) {
        const d = Math.hypot(hero.x - a.x, hero.y - a.y);
        if (d > 7) this.regroup(hero.x, hero.y);
        else if (d > 1.2) {
          target = this.behind(hero, 1.1);
          speed = Math.max(4.2, d * 3);
        }
      }
      if (!target) {
        a.moving = false;
        continue;
      }
      const dx = target.x - a.x, dy = target.y - a.y, dist = Math.hypot(dx, dy);
      if (dist < 0.06) {
        if (a.path.length) {
          a.path.shift();
          if (!a.path.length) {
            a.moving = false;
            const done = a.arrived;
            a.arrived = undefined;
            done?.();
          }
        }
        continue;
      }
      const step = Math.min(dist, speed * dt);
      a.x += (dx / dist) * step;
      a.y += (dy / dist) * step;
      a.face = Math.atan2(dy, dx);
      a.moving = true;
    }
  }

  /** The point `gap` tiles back along your trail. */
  private behind(hero: { x: number; y: number }, gap: number) {
    let prev = hero, left = gap;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i], d = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (d >= left) return { x: prev.x + ((p.x - prev.x) / d) * left, y: prev.y + ((p.y - prev.y) / d) * left };
      left -= d;
      prev = p;
    }
    return prev;
  }
}
