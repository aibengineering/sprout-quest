// New neighbours belong to the village track: closed roads brought them here; shared work gives them reasons to stay.
// Story and voice notes: the sibling Sprout Quest Bible, "Sowerby's neighbours".
import { visitHunter } from '../hunting';
import { offerVillageUpgrade } from '../housing';
import { homeLevel, type HomeId } from '../../housing';
import { residentDoor } from '../../villageLayout';
import { G, paused, persist } from '../context';
import { say, type Speaker } from '../scenes';
import type { Story } from '../stories';

const PEOPLE = {
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
const chatter: Record<NewResident, number> = { moss: 0 };
export function visitResident(id: HomeId) {
  if(id==='rook')return visitHunter();
  if (id === 'pip' || !homeLevel(G.save, id)) return G.ui.toast('🧔 Talk to Bram outside the Sawmill about building this home.');
  const p = PEOPLE[id], speaker: Speaker = p;
  return paused(async () => {
    if (!G.save.flags.includes(`${id}:recipe`)) {
      if(G.save.flags.includes(`${id}:returned`) || (G.save.stories[`journey-${id}`]??0)>=2) await say(speaker,'Clover’s oven, and a roof of my own. Think I’ll stop packing those buns for the road.');
      for (const text of p.welcome.slice(G.save.flags.includes(`${id}:returned`) || (G.save.stories[`journey-${id}`]??0)>=2 ? 1 : 0)) await say(speaker, text);
      if (!G.save.flags.includes(`${id}:recipe`)) G.save.flags.push(`${id}:recipe`);
      persist();
    } else {
      const turn = chatter[id]++;
      const milestone = G.save.bosses.includes('dragon') ? p.afterDragon : (G.save.stories.drums ?? 0) >= 4 ? p.afterCave : null;
      const final = 'My own oven beside the larder! Clover’s buns keep two extra minutes now.';
      const text = homeLevel(G.save, id) >= 2 && turn % 5 === 0 ? homeLevel(G.save,id)>=3 ? final : p.upgraded
        : milestone && turn % 3 === 0 ? milestone : p.lines[turn % p.lines.length];
      await say(speaker, text);
      await offerVillageUpgrade(p.name);
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
const ROOK_STORY:Story={id:'rook',title:'Rook’s Hunting Lodge',icon:'🏹',available:()=>homeLevel(G.save,'rook')>0,objs:[],steps:[{
 id:'welcome',label:'Visit Rook at his hunting lodge',target:()=>residentDoor('rook'),done:()=>G.save.flags.includes('rook:lodge'),
}],cast:()=>[{id:'rook:rook',name:'Rook',look:{kind:'walker',name:'rook'},...residentDoor('rook'),face:Math.PI/2,label:'Talk',talk:visitHunter}]};
export const RESIDENT_STORIES = [residentStory('moss'),ROOK_STORY];
