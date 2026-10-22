// Serves this folder: `bun promo/brainrot/serve.ts` (PORT=3400 by default), then open the printed URL.
import { join, normalize } from 'path';

export function serve(port: number) {
  const root = import.meta.dir;
  return Bun.serve({
    port,
    async fetch(req) {
      const path = normalize(decodeURIComponent(new URL(req.url).pathname)).replace(/^(\.\.[/\\])+/, '');
      const file = Bun.file(join(root, path.endsWith('/') ? path + 'index.html' : path));
      return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 });
    },
  });
}

if (import.meta.main) {
  const server = serve(Number(process.env.PORT ?? 3400));
  console.log(`Sprout Quest brainrot edit: http://localhost:${server.port}/`);
}
