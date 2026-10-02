// Enter an independent underground map through its visible mouth, and return to the same doorstep.
import { ECHO_OUTSIDE } from '../echoCave';
import { MOUTH } from '../procession';
import { seamById, seamOpen, SEAMS, TUNNEL_HOME } from '../seams';
import { syncStories } from './stories';
import { G, busy, paused, persist, transition } from './context';

export function enterEchoCave() {
  if (busy() || G.over.room || G.over.underground || G.mode !== 'world') return;
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
  if (G.over.underground) {
    if (G.over.underground.outAt(G.over.x, G.over.y)) G.over.underground===G.over.echo ? leaveEchoCave() : leaveOreGallery();
  } else if (G.over.currentZone.id === 'cave' && G.input.axis().y < -.5
    && Math.abs(G.over.x - MOUTH.x) < .5 && G.over.y > MOUTH.y - .2 && G.over.y < MOUTH.y + .6) enterEchoCave();
}

export function restoreUnderground() {
  const saved = G.save.underground;
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
 if(busy()||G.over.room||G.over.underground||G.mode!=='world')return;
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
