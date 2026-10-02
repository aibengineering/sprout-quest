// Pip, the mole miner: the first newcomer. Once Bram's settled in, his planks build Sowerby a Guest Cottage, and Pip
// tunnels up beside it the day it's finished: tiny, chatty and cheerful, he knows every rock in the valley (and was the
// first to talk about the warm black stone on Ember Peak). He teaches Granny his Rock Candy. See the story bible
// (Side quests).
import { ZONES } from '../../data';
import { cottageDue } from '../../rules';
import { G, paused, persist, syncWorld } from '../context';
import { bubble, narrate, pan, say, scene, wait, type Speaker } from '../scenes';
import type { Story } from '../stories';
import { residentDoor } from '../../villageLayout';
import { homeLevel } from '../../housing';
import { mealDescription } from '../../kitchen';
import { BRAM_AT } from './bram';

export const PIP: Speaker = { name: 'Pip', emoji: '⛏️', portrait: (m) => (m === 'wow' ? 'npc_pip_wow' : 'npc_pip') };
const ID = 'pip:pip';

/** By the Guest Cottage's door (the plot's in world.ts), just clear of the Waystone. */
const HOME = residentDoor('pip');

/** Talking to someone outside a scene: a few lines with the world waiting. */
const chat = (lines: [Speaker, string, string?][]) => paused(async () => {
  for (const [who, text, mood] of lines) await say(who, text, mood);
});

const LINES: [string, string?][] = [
  ['Every rock has a story. The big one by the Forge? Grumpy. Best not to ask.'],
  ["Eat some Rock Candy before you go mining! Rocks can tell. They loosen right up."],
  ["Up on Ember Peak there's a black, glassy rock. Obsidian! Never seen a stone like it. Warm, it is.", 'wow'],
  ['Bram says I talk too much. I say he talks too little. So I talk, and he nods. It works!'],
  ["I dug a little tunnel to the Waystone. Don't tell the Elder."],
];
let line = 0;

/** A chat with Pip by his door (also what the Guest Cottage does once he lives there, see interact.ts). */
export const visitPip = () => {
  const turn = line++;
  const [text, mood] = homeLevel(G.save, 'pip') >= 2 && turn % 6 === 5
    ? ['My own study! Room for every pebble. I taught Clover the slower way to cool Rock Candy; it lasts a whole minute longer now.']
    : LINES[turn % LINES.length];
  return chat([[PIP, text, mood]]);
};

/** Pops up out of the ground: small, then full size. */
async function popUp() {
  const a = G.over.actors.add({ id: ID, look: { kind: 'walker', name: 'pip' }, ...HOME, face: Math.PI / 2, scale: 0.2 });
  G.audio.play('pickup');
  for (const k of [0.35, 0.6, 0.85, 1.08, 1.15, 1.06, 1]) {
    a.scale = k;
    await wait(50);
  }
}

export const PIP_STORY: Story = {
  id: 'pip',
  title: 'Pip Moves In',
  icon: '⛏️',
  available: () => cottageDue(G.save) || G.save.build.cottage > 0,
  objs: [],

  steps: [
    {
      id: 'cottage', label: 'Ask Bram to build the Guest Cottage with your planks',
      target: () => BRAM_AT,
      done: () => G.save.build.cottage >= 1,
      async then() {
        syncWorld();
        await scene(async () => {
          await pan(HOME.x - 1, HOME.y - 1, 800);
          await narrate('The last plank is barely nailed down when the ground by the door starts to wobble…');
          await popUp();
          bubble(ID, '😵', 1.4);
          await say(PIP, "Oof! Wrong turn. I was aiming for the meadow!", 'wow');
          bubble(ID, '😮', 1.4);
          await say(PIP, "Oh! A cottage? A proper one, with a roof and a door and everything? Is anybody living in it?", 'wow');
          await narrate('You shake your head.');
          bubble(ID, '💖', 2.5);
          await say(PIP, "Nobody? Can I? I'm Pip! I dig. Mostly rocks. I know every rock in this valley by name. Well, by taste.");
          await say(PIP, "Mind you, I've never had a house with an upstairs. I've only ever had downstairs!");
          await say(PIP, "Tell you what: I'll give the lady in the blue house my Rock Candy recipe. Crunchy! Good for miners.");
        });
        G.save.flags.push('pip:candy');
        persist();
        await paused(() => G.ui.itemFound('meal_rockcandy', 'Rock Candy', `Granny can cook it now: ${mealDescription(G.save, 'rockcandy')} Stone and Copper.`, '🍬', 'New recipe'));
      },
    },
  ],

  cast(step) {
    if (step < 1) return [];
    return [{ id: ID, look: { kind: 'walker', name: 'pip' }, ...HOME, face: Math.PI / 2, mood: '😄', label: 'Talk', talk: visitPip }];
  },
};
