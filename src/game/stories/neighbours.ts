// Short journeys let a person arrive before Bram offers their place. Followers reuse the existing escort system.
import { NEIGHBOURS, NEIGHBOUR_ORDER, neighbourAvailable, neighbourBuilding, neighbourReturned, type NeighbourId } from '../../neighbours';
import { G, paused, persist } from '../context';
import { say, type Speaker } from '../scenes';
import { syncStories, waitAt, stopWaiting, type Story } from '../stories';
const HOME = { x: 31.8, y: 11.3 };
const flag = (id: NeighbourId, key: string) => `${id}:journey:${key}`;
const actorId = (id: NeighbourId) => `journey-${id}:${id}`;
const speaker = (id: NeighbourId): Speaker => ({ name: NEIGHBOURS[id].name, emoji: NEIGHBOURS[id].icon, portrait: () => `npc_${id}` });
function talk(id: NeighbourId) {
  return paused(async () => {
    if (!G.save.flags.includes(flag(id,'met'))) {
      for (const text of NEIGHBOURS[id].meet) await say(speaker(id),text);
      G.save.flags.push(flag(id,'met')); persist(); syncStories();
    } else if (G.save.flags.includes(flag(id,'waiting'))) {
      await say(speaker(id),'There you are. Ready to carry on?'); stopWaiting(flag(id,'waiting'));
    } else await say(speaker(id),neighbourReturned(G.save,id) ? 'Bram’s outside the Sawmill. He said to ask him about a place for me.' : 'Lead on. I’ll keep up.');
  });
}
function journey(id: NeighbourId): Story {
  const p=NEIGHBOURS[id], aid=actorId(id);
  return {
    id:`journey-${id}`, title:`${p.name} Finds Sowerby`, icon:p.icon, objs:[],
    available:()=>neighbourAvailable(G.save,id) || (G.save.flags.includes(flag(id,'met')) && !neighbourBuilding(G.save,id)),
    steps:[
      { id:'meet', label:`Find ${p.name} by the ${id === 'pip' || id === 'alder' ? 'Woods' : 'Meadow'} road`, target:()=>p.at, done:()=>G.save.flags.includes(flag(id,'met')) },
      { id:'home', label:`Walk ${p.name} back to Clover in Sowerby`, target:()=>G.save.flags.includes(flag(id,'waiting')) ? p.at : HOME,
        done:()=>{
          const a=G.over.actors.get(aid);
          return !G.save.spirit && !G.over.underground && !!a?.follow && !G.save.flags.includes(flag(id,'waiting')) && Math.hypot(G.over.x-HOME.x,G.over.y-HOME.y)<2.8 && Math.hypot(a.x-G.over.x,a.y-G.over.y)<3;
        }, then:()=>paused(async()=>{
          // Durable arrival before dialogue. Reloading here never sends them back out or opens a duplicate hand-in.
          if (!G.save.flags.includes(`${id}:returned`)) G.save.flags.push(`${id}:returned`);
          persist(); await say(speaker(id),p.arrived);
        }) },
    ],
    cast:()=>{
      if (neighbourBuilding(G.save,id)) return [];
      const met=G.save.flags.includes(flag(id,'met')), home=neighbourReturned(G.save,id), waiting=G.save.flags.includes(flag(id,'waiting'));
      const at=home?p.town:met&&!waiting?{x:G.over.x-.8,y:G.over.y+.1}:p.at;
      return [{id:aid,name:p.name,look:{kind:'walker',name:id},...at,follow:met&&!home&&!waiting,face:Math.PI/2,label:met?'Talk':`Meet ${p.name}`,talk:()=>talk(id)}];
    },
    fainted:()=>{if (G.over.actors.get(aid)?.follow) waitAt(aid,flag(id,'waiting'));},
  };
}
export const NEIGHBOUR_STORIES=NEIGHBOUR_ORDER.map(journey);
