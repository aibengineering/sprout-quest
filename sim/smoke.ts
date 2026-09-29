// The one check the simulator gets: a playthrough runs to the Emberwyrm without throwing or getting stuck. Run it by
// hand (`bun run sim:smoke`) when you use the simulator; it's deliberately not part of `bun test` or CI.
import { simulate } from './player';

for (const style of ['sword', 'hammer', 'whip', 'wand'] as const) {
  const r = simulate(style, 1);
  const ok = !r.stuck && r.save.bosses.includes('dragon');
  console.log(`${ok ? '✓' : '✗'} ${style}: ${ok ? `reached the Emberwyrm at Lv ${r.save.lv} in ${Math.round(r.save.playtime / 60)} min` : `stuck at ${r.stuck}`}`);
  if (!ok) process.exitCode = 1;
}
