// Rebuild the standalone review with `bun scripts/map-review.ts`.
// Compare against the last resident-housing commit, before the timber route redesign.
import { mkdirSync, writeFileSync } from 'node:fs';
import { ROUTES } from '../src/routes';
import { SHORTCUTS, shortcutWorldPoint } from '../src/shortcuts';
import { ROUTE_GUIDES } from '../src/mapDesign';
import { ZONES } from '../src/data';
import { World } from '../src/world';
import { newState } from '../src/state';

const old = Bun.spawnSync(['git', 'show', 'e0bb87b:src/routes.ts']);
if (old.exitCode) throw new Error('The review baseline e0bb87b is not available');
const before: Record<string, string[]> = {};
for (const match of old.stdout.toString().matchAll(/(meadow|woods|cave|hollow|peak):\s*\[([\s\S]*?)\]/g)) {
  before[match[1]] = [...match[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}
const w = new World();
for (const o of w.objs) if (o.kind === 'gate' || o.story || o.shown) o.hidden = true;
function distance(a: {x:number;y:number}, b: {x:number;y:number}) {
  const start=Math.floor(a.y)*w.w+Math.floor(a.x), end=Math.floor(b.y)*w.w+Math.floor(b.x);
  const d=new Int32Array(w.w*w.h).fill(-1), q=[start];d[start]=0;
  for(let n=0;n<q.length;n++) {
    const i=q[n],x=i%w.w,y=Math.floor(i/w.w);if(i===end)return d[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const xx=x+dx,yy=y+dy,j=yy*w.w+xx;
      if(xx<0||xx>=w.w||yy<0||yy>=w.h||d[j]>=0||w.blocked(xx+.5,yy+.9,.28))continue;
      d[j]=d[i]+1;q.push(j);
    }
  }
  return -1;
}
const save=newState();
const crossings=SHORTCUTS.map(p=>{
  const a=shortcutWorldPoint(p,p.from),b=shortcutWorldPoint(p,p.to);
  w.setShortcuts(save);const detour=distance(a,b);
  save.flags.push(p.flag);w.setShortcuts(save);const direct=distance(a,b);save.flags.pop();
  if(detour<0||direct<0)throw new Error(`${p.id}: unreachable bank`);
  return {...p,detour,direct};
});
const data=JSON.stringify({before,after:ROUTES,crossings,guides:ROUTE_GUIDES,names:Object.fromEntries(ZONES.map(z=>[z.id,z.name]))}).replaceAll('<','\\u003c');
const html=`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sprout Quest · Map design review</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#172820;color:#f2f4e9;font:16px/1.5 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:24px}h1{font-size:clamp(26px,4vw,40px);margin:0 0 8px}p{max-width:850px;color:#c6d6c9}nav{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0 16px}button{border:1px solid #688b71;background:#243d2f;color:inherit;padding:10px 16px;font:inherit;border-radius:12px;cursor:pointer}button[aria-pressed=true]{background:#b3d49c;color:#172820}button:focus-visible,input:focus-visible{outline:3px solid #ffd073;outline-offset:3px}.controls{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}label{cursor:pointer}input{accent-color:#aad28c;width:18px;height:18px;vertical-align:middle}.maps{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}.panel{border:1px solid #54705d;border-radius:16px;background:#203729;overflow:hidden}.panel h2{font-size:18px;margin:14px 16px 8px}.panel svg{width:100%;height:auto;display:block}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #54705d}th{color:#b4d994}small{color:#b7c7bb}.legend{display:flex;gap:14px;flex-wrap:wrap;color:#c6d6c9}.legend span:before{content:"";display:inline-block;width:12px;height:12px;background:var(--c);border-radius:3px;margin-right:6px}a{color:#d5edbd}code{color:#d5edbd}#guide{margin-top:8px}@media(max-width:700px){main{padding:16px}.maps{grid-template-columns:1fr}table{font-size:13px}th,td{padding:8px 4px}}
</style>
<main><h1>Routes worth learning</h1><p>First route redesign: recognisable landmarks, optional exploration loops and timber crossings that make return journeys shorter. Compare the old layout with the current map; open the crossings to see where the planks go.</p>
<nav aria-label="Region" id="regions"></nav>
<div class="controls"><strong id="size"></strong><label><input type="checkbox" id="open"> Show completed timber crossings</label></div>
<p id="guide"></p><div class="maps"><section class="panel"><h2>Before</h2><div id="before"></div></section><section class="panel"><h2>Current · <span id="mode">crossings planned</span></h2><div id="after"></div></section></div>
<div class="legend"><span style="--c:#ddc490">Path</span><span style="--c:#467d46">Encounter grass</span><span style="--c:#5895bd">Water / lava</span><span style="--c:#292238">Chasm</span><span style="--c:#d7ab69">Timber deck</span><span style="--c:#a89edc">Resource node</span></div>
<table><thead><tr><th>Crossing</th><th>Timber</th><th>Detour → crossing</th></tr></thead><tbody id="costs"></tbody></table>
<p><small>Distances count walkable tiles between banks, including the player's feet and scenery collisions. Both banks are reachable before construction; guardian gates still control region access. Diagrams show route tiles, resource nodes and story anchors, rather than the final game artwork. The separate Pebbler Hollow instance and Sowerby's housing layout are unchanged.</small></p>
<p><a href="map-design.md">Read the design notes</a></p></main>
<script>
const D=${data};let selected='cave';
const titles={meadow:'Willow Pond',woods:'Stillwater',cave:'Old Quarry',hollow:'Mirror Gorge',peak:'Cinder Basin'};
const materials={plank:'Oak',pineplank:'Pine',glimplank:'Glimmerwood',emberplank:'Emberwood'};
const colours={plank:'#d7ab69',pineplank:'#e8cc9b',glimplank:'#cdb8ee',emberplank:'#c68964'};
function draw(rows,current,open){
 const unit=12, width=rows[0].length*unit,height=rows.length*unit;let parts=[];
 rows.forEach((row,y)=>[...row].forEach((c,x)=>{
  let fill=c==='#'?'#3e5146':c===','?'#467d46':c==='='?'#ddc490':c==='~'?(selected==='peak'?'#e88b46':'#5895bd'):c==='^'?'#292238':'#81936b';
  parts.push('<rect x="'+x*unit+'" y="'+y*unit+'" width="12" height="12" fill="'+fill+'"/>');
  if(/[kKpPrRuUiIyYgGfFoO]/.test(c))parts.push('<circle cx="'+(x+.5)*unit+'" cy="'+(y+.5)*unit+'" r="3.3" fill="'+(c===c.toUpperCase()?'#e4addd':'#a89edc')+'" stroke="#233029" stroke-width="1"/>');
  if(/[ECSL]/.test(c))parts.push('<text x="'+(x+.5)*unit+'" y="'+(y+.75)*unit+'" fill="#fff" stroke="#172820" stroke-width=".6" paint-order="stroke" font-size="9" text-anchor="middle">'+c+'</text>');
 }));
 if(current)D.crossings.filter(p=>p.zone===selected).forEach(p=>{
  const d=p.deck, colour=colours[Object.keys(p.cost)[0]];
  parts.push('<rect x="'+d.x*unit+'" y="'+d.y*unit+'" width="'+d.w*unit+'" height="'+d.h*unit+'" fill="'+(open?colour:'none')+'" stroke="#ffe0a0" stroke-width="2"'+(open?'':' stroke-dasharray="4 3"')+'><title>'+p.name+'</title></rect>');
  parts.push('<circle cx="'+(p.marker.x+.3)*unit+'" cy="'+(p.marker.y+.3)*unit+'" r="4" fill="#ffe0a0"><title>Construction stake: '+p.name+'</title></circle>');
 });
 return '<svg role="img" aria-label="'+D.names[selected]+' '+(current?'current':'before')+' route map" viewBox="0 0 '+width+' '+height+'">'+parts.join('')+'</svg>';
}
function render(){
 const old=D.before[selected],rows=D.after[selected],open=document.querySelector('#open').checked;
 document.querySelector('#before').innerHTML=draw(old,false,false);document.querySelector('#after').innerHTML=draw(rows,true,open);
 document.querySelector('#mode').textContent=open?'crossings open':'crossings planned';
 document.querySelector('#size').textContent=D.names[selected]+' · '+rows[0].length+' × '+rows.length+' tiles'+(rows.length>old.length?' · '+Math.round((rows.length/old.length-1)*100)+'% more space':'');
 document.querySelector('#guide').textContent=D.guides[selected];
 document.querySelector('#costs').innerHTML=D.crossings.filter(p=>p.zone===selected).map(p=>{const [m,n]=Object.entries(p.cost)[0];return '<tr><td>'+p.name+'</td><td>'+n+' '+materials[m]+' planks</td><td>'+p.detour+' → '+p.direct+' tiles ('+Math.round((1-p.direct/p.detour)*100)+'% shorter)</td></tr>'}).join('');
 document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===selected)));
}
Object.keys(titles).forEach(id=>{const b=document.createElement('button');b.dataset.region=id;b.textContent=D.names[id];b.onclick=()=>{selected=id;render()};document.querySelector('#regions').append(b)});
document.querySelector('#open').onchange=render;render();
</script></html>`;
mkdirSync('docs',{recursive:true});writeFileSync('docs/map-review.html',html);
console.log('Wrote docs/map-review.html');
for(const p of crossings)console.log(`${p.name}: ${p.detour} → ${p.direct} tiles`);
