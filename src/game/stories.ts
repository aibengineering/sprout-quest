// Side stories: short chains told with scenes (camera pans, feelings over people's heads, dialogue), alongside the
// main quest. Each story is a list of steps; how far you are is saved, and the characters and monster groups on the
// map follow from that.
import type { ActorSpec } from '../actors';
import type { BattleSetup } from '../battle/types';
import type { MapLayers } from '../overworld';
import type { WorldObj } from '../world';
import { busy as transitioning, G, persist, syncWorld } from './context';
import { BRAM_STORY } from './stories/bram';
import { GRANNY_STORY } from './stories/granny';
import { PIP_STORY } from './stories/pip';
import { DRUMS } from './stories/drums';
import { POPPY } from './stories/poppy';

export interface StoryStep {
  id: string;
  /** Shown in the tracker and the Journal while this step is current. */
  label: string;
  /** Steps you haven't knowingly started (stumbling across the story) stay out of the tracker. */
  hidden?: boolean;
  /** Where the waypoint arrow points. */
  target?: () => { x: number; y: number } | null;
  /** No arrow at all while this holds (not even the main quest's): you find your own way, by ear. */
  noArrow?: () => boolean;
  /** Is this step done? Checked every frame while you're free to move. */
  done: () => boolean;
  /** What plays once it's done (a scene, a reward), before the next step begins. */
  then?: () => Promise<void>;
}

export interface Story {
  id: string;
  title: string;
  icon: string;
  /** Can it start yet? */
  available: () => boolean;
  steps: StoryStep[];
  /** Who's on the map at a step (the step count once the story's finished). Ids start with the story's id. */
  cast: (step: number) => ActorSpec[];
  /** Its first step's cast is on the map before the story can start (Bram at his camp, who won't talk to you yet). */
  castEarly?: boolean;
  /** Monster groups this story places on the map; each shows only at its step (see WorldObj.story). */
  objs: WorldObj[];
  /** Props belonging to the separate underground map, rather than the overworld. */
  undergroundObjs?: WorldObj[];
  /** Which map owns this step's cast (the entrance scene can still be outdoors). */
  castSpace?: (step: number) => 'world' | 'echo';
  /** Extra setup for one of its fights (by flag), such as someone watching from the edge. */
  fight?: (flag: string) => Partial<BattleSetup> | undefined;
  /** Small touches every frame (moods that react to what's around). */
  tick?: (step: number) => void;
  /** Chopping this tree makes noise that matters to the story (a meter fills with every sloppy strike)… */
  noisy?: (o: WorldObj) => boolean;
  /** …and what happens when it gets too loud. */
  tooLoud?: (o: WorldObj) => void;
  /** A tree was felled (or a rock broken). */
  felled?: (o: WorldObj) => void;
  /** You fainted and woke at your checkpoint (someone you were escorting waits where you left off). */
  fainted?: () => void;
  /** What it paints onto the map (see Overworld.layers), whether or not it's started. */
  layers?: Partial<MapLayers>;
}

export const STORIES: Story[] = [GRANNY_STORY, POPPY, BRAM_STORY, DRUMS, PIP_STORY];

/** How far through a story you are (0 = not started; the step count = finished). */
export const stepOf = (id: string) => G.save.stories[id] ?? 0;
export const finished = (st: Story) => stepOf(st.id) >= st.steps.length;

/** The story you're in the middle of (for the tracker and the waypoint), if any: one under way before one that's only waiting to start. */
export function activeStory(): { story: Story; step: StoryStep } | null {
  const open = STORIES.filter((st) => {
    const step = st.steps[stepOf(st.id)];
    return step && !step.hidden && st.available();
  });
  const story = open.find((st) => stepOf(st.id) > 0) ?? open[0];
  return story ? { story, step: story.steps[stepOf(story.id)] } : null;
}

/** Every story you've started, for the Journal. */
export function storyLog() {
  return STORIES.filter((st) => stepOf(st.id) > 0).map((st) => ({
    title: st.title, icon: st.icon, done: finished(st), label: finished(st) ? 'Complete!' : st.steps[stepOf(st.id)].label,
  }));
}

/** Puts every story's monster groups on the map (once), then syncs characters and visibility. */
export function setUpStories() {
  for (const st of STORIES) {
    for (const o of st.objs) if (!G.world.objs.includes(o)) G.world.objs.push(o);
    for (const o of st.undergroundObjs ?? []) if (!G.over.echo.objs.includes(o)) G.over.echo.objs.push(o);
  }
  syncStories();
}

