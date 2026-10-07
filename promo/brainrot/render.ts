// Renders the edit to files in promo/brainrot/out/:
//   music.wav      the soundtrack, rendered offline (OfflineAudioContext) from music.js
//   audio.webm     the same soundtrack captured as Opus (Playwright's ffmpeg has no audio encoder, so the browser encodes it)
//   video.webm     the picture, drawn frame by frame in step mode (no real-time stutter) and encoded to VP8
//   brainrot.webm  video + audio, muxed by stream copy
//
//   bun promo/brainrot/render.ts [--fps=30] [--width=1080] [--audio-only] [--video-only]
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { serve } from './serve';

const arg = (name: string, def: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def;
const FPS = Number(arg('fps', '30'));
const WIDTH = Number(arg('width', '1080'));
const audioOnly = process.argv.includes('--audio-only');
const videoOnly = process.argv.includes('--video-only');
const OUT = join(import.meta.dir, 'out');
mkdirSync(OUT, { recursive: true });

const ffmpegDir = readdirSync(join(homedir(), '.cache/ms-playwright')).find((d) => d.startsWith('ffmpeg-'));
const FFMPEG = ffmpegDir ? join(homedir(), '.cache/ms-playwright', ffmpegDir, 'ffmpeg-linux') : 'ffmpeg';

async function run(cmd: string[], stdin?: AsyncIterable<Uint8Array>) {
  const p = Bun.spawn(cmd, { stdin: stdin ? 'pipe' : 'ignore', stdout: 'ignore', stderr: 'pipe' });
  if (stdin) { for await (const chunk of stdin) { p.stdin!.write(chunk); await p.stdin!.flush(); } p.stdin!.end(); }
  const code = await p.exited;
  if (code) throw new Error(`${cmd[0]} failed (${code}):\n${(await new Response(p.stderr).text()).slice(-2000)}`);
}

const server = serve(0);
const url = `http://localhost:${server.port}/?step`;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: WIDTH, height: Math.round((WIDTH * 16) / 9) } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(url);
await page.evaluate(() => (window as any).__ready);
const END: number = await page.evaluate(async () => (await import('./score.js')).END);

let lead = 0; // seconds of silence before the music starts in audio.webm; the video is padded to match
if (!videoOnly) {
  console.log('Rendering music.wav and recording audio.webm (real time, ~%ds)...', Math.ceil(END));
  const res = await page.evaluate(async () => {
    const { renderSong, toWav } = await import('./music.js');
    const buf: AudioBuffer = await renderSong(48000);
    const b64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
    const onset = (ch: Float32Array, sr: number) => { for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]) > 0.02) return i / sr; return 0; };
    // Play the rendered buffer into a MediaRecorder: the browser's Opus encoder gives us a muxable audio track.
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
  });
  await Bun.write(join(OUT, 'music.wav'), Buffer.from(res.wav, 'base64'));
  await Bun.write(join(OUT, 'audio.webm'), Buffer.from(res.webm, 'base64'));
  lead = Math.max(0, res.lead);
  await Bun.write(join(OUT, 'lead.txt'), String(lead));
  console.log(`  music.wav + audio.webm written (audio starts ${lead.toFixed(3)}s in)`);
} else if (existsSync(join(OUT, 'lead.txt'))) lead = Number(await Bun.file(join(OUT, 'lead.txt')).text());

if (!audioOnly) {
  const frames = Math.ceil((END + lead) * FPS);
  console.log(`Capturing ${frames} frames at ${WIDTH}px, ${FPS} fps...`);
  const t0 = Date.now();
  async function* jpegs() {
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => (window as any).__seek(t), i / FPS - lead);
      yield await page.screenshot({ type: 'jpeg', quality: 93 });
      if (i % 100 === 0) console.log(`  frame ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }
  await run([FFMPEG, '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0',
    '-c:v', 'libvpx', '-b:v', '7M', '-crf', '8', '-qmin', '2', '-qmax', '42', '-deadline', 'good', '-cpu-used', '2', '-auto-alt-ref', '0',
    '-pix_fmt', 'yuv420p', join(OUT, 'video.webm')], jpegs());
  console.log(`  video.webm written in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

if (existsSync(join(OUT, 'video.webm')) && existsSync(join(OUT, 'audio.webm'))) {
  await run([FFMPEG, '-y', '-i', join(OUT, 'video.webm'), '-i', join(OUT, 'audio.webm'), '-map', '0:v', '-map', '1:a', '-c', 'copy', join(OUT, 'brainrot.webm')]);
  console.log('  brainrot.webm (video + audio) written');
}

await browser.close();
server.stop();
