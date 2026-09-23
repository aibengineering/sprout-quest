# 🌱 Sprout Quest

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

## Build

```sh
bun run build      # static site in dist/ — host anywhere (GitHub Pages, Netlify, itch.io…)
bun test           # rules + map sanity tests
bun run typecheck
```

## The loop

| Area | Lv | Monsters | Materials |
| --- | --- | --- | --- |
| 🏡 Sprout Village | – | – | Forge (craft) & Fountain (heal) |
| 🌼 Sunny Meadow | 1–3 | Slime, Hopbun | Goo, Fluff, Clover |
| 🌲 Whisper Woods | 4–7 | Sporecap, Woolf | Shroom Cap, Bark, Fang |
| 💎 Crystal Cave | 8–12 | Flapper, Pebblor | Bat Wing, Crystal, Golem Core |
| 🌋 Ember Peak | 13–17 | Impy, Magma Slime | Ember, Imp Horn |
| 🐉 Dragon Lair | 20 | Emberwyrm (boss) | Dragon Scale |

- **Encounters**: walking in tall grass has a chance to start a battle with 1–3 monsters from that area
  (4% chance of a ✨ golden one with double loot).
- **Battles**: real-time in a round arena. Drag to move; ⚔️ attack auto-aims at the nearest enemy (hold to
  keep swinging); 💨 dodge gives brief invincibility; ✨ uses your weapon's skill; 🧪 drinks a potion.
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

  Tiers (★ to ★★★★★) extend reach, grow the trails and hit harder. Elements add effects: 🔥 fire burns over
  time, 💎 crystal crits more, 🐉 dragon weapons erupt in dragonfire on every strike.
- **Crafting**: 13 weapons, 7 armors (each changes how your hero looks), 4 charms and 3 potion recipes at the Forge. The 🗺️ Map lets you warp home
  from anywhere and hop to discovered areas from the village.

Keyboard also works: WASD/arrows, J/Space attack, K dodge, L skill, H potion, E interact, M menu, R run.

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
- `src/overworld.ts` / `src/world.ts` — map generation, collisions, grass encounters, tile rendering
- `src/battle.ts` — arena combat, enemy AI, projectiles, hazards, shockwaves
- `src/weapons.ts` — per-weapon-type movesets (combo timings, hitbox shapes, animations)
- `src/assets.ts` — sprite atlas loading and drawing
- `src/sprites.ts` — procedurally drawn chibi characters and monsters
- `src/data.ts` — monsters, zones, gear, recipes (tweak balance here)
- `src/rules.ts` — pure stat/damage/XP/crafting rules (unit tested)
- `src/ui.ts`, `public/` — DOM HUD, menus, styles
