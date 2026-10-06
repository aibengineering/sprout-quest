import { FoxTrial, claimFoxScarf } from '../fox';
import { G, paused, persist } from './context';
import { drawHero } from '../assets';
import { say, type Speaker } from './scenes';
export const FOX: Speaker = { name: 'Masked Fox', emoji: '🦊', portrait: () => 'npc_fox' };
export async function foxTrial() {
  await paused(async () => {
    await say(FOX, 'Watch the dust before the stone. It tells you where to stand. Or, rather, where not to.');
    let retry = true;
    while (retry) {
      const trial = new FoxTrial();
      const result = G.ui.dialog('<h2>🦊 The falling glimmer</h2><p>Six falling shards. Dodge out of the glowing lane before each falls.</p><canvas id="fox-trial" width="540" height="260" aria-label="Three dodge lanes; the glowing lane marks the next falling shard" style="width:100%;max-height:32vh;border-radius:16px"></canvas><p id="fox-trial-status" aria-live="polite">Watch the glowing mark…</p><div style="display:flex;gap:12px"><button class="go" id="fox-left" style="flex:1">← Dodge</button><button class="go" id="fox-right" style="flex:1">Dodge →</button></div><p>Keyboard: ← / → or A / D</p>', [['leave', 'Try another time']], 'fox-trial');
      const canvas = document.getElementById('fox-trial') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const status = document.getElementById('fox-trial-status')!;
      const left = () => { trial.dodge(-1); G.audio.play('dodge'); };
      const right = () => { trial.dodge(1); G.audio.play('dodge'); };
      document.getElementById('fox-left')!.onclick = left;
      document.getElementById('fox-right')!.onclick = right;
      const key = (e: KeyboardEvent) => {
        if (e.repeat) return;
        if (['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(e.code)) { e.preventDefault(); e.code === 'ArrowLeft' || e.code === 'KeyA' ? left() : right(); }
      };
      window.addEventListener('keydown', key);
      let raf = 0, last = performance.now(), stopped = false, heroX = 270;
      const paint = (now: number) => {
        if (stopped) return;
        trial.update((now-last)/1000); last=now;
        heroX += ((90+trial.lane*180)-heroX)*.3;
        ctx.fillStyle='#292b45';ctx.fillRect(0,0,540,260);
        for(let lane=0;lane<3;lane++) {
          const x=90+lane*180;
          ctx.fillStyle=lane===trial.marked?'#796d97':'#454960';ctx.beginPath();ctx.ellipse(x,208,68,22,0,0,Math.PI*2);ctx.fill();
          if(lane===trial.marked){
            const f=trial.phase==='tell'?0:Math.min(1,(trial.time-trial.tell)/.24);
            ctx.strokeStyle='#e0b8ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,208,26+20*Math.sin(trial.time*8),12,0,0,Math.PI*2);ctx.stroke();
            ctx.fillStyle='#c9b6fa';ctx.beginPath();ctx.moveTo(x,15+f*163);ctx.lineTo(x+14,38+f*163);ctx.lineTo(x,65+f*150);ctx.lineTo(x-14,38+f*163);ctx.closePath();ctx.fill();
          }
        }
        drawHero(ctx,G.save.equip.armor,heroX,214,64,Math.PI/2,trial.dodgeT>0,now/1000,{},'fox-trial-hero');
        const text=`${Math.min(6,trial.wave+1)}/6 · ${trial.hits?'A bump! You can try again.':'Watch the glowing mark…'}`;
        if(status.textContent!==text)status.textContent=text;
        if(trial.done){ (document.querySelector('[data-dialog="leave"]') as HTMLButtonElement)?.click();return; }
        raf=requestAnimationFrame(paint);
      };
      raf=requestAnimationFrame(paint);
      try { await result; } finally { stopped=true;cancelAnimationFrame(raf);window.removeEventListener('keydown',key); }
      if(!trial.done) return;
      if(trial.passed) {
        claimFoxScarf(G.save); persist();
        await say(FOX, 'There. You listened. Most people come up here waving something sharp.');
        await say(FOX, 'Take this. It remembers the way between shadows. And keep this little place to yourself. There are others asleep behind those stones.');
        await G.ui.itemFound('glimmershawl','Shadow Scarf','Your dodge travels farther and faster, leaving an afterimage. You can dash along paths too. The Echo Anklet still gives you two charges.','🧣','A quiet gift');
        return;
      }
      retry = await G.ui.dialog('<h2>Almost!</h2><p>A little dust on your hat. Watch where the glow settles, then move out of that lane.</p>',[['retry','Try again'],['leave','Another time']],'fox-retry')==='retry';
    }
  });
}
