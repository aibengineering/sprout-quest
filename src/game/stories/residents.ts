// New neighbours belong to the village track: closed roads brought them here; shared work gives them reasons to stay.
// Story and voice notes: the sibling Sprout Quest Bible, "Sowerby's neighbours".
import { homeLevel, type HomeId } from '../../housing';
import { residentDoor } from '../../villageLayout';
import { G, paused, persist } from '../context';
import { say, type Speaker } from '../scenes';
import type { Story } from '../stories';

const PEOPLE = {
  hazel: { name: 'Hazel', emoji: '🌿', portrait: () => 'npc_hazel', meal: 'meadowtea', recipe: 'Meadow Tea',
    welcome: [
      'I’m Hazel. Pip told me Poppy was growing a garden here.',
      'I brought cuttings through the Woods. They need somewhere to take root.',
      'Clover saved me a place by the kettle. I’ll show her my Meadow Tea.',
      'Use Poppy’s herbs and flowers. A cup settles your hands before mining.',
    ],
    lines: [
      'That fern survived the closed road in my coat pocket. Poppy’s found it a bed.',
      'Pip found a leaf inside a stone. I’m growing the nearest match I can find.',
      'Some of Poppy’s weeds are useful. I set those aside before she clears the beds.',
      'Poppy wants to name every seedling. We’re starting with the ones she can reach.',
    ],
    afterCave: 'Poppy asked whether Pebblors like flowers. I said we could leave some and see.',
    afterDragon: 'There’s less ash on the beds today. Poppy noticed before I did.',
    upgraded: 'There’s room for Poppy’s cuttings in the glasshouse now. Clover’s tea keeps a minute longer, too.' },
  moss: { name: 'Moss', emoji: '🥖', portrait: () => 'npc_moss', meal: 'trailbuns', recipe: 'Trail Buns',
    welcome: [
      'I’m Moss. I used to bake for people passing through.',
      'When the road closed, nobody came. Bram said there might be work here.',
      'Clover’s lending me her oven. I’ll teach her my Trail Buns.',
      'Berries and Bunny Fluff. Take some before gathering; you’ll learn more from the work.',
    ],
    lines: [
      'Clover makes me eat before we bake. Apparently counting the buns doesn’t count as breakfast.',
      'I baked too many again. Bram offered a shelf. Clover said to fetch a plate.',
      'I still wrap a bun for the road. Old habit. Now there’s someone here to give it to.',
      'Pip comes up through the floor when he smells baking. Bram’s stopped fixing that board.',
    ],
    afterCave: 'Clover kept supper warm while Poppy was away. I kept her company.',
    afterDragon: 'The road’s open. I could move on. Think I’ll stay for breakfast.',
    upgraded: 'Room for an extra tray in the cool larder. Clover’s Trail Buns last a minute longer.' },
} as const;
type NewResident = keyof typeof PEOPLE;
const chatter: Record<NewResident, number> = { hazel: 0, moss: 0 };
export function visitResident(id: HomeId) {
  if (id === 'pip' || !homeLevel(G.save, id)) return G.ui.toast('🧔 Talk to Bram outside the Sawmill about building this home.');
  const p = PEOPLE[id], speaker: Speaker = p;
  return paused(async () => {
    if (!G.save.flags.includes(`${id}:recipe`)) {
      for (const text of p.welcome) await say(speaker, text);
      if (!G.save.flags.includes(`${id}:recipe`)) G.save.flags.push(`${id}:recipe`);
      persist();
    } else {
      const turn = chatter[id]++;
      const milestone = G.save.bosses.includes('dragon') ? p.afterDragon : (G.save.stories.drums ?? 0) >= 4 ? p.afterCave : null;
      const text = homeLevel(G.save, id) >= 2 && turn % 5 === 0 ? p.upgraded
        : milestone && turn % 3 === 0 ? milestone : p.lines[turn % p.lines.length];
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
