import { OUT, launch, boot, server } from './_visual_lib';
const errors: string[] = [];
const b = await launch();
try {
  const page = await boot(b, 390, 844, errors);
  console.log('boot errors', errors.filter(e => !/preload/.test(e)).map(e => e.slice(0, 80)));
  await page.evaluate(() => { const g = (window as any).game, s = g.save; g.ui.closeMenu(true); for (const k in s.mats) s.mats[k] = 100; s.lv = 20; s.build.forge = 5; s.stories.poppy = 6; s.stories.drums = 4;
      for (const flag of ['oldtools', 'bram:pie', 'bram:stew', 'pip:candy', 'garden:berries']) if (!s.flags.includes(flag)) s.flags.push(flag);
 void g.over.actors.get('granny:granny').talk(); });
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(600);
    const t = await page.evaluate(() => [...document.querySelectorAll('#modal [data-dialog]')].map(e => (e as HTMLElement).dataset.dialog + ':' + e.textContent?.slice(0, 20)).join(' | ') + ' // ' + document.querySelector('#modal')?.textContent?.slice(0, 120));
    console.log(i, t);
    const ok = await page.$('#modal:not([hidden]) [data-dialog]');
    if (ok && !await page.$('[data-dialog^="cook:"]')) await ok.click().catch(() => {});
  }
  await page.screenshot({ path: OUT + 'dbg.png' });
} finally { await b.close(); server.stop(true); }
