# Potion and Granny Kitchen contributions

Seven item-local contributions based on `dev` at `f71d591`, preserving the regional music and icon changes through `ab09e97`. There are no changes to recipes, quantities, stats, potion capacity/healing, meal effects/durations, unlocks, or drop rates.

| Recipe | Ingredients | What they become |
| --- | --- | --- |
| Jelly Potion | 2 Slime Goo + 1 Bunny Fluff | Green infusion and a soft white foam cap |
| Shroom Brew | 2 Shroom Caps | Rose-red infusion with spotted cap pieces |
| Ember Tonic | 2 Embers | Orange infusion with warm, slowly turning swirls |
| Fluff Pancakes | 5 Bunny Fluff + 3 Slime Goo | Airy pancakes with green goo syrup and drips |
| Clover Tea | 2 Clover | Two four-leaf sprigs steeped in pale green tea |
| Goo Jelly | 8 Slime Goo | A glossy green fluted mold, without the old uncosted berry garnish |
| Woodcutter's Stew | 3 Pine Logs + 2 Shroom Caps | Logs heat the pot from below; spotted caps remain visible in the broth |

Bottles, cups, plates, the pot, and steam are presentation props. Pine is fuel, not an edible part of the stew. Its fuel layer is present during cooking and omitted from the finished meal icon/reveal. No material substitutions are required for this design.

## Isolated source and assets

- `art/gear/<id>.py`: each item's `build_item(root)` returns a dictionary of registered named mesh groups; `build_icon()` returns its finished icon geometry.
- `art/gear/_consumable_shapes.py`: geometry helpers used only by these seven contributions.
- `art/gear/_render_consumables.py`: local generation entrypoint, no atlas mutation.
- `public/assets/crafting/<id>-<part>.webp`: 512×512 transparent images sharing one camera per item; complete image included.
- `public/assets/crafting/<id>.json`: registered alpha bounds, centers, stacking and ingredient roles.
- `public/assets/icons/<id>.webp`: 128×128 potion icons; meals retain canonical `meal_<id>` icon paths.

```sh
blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_consumables.py
# Or one item, without touching any other item or shared atlas:
blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_consumables.py -- stew
```

All layers retain their full 512px camera registration. Never independently crop or fit a layer. The generators reject empty/clipped layers. Compressed complete images also produce the inventory icons. WebP quality 92 keeps the complete seven-recipe set at 358,860 bytes; the largest recipe is 64,530 bytes. All PNG sources retain their registered camera and alpha. Each on-demand recipe layer set has a 160KiB ceiling; all seven sets together have a 768KiB ceiling. They add no equipped model or weapon attachment, since these are consumables.

## Shared wiring required

The shared coordinator owns the crafting renderer, registry, UI, transaction guard, production generation hooks, and icon preload integration. Potion crafting must retain its existing single potion increment and persist before presentation; the meal rule must continue applying exactly one meal immediately, with play time paused through its presentation. Neither an animation nor its finish callback may spend, grant, heal, or call `cook`/`craftPotion` again.

When regenerating assembly assets, honor each module’s `WEBP_QUALITY = 92` (recorded as `webpQuality` in its manifest); quality 100 exceeds the tested mobile byte budgets.

Show untargeted bottle/plate/cup/pot layers from the start, and introduce untargeted steam at the simmer/reveal phase. Honor `art/gear/stew.py`’s `COMPLETE_PARTS` (also recorded as `completeParts` in its manifest): pine fuel is a cooking layer and must not be included when regenerating the finished stew icon/image. The shared icon hook currently calls `build_item`; it likewise needs to hide objects outside `COMPLETE_PARTS` for stew.

Use item recipe IDs `jellypot`, `shroombrew`, `embertonic`, `pancakes`, `tea`, `goojelly`, and `stew`; use `meal_` only for the four canonical meal icon paths. Load only the selected recipe's layers. The registry should retain finished potion icons even though the save stores a shared potion count rather than potion types.

Timeline modules in `src/crafting/items/<id>.ts` default-export the shared `CraftPresentation` contract from `f71d591`. Geometry exports `build_item(root)` and matched `CAMERA` settings. Item-only helper filenames start with `_` so discovery cannot mistake them for item contributions. The presentation should count real recipe ingredients, softly squish goo, lift fluff, steep clover and caps, and place pine below the pot. Skip, reduced motion, backgrounding, failed/slow art, keyboard completion and disposal remain shared renderer responsibilities. No minigame or new interaction is needed.

## Verification

```sh
bun run typecheck
bun test tests/crafting-items/
blender -b --factory-startup --python-exit-code 1 -P tests/crafting-items/consumables-geometry.py
CHROMIUM_PATH=/usr/bin/chromium bun run tests/crafting-items/kitchen-icons.browser.ts
bun test tests/kitchen.test.ts tests/crafting.test.ts tests/weaponPose.test.ts
bun test
bun run build
CHROMIUM_PATH=/usr/bin/chromium bun run e2e --only 'Fluffy crafting' --shots -j 1
```

Final integration requires browser inspection of the shared reveal on desktop and a 320×568 phone, plus skip/reduced motion and transaction persistence for both potions and meals. Audio synthesis checks can prove signal levels; audible quality still requires listening.

### Completed local QA and limits

All seven complete renders were visually inspected. The item tests verify real ingredient keys/destinations, registered 512px layers, 128px icons, timing, byte budgets, fuel placement, and unchanged potion/meal consumption. Blender checks verify all exported visible meshes belong to exactly one layer and remain parented to the item root. Full typecheck, unit tests and production build pass. The Fluffy pilot’s four browser scenarios pass, including 320px phone, reduced motion, repeated requests and reload persistence.

The local kitchen browser check loads all four new canonical meal icons at 320×568, 390×844, and 900×700 with no horizontal overflow or page errors. Before/after screenshots remain only in the ignored `tests/e2e/out/` folder. The kitchen remains vertically scrollable at small sizes. No reference bundle or Library artifact is created. These consumables have no equipped model or attachment; existing weapon-pose regression tests pass.

The new potion/meal workbench lifecycle is not yet wired in this feature branch; its animation, skip/reduced-motion, persistence and audio integration must be checked in the coordinator’s combined game. Sound names use existing soft synthesized effects, but audible quality has not been listened to in this environment.
