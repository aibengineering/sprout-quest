// Dev server: rebuilds the bundle on every request to /main.js (a dev build, with save slots and presets on the title
// screen) and serves public/ as-is.
// Binds to 0.0.0.0 so you can open it on your phone over the LAN.
import { networkInterfaces } from 'node:os';

/** Starts the dev server (port 0 picks a free one, as the e2e smoke test does). */
export function startServer(port: number, log = false) {
  // The source map is its own file (browsers only fetch it with devtools open): inline, it made main.js 7 MB, which a
  // phone had to download in full, with the loading bar stuck on its idle animation, every time it opened the game.
  let map: Blob | null = null;
  return Bun.serve({
    port,
    hostname: '0.0.0.0',
    async fetch(req, server) {
      const path = new URL(req.url).pathname;
      if (path === '/main.js') {
        const t0 = performance.now();
        const out = await Bun.build({ entrypoints: ['./src/main.ts'], target: 'browser', sourcemap: 'linked', define: { __DEV__: 'true' } });
        if (!out.success) return new Response(out.logs.map(String).join('\n'), { status: 500 });
        const js = out.outputs.find((o) => o.kind === 'entry-point')!;
        map = out.outputs.find((o) => o.kind === 'sourcemap') ?? null;
        // Rebuilt every time, but unchanged code is a 304: the phone keeps its copy until you edit something.
        const etag = `"${Bun.hash(await js.arrayBuffer()).toString(36)}"`;
        const fresh = req.headers.get('if-none-match') !== etag;
        if (log) console.log(`main.js → ${server.requestIP(req)?.address ?? '?'}: ${fresh ? `${(js.size / 1048576).toFixed(1)} MB` : 'unchanged (304)'}, built in ${Math.round(performance.now() - t0)} ms`);
        const headers = { 'content-type': 'text/javascript', 'cache-control': 'no-cache', etag };
        return fresh ? new Response(js, { headers }) : new Response(null, { status: 304, headers });
      }
      if (path === '/main.js.map' && map) return new Response(map, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      const file = Bun.file(`./public${path === '/' ? '/index.html' : path}`);
      if (await file.exists()) return new Response(file, { headers: { 'cache-control': 'no-store' } });
      return new Response('Not found', { status: 404 });
    },
  });
}

if (import.meta.main) {
  const server = startServer(Number(process.env.PORT ?? 3000), true);
  const lan = Object.values(networkInterfaces()).flat().find((i) => i?.family === 'IPv4' && !i.internal)?.address;
  console.log(`🌱 Sprout Quest running at http://localhost:${server.port}${lan ? `  ·  on your phone: http://${lan}:${server.port}` : ''}`);
}
