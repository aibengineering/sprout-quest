# 🌱 Sprout Quest

> **This game is a test of Claude Opus 5.5's capabilities, built on release day (22–23 September 2026).**
>
> Everything here (the game code, the Blender art pipeline and every 3D model, the tests and this repo) was written by
> Claude Opus 5.5 in [Claude Code](https://claude.com/claude-code) from a single conversation of plain-language requests.
> A human played it on their phone and gave feedback between turns; no code or art was written by hand.

**▶ Play it: https://aibengineering.github.io/sprout-quest/** (best on a phone, in portrait)

### How it was built, by the numbers

Measured from the Claude Code session log, up to the first push of this repo:

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


A cute, mobile-first little adventure game. Wander from Sprout Village through tall grass, get pulled into
real-time arena battles, level up, collect monster materials and craft better gear at the Forge — then push
further east toward stronger monsters and the dragon at the end of Ember Peak.

No runtime dependencies. Characters, monsters, weapons and scenery are cute cel-shaded 3D models built with
Blender Python scripts in `art/` and pre-rendered into sprite atlases; sounds and the map are generated in code.

## Play

```sh
bun install
bun run dev        # http://localhost:3000 — also prints a LAN URL to open on your phone
```

On a phone, "Add to Home Screen" for a fullscreen, app-like experience. Progress saves automatically (localStorage).

Every push to `main` runs the typecheck and tests, builds the site and deploys it to GitHub Pages
(`.github/workflows/deploy.yml`).

## Build

```sh
bun run build      # static site in dist/ — host anywhere (GitHub Pages, Netlify, itch.io…)
bun test           # rules + map sanity tests
bun run typecheck
```

## Story and progression

**Prologue.** You wake up in the Quiet Glade west of the village, pick up a Twig Sword, and fight your way down the
forest path: a slime (attack) and then a Hopbun (its charge teaches dodging), with only ⚔️ and 💨 on screen and coaching
bubbles. Reaching Sprout Village plays a letterboxed camera tour with Elder Bloom (the empty plots, the ruined forge, the
guarded roads east). From there systems unlock one at a time with a small card: 🎒 Bag, 📜 Journal, ✨ weapon skill,
🏡 Village building (starting with repairing the forge), ⚒ crafting, then new building plots as guardians fall.

Smoke from Ember Peak has made the monsters grumpy, and guardians block the roads. Elder Bloom (by the Forge)
guides you through a chain of chapters, and the current goal is always shown in the 📜 tracker at the top of the screen.

| Chapter | Goal |
| --- | --- |
| Prologue | Wake in the glade → find a sword → beat a slime and a Hopbun → reach the village |
| 1 | Gather materials in the meadow → repair the Forge → craft gear → craft a Stone Axe and chop Oak Logs → build a Cottage |
| 2 | 👑 **Slime King** (Lv 5) guards Whisper Woods → upgrade the Forge to a Smithy |
| 3 | 🐺 **Alpha Woolf** (Lv 9) guards Crystal Cave → build the Warp Stone |
| 4 | 💎 **Crystal King** (Lv 14) guards Ember Peak → upgrade to a Master Forge |
| Finale | 🐉 **Emberwyrm** (Lv 20) → then build your Manor |

- **Guardian gates**: each road is physically blocked until you beat its guardian, like gyms. Guardians have their
  own attack patterns and summon helpers. Beating one opens the road, lights a 🔥 **campfire checkpoint** (heal, respawn,
  warp point) and drops a **trophy** needed for the next village upgrade.
- **Village construction**: Home (Tent → Cottage → Manor, +max HP), Forge (levels gate ★★★ and ★★★★+ recipes),
  Garden (more free potions), Training Yard (+attack) and Warp Stone (fast travel). Buildings visibly change in the village.

## Areas

Each area past the village is a hand-drawn route (`src/routes.ts`), Pokémon style: a path that winds through the
area, tall-grass crossings you can't avoid, optional grassy pockets off the path (where the best trees grow),
ponds or lava, and signs. Tests check every route can be walked end to end, can't be done without wading through
grass, and that every tree, sign and campfire can be reached.

| Area | Lv | Monsters | Materials |
| --- | --- | --- | --- |
| 🌳 Quiet Glade | – | Prologue only | Where your story begins |
| 🏡 Sprout Village | – | – | Forge, Fountain, Elder Bloom, building plots |
| 🌼 Sunny Meadow | 1–3 | Slime, Hopbun | Goo, Fluff, Clover · 🪵 oaks |
| 🌲 Whisper Woods | 4–7 | Sporecap, Woolf | Shroom Cap, Fang, Clover · 🪵 oaks, 🌲 pines |
| 💎 Crystal Cave | 8–12 | Flapper, Pebblor | Bat Wing, Crystal, Golem Core |
| 🌋 Ember Peak | 13–17 | Impy, Magma Slime | Ember, Imp Horn |
| 🐉 Dragon Lair | 20 | Emberwyrm (boss) | Dragon Scale |

- **Monsters in the grass**: you can see them wandering the tall grass (a ×2/×3 badge means friends are hiding
  with it; ✨ golden ones drop double loot). Get close and one spots you ("!") and gives chase, but you're faster.
  Touch one to fight it; tap Attack next to one that hasn't seen you for a surprise attack (they start dazed). Tall
  grass is never quite safe either: unseen monsters can still ambush you as you wade through it.
- **Battles**: no wipe or countdown. The camera swoops in on you, and you land in a clearing dressed in the area's
  scenery (meadow trees and butterflies, woods pines and falling leaves, cave crystals, peak boulders and embers).
  Win and it swoops back out with a toast for XP and loot. Guardians and the dragon fight inside an old stone ring
  with their full fanfare. Drag to move; ⚔️ attacks the way you last moved, with a small
  nudge onto an enemy that's nearly dead ahead (an arrow at your feet shows where; hold to keep swinging); 💨 dodge gives brief invincibility; ✨ uses your weapon's skill; 🧪 drinks a potion.
  Enemies telegraph attacks — shaking/glowing before a charge, red circles before a slam.
- **Weapons play differently** — each type has its own combo, animation and hitbox (hitboxes sweep with the weapon,
  so what you see is what you hit):

  | Type | Combo | Skill |
  | --- | --- | --- |
  | 🗡️ Sword | slash → backslash → lunging stab | Spin |
  | 🔱 Spear | jab → jab → long lunge thrust | Lunge (dash through, invulnerable) |
  | 🪓 Axe | heavy overhead cleave → back-cleave → spinning finisher | Whirlwind |
  | 🔨 Hammer | overhead slam that sends a shockwave line forward (×2, bigger) | Quake (stun + 8 shockwaves) |
  | 🪄 Wand | shot → shot → spread | Nova |

  Tiers (★ to ★★★★★) extend reach a little, grow the trails and hit harder. `bun run balance` also measures every
  weapon (damage per second against its tier, reach and area as a share of the arena, skill coverage), and the
  tests keep them in line so no weapon or skill can clear the arena by itself. Elements add effects: 🔥 fire burns over
  time, 💎 crystal crits more, 🐉 dragon weapons erupt in dragonfire on every strike.
- **Woodcutting and Mining**: craft axes and picks at the Forge (Tools tab), then chop glowing trees and mine glowing
  rocks along the routes. Both are timing minigames: chopping is a bar with a green sweet spot; mining is a rock face
  where you strike when the pickaxe lines up with the glowing seam, and cracks spread as it breaks. Clean hits build
  a streak that speeds things up and hits harder; a miss just resets it, and a flawless job gives one extra. Nodes by
  the path are safe but slow to come back; ones out in the tall grass give more, come back faster and can hold a
  rare find (clover, crystal, a golem core), but monsters roam there. Oak and pine (Stone and Fang Axe), rock,
  copper and iron (Stone, Copper and Iron Pick); skill levels widen the sweet spot and unlock the better tools.
- **Two gear tracks**: hunter gear is forged only from monster drops; gatherer gear only from wood, stone and ore,
  and needs a Woodcutting or Mining level. Every weapon tier from ★ to ★★★★ has both, armor too (Timber Vest,
  Copper Mail and Iron Plate on the gatherer side). The ★★★★★ weapons and Dragon Mail need both, and beat everything
  else. Village buildings and tools mix the two: the Cottage needs logs and stone, the Smithy copper, the Master
  Forge iron.
- **Crafting**: 13 weapons, 10 armors (each changes how your hero looks), 4 charms and 3 potion recipes at the Forge. The 🗺️ Map lets you warp home
  from anywhere and hop to discovered areas from the village.

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
- `art/weapons.py`, `art/env.py`, `art/icons.py`: weapons, scenery and buildings, menu icons
- `art/pack.py`: trims frames and packs them into WebP atlases plus `atlas.json`

The game falls back to its procedural canvas drawings if the atlas can't load.

## Code map

- `src/main.ts` — game loop, mode switching, glue
- `src/overworld.ts` / `src/world.ts` — the map (glade and village generated, routes from `src/routes.ts`), collisions, grass encounters, tile rendering
- `src/routes.ts` — the hand-drawn route maps, one character per tile (legend at the top)
- `src/battle.ts` — arena combat, enemy AI, projectiles, hazards, shockwaves, themed arenas and the swoop in/out
- `src/arena.ts` — the oval arena's shape and edge collisions
- `src/roamers.ts` — monsters wandering the grass: noticing, chasing, surprise attacks
- `src/weapons.ts` — per-weapon-type movesets (combo timings, hitbox shapes, animations)
- `src/assets.ts` — sprite atlas loading and drawing
- `src/sprites.ts` — procedurally drawn chibi characters and monsters
- `src/data.ts` — monsters, zones, guardians, gear, recipes, village projects and story chapters (tweak balance here)
- `src/quests.ts` — story progression logic
- `src/rules.ts` — pure stat/damage/XP/crafting/gathering rules (unit tested)
- `src/gather.ts` — the chopping and mining timing minigames
- `src/balance.ts` — balance targets for fights, pacing and the material economy; `bun run balance` prints the table, `tests/balance.test.ts` enforces it
- `src/ui.ts`, `public/` — DOM HUD, menus, styles