/** Whether a story's cast is on the map: once it can start (or has), or from the outset for one that's there early. */
const castOut = (st: Story) => st.available() || stepOf(st.id) > 0 || !!st.castEarly;
/** Which stories had their cast out at the last sync, to catch one becoming available (Granny, once you reach Sowerby). */
let castKey = '';

/** Places each story's cast for its current step: new characters appear, gone ones leave, the rest update. */
export function syncStories() {
  castKey = STORIES.map((st) => (castOut(st) ? 1 : 0)).join('');
  for (const st of STORIES) {
    const cast = castOut(st) ? st.cast(stepOf(st.id)) : [];
    const space = st.castSpace?.(stepOf(st.id)) ?? 'world';
    for (const [key, actors] of [['world', G.over.actors], ['echo', G.over.echo.actors]] as const) {
      const specs = key === space ? cast : [];
      for (const a of actors.list.filter((a) => a.id.startsWith(`${st.id}:`) && !specs.some((c) => c.id === a.id))) actors.remove(a.id);
      for (const spec of specs) {
        const a = actors.get(spec.id);
        if (!a) actors.add(spec);
        else {
          // Keep where they are (a follower mid-walk), but take on the step's look, mood and lines.
          const { x, y, ...rest } = spec;
          Object.assign(a, rest, a.follow || spec.follow ? {} : { x, y }, { follow: !!spec.follow, mood: spec.mood, label: spec.label, talk: spec.talk });
        }
      }
    }
  }
  syncWorld();
}

let busy = false;

/** Advances any story whose current step is done, playing its scene. Returns whether one moved on. */
export async function checkStories(): Promise<boolean> {
  // Input earlier in the same frame may have opened a menu or started entering a room.
  if (busy || G.mode !== 'world' || transitioning() || G.over.room || G.ui.isOpen) return false;
  // A story that's just become available brings its cast onto the map, even before its first step.
  if (STORIES.map((st) => (castOut(st) ? 1 : 0)).join('') !== castKey) syncStories();
  for (const st of STORIES) {
    const i = stepOf(st.id), step = st.steps[i];
    if (!step || !st.available() || !step.done()) continue;
    busy = true;
    try {
      G.save.stories[st.id] = i + 1;
      persist();
      await step.then?.();
      syncStories();
      persist();
    } finally {
      busy = false;
    }
    return true;
  }
  return false;
}

/** Per-frame touches for every story. */
export function tickStories() {
  for (const st of STORIES) if (stepOf(st.id) > 0) st.tick?.(stepOf(st.id));
}

/** Stories that are under way (or can start), for the gathering hooks. */
const live = () => STORIES.filter((st) => st.available() || stepOf(st.id) > 0);
export const storyNoisy = (o: WorldObj) => live().some((st) => st.noisy?.(o));
export const storyTooLoud = (o: WorldObj) => live().forEach((st) => st.tooLoud?.(o));
export const storyFelled = (o: WorldObj) => live().forEach((st) => st.felled?.(o));
export const storyFainted = () => live().forEach((st) => st.fainted?.());

/** Someone stops following you and waits at `at` (with `flag` set) until you come back and talk to them. */
export function waitAt(id: string, flag: string) {
  const a = G.over.actors.get(id);
  if (a) a.follow = false;
  if (!G.save.flags.includes(flag)) G.save.flags.push(flag);
  persist();
  syncStories();
}

/** They pick up following you again. */
export function stopWaiting(flag: string) {
  G.save.flags = G.save.flags.filter((f) => f !== flag);
  persist();
  syncStories();
}

/** Extra battle setup for a story's monster group. */
export function storyFightExtras(o: WorldObj): Partial<BattleSetup> | undefined {
  const st = STORIES.find((s) => s.id === o.story?.id);
  return o.flag ? st?.fight?.(o.flag) : undefined;
}

/** Every story's paint on the map, for the Overworld to draw. */
export const storyLayers: MapLayers = {
  ground: (ctx, ts) => STORIES.forEach((st) => st.layers?.ground?.(ctx, ts)),
  over: (ctx, ts, view) => STORIES.forEach((st) => st.layers?.over?.(ctx, ts, view)),
  headroom: () => Math.max(0, ...STORIES.map((st) => st.layers?.headroom?.() ?? 0)),
};

/** The active story wants no arrow at all just now. */
export const storyNoArrow = () => !!activeStory()?.step.noArrow?.();

/** The waypoint for the active story, if it has one. */
export function storyTarget(): { x: number; y: number } | null {
  return activeStory()?.step.target?.() ?? null;
}
