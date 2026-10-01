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

## How they're built

- `art/gear/<id>.py`: each item's `build_item(root)` returns a dictionary of named mesh groups, the layers of its
  crafting scene (`bun run art crafting <id>` → `public/assets/crafting3d/<id>.glb`).
- `art/gear/_consumable_shapes.py`: geometry helpers used only by these contributions. A bottle has a pale glass body
  just inside its infusion, so it reads as an empty bottle until the infusion fills (and hides) it.
- Inventory icons are drawn from the finished scene (`bun run art icons3d <id>`; meals as `meal_<id>`). A layer marked
  `finished: false` in `src/crafting/items/<id>.ts` (the stew's pine fuel) leaves when the piece is revealed and isn't
  in its icon.

Untargeted bottles, plates, cups and the pot show from the start; untargeted steam arrives at its `showAt` time. Potion
crafting keeps its single potion increment and saves before the scene; a meal applies at once. No animation or its
finish callback spends, grants, heals, or crafts again.

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
