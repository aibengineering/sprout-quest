// A private friendship in Glimmer Hollow, not a public monster arrival in Sowerby.
import type { Story } from '../stories';
import { syncStories } from '../stories';
import { FOX_DEN, FOX_SIGHT, FOX_TRAIL, foxTrusted } from '../../fox';
import { FOX, foxTrial } from '../fox';
import { G, paused, persist } from '../context';
import { say } from '../scenes';
import { visitDojo } from '../dojo';
const ID = 'fox:fox';
const has = (flag:string) => G.save.flags.includes(flag);
const progress = () => FOX_TRAIL.reduce((n,_,i)=>has(`fox:trail:${i}`)?i+1:n,0);
async function talk() {
  if (!has('fox:seen')) {
    await paused(async()=>{
      await say(FOX,'Those boots make an extraordinary amount of noise.');
      await say(FOX,'No, I’m not taking your shiny sword. I have perfectly good shiny things of my own. Follow me, if you can keep up.');
      G.save.flags.push('fox:seen'); persist();
    });
    const a=G.over.actors.get(ID); if(a) a.path=[{x:FOX_SIGHT.x,y:FOX_TRAIL[0].y},FOX_TRAIL[0]];
    syncStories(); return;
  }
  if (progress()<FOX_TRAIL.length && !has('fox:catch')) return;
  if (!G.save.perks.includes('shadowscarf')) {
    if(!has('fox:catch')) { G.save.flags.push('fox:catch'); persist(); }
    await foxTrial(); syncStories(); return;
  }
  if(G.save.build.training) return visitDojo();
  await paused(()=>say(FOX,'Your timber friend could bring a few soft targets. Here, by my den. This stays between us, little boots.'));
}
export const DOJO_STORY: Story = {
  id:'fox', title:'A Step Between Shadows', icon:'🦊', objs:[],
  available:()=>G.save.bosses.includes('echoqueen') || foxTrusted(G.save),
  started:()=>has('fox:seen'),
  steps:[
    {id:'sighting',label:'A flicker on the glimmer trail',hidden:true,target:()=>FOX_SIGHT,done:()=>has('fox:seen')},
    {id:'follow',label:'Follow the masked fox along the hidden trail',target:()=>{const a=G.over.actors.get(ID);return a?{x:a.x,y:a.y}:FOX_TRAIL[Math.min(progress(),2)];},done:()=>has('fox:catch')},
    {id:'trial',label:'Watch the glimmer marks and dodge the falling shards',target:()=>FOX_TRAIL[2],done:()=>G.save.perks.includes('shadowscarf')},
  ],
  cast:()=>{
    const n=progress(), a=G.over.actors.get(ID);
    const at=G.save.perks.includes('shadowscarf')?FOX_DEN:!has('fox:seen')?FOX_SIGHT:n>=3?FOX_TRAIL[2]:a?.path.length?{x:a.x,y:a.y}:FOX_TRAIL[n];
    return [{id:ID,name:'Masked Fox',look:{kind:'walker',name:'fox'},...at,face:Math.PI/2,speed:4.6,label:!has('fox:seen')?'Talk':n<3?'Follow the fox':G.save.build.training&&G.save.perks.includes('shadowscarf')?'Train with the fox':'Talk',talk}];
  },
  tick:()=>{
    if(!has('fox:seen')||G.mode!=='world'||G.over.room||G.over.underground||G.over.currentZone.id!=='hollow'||has('fox:catch'))return;
    const n=progress(), a=G.over.actors.get(ID);
    if(n>=3||!a||a.path.length||Math.hypot(G.over.x-a.x,G.over.y-a.y)>2.1)return;
    G.save.flags.push(`fox:trail:${n}`);persist();
    if(n<2) {
      a.label='Follow the fox';a.path=[FOX_TRAIL[n+1]];
      G.over.actors.say(ID,n===0?'You’re getting quieter.':'Mind the dust, little boots.',2.5);
    } else { a.label='Talk';G.over.actors.say(ID,'There. Nobody treads on the sleepers here.',3); }
  },
};
