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

## Registered camera

Assembly root rotation is `(0, -pi/4, 0)` and scale is `(1, 1.25, 1.25)`;
then apply each module's `CAMERA` ppu/anchor/elevation. The equipped builders
leave root transforms untouched. All 512×512 layers and the complete image use
this same camera. Never independently crop/reframe a part. Contact coordinates
are normalized to this full canvas. `_` helper filenames prevent shared item
discovery from registering helper modules.

Until the shared crafting command supports this root presentation, run the
isolated `art/gear/_render_iron_bat.py` for only these four weapons. GLBs use:

```sh
bun run art models wpn_ironsword,wpn_ironhammer,wpn_batwhip,wpn_batwand
```

## Validation

Typecheck, all 207 tests and build passed. Item tests verify unchanged recipes,
one-time costs/equip, ingredient/layer coverage, contact timing/bounds, WebP
512px registration/alpha/margins, GLB toon attributes/grip origin and budgets.
Real Chromium software WebGL verified equipped/map/combat at 320×568 and
1024×768. The production rig probe checked carried, hand and extended poses,
including the whip's separate uncoiled grip. QA screenshots stay local.

Four GLBs total 81,128 B (previously 56,876 B). Assembly WebPs total 112,896 B.
Per-item tests cap GLBs at 30 KB and assembly art at 100 KB. Icons are 128×128.
No aggregate atlas was rebuilt. Shared catalog/runtime crafting UI and audible
mix checks remain for integration; no integrated crafting animation QA claimed.

```sh
bun run typecheck
bun test
bun run build
CHROMIUM_PATH=/usr/bin/chromium bun tests/items/iron-bat-browser.ts
```
