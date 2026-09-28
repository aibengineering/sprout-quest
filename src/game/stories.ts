// Side stories: short chains told with scenes (camera pans, feelings over people's heads, dialogue), alongside the
// main quest. Each story is a list of steps; how far you are is saved, and the characters and monster groups on the
// map follow from that.
import type { ActorSpec } from '../actors';
import type { BattleSetup } from '../battle/types';
import type { WorldObj } from '../world';
import { G, persist, syncWorld } from './context';
import { BRAM_STORY } from './stories/bram';
import { GRANNY_STORY } from './stories/granny';
import { POPPY } from './stories/poppy';

export interface StoryStep {
  id: string;
  /** Shown in the tracker and the Journal while this step is current. */
  label: string;
  /** Steps you haven't knowingly started (stumbling across the story) stay out of the tracker. */
  hidden?: boolean;
  /** Where the waypoint arrow points. */
  target?: () => { x: number; y: number } | null;
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
  /** Monster groups this story places on the map; each shows only at its step (see WorldObj.story). */
  objs: WorldObj[];
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
}

export const STORIES: Story[] = [GRANNY_STORY, POPPY, BRAM_STORY];

/** How far through a story you are (0 = not started; the step count = finished). */
export const stepOf = (id: string) => G.save.stories[id] ?? 0;
export const finished = (st: Story) => stepOf(st.id) >= st.steps.length;

/** The story you're in the middle of (for the tracker and the waypoint), if any. */
export function activeStory(): { story: Story; step: StoryStep } | null {
  for (const story of STORIES) {
    const i = stepOf(story.id), step = story.steps[i];
    if (step && !step.hidden && story.available()) return { story, step };
  }
  return null;
}

/** Every story you've started, for the Journal. */
export function storyLog() {
  return STORIES.filter((st) => stepOf(st.id) > 0).map((st) => ({
    title: st.title, icon: st.icon, done: finished(st), label: finished(st) ? 'Complete!' : st.steps[stepOf(st.id)].label,
  }));
}

/** Puts every story's monster groups on the map (once), then syncs characters and visibility. */
export function setUpStories() {
  for (const st of STORIES) for (const o of st.objs) if (!G.world.objs.includes(o)) G.world.objs.push(o);
  syncStories();
}

/** Places each story's cast for its current step: new characters appear, gone ones leave, the rest update. */
export function syncStories() {
  const actors = G.over.actors;
  for (const st of STORIES) {
    const cast = st.available() || stepOf(st.id) > 0 ? st.cast(stepOf(st.id)) : [];
    for (const a of actors.list.filter((a) => a.id.startsWith(`${st.id}:`) && !cast.some((c) => c.id === a.id))) actors.remove(a.id);
    for (const spec of cast) {
      const a = actors.get(spec.id);
      if (!a) actors.add(spec);
      else {
        // Keep where they are (a follower mid-walk), but take on the step's look, mood and lines.
        const { x, y, ...rest } = spec;
        Object.assign(a, rest, a.follow || spec.follow ? {} : { x, y }, { follow: !!spec.follow, mood: spec.mood, label: spec.label, talk: spec.talk });
      }
    }
  }
  syncWorld();
}

let busy = false;

/** Advances any story whose current step is done, playing its scene. Returns whether one moved on. */
export async function checkStories(): Promise<boolean> {
  if (busy) return false;
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

/** Extra battle setup for a story's monster group. */
export function storyFightExtras(o: WorldObj): Partial<BattleSetup> | undefined {
  const st = STORIES.find((s) => s.id === o.story?.id);
  return o.flag ? st?.fight?.(o.flag) : undefined;
}

/** The waypoint for the active story, if it has one. */
export function storyTarget(): { x: number; y: number } | null {
  return activeStory()?.step.target?.() ?? null;
}
