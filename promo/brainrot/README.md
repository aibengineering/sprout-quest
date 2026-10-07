# Sprout Quest: brainrot edit

A ~33 s vertical (9:16) meme-style ad for Sprout Quest. Everything is drawn as SVG in the browser and the soundtrack
is synthesized live with Web Audio (no samples, no images, no CDNs). The picture follows the audio clock, so every
cut, zoom punch and shake lands on the beat.

## Watch it

```sh
bun promo/brainrot/serve.ts          # http://localhost:3400/  (PORT=... to change)
```

Open the URL, tap **▶ tap to play** (browsers need a tap before they play sound), and turn the sound on.
`?t=12.3` shows a single frame; `?step` exposes `window.__seek(t)` for capture.

## Render to files

```sh
bun promo/brainrot/render.ts         # writes promo/brainrot/out/ (git-ignored)
```

- `music.wav`: the soundtrack rendered offline.
- `video.webm`: the picture, captured frame by frame at 1080×1920, 30 fps (VP8).
- `audio.webm`: the soundtrack as Opus. Playwright's bundled ffmpeg can't encode audio, so the browser's
  MediaRecorder encodes it in real time.
- `brainrot.webm`: video and audio muxed together. This is the one to share.

Options: `--fps=30`, `--width=1080`, `--audio-only`, `--video-only`.

## Files

| File | What it does |
| --- | --- |
| `score.js` | The timeline (160 BPM): scene times, every note and sound effect. Music and picture both read it. |
| `music.js` | Web Audio instruments (808, cowbell, kick, clap, hats, music box) and meme SFX, with a compressor and limiter on the master. |
| `art.js` | Hand-drawn SVG in the game's toon style: the hero, slime, Poppy, Mr. Floppers, Bram, Granny, the Emberwyrm, the forge, the Sawmill, emoji stickers. |
| `edit.js` | The scenes, camera cuts, captions, HUD and effects. `renderAt(t)` draws any moment. |
| `res/` | The game's resource art used here (trees, ores, crystal), copied from `public/assets/resources/`. |
