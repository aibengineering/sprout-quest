// Granny Clover: by the blue house in Sowerby from the day you arrive, worrying about her granddaughter Poppy. Once
// Mr. Floppers is home (Poppy's story), she welcomes you into her Kitchen to cook together (see kitchen.ts).
import { kitchenOpen } from '../../kitchen';
import { poppyAway } from '../../procession';
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
  // Poppy's off after the drums in Echo Cavern (drums.ts).
  if (poppyAway(G.save)) return [["Echo Cavern, dear. Please, bring my Poppy home.", 'worried']];
  // Before the rescue can start, she only frets; once it can, Poppy's properly overdue (and she says where).
  if (step === 0 && !poppyDue()) return [["Oh! You must be the traveler everyone's talking about. My granddaughter Poppy's off picking flowers in the Sunny Meadow again. She wanders so far… I do worry.", 'worried']];
  if (step <= 1) return [["Poppy went to pick flowers this morning, down in the meadow's far south-east corner. She should have been home by now…", 'worried']];
  if (step <= 4) return [['Poor Poppy. That bunny is her best friend in the whole world.', 'worried']];
  if (step === 5) return [["You found him? Oh, go on, give him to her, dear!"]];
  if (!kitchenOpen(G.save)) return [["Thank you for bringing Mr. Floppers home, dear. I’d love to cook something with you, but this little kitchen barely fits me."], [G.save.flags.includes('bram:hut') ? "Bram’s putting a kitchen beside the house. Grow some flowers with Poppy, then bring him the timber and oven stone." : "Once Bram’s home, I’ll ask about a kitchen with proper benches. Poppy wants flowers in every window."]];
  const neighbours = G.save.flags.includes('moss:recipe')
    ? 'Moss knows bread. Hazel knows leaves. I know how to squeeze another chair round this table.'
    : G.save.flags.includes('hazel:recipe') ? 'Hazel brought cuttings. Poppy’s making labels for them. Mind you, some of the names are hers.'
    : "Those boots holding up? Poppy hasn't stopped talking about you. And that grove of hers has lovely timber and stone, now the bullies are gone.";
  return [[neighbours], ["Look at all this room! Come inside and have some food, dear. I'll join you by the recipe book, and we'll find something lovely to make."]];
}

/** Bram's story starts with her: once the Woods are open and Poppy's safe home, she asks you to take him a pie. */
export const bramDue = () => G.save.bosses.includes('kingslime') && poppyStep() >= 6 && !G.save.flags.includes('bram:pie');

export function askFavour() {
  return paused(async () => {
    await say(GRANNY, "Oh, dear, would you do an old woman a favour? My old friend Bram is a lumberjack, out in Whisper Woods.");
    await say(GRANNY, "He used to bring me firewood every week. I haven't seen him in years, and I do worry.", 'worried');
    await say(GRANNY, "Would you take him this pie? Cherry. It's his favourite.");
    G.save.flags.push('bram:pie');
    persist();
    await G.ui.itemFound('pie', "Granny's Cherry Pie", "Still warm. For Bram, at his logging camp in the north-west of Whisper Woods.", '🥧', 'Granny gave you', true);
  });
}

export const GRANNY_STORY: Story = {
  id: 'granny',
  title: "Granny's Kitchen",
  icon: '🍳',
  available: () => G.save.flags.includes('village'),
  steps: [],
  objs: [],
  // She joins you in the kitchen when you enter; outdoors she remains available for chats and quests.
  cast: () => [{
    id: GRANNY_ID, look: { kind: 'idle', name: 'granny' }, ...GRANNY_AT, label: 'Talk',
    mood: poppyAway(G.save) ? '😰' : poppyStep() <= 4 ? '😟' : undefined,
    talk: () => (bramDue() ? askFavour() : paused(async () => {
      for (const [text, mood] of lines()) await say(GRANNY, text, mood);
    })),
  }],
};
