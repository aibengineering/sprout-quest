// Production build: bundles src/main.ts and copies static files into dist/.
import { cp, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
const out = await Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  naming: 'main.js',
});
if (!out.success) {
  for (const log of out.logs) console.error(log);
  process.exit(1);
}
await cp('public', 'dist', { recursive: true });
console.log(`Built dist/ (${(out.outputs[0].size / 1024).toFixed(1)} KB JS)`);
