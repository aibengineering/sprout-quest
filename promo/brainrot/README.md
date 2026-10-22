# Sprout Quest: brainrot edit

A ~33 s vertical (9:16) meme-style ad for Sprout Quest. Everything is drawn as SVG in the browser and the soundtrack
is synthesized live with Web Audio (no samples, no images, no CDNs). The picture follows the audio clock, so every
cut, zoom punch and shake lands on the beat.

The music is two public-domain Grieg tunes (Peer Gynt, 1875) in my own arrangement: the flute phrase from
*Morning Mood* over the cosy intro, then a record scratch and *In the Hall of the Mountain King* as 160 BPM phonk:
cowbell and a supersaw lead over distorted 808s, building through the edit, in double time for the dragon and
in a harmonised major key on the title card.

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

- `brainrot.mp4`: H.264 + AAC at 1080×1920, 30 fps. This is the one to share (TikTok, Reels, iPhone).
- `brainrot.webm`: VP8 + Opus.
- `music.wav`: the soundtrack rendered offline.

The picture is captured frame by frame in step mode and the sound is encoded straight from `music.wav`, so they
line up exactly. This needs a full ffmpeg (`/usr/bin/ffmpeg`, or one on `PATH` with libx264). Without one, it falls
back to Playwright's bundled ffmpeg: WebM only, with the sound recorded through the browser's MediaRecorder.

Options: `--fps=30`, `--width=1080`.

## Files

| File | What it does |
| --- | --- |
| `score.js` | The timeline (160 BPM): scene times, the two Grieg tunes, every note and sound effect. Music and picture both read it. |
| `music.js` | Web Audio instruments (808, cowbell, supersaw lead, flute, kick, clap, hats) and meme SFX, with a compressor and limiter on the master. |
| `art.js` | Hand-drawn SVG in the game's toon style: the hero, slime, Poppy, Mr. Floppers, Bram, Granny, the Emberwyrm, the forge, the Sawmill, emoji stickers. |
| `edit.js` | The scenes, camera cuts, captions, HUD and effects. `renderAt(t)` draws any moment. |
| `res/` | The game's resource art used here (trees, ores, crystal), copied from `public/assets/resources/`. |
