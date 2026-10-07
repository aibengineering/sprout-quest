// Renders the edit to files in promo/brainrot/out/:
//   music.wav      the soundtrack, rendered offline (OfflineAudioContext) from music.js
//   brainrot.mp4   H.264 + AAC, 1080×1920, for TikTok/Reels/iPhone   (needs a full ffmpeg)
//   brainrot.webm  VP8 + Opus
// The picture is drawn frame by frame in step mode, so there's no real-time stutter.
//
// With a full ffmpeg (/usr/bin/ffmpeg or one on PATH with libx264), the audio is encoded straight from music.wav, so
// it lines up with frame 0 exactly. Without one, it falls back to Playwright's bundled ffmpeg, which can't encode
// audio: the browser's MediaRecorder records the soundtrack as Opus in real time, the video is padded by the measured
// start offset, and the two are muxed by stream copy (WebM only).
//
//   bun promo/brainrot/render.ts [--fps=30] [--width=1080]
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { serve } from './serve';

const arg = (name: string, def: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def;
const FPS = Number(arg('fps', '30'));
const WIDTH = Number(arg('width', '1080'));
const OUT = join(import.meta.dir, 'out');
mkdirSync(OUT, { recursive: true });
const out = (f: string) => join(OUT, f);

async function run(cmd: string[], stdin?: AsyncIterable<Uint8Array>) {
  const p = Bun.spawn(cmd, { stdin: stdin ? 'pipe' : 'ignore', stdout: 'pipe', stderr: 'pipe' });
  const output = Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]); // drain while we write
  if (stdin) { for await (const chunk of stdin) { p.stdin!.write(chunk); await p.stdin!.flush(); } p.stdin!.end(); }
  const [code, [stdout, stderr]] = await Promise.all([p.exited, output]);
  if (code) throw new Error(`${cmd[0]} failed (${code}):\n${stderr.slice(-2000)}`);
  return stdout;
}

/** A full ffmpeg (with libx264 and AAC) if there is one, else Playwright's minimal build. */
async function findFfmpeg() {
  for (const bin of ['/usr/bin/ffmpeg', Bun.which('ffmpeg')]) {
    if (bin && existsSync(bin) && /libx264/.test(await run([bin, '-hide_banner', '-encoders']).catch(() => ''))) return { bin, full: true };
  }
  const dir = readdirSync(join(homedir(), '.cache/ms-playwright')).find((d) => d.startsWith('ffmpeg-'));
  return { bin: join(homedir(), '.cache/ms-playwright', dir!, 'ffmpeg-linux'), full: false };
}
const ff = await findFfmpeg();
console.log(`ffmpeg: ${ff.bin}${ff.full ? '' : ' (minimal: WebM only, audio via MediaRecorder)'}`);

const server = serve(0);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: WIDTH, height: Math.round((WIDTH * 16) / 9) } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`http://localhost:${server.port}/?step`);
await page.evaluate(() => (window as any).__ready);
const END: number = await page.evaluate(async () => (await import('./score.js')).END);

console.log(ff.full ? 'Rendering music.wav...' : `Rendering music.wav and recording audio.webm (real time, ~${Math.ceil(END)}s)...`);
const audio = await page.evaluate(async (record) => {
  const { renderSong, toWav } = await import('./music.js');
  const buf: AudioBuffer = await renderSong(48000);
  const b64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  if (!record) return { wav: b64(toWav(buf)), webm: '', lead: 0 };
  // Play the rendered buffer into a MediaRecorder: the browser's Opus encoder gives us a muxable audio track.
  const onset = (ch: Float32Array, sr: number) => { for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]) > 0.02) return i / sr; return 0; };
  const ctx = new AudioContext({ sampleRate: 48000 });
  await ctx.resume();
  const dest = ctx.createMediaStreamDestination();
  const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));
  rec.start();
  await new Promise((r) => setTimeout(r, 200));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  src.start(ctx.currentTime + 0.1);
  await new Promise((r) => (src.onended = r));
  await new Promise((r) => setTimeout(r, 300));
  rec.stop();
  await stopped;
  const webm = new Uint8Array(await new Blob(chunks).arrayBuffer());
  const dec = await ctx.decodeAudioData(webm.slice().buffer);
  return { wav: b64(toWav(buf)), webm: b64(webm), lead: onset(dec.getChannelData(0), dec.sampleRate) - onset(buf.getChannelData(0), buf.sampleRate) };
}, !ff.full);
await Bun.write(out('music.wav'), Buffer.from(audio.wav, 'base64'));
if (audio.webm) await Bun.write(out('audio.webm'), Buffer.from(audio.webm, 'base64'));
const lead = Math.max(0, audio.lead); // seconds of silence before the music in audio.webm; the video is padded to match

const frames = Math.ceil((END + lead) * FPS);
console.log(`Capturing ${frames} frames at ${WIDTH}px, ${FPS} fps...`);
const t0 = Date.now();
async function* jpegs() {
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => (window as any).__seek(t), i / FPS - lead);
    yield await page.screenshot({ type: 'jpeg', quality: 95 });
    if (i % 100 === 0) console.log(`  frame ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
}
const frameInput = ['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0'];
// Screenshots are full-range JPEGs; video players expect limited-range BT.709, tagged as such.
const color = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
const vp8 = ['-c:v', 'libvpx', '-b:v', '7M', '-crf', '8', '-qmin', '2', '-qmax', '42', '-deadline', 'good', '-cpu-used', '2', '-auto-alt-ref', '0', ...color];
if (ff.full) {
  // One pass, two files: frames from the pipe, sound from music.wav.
  await run([ff.bin, '-y', '-hide_banner', '-loglevel', 'error', ...frameInput, '-i', out('music.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', ...color,
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out('brainrot.mp4'),
    '-map', '0:v', '-map', '1:a', ...vp8, '-c:a', 'libopus', '-b:a', '192k', '-shortest', out('brainrot.webm')], jpegs());
  console.log(`  brainrot.mp4 + brainrot.webm written in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
} else {
  await run([ff.bin, '-y', ...frameInput, ...vp8, out('video.webm')], jpegs());
  await run([ff.bin, '-y', '-i', out('video.webm'), '-i', out('audio.webm'), '-map', '0:v', '-map', '1:a', '-c', 'copy', out('brainrot.webm')]);
  console.log(`  brainrot.webm written in ${((Date.now() - t0) / 1000).toFixed(0)}s (audio starts ${lead.toFixed(3)}s in)`);
}

await browser.close();
server.stop();
