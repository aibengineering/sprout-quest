// The hero in every armour, in software WebGL: a contact sheet (idle, two walk frames, from behind, sword in hand) to
// compare the composed hero (base + armour) against what it should look like.
//
//   bun run tests/e2e/hero-armors.ts [out.png]
import { chromium } from 'playwright-core';
import { startServer } from '../../server';

const out = process.argv[2] ?? 'tests/e2e/out/hero-armors.png';
const server = startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const probe = await Bun.build({ entrypoints: [new URL('./hero-armors-probe.ts', import.meta.url).pathname], target: 'browser', define: { __DEV__: 'false' } });
if (!probe.success) throw Error(probe.logs.join('\n'));
let failed = false;
try {
  const page = await (await browser.newContext({ viewport: { width: 760, height: 2100 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /model/.test(m.text()))) errors.push(m.text()); });
  await page.goto(`http://localhost:${server.port}/`);
  await page.waitForSelector('.title-btns:not([hidden])', { timeout: 60000 });
  await page.addScriptTag({ content: await probe.outputs[0].text() });
  const result = await page.evaluate(() => (window as any).heroArmorSheet());
  await page.locator('#hero-armor-sheet').screenshot({ path: out });
  console.log(`${result.armors} armours → ${out}`);
  if (result.missing.length || errors.length) {
    failed = true;
    console.log(`missing: ${result.missing.join(', ')}\nerrors: ${errors.join(' | ')}`);
  }
} finally {
  await browser.close();
  server.stop(true);
}
if (failed) process.exit(1);
