// Production build: bundles src/main.ts and copies static files into dist/.
//
//   bun run build          the published game
//   bun run build --dev    with the dev tools (save slots, preset saves), e.g. for a test server
import { cp, rm } from 'node:fs/promises';

const dev = process.argv.includes('--dev');

await rm('dist', { recursive: true, force: true });
const out = await Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  naming: 'main.js',
  define: { __DEV__: String(dev) },
});
if (!out.success) {
  for (const log of out.logs) console.error(log);
  process.exit(1);
}
await cp('public', 'dist', { recursive: true });
console.log(`Built dist/ (${(out.outputs[0].size / 1024).toFixed(1)} KB JS${dev ? ', with dev tools' : ''})`);
