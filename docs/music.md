# Music

The music is code: each theme in `src/music/scores.ts` is a score. A score has hand-written melodies and a chord
progression, plus a list of orchestra sections. Each section does one job over the chords: play a melody, hold the
chords, run an ostinato, or hit a rhythm. Every note is played by a real recording from
[VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE), which is public domain (CC0), so no credit or
licence is needed.

## Themes

| Theme | Plays |
|---|---|
| `glade` | In the Quiet Glade: a lullaby for waking up |
| `sowerby` | In the village: home |
| `meadow` | In the Sunny Meadow, and anywhere without a theme of its own (the tower's camp) |
| `woods` | In Whisper Woods: curious, a little mysterious |
| `cave` | In Echo Cavern: sparse, with drips that echo |
| `hollow` | In Glimmer Hollow: a crystalline waltz |
| `peak` | On Ember Peak: the climb to the dragon |
| `battleMeadow` | Quiet Glade, Sunny Meadow and Secret Grove ordinary fights: playful clarinet/flute and plucks |
| `battleWoods` | Whisper Woods ordinary fights: sly Dorian clarinet, displaced plucks and harp |
| `battleCave` | Echo Cavern ordinary fights: clipped horn calls, low-string footsteps and sparse bells |
| `battleHollow` | Glimmer Hollow ordinary fights: agile flute and harp in 3/4 |
| `battlePeak` | Ember Peak ordinary fights: low brass and restrained 3+3+2 strings |
| `guardian` | In boss fights |

`zoneTheme` and `ZONE_THEMES` in `scores.ts` choose the theme for each area. The frame loop in `main.ts` picks the
fight or area theme. `battleTheme` takes the battle arena's zone (including tower floors); boss identity takes priority, including Big Bun. Unknown regions borrow `battleMeadow`.

## Loading

- Nothing waits for the music.
- The recordings download and decode while the title screen is up (decoding needs no tap), so the music can start on
  the first tap, which is when browsers allow sound.
- They load one theme at a time: the theme for where you are first, then the opening's (`FIRST_THEMES`: glade and
  battleMeadow), then the rest.
- A theme that hasn't loaded yet is silent. It fades in as soon as it's ready, if it's still the one playing.
- Ordinary battle themes remember the next four-bar phrase for the next encounter, per region and per session.
  The first encounter starts at bar 1; subsequent fights start at a phrase boundary, with the normal fade-in.
  Continuous loops retain their note/reverb tails, and bosses always begin at their own opening.
- Themes crossfade, and the music ducks under fanfares (the jingles listed in `FANFARES` in `audio.ts`).
- Automated browsers (the e2e tests) get no music unless the URL has `?music`.

## Samples

`bun run music` runs `art/music/pack.ts`. It ships **only the recordings the scores play**, as 64 kbps mono AAC in
`public/music/`, with an `index.json` that the player reads. It currently ships 157 recordings, 3.149 MiB in all,
and 1.003 MiB (47 recordings) for the opening. The regional battle revision adds no recordings.

The first run, and any run with `--fresh`, calls `art/music/samples.py` through `uv`. That script:

- downloads the chosen instruments;
- finds each recording's real pitch (VSCO's note names are an octave off);
- trims each recording to 3 s or less;
- caches everything in `art/music/cache/`, which is git-ignored.

**After changing a score, re-run `bun run music`.** For a revision deliberately limited to the current bank, use
`bun run music --reuse-shipped`: this verifies pitch coverage and removes unplayed encoded recordings without
downloading or re-encoding samples. Use the normal source rebuild when coverage requires new recordings. `tests/music.test.ts` checks that:

- every note has its recording shipped, stretched by at most 4 semitones. The horn's limit is 7, because VSCO has no
  horn recordings between middle C and D5.
- nothing is shipped that no score plays;
- the opening stays under 1.5 MB and the whole set under 3.5 MB.

`tests/music-playback.test.ts` also checks the player's note envelopes. Plucked strings, harp, bells and percussion
ring to the recording's natural end, including when a lower pitch makes it longer. Bowed and blown notes release
at their written end. Every new instrument needs an entry in `DESK` in `player.ts`: in particular, a pizzicato
section needs `release: 0`, rather than the fallback sustained-note envelope.

## Writing and trying themes

Try themes in the music lab before they come into the game. It lives in the story bible repo, in
`music-lab/` (run `bun server.ts` there). It uses the same score format and lets you mute each section.

## Volume

- **The music sits well under the sound effects.** `VOLUME` in `player.ts` sets its overall level. Fight themes play
  lower still (`THEME_LEVEL`), because fights are the busiest for sound effects.
- **Players set their own levels** in the menu's More tab, under Sound. There's a mute for everything, plus a slider (squared, so it follows the ear)
  each for the music (default 70%) and the effects.
- These are device settings in `src/sound.ts`, not part of the save, so every save slot sounds the same.
- With the music at Off, its recordings are never downloaded.

See [the area-music review](music-review.md) for the score assessment, the small playback corrections, and an
audition checklist. The review distinguishes measured behavior from choices that need an in-game listen.

See [the regional battle review](regional-battle-music.md) for arrangement details and verification limits.
