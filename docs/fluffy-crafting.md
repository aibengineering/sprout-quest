# Fluffy Vest crafting pilot

A single, automatic making-of at the Forge. Craft a Fluffy Vest and watch bundles leave the bag, land on the workbench and become a wearable piece. There is no timing challenge or extra interaction required.

## Try it

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000/?preset=fluffy-craft`. This dev-only preset uses its own save slot and leaves the main playthrough alone. It starts in front of the Forge with the existing **12 Bunny Fluff + 4 Slime Goo** recipe. Interact with the Forge, choose **Armor → Fluffy Vest → Craft**. Reload the preset URL to try again.

Alternatively, craft the vest normally in a saved game. Other recipes retain their existing reveal.

## What happens

- Five staggered bundles of Bunny Fluff fly from their visible inventory stack into pink felted panels, a white collar and white cuffs
- Four blobs of Slime Goo bind the cuff edges, hem and front closure; the green binding remains on the finished garment and equipped hero
- Material-specific pull, soft contact, goo and seam sounds mark the physical contacts; the existing treasure fanfare marks completion
- The finished vest gets a short squash/settle and lift before **Keep in bag / Equip now** appears
- About 3.2 seconds of animation, played live in 3D (the vest's model, see docs/crafting-contributions.md)

The palette and fluffy silhouette follow the existing vest. Crafting costs, drops, stats and progression balance are unchanged.

## Safety and accessibility

The existing game rule commits the recipe and ownership once, and saves before animation. Repeated craft requests are ignored until the choice flow finishes. Skipping never refunds, duplicates or equips an item. A reload during assembly keeps the vest in the bag.

**Skip animation**, Escape, Enter or Space goes directly to the finished piece. A second explicit choice keeps/equips it. Enter/Space honors a focused choice button; E chooses the primary action and Escape chooses Keep. Reduced-motion mode starts at the completed reveal. Backgrounding the page finishes quietly without delayed sounds. Without WebGL (or if the scene's model failed to download) it finishes at once on the item's icon. All temporary frames, listeners and Web Animations are cleaned up.

## Implementation

- `src/crafting.ts`: presentation-only timeline, recipe-counted flights and lifecycle
- `src/ui.ts`: final comparison/choice integration and keyboard behavior
- `src/game/menu.ts`: existing craft transaction, persistence and one-flow guard
- `src/audio.ts`: short material-specific synthesized effects
- `art/hero.py` `build_fluffvest`: the garment's geometry, shared by the worn armour and the crafting scene
- `src/models.ts` `craftView`: plays the scene (`public/assets/crafting3d/fluffvest.glb`) live
- `src/dev/presets.ts`: disposable `fluffy-craft` test save

Rebuild the scene with `bun run art crafting fluffvest`, the worn armour with `bun run art models armor_fluffvest`, then
the icon with `bun run art icons3d fluffvest`.

## Checks

```sh
bun run typecheck
bun test
bun run build
bun run e2e:full --only 'Fluffy crafting' --shots -j 1
```

The in-process DOM tests cover flight quantities, one reveal, skip/cancel, reduced motion, backgrounding, missing art, detached screens and focused keyboard choices. The browser scenarios cover a complete craft/equip, repeated requests, Keep, a 320×568 phone, reduced motion and reloading during assembly. Use `CHROMIUM_PATH=/path/to/chromium` if testing with a system browser rather than Playwright's downloaded build.
