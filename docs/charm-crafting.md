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

## How they're built

Each `art/gear/<id>.py` exports `build_item(root)`, returning a dictionary of named object lists: the crafting
scene's layers (`bun run art crafting <id>` → `public/assets/crafting3d/<id>.glb`). The inventory icon is drawn from
that model (`bun run art icons3d <id>`). `art/gear/_charm_shapes.py` holds charm-only shape helpers. See
docs/crafting-contributions.md for the whole pipeline.

Charms have no attachment on the hero: equipped charm IDs feed stats and the Bag only.

## Checks

- `bun test` (shipped files, recipes, ingredient/layer coverage, timing).
- `blender -b --factory-startup --python-exit-code 1 -P tests/charm-geometry.py`: every mesh in exactly one layer,
  parented to the item, no empty layers, and the shared icon hook routing.
- `CHROMIUM_PATH=/usr/bin/chromium bun tests/e2e/charms.ts --shots`: crafts and equips all four in a browser.
