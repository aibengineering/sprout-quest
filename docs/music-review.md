# Area music review

Reviewed the 0.3.5 scores at `15189bf` (the four new area themes arrived in `b070d38`). The strongest choice is to keep
these compositions: each has a recognizable instrumental identity, a distinct pace, and an arrangement that develops
within its 16 bars. This pass corrects two playback details instead of replacing melodies the player already likes.

## What fits each area

| Area | Written character | Loop | Assessment |
|---|---|---:|---|
| Whisper Woods | Clarinet, harp and pizzicato; flute answers in the second half; E-minor harmony with Dorian color | 41.74 s | A lighter, curious texture for the wooded paths. The C-natural/ C-sharp mixture gives it both warmth and mystery. |
| Echo Cavern | Slow horn, low strings, scattered glockenspiel drips and a quieter delayed answer | 48.00 s | The sparsest new score: about 3.94 note onsets/s versus 13.16 on the Peak. It leaves room for the cavern atmosphere. |
| Glimmer Hollow | High flute, harp, tremolo strings and glockenspiel; a 3/4 waltz with A-Lydian color | 26.67 s | A clear contrast after the cave. D-natural chords provide a warmer contrast to the raised fourth; they are not automatically wrong notes. |
| Ember Peak | G-minor horn theme, driving low strings, then trombone/trumpet reinforcement | 32.00 s | Increasing weight suits the final climb. Its density sits below the regular battle score's 35.79 onsets/s. |

Onset counts include simultaneous chord tones and doublings; they describe the score, not perceived loudness or
quality. All themes retain their melodies, harmony, tempo, meter, entrance bars and existing overall volume.

## Corrections made

### Let pitched recordings finish naturally

The player previously stopped every recording after its original file duration. A sample pitched down plays more
slowly, so that stop could cut its decay off early. The existing G2 harp example is stopped at **3.506 s** even
though its pitched recording lasts **3.936 s**: about **0.429 s** of the recorded tail is missing.

One-shot voices now finish naturally through Web Audio. Sustained voices still stop after their written note and
release, with the source naturally ending sooner if its recording runs out. No sample assets need to change.
This also avoids imposing the original file's duration on a lower-pitched held voice.

### Give the Woods' pizzicato cellos their own seat and envelope

`celli_pizz` was the only shipped instrument missing from the player's instrument settings. It therefore inherited
a generic 0.2-second release, which faded the pluck at the written beat instead of letting the recording decay.
It now rings naturally, as the other pizzicato sections do, and sits with the cellos at pan +0.3. Its previous
fallback gain of 0.7 is preserved.

These are small changes. In the deterministic dry render, the Woods' whole-loop RMS changes by under 0.01 dB;
there is no level boost intended to make the comparison sound more impressive.

## Principles used

- **Preserve note and reverb tails across loop boundaries.** Audiokinetic demonstrates overlapping a segment's
  post-exit decay into the next repeat for natural looping. The game's continuous note scheduler already carries
  voices and the hall over the wrap; avoid treating every loop as a fresh fade-in.
  [Wwise: Looping a Music Segment](https://www.audiokinetic.com/courses/wwise201/?id=looping_music_segment_using_playlist_container&source=wwise201)
- **Keep transitions musically deliberate.** Wwise exposes source exit points, destination entry points, pickups,
  tails and fades. A longer crossfade is not universally smoother when keys, tempos or meters differ. The existing
  1.2-second fade is retained pending in-game listening.
  [Wwise: Source and Destination Properties](https://www.audiokinetic.com/en/library/edge/?id=setting_source_and_destination_properties&source=Help)
- **Use texture and instrumentation to make a place recognizable.** Composer Winifred Phillips describes distinct
  instrumental approaches to the Bayou and Mayan ruins in *Assassin's Creed Liberation*. Sprout Quest already has
  this useful distinction; preserve it when refining details.
  [Phillips: Time and Place](https://winifredphillips.wpcomstaging.com/2026/03/19/time-and-place-the-music-of-assassins-creed-liberation/)
- **Variation can refresh an identity without discarding it.** Phillips discusses theme-and-variation as a way to
  develop recognizable material. Consider a small phrase or orchestration variation only if repetition becomes
  tiring during actual play; a fixed bar-count rule cannot determine this.
  [Phillips: Characters and Ideals](https://winifredphillips.wpcomstaging.com/2026/07/13/characters-and-ideals-the-music-of-assassins-creed-liberation/)
- **Protect gameplay sound clarity.** Double Stallion's *BAMF* case study describes voice limits and music
  side-chaining to maintain clarity. Here, retain the quiet music level and existing fanfare ducking; judge the
  densest passages alongside actual hits, mining and rewards before adding processing.
  [Double Stallion / Audiokinetic case study](https://www.audiokinetic.com/download/documents/customer_profiles/AK_C_PROFILE_BAMF_ENG_WEB.pdf)
- **Sample speed changes sample duration.** Web Audio's playback-rate behavior is the technical basis for the tail
  correction, rather than an orchestration preference.
  [Web Audio specification: AudioBufferSourceNode](https://www.w3.org/TR/webaudio/#AudioBufferSourceNode)

## Morning audition

1. Start with the exposed harp A/B: before, one-second pause, after. Focus on the decay around 3.5 seconds after each
   note starts. The full mix intentionally makes the difference subtle.
2. Compare the Woods cello A/B: before, one-second pause, after. Listen for a natural plucked decay and its placement
   with the cello section, rather than a new bass line.
3. Hear each complete area loop into its first two bars again. The wrap occurs at the times in the table above.
   Listen for both continuity and whether the return feels musically comfortable.
4. In the game, cross an area boundary during both a busy and a sparse phrase; enter and leave a fight; trigger a
   reward over music. Check that the fade and effects remain clear.
5. Spend a few loops in Glimmer Hollow. It repeats most often of the new cues. A gentler glockenspiel pattern or an
   alternating phrase is an audition option if it becomes tiring, not a change justified by the score alone.

## Evidence and limits

- All nine scores and their shipped samples were inspected. Sample coverage and size-budget tests pass unchanged.
- Dry, deterministic stereo A/B reference files were rendered from the shipped recordings, score timing, seating,
  levels and envelopes. Paired files use identical gain. Full-area files share one audition gain and include one
  loop plus two bars to expose the wrap. Exposed-instrument files use their own matched gain for clarity.
- These reference files omit the hall, compressor, humanized timing/velocity and SFX. They are **not recordings of
  the game**, and the analysis is **not a listening verdict**. No audio-perception tool was available.
- The dry default-volume area peaks remain around -38 to -30 dBFS. This is evidence that the corrections do not
  introduce a dry-path clipping problem, not certification of the final game mix or SFX intelligibility.
- Nineteen sustained cave notes per loop have recordings that run out at least 0.1 seconds before their written
  duration after repitching. For example, one held F4 horn lasts about 2.26 seconds versus a written 3 seconds.
  The hall may bridge this naturally. Extending or looping sustained samples needs a separate listening pass;
  this review does not change the melody to conceal a sample limitation.
- Regression tests: the five new scheduling tests give four failures against the original player, then all five
  pass with the correction. Full suite: **168 tests pass**. Typecheck, production build and `git diff --check` pass.
- Browser smoke test was attempted but could not launch: the expected Playwright Chromium headless-shell binary
  is unavailable in this environment. Browser/mobile playback and transition listening remain unverified.

The findings above record the original music review. The playback correction and regression tests are included
with the Fluffy Vest crafting work on `dev`; publication to `main` remains a separate release step.
