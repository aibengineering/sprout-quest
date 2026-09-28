// Dev server: rebuilds the bundle on every request to /main.js (a dev build, with save slots and presets on the title
// screen) and serves public/ as-is.
// Binds to 0.0.0.0 so you can open it on your phone over the LAN.
import { networkInterfaces } from 'node:os';

/** Files worth gzipping (images are already compressed). Models shrink by about 60%, the script by about 80%. */
const COMPRESSIBLE = /\.(js|json|glb|html|css|map|svg|txt)$/;
const TYPES: Record<string, string> = { js: 'text/javascript', json: 'application/json', map: 'application/json', glb: 'model/gltf-binary' };

/**
 * A response that a browser can keep: an ETag (so a reload with nothing changed is a 304), and gzip when the browser
 * takes it. Everything is revalidated each time, so edits still show straight away.
 */
type Bytes = Uint8Array<ArrayBuffer>;

function send(req: Request, body: Bytes, etag: string, type: string, gz: (() => Bytes) | null) {
  const headers: Record<string, string> = { 'cache-control': 'no-cache', etag, vary: 'accept-encoding', 'x-size': String(body.byteLength) };
  if (type) headers['content-type'] = type;
  if (req.headers.get('if-none-match') === etag) return { res: new Response(null, { status: 304, headers }), bytes: 0 };
  if (gz && /\bgzip\b/.test(req.headers.get('accept-encoding') ?? '')) {
    const z = gz();
    return { res: new Response(z, { headers: { ...headers, 'content-encoding': 'gzip' } }), bytes: z.byteLength };
  }
  return { res: new Response(body, { headers }), bytes: body.byteLength };
}

/** Starts the dev server (port 0 picks a free one, as the e2e smoke test does). */
export function startServer(port: number, log = false) {
  // The source map is its own file (browsers only fetch it with devtools open): inline, it made main.js 7 MB, which a
  // phone had to download in full, with the loading bar stuck on its idle animation, every time it opened the game.
  let map: Blob | null = null;
  /** Gzipped copies of files in public/, redone when a file changes. */
  const zipped = new Map<string, { stamp: string; z: Bytes }>();
  return Bun.serve({
    port,
    hostname: '0.0.0.0',
    async fetch(req, server) {
      const path = new URL(req.url).pathname;
      const who = () => server.requestIP(req)?.address ?? '?';
      if (path === '/main.js') {
        const t0 = performance.now();
        const out = await Bun.build({ entrypoints: ['./src/main.ts'], target: 'browser', sourcemap: 'linked', define: { __DEV__: 'true' } });
        if (!out.success) return new Response(out.logs.map(String).join('\n'), { status: 500 });
        const js = new Uint8Array(await out.outputs.find((o) => o.kind === 'entry-point')!.arrayBuffer());
        map = out.outputs.find((o) => o.kind === 'sourcemap') ?? null;
        // Rebuilt every time, but unchanged code is a 304: the phone keeps its copy until you edit something.
        const { res, bytes } = send(req, js, `"${Bun.hash(js).toString(36)}"`, TYPES.js, () => Bun.gzipSync(js));
        if (log) console.log(`main.js → ${who()}: ${bytes ? `${(bytes / 1024).toFixed(0)} KB sent` : 'unchanged (304)'}, built in ${Math.round(performance.now() - t0)} ms`);
        return res;
      }
      if (path === '/main.js.map' && map) return new Response(map, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      const name = `./public${path === '/' ? '/index.html' : path}`;
      const file = Bun.file(name);
      if (!(await file.exists())) return new Response('Not found', { status: 404 });
      const stamp = `${file.size}-${file.lastModified}`;
      let body = new Uint8Array(await file.arrayBuffer());
      // The page links its stylesheet by version, so a phone can never pair new code with a stale cached style.css.
      if (name.endsWith('index.html')) {
        const css = Bun.file('./public/style.css');
        const v = `${css.size}-${css.lastModified}`;
        body = new TextEncoder().encode(new TextDecoder().decode(body).replace('href="style.css"', `href="style.css?v=${v}"`));
      }
      const ext = name.split('.').pop() ?? '';
      const tag = name.endsWith('index.html') ? `${stamp}-${Bun.hash(body).toString(36)}` : stamp;
      const gz = () => {
        const hit = zipped.get(name);
        if (hit?.stamp === tag) return hit.z;
        const z = Bun.gzipSync(body);
        zipped.set(name, { stamp: tag, z });
        return z;
      };
      // Images go uncompressed (gzip can't shrink them), but still get the ETag.
      return send(req, body, `"${tag}"`, TYPES[ext] ?? file.type, COMPRESSIBLE.test(name) ? gz : null).res;
    },
  });
}

if (import.meta.main) {
  const server = startServer(Number(process.env.PORT ?? 3000), true);
  const lan = Object.values(networkInterfaces()).flat().find((i) => i?.family === 'IPv4' && !i.internal)?.address;
  console.log(`🌱 Sprout Quest running at http://localhost:${server.port}${lan ? `  ·  on your phone: http://${lan}:${server.port}` : ''}`);
}
