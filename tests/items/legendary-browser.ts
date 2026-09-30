// Equipped-art checks at two phone sizes; run with CHROMIUM_PATH=/path/to/chromium bun tests/items/legendary-browser.ts.
import { chromium } from 'playwright-core';
import { startServer } from '../../server';
import { mkdirSync } from 'node:fs';
const server=startServer(0);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out='tests/e2e/out/legendary'; mkdirSync(out,{recursive:true});
const report:any[]=[];
for(const width of [390,320]) for(const id of ['emberblade','wyrmbreaker','dragontail','wyrmfire']){
 const context=await browser.newContext({viewport:{width,height:width===320?568:844},deviceScaleFactor:1});
 const page=await context.newPage(); const errors:string[]=[];
 page.on('pageerror',(e)=>errors.push(String(e)));
 await page.goto(`http://localhost:${server.port}/?preset=poppy-done`);
 await page.waitForFunction(()=> (window as any).game?.mode==='world',{},{timeout:60000});
 const downloaded=page.waitForResponse(r=>r.url().endsWith(`/wpn_${id}.glb`)&&r.status()===200,{timeout:30000});
 await page.evaluate((id)=>{const g=(window as any).game;g.save.owned.push(id);g.save.equip.weapon=id;g.save.lv=30;g.save.hp=999;g.save.mastery[id==='emberblade'?'sword':id==='wyrmbreaker'?'hammer':id==='dragontail'?'whip':'wand'].lv=12;},id);
 await downloaded;
 await page.waitForTimeout(1500);
 await page.screenshot({path:`${out}/${width}-${id}-equipped-map.png`});
 await page.evaluate(()=>{const g=(window as any).game;g.fight('bunny',20,1);});
 await page.waitForFunction(()=> (window as any).game.mode==='battle',{},{timeout:30000});
 await page.waitForTimeout(1500);
 await page.screenshot({path:`${out}/${width}-${id}-equipped-battle.png`});
 await page.keyboard.down('j'); await page.waitForTimeout(500); await page.screenshot({path:`${out}/${width}-${id}-attack.png`}); await page.keyboard.up('j');
 report.push({id,width,errors,stats:await page.evaluate(()=>({stats:(window as any).game.modelStats,equipped:(window as any).game.save.equip.weapon,mode:(window as any).game.mode})),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 await context.close();
}
console.log(JSON.stringify(report,null,2));
if (report.some(r => r.errors.length || r.overflow || !r.stats.stats.renders || r.stats.equipped !== r.id)) throw new Error('Legendary equipped QA failed');
await browser.close();server.stop(true);
