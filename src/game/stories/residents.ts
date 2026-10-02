// Two neighbours arrive when their homes are built. Meeting each teaches Granny a recipe once.
import { homeLevel, type HomeId } from '../../housing';
import { residentDoor } from '../../villageLayout';
import { G, paused, persist } from '../context';
import { say, type Speaker } from '../scenes';
import type { Story } from '../stories';

const PEOPLE = {
  hazel: { name: 'Hazel', emoji: '🌿', portrait: () => 'npc_hazel', meal: 'meadowtea', recipe: 'Meadow Tea',
    hello: 'Bram said there was a garden that needed a friend. What a lovely little home! I’m Hazel. I know which leaves make a weary hand steady again.',
    gift: 'I’ll teach Clover my Meadow Tea. Herbs and flowers from Poppy’s Garden; sip it before mining and those little seams will be easier to strike.',
    lines: ['Poppy grows them; I learn their names; Clover puts the kettle on. That’s how a village works.', 'Pip brought me a stone with a tiny fern pressed into it. Some gardens are older than any of us.'],
    upgraded: 'The glasshouse keeps my herbs dry through the rain. Clover’s Meadow Tea stays good for a whole minute longer now.' },
  moss: { name: 'Moss', emoji: '🥖', portrait: () => 'npc_moss', meal: 'trailbuns', recipe: 'Trail Buns',
    hello: 'A pine roof! Smells almost as good as fresh bread. Moss, at your service. I followed the smell of Clover’s cooking all the way here.',
    gift: 'My Trail Buns use berries and a little Bunny Fluff for the dough. I’ll show Clover. Eat one before gathering; every good strike teaches your hands a little more.',
    lines: ['Bram builds the shelves, Poppy brings the berries, and I try not to eat everything before Clover sees it.', 'Hazel says I knead too loudly. Pip says the floor sounds delicious. I’m still deciding what to do with that.'],
    upgraded: 'The Glimmer Larder keeps the dough cool. Our Trail Buns keep you going a minute longer. That’s good timber doing good work.' },
} as const;
type NewResident = keyof typeof PEOPLE;
const chatter: Record<NewResident, number> = { hazel: 0, moss: 0 };
export function visitResident(id: HomeId) {
  if (id === 'pip' || !homeLevel(G.save, id)) return G.ui.toast('🧔 Talk to Bram outside the Sawmill about building this home.');
  const p = PEOPLE[id], speaker: Speaker = p;
  return paused(async () => {
    if (!G.save.flags.includes(`${id}:recipe`)) {
      await say(speaker, p.hello);
      await say(speaker, p.gift);
      if (!G.save.flags.includes(`${id}:recipe`)) G.save.flags.push(`${id}:recipe`);
      persist();
    } else {
      const turn = chatter[id]++;
      const text = homeLevel(G.save, id) >= 2 && turn % 2 === 0 ? p.upgraded : p.lines[turn % p.lines.length];
      await say(speaker, text);
    }
  });
}
function residentStory(id: NewResident): Story {
  const p = PEOPLE[id];
  return {
    id, title: `${p.name} Moves In`, icon: p.emoji, objs: [], available: () => homeLevel(G.save, id) > 0,
    steps: [{ id: 'welcome', label: `Welcome ${p.name} at their new home`, target: () => residentDoor(id), done: () => G.save.flags.includes(`${id}:recipe`),
      then: () => paused(async () => { await G.ui.itemFound(`meal_${p.meal}`, p.recipe, `${p.name} has taught Granny a new recipe. Choose it in the Kitchen’s recipe book.`, p.emoji, 'New neighbour, new recipe'); }) }],
    cast: () => [{ id: `${id}:${id}`, name: p.name, look: { kind: 'walker', name: id }, ...residentDoor(id), face: Math.PI / 2,
      label: G.save.flags.includes(`${id}:recipe`) ? 'Talk' : `Meet ${p.name}`, talk: () => visitResident(id) }],
  };
}
export const RESIDENT_STORIES = [residentStory('hazel'), residentStory('moss')];
