// Render/inspect all resource vectors and their split states at phone density.
// bun run tests/e2e/resource-vectors.ts [--reference <old-atlas-directory>]
// Screenshots and browser assertions go to .amp/in/artifacts/resource-vectors/.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { startServer } from '../../server';
import { browserEnv } from './browser-env';
import { RESOURCE_FRAMES } from '../../src/resourceVectors';

const out = '.amp/in/artifacts/resource-vectors';
mkdirSync(out, { recursive:true });
const at = process.argv.indexOf('--reference');
const reference = at >= 0 ? resolve(process.argv[at+1]) : null;
const server = startServer(0), url = `http://localhost:${server.port}`;
const build = await Bun.build({ entrypoints:['src/assets.ts','src/nodeart.ts'], target:'browser', define:{__DEV__:'true'} });
if (!build.success) throw Error(build.logs.join('\n'));
const browser = await chromium.launch({ env:browserEnv(true), args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport:{width:960,height:980}, deviceScaleFactor:2 });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e)));
  console.log('Rendering resource sheet…');
  await page.route('**/resource-test/*.js', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const js = build.outputs.find(o => o.path.endsWith(`/${name}`));
    if (!js) throw Error(`No test module ${name}`);
    await route.fulfill({contentType:'application/javascript',body:await js.text()});
  });
  await page.route('**/resource-reference/*', async route => {
    await route.fulfill({body:Buffer.from(await Bun.file(`${reference}/${new URL(route.request().url()).pathname.split('/').pop()}`).bytes())});
  });
  await page.route('**/resource-preview', route => route.fulfill({contentType:'text/html',body:'<html><body style="margin:0;background:#f6f0df"><canvas id="sheet"></canvas></body></html>'}));
  await page.goto(`${url}/resource-preview`);
  const result = await Promise.race([page.evaluate(async ({names,reference}) => {
    const assetsModule='/resource-test/assets.js', artModule='/resource-test/nodeart.js';
    const {frame,drawFrame} = await import(assetsModule);
    const {RockArt,TreeArt} = await import(artModule);
    const check = (ok:boolean, message:string) => {if(!ok)throw Error(message);};
    const alpha = (f:any, x:number, y:number) => {
      const c = f.img as HTMLCanvasElement;
      return c.getContext('2d')!.getImageData(Math.floor(f.ax+x*f.ppu/80), Math.floor(f.ay+y*f.ppu/80), 1,1).data[3];
    };
    for(const name of names){
      const f=frame(name);check(!!f?.rasterize,`${name} is not vector-backed`);
      check(f===frame(name),`${name} rebuilt at the same resolution`);
      const high=f.rasterize(256);check(high===f.rasterize(256),`${name} did not cache its high-resolution raster`);
      check(high.w>f.w&&Math.abs(high.ax/high.ppu-f.ax/f.ppu)<.001,`${name} changed its anchor while scaling`);
      const data=(high.img as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,high.w,high.h).data;
      check(data.some((v:number,i:number)=>i%4===3&&v>0),`${name} is blank`);
    }
    // Device density, camera scale and draw options all contribute to the raster resolution.
    const probe=document.createElement('canvas').getContext('2d')!;
    let requested=0;const source=frame('env/copper_node');
    const tracked={...source,rasterize:(ppu:number)=>{requested=ppu;return source.rasterize(ppu);}};
    probe.scale(2,3);drawFrame(probe,tracked,0,0,45,{sx:1.8,sy:1.1});
    check(requested===256,'high-DPI or nonuniform draw scale was ignored');
    probe.setTransform(.5,0,0,.5,0,0);drawFrame(probe,tracked,0,0,80);
    check(requested===64,'zoomed-out frames did not use a smaller bucket');
    // Independent oak cut-plane samples: stump/top must divide the trunk, not repeat the whole tree.
    check(alpha(frame('gather/oak_top'),0,-30)>200&&alpha(frame('gather/oak_top'),0,-15)===0,'oak top extends below the cut');
    check(alpha(frame('gather/oak_stump'),0,-15)>200&&alpha(frame('gather/oak_stump'),0,-40)===0,'oak stump includes the canopy');
    // In a real canvas, strike targets must land on the silhouette, not in a fixed empty rectangle.
    for(const kind of ['rock','copper','iron','crystal','obsidian']){
      const art=new RockArt(kind,{body:'#888',dark:'#444',fleck:'#ffc'});
      const points=[.15,.5,.85].map(p=>art.target(p));
      check(points.every(p=>p.y<0),`${kind} strike misses the stone`);
      check(points[1].y<points[0].y,`${kind} center has no raised surface`);
    }
    const canvas=document.querySelector('canvas')!;
    const scale=2;canvas.width=960*scale;canvas.height=980*scale;canvas.style.width='960px';canvas.style.height='980px';
    const g=canvas.getContext('2d')!;g.scale(scale,scale);
    g.fillStyle='#f6f0df';g.fillRect(0,0,960,980);g.fillStyle='#3a2448';g.font='bold 22px sans-serif';
    g.fillText(reference?'Original WebP sprites → vector paths':'Vector trees and rocks',24,34);
    let old:any, images:HTMLImageElement[]=[];
    if(reference){
      old=await(await fetch('/resource-reference/atlas.json')).json();
      images=await Promise.all(old.pages.map(async(n:string)=>{const image=new Image();image.src='/resource-reference/'+n;await image.decode();return image;}));
    }
    const kinds=['oak','pine','glimwood','emberwood','rock','copper','iron','crystal','obsidian'];
    for(let i=0;i<kinds.length;i++){
      const kind=kinds[i], tree=i<4, name=`gather/${kind}${tree?'_whole':''}`;
      const x=(i%3)*320, y=60+Math.floor(i/3)*300;
      g.fillStyle='#ece5d5';g.fillRect(x+6,y+6,308,284);
      g.fillStyle='#3a2448';g.font='bold 17px sans-serif';g.fillText(kind,x+16,y+28);
      g.font='12px sans-serif';g.fillText(reference?'WebP':'map',x+42,y+52);g.fillText('vector',x+209,y+52);
      const unit=80;
      if(reference){
        const [page,sx,sy,w,h,ax,ay,ppu]=old.frames[name];
        drawFrame(g,{img:images[page],x:sx,y:sy,w,h,ax,ay,ppu},x+80,y+247,unit);
      }else drawFrame(g,frame(`env/${kind}_node`),x+80,y+247,64);
      drawFrame(g,frame(name),x+240,y+247,unit);
    }
    // Render the non-default states, including the real fall/break compositing paths.
    const states=document.createElement('canvas');states.width=960*scale;states.height=560*scale;states.style.width='960px';states.style.height='560px';document.body.append(states);
    const s=states.getContext('2d')!;s.scale(scale,scale);s.fillStyle='#f6f0df';s.fillRect(0,0,960,560);
    s.strokeStyle='#c5bda8';s.beginPath();s.moveTo(0,500);s.lineTo(960,500);s.stroke();
    const fx:any={chips(){},dust(){},leaves(){},twinkle(){},sparks(){}};
    for(let i=0;i<4;i++){
      const kind=kinds[i];s.save();s.translate(100+i*240,245);const art=new TreeArt(kind);
      art.draw(s,.65,0);s.restore();
      s.save();s.translate(65+i*240,500);art.giveWay(fx);
      let landed=false;for(let t=0;t<2&&!landed;t+=.01)landed=art.update(.01,fx);
      check(landed,`${kind} never landed`);art.draw(s,1,0);s.restore();
      const landing=document.createElement('canvas');landing.width=300;landing.height=260;
      const l=landing.getContext('2d')!;l.translate(40,220);art.draw(l,1,0);
      check(!l.getImageData(0,225,300,35).data.some((v:number,j:number)=>j%4===3&&v>0),`${kind} landed underground`);
    }
    const ore=document.createElement('canvas');ore.width=960*scale;ore.height=420*scale;ore.style.width='960px';ore.style.height='420px';document.body.append(ore);
    const o=ore.getContext('2d')!;o.scale(scale,scale);o.fillStyle='#f6f0df';o.fillRect(0,0,960,420);
    for(let i=0;i<5;i++){
      const art=new RockArt(kinds[i+4],{body:'#888',dark:'#444',fleck:'#ffc'});
      art.hit({at:.55,share:.4,kind:'perfect',seed:17},.7,fx);
      o.save();o.translate(95+i*190,165);art.draw(o,.7,0);o.restore();
      art.giveWay();for(let t=0;t<.25;t+=.01)art.update(.01,fx);
      o.save();o.translate(95+i*190,375);art.draw(o,1,0);o.restore();
    }
    return {frames:names.length,canvas:canvas.toDataURL(),trees:states.toDataURL(),rocks:ore.toDataURL()};
  },{names:RESOURCE_FRAMES,reference:!!reference}), new Promise<never>((_,reject)=>setTimeout(()=>reject(Error(`Resource preview timed out: ${errors.join('\n')}`)),30000).unref())]);
  for(const [name,data] of [['comparison',result.canvas],['tree-states',result.trees],['rock-states',result.rocks]]){
    await Bun.write(`${out}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log(`PASS: ${result.frames} vector frames; caching, high-DPI anchors, tree split planes, ore strike surfaces and fall/break states.`);
  // Actual phone-size game renders, using the normal world and gather pipelines.
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${url}/?preset=sandbox`);
  await page.waitForFunction(()=>(window as any).game?.mode==='world');
  await page.evaluate(()=>{const g=(window as any).game;g.over.roamers.calm=999;g.sound.muted=true;});
  for(const kind of ['oak','copper','crystal']){
    await page.evaluate(kind=>{
      const g=(window as any).game,o=g.over,w=o.world;
      const n=w.objs.find((n:any)=>n.node===kind&&!n.boulder&&!n.grass);
      if(!n)throw Error(`No ${kind}`);
      delete g.save.nodes[n.id];g.save.tools.wood=4;g.save.tools.mine=4;
      for(const [dx,dy] of [[0,1],[-1,0],[1,0],[0,-1]]){
        const x=n.x+n.w/2+dx*.95,y=n.y+n.h+dy*.95;
        if(w.blocked(x,y,.28))continue;
        o.teleport(x,y);o.roamers.calm=999;
        if(o.nearbyObject()===n)return;
      }
      throw Error(`No approach to ${kind}`);
    },kind);
    await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${kind}-map.png`});
    await page.keyboard.press('KeyE');await page.waitForFunction(()=>(window as any).game.mode==='gather');
    await page.waitForTimeout(600);await page.screenshot({path:`${out}/${kind}-closeup.png`});
    await page.keyboard.press('Escape');await page.waitForFunction(()=>(window as any).game.mode==='world');
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PASS: oak, copper and crystal map/close-up screenshots at 390px, 2×, WebGL enabled.');
}finally{await browser.close();server.stop(true);}
