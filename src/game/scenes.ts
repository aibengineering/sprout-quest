// Scene scripting: short cinematic moments written as plain async code. Pan the camera, follow someone, pop a
// feeling over their head, walk them somewhere, and have them talk.
import { G } from './context';

/** Who can talk: their name, a portrait for each mood (rendered from their model), and an emoji fallback. */
export interface Speaker { name: string; portrait: (mood: string) => string; emoji: string }

/**
 * Plays a scene: letterboxed, the world waiting (you can't move), then hands control back. Start any fight after
 * the scene ends, not inside it.
 */
export async function scene(run: () => Promise<void>) {
  G.mode = 'dialog';
  G.ui.cinema(true);
  G.over.quiet = true;
  G.input.reset();
  try {
    await run();
  } finally {
    G.over.camTarget = null;
    G.over.quiet = false;
    G.ui.cinema(false);
    await wait(250);
    G.mode = 'world';
    G.input.reset();
  }
}

export const wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

/** Glides the camera to a spot (in tiles) and holds there. */
export async function pan(x: number, y: number, ms = 900) {
  G.over.camTarget = { x, y };
  await wait(ms);
}

/** Keeps the camera on an actor as they move. */
export function follow(id: string) {
  G.over.camTarget = () => G.over.cast.get(id) ?? { x: G.over.x, y: G.over.y };
}

/** A feeling over someone's head. */
export function bubble(id: string, emoji: string, secs = 1.8) {
  G.over.cast.bubble(id, emoji, secs);
}

/** Walks an actor along a path (tiles); resolves when they arrive. */
export function walk(id: string, path: { x: number; y: number }[], speed?: number) {
  return G.over.cast.walk(id, path, speed);
}

/** Turns an actor to face someone (another actor's id, or the hero by default). */
export function lookAt(id: string, at?: string) {
  const a = G.over.cast.get(id), b = (at && G.over.cast.get(at)) || { x: G.over.x, y: G.over.y };
  if (a) a.face = Math.atan2(b.y - a.y, b.x - a.x);
}

/** Up-close dialogue: their portrait in the mood given, and what they say. It sits at the top if the action's low. */
export function say(who: Speaker, text: string, mood = 'happy') {
  const t = G.over.camTarget, focus = (typeof t === 'function' ? t() : t) ?? { x: G.over.x, y: G.over.y };
  return G.ui.talk(who.name, who.portrait(mood), who.emoji, text, G.over.screenY(focus.y) > 0.5);
}

/** A narrator's line along the bottom of the screen. */
export function narrate(text: string) {
  return G.ui.caption(text, 'narrator');
}
