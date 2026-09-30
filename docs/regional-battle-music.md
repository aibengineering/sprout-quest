# Regional battle music

Ordinary slime and bunny encounters previously restarted the same 168 BPM D-minor cue as every other ordinary
fight: 22.86 seconds, 35.79 note onsets per second, with doubled strings/brass and frequent heavy percussion.
The new scores use each area's palette and four clear four-bar phrases, rather than transposing that arrangement.

| Region | Written character | Loop | Onsets/s |
|---|---|---:|---:|
| Glade / Meadow / Secret Grove | D major, 136 BPM; clarinet questions alternating with flute answers, springy pizzicato, light claves; harp enters at bar 9 | 28.24 s | 7.93 |
| Whisper Woods | E Dorian, 124 BPM; offbeat clarinet, displaced cello plucks and harp replies; quiet viola harmony only in phrase 3 | 30.97 s | 7.01 |
| Echo Cavern | D minor, 116 BPM; short horn gestures with deliberate rests, low-string footsteps, three isolated glock glints | 33.10 s | 5.47 |
| Glimmer Hollow | A Lydian, 120 BPM, 3/4; agile flute, broken harp figures and sparse cello plucks; upper plucks enter in the second half | 24.00 s | 6.92 |
| Ember Peak | G minor, 144 BPM; the rising four-note idea and 3+3+2 accents survive in a lower register, with rests; trombone and quiet snare only in phrase 3 | 26.67 s | 11.70 |

Onset counts include simultaneous notes. They describe density, not perceived loudness or compositional quality.
All five ordinary battle themes retain the 0.65 fight gain, and the guardian score and 0.75 gain are unchanged.
The existing 1.2-second crossfade and fanfare ducking remain. Repeated encounters enter the next four-bar phrase
following the previous exit, so quick fights can expose more of the composition. Entry memory is separate for each
region, resets with the page, and never changes guardian openings. No random variations or new game mechanics.

## Sample and download impact

The shipped bank is reused byte-for-byte. Five recordings used only by the retired battle arrangement are removed.
The bank decreases from 162 samples / 3.209 MiB to **157 / 3.149 MiB**. Opening preload changes from glade + old battle
to glade + battleMeadow: **47 samples / 1,051,681 bytes (1.003 MiB)**, previously about 1.436 MiB. Both remain below
the existing 1.5 MiB opening and 3.5 MiB total limits. No runtime instrument downloads were added.

`bun run music --reuse-shipped` preserves encoded samples, verifies pitch coverage before modifying the bank,
and prunes recordings no longer selected. The full source packer remains available for future score changes that
need a different range. All notes stay within the existing stretch limits (four semitones, seven for horn).

## Verification and listening limits

Score checks cover exact 16-bar line lengths, every bar's meter, notes within the loop, valid velocities and
sample coverage. Scheduler tests cover subsequent phrase entries, 3/4 entries, wraparound, independent regions,
long encounters, all fight gains and guardian restarts. Browser coverage checks that the battle arena's region
wins over an intentionally different overworld region, and that boss routing takes priority.

These are score-based composition decisions, not a listening verdict. No audio perception was available.
An in-game listen should compare meadow slime/bunny fights, a complete loop and repeat entry in each region,
regional transitions and guardian/Big Bun encounters, with hit/dodge sounds and reward fanfares enabled.

Reference renders use the player's real note playback, sample onset handling, seating, hall and compressor in
Chromium OfflineAudioContext, one loop plus two bars and four seconds of tail. They omit gameplay SFX and the entry
crossfade. The MP3 listening copies share a +18 dB audition boost; their source render uses the default 70% slider
and 0.65 battle level. Source peaks range from -40.40 to -37.47 dBFS, with no clipping observed. This does not assess
in-game masking or how the melodies sound. A 390×844 browser capture also shows the corrected Gear Up celebration.

Production `main.js` changes from 1,033,034 to 1,037,643 bytes (+4,609); gzip changes from 297,196 to 298,324 (+1,128).
The removed audio saves 63,512 bytes plus 345 bytes of sample-index metadata.
