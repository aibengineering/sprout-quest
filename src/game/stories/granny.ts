// Granny Clover: in the blue house in Sowerby from the day you arrive, worrying about her granddaughter Poppy. Once
// Mr. Floppers is home (Poppy's story), she cooks for you: her Kitchen (see kitchen.ts).
import { cook, kitchenOpen, MEALS, type MealId } from '../../kitchen';
import { G, paused, persist } from '../context';
import { say, type Speaker } from '../scenes';
import type { Story } from '../stories';

export const GRANNY: Speaker = { name: 'Granny Clover', emoji: '👵', portrait: (m) => (m === 'worried' ? 'npc_granny_worried' : 'npc_granny') };
/** Her actor's id, for scenes in other stories. */
export const GRANNY_ID = 'granny:granny';
/** By the blue house's door. */
export const GRANNY_AT = { x: 31.8, y: 10.3 };

const poppyStep = () => G.save.stories.poppy ?? 0;
/** Poppy's rescue can start (see poppy.ts). */
const poppyDue = () => G.save.lv >= 3;

function lines(): [string, string?][] {
  const step = poppyStep();
  // Before the rescue can start, she only frets; once it can, Poppy's properly overdue (and she says where).
  if (step === 0 && !poppyDue()) return [["Oh! You must be the traveler everyone's talking about. My granddaughter Poppy's off picking flowers in the Sunny Meadow again. She wanders so far… I do worry.", 'worried']];
  if (step <= 1) return [["Poppy went to pick flowers this morning, down in the meadow's far south-east corner. She should have been home by now…", 'worried']];
  if (step <= 4) return [['Poor Poppy. That bunny is her best friend in the whole world.', 'worried']];
  if (step === 5) return [["You found him? Oh, go on, give him to her, dear!"]];
  return [["Those boots holding up? Poppy hasn't stopped talking about you. And that grove of hers has lovely timber and stone, now the bullies are gone."]];
}

const GREETINGS = ["Sit down, sit down! What'll it be, dear?", 'Hungry? Of course you are. Look at you, all skin and leaves.', "There's always something on the stove for our hero."];
let greet = 0;

/** Her kitchen table: pick a meal, and she cooks it while you wait. */
function kitchen() {
  return paused(async () => {
    const r = await G.ui.kitchen(G.save, GREETINGS[greet++ % GREETINGS.length]);
    if (!r.startsWith('cook:')) return;
    const id = r.slice(5) as MealId;
    if (cook(G.save, id) !== 'ok') return;
    G.audio.play('craft');
    persist();
    await say(GRANNY, `${MEALS[id].icon} There you go: ${MEALS[id].name}. Mind the crumbs!`);
  });
}

export const GRANNY_STORY: Story = {
  id: 'granny',
  title: "Granny's Kitchen",
  icon: '🍳',
  available: () => G.save.flags.includes('village'),
  steps: [],
  objs: [],
  cast: () => [{
    id: GRANNY_ID, look: { kind: 'idle', name: 'granny' }, ...GRANNY_AT,
    label: kitchenOpen(G.save) ? 'Cook' : 'Talk',
    mood: poppyStep() <= 4 ? '😟' : undefined,
    talk: () => (kitchenOpen(G.save) ? kitchen() : paused(async () => {
      for (const [text, mood] of lines()) await say(GRANNY, text, mood);
    })),
  }],
};
