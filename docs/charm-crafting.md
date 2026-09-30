# Charm material uplift

Scoped contribution based on `dev` at `ab09e9720378bf5ac3382d0196568c4695040fc6`.
Recipe costs, stats, drops, names and progression are unchanged.

| Charm | Existing recipe | Finished visible materials | Assembly plan |
| --- | --- | --- | --- |
| Clover Charm | 3 Clover + 3 Slime Goo | Three veined four-leaf clovers, green goo backing, loop and edge binding | Three leaves press softly into place; goo cushions the back and binds the stems with a gentle squash |
| Tooth Necklace | 4 Fang + 2 Shroom Cap | Four curved ivory fangs; red and cream cap-fiber braid with cap spots | Two flexible strands curl into the necklace; four fangs click softly into their loops and settle |
| Crystal Heart | 4 Glimmer Jelly + 3 Bat Wing + 1 Clover | Lavender jelly heart and glossy pools; two purple wing membranes and a wing loop; green clover seal | Wing membranes unfurl; jelly pools press into the heart; clover seals it with a soft tap |
| Imp Ring | 4 Imp Horn + 3 Ember | Four ridged ivory horn band sections and horn clasps holding three warm orange embers | Horn sections nest together; three embers arrive with quiet warm contact and a short glow settle |

Crystal Heart contains **no crystal**. Its historical name stays intact. Optional user decision: rename it **Glimmer Heart**, which would have no numerical balance impact. Adding crystal to the recipe would increase cavern mining demand and change accessibility/cost; this contribution does not do so.

## Owned files and coordinator hooks

Each `art/gear/<id>.py` exports `build_item(root)`, returning a dictionary of named object lists. Those lists define the registered component layers. The shared icon hook uses the same geometry. `art/gear/_charm_shapes.py` contains charm-only shape helpers. No existing shared art factory, registry, atlas, renderer, UI or rule file is changed.

`art/gear/_render_charms.py` is a scoped reproducible renderer:

```sh
blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_charms.py
```

It writes canonical 128×128 icons, 512×512 transparent layers, complete images and per-item manifests. Every layer uses one fixed camera, no independent crop/fit. The manifests contain normalized destination centers, alpha bounds and stacking order.

`src/crafting/items/<id>.ts` default-exports the agreed `CraftPresentation`, covering roles, registered layers, ingredient destinations, material contacts, phases and status copy. The shared coordinator must add the four definitions to its crafting registry. Geometry already follows the shared scaffold on `dev` at `f71d591`. Runtime sound and motion belong to the shared player; no charm runtime is duplicated here.

Charms have no supported attachment in the current hero renderer. `src/models.ts`, `src/assets.ts` and the world/battle draw paths accept armor and weapon models; equipped charm IDs feed stats and bag UI only. This contribution therefore supplies no fake equipped hero charm or new attachment node. The actual game hero continues to render in software WebGL after all four charms are crafted and equipped.

## Checks and evidence

- Typecheck, production build, full Bun test suite: pass. The three new asset tests verify unchanged recipes, actual WebP alpha/dimensions, common layer registration, ingredient/layer coverage, destination bounds, padded bounds and asset budgets.
- `blender -b --factory-startup --python-exit-code 1 -P tests/charm-geometry.py`: checks complete geometry parenting, unique objects, layer names/order, mesh conversion and shared icon hook routing.
- Shipped charm images: **514,834 bytes** total; enforced limits: 350,000 bytes per charm, 1,000,000 bytes combined. Assets are loaded per recipe by the shared runtime.
- Inspected the four 512-square finished Blender previews; canonical complete images are in `public/assets/crafting/<id>-complete.webp`. Before icons and in-game 320×568 reveal screenshots remain local QA evidence. These screenshots show the ordinary reveal before the shared runtime is wired.
- Baseline Fluffy Vest browser scenarios: **4/4 pass**, including skip, repeated craft requests, Keep, reduced motion at 320×568, and reload during assembly.
- `CHROMIUM_PATH=/usr/bin/chromium bun tests/e2e/charms.ts --icons-only --shots`: crafts all four recipes, checks cost exactly once, equips all four, checks reachable controls/no horizontal overflow at 320×568 and confirms real hero WebGL rendering. Screenshots are in `tests/e2e/out/charms/` (ignored build evidence).
- `CHROMIUM_PATH=/usr/bin/chromium bun tests/e2e/charms.ts --shots`: full normal/skip/reduced charm assembly verification; requires the coordinator's runtime wiring. Do not infer charm assembly QA from the icon-only run.

No audio listening check has yet been performed for the proposed charm sounds. The shared runtime's exact material profiles and final animation timing need review after integration.
