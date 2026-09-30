// Packs the game's music samples: every recording the scores in src/music/scores.ts actually play, and nothing else,
// as small mono AAC files in public/music/ with an index the player reads.
//
//   bun run music            re-pack (after changing a score)
//   bun run music --fresh    download and prepare the recordings again first (art/music/samples.py, needs uv)
//
// Run it whenever a score changes: a note outside the shipped samples plays the nearest one that is shipped, and the
// assets test flags it.
import { $ } from 'bun';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { orchestrate, pick, samplesFor, type SampleIndex } from '../../src/music/orchestra';
import { THEMES } from '../../src/music/scores';

const CACHE = 'art/music/cache';
const DEST = 'public/music';
/** Mono AAC at this bitrate: plenty for an orchestra through a phone speaker or earbuds. */
const BITRATE = '64k';

const uv = (args: string[]) => $`uv run --quiet --with numpy --with soundfile --with imageio-ffmpeg ${args}`;

// Score-only revisions can reuse the encoded bank exactly, pruning unused files without a source download or
// lossy re-encode. Refuse missing/range-stretched notes; those require the full source packer below.
if (process.argv.includes('--reuse-shipped')) {
  if (process.argv.includes('--fresh')) throw new Error('Choose --fresh or --reuse-shipped, not both');
  const index = JSON.parse(await readFile(`${DEST}/index.json`, 'utf8')) as SampleIndex;
  for (const [id, score] of Object.entries(THEMES)) for (const n of orchestrate(score).notes) {
    const sample = pick(index, n.inst, n.midi, n.vel);
    if (!sample || !existsSync(`${DEST}/${sample.file}`) ||
        (n.midi != null && Math.abs(n.midi - sample.midi!) > (n.inst === 'horn' ? 7 : 4))) {
      throw new Error(`${id}: ${n.inst} ${n.midi} needs a full sample rebuild`);
    }
  }
  const needed = new Set(Object.values(THEMES).flatMap((s) => [...samplesFor(index, s)]));
  for (const [inst, entries] of Object.entries(index)) {
    for (const e of entries) if (!needed.has(e.file)) await rm(`${DEST}/${e.file}`);
    index[inst] = entries.filter((e) => needed.has(e.file));
    if (!index[inst].length) delete index[inst];
  }
  await writeFile(`${DEST}/index.json`, JSON.stringify(index));
  const bytes = (await Promise.all([...needed].map(async (f) => (await stat(`${DEST}/${f}`)).size))).reduce((a, b) => a + b, 0);
  console.log(`MUSIC ${needed.size} existing recordings, ${(bytes / 1024 / 1024).toFixed(3)} MiB; no new downloads`);
  process.exit(0);
}

if (process.argv.includes('--fresh') || !existsSync(`${CACHE}/catalog.json`)) await uv(['art/music/samples.py']);
const catalog = JSON.parse(await readFile(`${CACHE}/catalog.json`, 'utf8')) as SampleIndex;

const needed = new Set<string>();
for (const score of Object.values(THEMES)) for (const f of samplesFor(catalog, score)) needed.add(f);

const ffmpeg = (await uv(['python', '-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())']).text()).trim();
await rm(DEST, { recursive: true, force: true });
const index: SampleIndex = {};
let bytes = 0;
for (const [inst, entries] of Object.entries(catalog)) {
  const kept = entries.filter((e) => needed.has(e.file));
  if (!kept.length) continue;
  await mkdir(`${DEST}/${inst}`, { recursive: true });
  index[inst] = [];
  for (const e of kept) {
    const out = `${e.file}.m4a`;
    await $`${ffmpeg} -y -loglevel error -i ${CACHE}/wav/${e.file}.wav -ac 1 -ar 44100 -c:a aac -b:a ${BITRATE} ${DEST}/${out}`;
    bytes += (await stat(`${DEST}/${out}`)).size;
    index[inst].push({ file: out, midi: e.midi, vel: e.vel, gain: e.gain });
  }
}
await writeFile(`${DEST}/index.json`, JSON.stringify(index));
console.log(`MUSIC ${needed.size} recordings in ${Object.keys(index).length} instruments, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
