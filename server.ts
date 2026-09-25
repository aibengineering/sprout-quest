// Dev server: rebuilds the bundle on every request to /main.js and serves public/ as-is.
// Binds to 0.0.0.0 so you can open it on your phone over the LAN.
import { networkInterfaces } from 'node:os';

/** Starts the dev server (port 0 picks a free one, as the e2e smoke test does). */
export function startServer(port: number) {
  return Bun.serve({
    port,
    hostname: '0.0.0.0',
    async fetch(req) {
      const path = new URL(req.url).pathname;
      if (path === '/main.js') {
        const out = await Bun.build({ entrypoints: ['./src/main.ts'], target: 'browser', sourcemap: 'inline' });
        if (!out.success) return new Response(out.logs.map(String).join('\n'), { status: 500 });
        return new Response(out.outputs[0], { headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } });
      }
      const file = Bun.file(`./public${path === '/' ? '/index.html' : path}`);
      if (await file.exists()) return new Response(file, { headers: { 'cache-control': 'no-store' } });
      return new Response('Not found', { status: 404 });
    },
  });
}

if (import.meta.main) {
  const server = startServer(Number(process.env.PORT ?? 3000));
  const lan = Object.values(networkInterfaces()).flat().find((i) => i?.family === 'IPv4' && !i.internal)?.address;
  console.log(`🌱 Sprout Quest running at http://localhost:${server.port}${lan ? `  ·  on your phone: http://${lan}:${server.port}` : ''}`);
}
