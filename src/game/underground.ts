// Enter an independent underground map through its visible mouth, and return to the same doorstep.
import { zoneById } from '../data';
import { ECHO_OUTSIDE } from '../echoCave';
import { MOUTH } from '../procession';
import { seamById, seamOpen, SEAMS, TUNNEL_HOME } from '../seams';
import { syncStories } from './stories';
import { CAVE_WEST_EDGE, CAVE_EAST_EDGE, CAVE_WEST_OUTSIDE, CAVE_EAST_OUTSIDE } from '../caveEntrance';
import { G, busy, paused, persist, transition } from './context';

export function enterMainCavern(side: 'west' | 'east' = 'west') {
 if(busy()||G.mode!=='world'||G.over.room||G.over.underground)return;
 if(!G.save.bosses.includes('alphawolf')){G.ui.toast('The Alpha Woolf guards this cave entrance. Challenge it at the gate.');return;}
 G.audio.play('step');G.input.reset();transition(()=>{
   if(side==='east')G.over.teleport(CAVE_EAST_EDGE-1.5,14.8);
   else { const p=G.world.entryPoint('cave');G.over.teleport(p.x+1,p.y); }
   G.over.face=side==='east'?Math.PI:0;persist();
 },.85,'fade');
}

export function enterEchoCave() {
  if (busy() || G.over.room || !G.over.fieldMap || G.mode !== 'world') return;
  G.audio.play('step');
  G.input.reset();
  transition(() => { G.over.enterCave(); persist(); });
}

export function leaveEchoCave() {
  if (busy() || !G.over.underground) return;
  G.audio.play('step');
  G.input.reset();
  transition(() => { G.over.teleport(ECHO_OUTSIDE.x, ECHO_OUTSIDE.y); G.over.face = Math.PI / 2; persist(); });
}

export function undergroundTick() {
  if (busy() || G.mode !== 'world' || G.over.room) return;
  if (G.over.underground===G.over.cavern) {
    const c=G.over.cavern, a=G.input.axis();
    if(c.outAt(G.over.x,G.over.y)) {
      if(G.over.x<c.x0+.8&&a.x<-.5) {G.input.reset();transition(()=>{G.over.teleport(CAVE_WEST_OUTSIDE.x,CAVE_WEST_OUTSIDE.y);G.over.face=Math.PI;persist();},.85,'fade');}
      else if(G.over.x>c.x0+c.w-.8&&a.x>.5&&G.save.bosses.includes('echoqueen')) {G.input.reset();transition(()=>{G.over.teleport(CAVE_EAST_OUTSIDE.x,CAVE_EAST_OUTSIDE.y);G.over.face=0;persist();},.85,'fade');}
    }
    if(a.y<-.5 && Math.abs(G.over.x-MOUTH.x)<.5 && G.over.y>MOUTH.y-.2&&G.over.y<MOUTH.y+.6) enterEchoCave();
  } else if (G.over.underground) {
    if (G.over.underground.outAt(G.over.x, G.over.y)) G.over.underground===G.over.echo ? leaveEchoCave() : leaveOreGallery();
  } else if(G.over.currentZone.id==='woods'&&G.over.x>CAVE_WEST_EDGE-2&&G.input.axis().x>.5&&G.save.bosses.includes('alphawolf')) enterMainCavern();
  else if(G.over.currentZone.id==='hollow'&&G.over.x<CAVE_EAST_EDGE+1.1&&G.input.axis().x<-.5) enterMainCavern('east');
  else if (G.over.currentZone.id === 'cave' && G.input.axis().y < -.5
    && Math.abs(G.over.x - MOUTH.x) < .5 && G.over.y > MOUTH.y - .2 && G.over.y < MOUTH.y + .6) enterEchoCave();
}

export function restoreUnderground() {
  const saved = G.save.underground;
  if(saved?.id==='cavern'&&!G.over.room) {
    const c=G.over.cavern; c.sync();
    const valid=Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&saved.x>=c.x0&&saved.x<c.x0+c.w&&!c.blocked(saved.x,saved.y,.28);
    const p=valid?saved:G.world.entryPoint('cave'); G.over.teleport(p.x,p.y);return;
  }
  if (saved?.id === 'resource' && !G.over.room) {
    G.over.oreGallery.sync(G.save);
    const valid=Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&!G.over.oreGallery.blocked(saved.x,saved.y,.28);
    G.over.enterOreGallery(valid?saved:undefined);return;
  }
  if (saved?.id !== 'echo' || G.over.room) return;
  const valid = Number.isFinite(saved.x) && Number.isFinite(saved.y) && !G.over.echo.blocked(saved.x, saved.y, .28);
  G.over.enterCave(valid ? saved : undefined);
}

export function enterOreGallery(){
 if(busy()||G.over.room||!G.over.fieldMap||G.mode!=='world')return;
 G.audio.play('step');G.input.reset();transition(()=>{G.over.enterOreGallery();syncStories();persist();});
}
export function leaveOreGallery(){
 if(busy()||G.over.underground!==G.over.oreGallery)return;
 G.audio.play('step');transition(()=>{const p=SEAMS[0].at;G.over.teleport(p.x+.45,p.y+.8);syncStories();persist();});
}
export async function useBurrow(id:string){
 if(busy()||G.save.spirit)return;
 if(id==='home'){
  const choices=SEAMS.filter(p=>seamOpen(G.save,p.id));
  const result=await paused(()=>G.ui.dialog('<h2>⛏️ Pip’s tunnels</h2><p>Only passages you have opened lead out from here.</p>'+choices.map(p=>`<button class="go wide" data-dialog="tunnel:${p.id}">${p.name}</button>`).join(''),[['close','Stay']],'burrow-travel'));
  const p=choices.find(p=>result===`tunnel:${p.id}`);if(!p)return;
  transition(()=>{if(p.id==='quarry')G.over.enterOreGallery({x:G.over.oreGallery.x0+10.5,y:3.2});else G.over.teleport(p.at.x,p.at.y+1);syncStories();persist();});return;
 }
 const p=seamById(id);if(!p||!seamOpen(G.save,id))return;
 if(id==='quarry'&&!G.save.flags.includes('pip:journey:met')&&!G.save.flags.includes('pip:returned')&&!G.save.build.cottage){G.ui.toast('⛏️ Show Pip what you found before taking his tunnel home.');return;}
 G.audio.play('step');transition(()=>{G.over.teleport(TUNNEL_HOME.x-.7,TUNNEL_HOME.y+.5);syncStories();persist();G.ui.banner('Sowerby','Pip’s tunnel brings you home');});
}
