# 🌱 Sprout Quest

A cute, mobile-first little adventure game. Wander from Sprout Village through tall grass, get pulled into
real-time arena battles, level up, collect monster materials and craft better gear at the Forge — then push
further east toward stronger monsters and the dragon at the end of Ember Peak.

No assets, no runtime dependencies: everything (sprites, sounds, map) is generated in code.

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
- **Weapons play differently**: Sword (wide arc, Spin), Spear (long reach, Lunge), Wand (projectiles, Nova),
  Hammer (slow 360° smash, Quake + stun).
- **Crafting**: 7 weapons, 7 armors, 4 charms and 3 potion recipes at the Forge. The 🗺️ Map lets you warp home
  from anywhere and hop to discovered areas from the village.

Keyboard also works: WASD/arrows, J/Space attack, K dodge, L skill, H potion, E interact, M menu, R run.

## Code map

- `src/main.ts` — game loop, mode switching, glue
- `src/overworld.ts` / `src/world.ts` — map generation, collisions, grass encounters, tile rendering
- `src/battle.ts` — arena combat, enemy AI, projectiles, hazards
- `src/sprites.ts` — procedurally drawn chibi characters and monsters
- `src/data.ts` — monsters, zones, gear, recipes (tweak balance here)
- `src/rules.ts` — pure stat/damage/XP/crafting rules (unit tested)
- `src/ui.ts`, `public/` — DOM HUD, menus, styles
