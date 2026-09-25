# 🌱 Sprout Quest

> **Sprout Quest has been built entirely by Claude Opus 5.5, starting on the model's release day (22 September 2026).**
>
> Everything here (the game code, the Blender art pipeline and every 3D model, the tests, CI and this repo) was written
> by Claude Opus 5.5 in [Claude Code](https://claude.com/claude-code) from plain-language requests. A human plays it on
> their phone and gives feedback between turns; no code or art has been written by hand.

**▶ Play it: https://aibengineering.github.io/sprout-quest/** (best on a phone, in portrait)

## How it was built

### Release day: a playable game from a handful of prompts (0.1.0)

The first version was built in one conversation on release day, and was a complete, playable game by the first push:
a prologue, four areas, real-time battles, guardian bosses, a village to rebuild and gear to craft. Measured from the
Claude Code session log, up to that first push:

| | |
| --- | --- |
| Human prompts to build the game end to end | **11** (plus 3 more to set up GitHub and this repo) |
| Wall-clock time | ~4 h 25 min, from first prompt to published repo |
| Model calls | ~230 |
| Tool calls (shell commands, file edits, Blender renders, headless browser tests…) | ~245 |
| Output tokens | ~565K |
| Input tokens | ~99M total: ~450 uncached + ~716K cache writes + ~98.4M cache reads (the conversation is re-read from cache on every call) |

The prompts, roughly: *make a cute mobile adventure game with a fight → level → craft loop* · *use Bun* ·
*give me a link to play it* · *fix clipped menu text* · *install Blender and make cute 3D art; make weapons feel
different and powerful* · *add story, bosses and milestones that gate progression* · *make the first-time
experience less overwhelming* · *start with a prologue before the village* · *move the bag near the thumbs* ·
*let me close the menu from the bottom* · *fix two bugs with the forge quest*.

### Since then: playing it and iterating (0.2.0 onward)

Since the first release, development has been a loop: play the game on a phone, describe what feels off, and have
Opus 5.5 rework it. Some of the bigger rounds so far:

- **Progression overhaul (0.2.0):** a new area, woodcutting and mining with tool tiers, four weapon classes with monster
  and ore tracks, weapon handling, stamina, level-up screens and gear that stays a mystery until you reach its level
- **Playtest data:** an in-game play report (fights, stamina, deaths, time per area) exported after a playthrough and
  handed back to Opus 5.5 to tune the balance against real play, not just the balance model
- **Engineering:** splitting the largest modules, an end-to-end browser test, CI, a `dev` → `main` release flow and
  in-game patch notes
- **Visual pass (0.2.1):** a sharper, outlined hero whose every armor changes their silhouette, and axes and picks
  that swing into the tree or rock

Each release's player-facing changes are in the in-game patch notes (`src/version.ts`).

## The game

A cute, mobile-first little adventure game. Wander from Sprout Village through tall grass, get pulled into
real-time arena battles, level up, chop and mine your way up the material tiers, and craft better gear at the Forge,
then push east toward stronger monsters and the dragon at the end of Ember Peak.

No runtime dependencies. Characters, monsters, weapons and scenery are cute cel-shaded 3D models built with
Blender Python scripts in `art/` and pre-rendered into sprite atlases; sounds and the map are generated in code.

## Play

```sh
bun install
bun run dev        # http://localhost:3000, and prints a LAN URL to open on your phone
```

The title screen shows a loading bar (game code, then sprite download in MB, then menu icons) and only offers
Continue / New Game once everything is in, so nothing starts half-drawn. On a phone, "Add to Home Screen" for a
fullscreen, app-like experience. Progress saves automatically (localStorage).

Every push to `main` runs the typecheck and tests, builds the site and deploys it to GitHub Pages
(`.github/workflows/deploy.yml`).

## Branches and releases

Work happens on `dev`; `main` is what's live. `main` only takes pull requests, and CI (`.github/workflows/ci.yml`)
must pass first:

- **Typecheck, tests and build**, and the **browser smoke test**, on every pull request and every push to `dev`
- **Version bump and patch notes**, on pull requests into `main`: the `version` in `package.json` must be newer than
  `main`'s, and the top entry of `PATCH_NOTES` in `src/version.ts` must describe it (`scripts/check-release.ts`)

So a release is: bump `version` in `package.json`, add its patch notes at the top of `src/version.ts`, and open a pull
request from `dev` to `main`. The version lives only in `package.json`; the game reads it from there, and players
see a dot on the patch notes until they've read the new ones.

## Build and test

```sh
bun run build      # static site in dist/: host anywhere (GitHub Pages, Netlify, itch.io…)
bun test           # rules, balance, story, routes and map tests
bun run typecheck
bun run balance    # prints the balance model: fights, pacing, the material economy, every weapon
bun run e2e        # plays the real game in headless Chromium (add --shots for screenshots in tests/e2e/out/)
```

The end-to-end smoke test (`tests/e2e/smoke.ts`) needs Playwright's Chromium once:
`bunx playwright-core install chromium-headless-shell`. It plays a new game through the prologue, wins a fight
through its level-up screens, mashes every weapon class, fights every monster, mines crystal, checks the Forge's
mystery cards and exports a play report, failing on any page error.

## Play report

Every fight (time, swings, hits, damage dealt and taken, potions, gear) and every gathering run is logged in the
browser. **More → Play report** downloads (or copies) it as JSON with a per-area summary, the level and crafting
timeline and the raw events, to tune the balance against real play.

## Story and progression

**Prologue.** You wake up in the Quiet Glade west of the village, pick up a Twig Sword, and fight your way down the
forest path: a slime (attack) and then a Hopbun (its charge teaches dodging), with only ⚔️ and 💨 on screen and coaching
bubbles. Reaching Sprout Village plays a letterboxed camera tour with Elder Bloom (the empty plots, the ruined forge, the
guarded roads east). From there systems unlock one at a time with a small card: 🎒 Bag, 📜 Journal, ✨ weapon skill,
🏡 Village building (starting with repairing the forge), ⚒ crafting, then new building plots as guardians fall.

Smoke from Ember Peak has made the monsters grumpy, and guardians block the roads. Elder Bloom guides you through a
chain of chapters, and the current goal is always shown in the 📜 tracker at the top of the screen, with a progress bar
for the materials it needs.

| Chapter | Goal |
| --- | --- |
| Prologue | Wake in the glade → find a sword → beat a slime and a Hopbun → reach the village |
| 1 | Gather materials in the meadow → repair the Forge → craft gear → craft a Stone Axe and Pick → build a Cottage |
| 2 | 👑 **Slime King** (Lv 5) guards Whisper Woods → upgrade the Forge to a Smithy |
| 3 | 🐺 **Alpha Woolf** (Lv 9) guards Echo Cavern → build the Warp Stone |
| 4 | 💎 Mine crystal in **Glimmer Hollow** |
| 5 | 💎 **Crystal King** (Lv 14) guards Ember Peak → upgrade to a Master Forge |
| Finale | 🐉 **Emberwyrm** (Lv 20), then build your Manor |

- **Guardian gates**: each road is physically blocked until you beat its guardian, like gyms. Guardians have their
  own attack patterns and summon helpers. Beating one opens the road, lights a 🔥 **campfire checkpoint** (heal, respawn,
  warp point) and drops a **trophy** needed for the next village upgrade.
- **Village construction**: Home (Tent → Cottage → Manor, +max HP), Forge (Forge → Smithy → Master Forge, gating
  ★★★ and ★★★★★ recipes), Garden (more free potions), Training Yard (+attack) and Warp Stone (fast travel). Buildings
  visibly change in the village.
- **Levels you can feel**: a combat level-up pauses the game on its own screen with your stat changes and what you're
  now ready for (a guardian, a new area). Woodcutting, Mining and weapon handling levels get a screen too, listing what
  they just unlocked in the Forge.

## Areas

Each area past the village is a hand-drawn route (`src/routes.ts`), Pokémon style: a path that winds through the
area, tall-grass crossings you can't avoid, optional grassy pockets off the path (where the best nodes grow),
ponds or lava, and signs. Tests check every route can be walked end to end, can't be done without wading through
grass, and that every tree, rock, sign and campfire can be reached. Each area is one material tier.

| Area | Lv | Monsters | Materials |
| --- | --- | --- | --- |
| 🌳 Quiet Glade | – | Prologue only | Where your story begins |
| 🏡 Sprout Village | – | – | Forge, Fountain, Elder Bloom, building plots |
| 🌼 Sunny Meadow | 1–3 | Slime, Hopbun | Goo, Fluff, Clover · 🪵 oak, 🪨 stone |
| 🌲 Whisper Woods | 4–7 | Sporecap, Woolf, Hopbun | Shroom Cap, Fang · 🌲 pine, 🟠 copper |
| 🪨 Echo Cavern | 8–11 | Flapper, Pebblor, Sporecap | Bat Wing, Golem Core · ⚙️ iron |
| 💎 Glimmer Hollow | 11–13 | Glimmer Slime, Flapper, Pebblor | Glimmer Jelly · 💎 crystal |
| 🌋 Ember Peak | 13–17 | Impy, Magma Slime, Pebblor | Ember, Imp Horn |
| 🐉 Dragon Lair | 20 | Emberwyrm (boss) | Dragon Scale |

- **Monsters in the grass**: you can see them wandering the tall grass (a ×2/×3 badge means friends are hiding
  with it; ✨ golden ones drop double loot). Get close and one spots you ("!") and gives chase, but you're faster.
  Touch one to fight it; tap Attack next to one that hasn't seen you for a surprise attack (they start dazed). Tall
  grass is never quite safe either: unseen monsters can still ambush you as you wade through it.
- **Battles**: no wipe or countdown. The camera swoops in on you, and you land in a clearing dressed in the area's
  scenery and ambient life. Win and it swoops back out, with loot and XP stacking up on the right. Guardians and the
  dragon fight inside an old stone ring with their full fanfare. Drag to move; ⚔️ attacks the way you last moved,
  with a small nudge onto an enemy that's nearly dead ahead (an arrow at your feet shows where); 💨 dodge gives brief
  invincibility; ✨ uses your weapon's skill; 🧪 drinks a potion. Enemies telegraph attacks: shaking and glowing
  before a charge, red circles before a slam.

## Weapons

Four classes, each with its own combo, animation and hitbox (hitboxes sweep with the weapon, so what you see is what
you hit), and a weapon at every tier from ★ to ★★★★★:

| Class | Combo | Skill | Stamina |
| --- | --- | --- | --- |
| 🗡️ Sword | slash → backslash → lunging stab | Spin | 3 |
| 🔨 Hammer | two overhead slams, each sending a line of rock spikes forward | Quake | 2 (slow to refill) |
| 〰️ Whip | two long lashes → a crack at the tip | Twirl | 3 |
| 🪄 Wand / slingshot | shot → shot → a weaker three-way spread | Nova | 3 |

- **Stamina**: every swing or shot spends a pip (shown under the attack button). Pips come back only once you pause,
  and each class rests after its full combo, so mashing gets you a combo and then a wait.
- **Two tracks**: gatherer weapons (swords and hammers in stone, copper, iron and crystal) are forged from ore and
  hit a little harder, plainly. Hunter weapons (whips and wands from jelly, spores, bat wings and glimmer) are forged
  from monster drops, hit a little softer, and carry the monster's trick: jelly slows, spores poison, bat weapons
  drain life, glimmer sparks chain to a second foe. Ranged wands aim lower still, since they never walk into danger.
  The ★★★★★ legendaries need both tracks' materials: the Ember Blade, Dragontail Whip, Wyrmfire Wand and the
  Wyrmbreaker, a war hammer whose slam breathes a fan of dragonfire that leaves the ground burning.
- **Weapon handling**: winning with a class levels its handling, and better weapons of that class need it, so
  sticking with a class pays off.
- **Balance**: `bun run balance` measures every weapon over a typical fight from full stamina (sustained damage and
  opening burst against its tier, reach and area as a share of the arena, skill coverage), and the tests keep each
  within its track's band.

## Gathering and crafting

- **Woodcutting and Mining**: craft axes and picks at the Forge (Tools tab), then chop glowing trees and mine glowing
  rocks along the routes. Each tool gathers its own tier quickly and the next tier up slowly, so you chip the next
  material to forge the tool that mines it properly: Stone Axe (oak, slowly pine) → Copper Axe; Stone Pick (stone,
  slowly copper) → Copper Pick → Iron Pick → Crystal Pick.
- **The minigames**: chopping is a bar with a green sweet spot; mining is a rock face where you strike when the pick
  lines up with the glowing seam. The tree or rock shows every blow (a deepening notch, cracks that fork on perfect
  hits), then topples or splits. Clean hits build a streak that speeds things up; a flawless job gives one extra.
  Nodes by the path are safe but slow to come back; ones out in the tall grass give more and can hold a rare find, but
  monsters roam there. Skill levels widen the sweet spot and unlock the better tools.
- **The Forge**: 20 weapons, 10 armors (each changes how your hero looks), 4 charms and 3 potions. Gear you haven't
  reached the level for (Forge, gathering skill or weapon handling) stays a mystery: a silhouette, its class and tier,
  and the level that reveals it. The 🗺️ Map lets you warp home from anywhere and hop to discovered areas.

On a computer the game shows key hints on every button (switching back to touch hints as soon as you touch the screen):
WASD/arrows move, J/Space attack (hold to combo), K dodge, L skill, H potion, R run, E interact, B bag, Q journal.
In menus and dialogs: Enter/Space confirms, Esc cancels or closes, 1–5 or ←/→ switch tabs.

## Art pipeline (Blender)

Every sprite comes from Blender Python scripts in `art/`: primitives with a cel-shading material and inverted-hull
outlines, posed per frame and rendered with EEVEE. It runs headless, with no Blender UI needed.

```sh
bun run art              # re-render everything (~30 min on CPU), then pack into public/assets/
bun run art monsters     # re-render one group: hero | monsters | weapons | env | icons
BLENDER=/path/to/blender bun run art
```

- `art/lib.py`: toon material, outlines, primitive builders, ortho camera and render helpers
- `art/hero.py`: the hero (every armor looks different) plus the walk cycle
- `art/monsters.py`: monsters with idle loops and golden variants
- `art/weapons.py`, `art/env.py`, `art/icons.py`: weapons (built from reusable parts per material), scenery and
  buildings, menu icons
- `art/pack.py`: trims frames and packs them into WebP atlases plus `atlas.json`

The game falls back to its procedural canvas drawings if the atlas can't load.

## Code map

- `src/main.ts`: the canvas, the frame loop, and wiring the page's buttons to the game
- `src/game/`: the game's flows, sharing state through `G` in `context.ts` (save, map, fight, mode, transitions)
  - `fights.ts`: starting and finishing fights, rewards, the swoop in and out, in-battle coaching
  - `gathering.ts`: the chop/mine minigame on the map
  - `story.ts`: quests, unlock cards, Elder Bloom, the village cutscene
  - `rewards.ts`: loot rows, level-up screens, gear the Forge reveals
  - `interact.ts`: what the action button does next to each kind of map object
  - `menu.ts`: what the menu's buttons do (crafting, building, travel, the play report)
  - `waypoint.ts`: where the goal arrow points; `title.ts`: loading and the title screen
- `src/battle/`: arena combat
  - `battle.ts`: the fight simulation (you, strikes, shots, hazards, shockwaves)
  - `monsters.ts`: how each monster fights, one entry per kind
  - `elements.ts`: each weapon element's colors and on-hit trick
  - `render.ts`: drawing the fight, the themed clearings and the overlay; `pose.ts`, `types.ts`: shared pieces
- `src/overworld.ts` / `src/world.ts`: the map (glade and village generated, routes from `src/routes.ts`), collisions,
  grass encounters, rendering
- `src/routes.ts`: the hand-drawn route maps, one character per tile (legend at the top)
- `src/roamers.ts`: monsters wandering the grass: noticing, chasing, surprise attacks
- `src/weapons.ts`: each class's moveset (combo timings, hitbox shapes, stamina) and the damage model
- `src/data.ts`: monsters, zones, guardians, gear, recipes, tools, village projects and story chapters
- `src/rules.ts`: pure stat, damage, XP, crafting and gathering rules (unit tested)
- `src/quests.ts`, `src/unlocks.ts`: story progression and system unlocks
- `src/gather.ts`: the chopping and mining minigames
- `src/stats.ts`: the play report log
- `src/balance.ts`: balance targets for fights, pacing, weapons and the material economy; `bun run balance` prints
  them, `tests/balance.test.ts` enforces them
- `src/assets.ts`, `src/sprites.ts`: sprite atlas loading and drawing, and the procedural fallbacks
- `src/ui.ts`, `public/`: DOM HUD, menus, styles
