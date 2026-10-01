# Iron/bat weapon integration notes

Owns `ironsword`, `ironhammer`, `batwhip`, `batwand`. Geometry exports
`build_weapon(root)`; runtime files default-export `CraftPresentation`.
The shared owner registers the four presentations and rebuilds matching atlas
entries. Recipes, stats, progression, music and Fluffy Vest are unchanged.

Iron weapons expose grained pine grips/shafts and forged iron structure.
The whip uses folded wing hide, wing-strip coils, one gray/lilac Golem Core
and two ivory fangs. The wand uses a rolled wing shaft, ribbed/scalloped crown
and two gray/lilac cores. No ingredient/balance changes are proposed.

Assembly lasts 3.2 s (iron) / 3.4 s (bat). Recipe quantities are allocated by the
shared runtime. Every material has destinations, registered layers and a role.
Contacts use solid/bind/soft/energy motion and existing soft material sounds.

## How they're built

The crafting scene is the weapon's builder with its preview turn: the root rotated `(0, -pi/4, 0)` and scaled
`(1, 1.25, 1.25)` (or the module's `PREVIEW_ROTATION`/`PREVIEW_SCALE`); the equipped builders leave the root alone.
`bun run art crafting <id>` exports the scene, `bun run art models wpn_<id>` the held weapon, and
`bun run art icons3d <id>` redraws the icon from the scene. See docs/crafting-contributions.md.

```sh
bun run typecheck
bun test
bun run build
CHROMIUM_PATH=/usr/bin/chromium bun tests/items/iron-bat-browser.ts
```
