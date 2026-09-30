# Crafting contribution contract

Item tasks own unique files. The shared integration owner maintains the catalog,
UI/menu flows, CSS, equipped-model hooks and build/atlas scripts. Do not change
recipes, stats, progression requirements or material names in an art contribution.
Report proposed recipe changes with their impact for a separate decision.

## Runtime definition

Create `src/crafting/items/<id>.ts`, default-exporting an object that
`satisfies CraftPresentation` imported from `../types`. See `fluffvest.ts`.

```ts
import type { CraftPresentation } from '../types';
export default {
  id: 'example', duration: 3200,
  layers: [{ id: 'body', src: 'assets/crafting/example-body.webp' }],
  complete: 'assets/crafting/example-complete.webp',
  roles: { bark: 'Shaped wooden body' },
  targets: [
    { material: 'bark', part: 'body', at: 220, duration: 520,
      x: .5, y: .5, contact: 'solid' },
  ],
  phases: [
    { at: 0, stage: 'shape', text: 'Wood, finding its shape…' },
    { at: 2450, stage: 'reveal', text: 'Ready for the road.', sound: 'craftStitch' },
  ],
  sceneLabel: 'Wood is shaped into the finished body.',
  pattern: 'made for the road', intro: 'A handful of useful things.',
  finished: 'Made by you, ready to use.',
} satisfies CraftPresentation;
```

- Use the exact item id from gear/tools/potion/meal data. Meals use `pancakes`,
  `tea`, `goojelly`, `stew`; their existing inventory icons use the `meal_` prefix.
- Layer ids are unique within the item and should use lowercase letters/digits/hyphens.
  They are rendered in array order; `part` matches one of those ids.
- Every positive recipe material needs a role and at least one target. Quantities
  are allocated evenly among that material's targets from the actual recipe.
  Do not hardcode ingredient counts in animation metadata.
- Targets carry milliseconds `at`/`duration`, normalized 512-canvas contact points
  `x,y`, and `contact: 'soft' | 'bind' | 'solid' | 'energy'`.
  Optional `sound` is an existing `Sfx` name; do not add shared sound cases.
- Phases have increasing times beginning at zero. Include `stage: 'reveal'` after
  all contacts, leaving time for the final lift before `duration`.
- A layer may use `clip: 'inset(...)'` to reveal separate contacts from one
  registered image. Use separate unique ids for those clips.
- Untargeted bottles/cookware show initially by default. `initial` overrides that
  default; `showAt` schedules steam or other effects in milliseconds; `finished:
  false` hides fuel or temporary supports at reveal and after skip/reduced motion.
- Optional `eyebrow` names another station, such as Granny's kitchen.
- `binding` is a pilot compatibility field. New definitions do not need it.
- Text fields explain the actual materials and construction. The schema describes
  presentation only; persistence, ownership, effects and equip stay in game rules.
- The integration owner runs `bun run scripts/register-crafting.ts` to add finished
  definitions to `src/crafting/catalog.ts` after their assets arrive.

## Blender geometry

Create `art/gear/<id>.py`. The module is imported lazily by the shared hooks, so it
may reuse `lib`, `hero` and `weapons` helpers. Do not import or render on module
initialization. Each builder returns `{layer_id: [bpy objects]}`; include all of its
visible objects, including trim/glow, in the map.

Armor exports `build_armor(P)`. `P` has the existing `root`, `body`, `head`,
`arm-1`, `arm1` pivots. Body origin is at the hero origin; head is `(0,0,.8)`;
arms are `(.29*side,0,.37)` relative to body. Parent cuffs/sleeves to arms so they
follow idle/walk. The custom builder replaces the old torso/sleeves and armor
decorations, retaining hands, face, feet and animation pivots. Optional `HELMET`
controls omission of the starter bangs/sprout (default is the existing armor's
helmet setting). Preview rendering supplies these same empty pivots without skin.

Weapons export `build_weapon(root)`. Keep the grip at the origin and length along
`+X`, within the existing weapon's footprint. Existing length metadata and hero
attachment nodes stay unchanged. All weapon render/model callers use this builder.
Only the preview root rotates `(0,-pi/4,0)` and scales `(1,1.25,1.25)` by default,
matching the existing tilted weapon view. Optional `PREVIEW_ROTATION` and
`PREVIEW_SCALE` override those preview transforms. `CAMERA` anchors are world
coordinates after these transforms. Equipped geometry stays on the grip/+X axis.

Charms, tools, potions and meals export `build_item(root)`. Construct under that
root and return the parts map; icon and workbench rendering share the builder.

Assembly rendering accepts optional `CAMERA = dict(ppu=..., anchor=(x,y,z),
elevation=..., fit_origin=.5)`; elevation is in radians. Every part and complete image uses that
one camera. Optional `ICON_ID` overrides the destination inventory icon (meals
automatically use `meal_<id>`).
Optional `COMPLETE_PARTS` selects component ids present in the completed render and
inventory icon; other components (for example pine cooking fuel) still get their
own registered assembly image. Mark those runtime layers `finished: false` too.

The shared command is `bun run art crafting <id>` (or comma-separated ids).
It renders registered transparent 512×512 PNGs and packs WebPs (quality 100 by
default; optional `WEBP_QUALITY` preserves an item’s reviewed compression budget),
records alpha bounds/centers in `public/assets/crafting/<id>.json`, and writes the
complete piece as the 128×128 inventory icon. Never independently fit or trim
component images. Deliver your individual WebPs, JSON metadata and equipped GLB
outputs; the shared integration owner coordinates atlas regeneration. For a
coordinated partial integration, `blender -b --factory-startup --python-exit-code 1
-P art/pack.py -- --overlay --gathering` appends updated weapon renders and
standalone gathering frames, preserving existing atlas pages byte-for-byte.

## Checks and publication

Keep the Fluffy Vest pilot working. Run typechecking, unit/DOM tests and build.
Shared contract tests check each registered item's shipped files, ingredient
accounting, valid layers/timing and the real recipe. Browser QA verifies complete,
skip, Keep/equip, repeated requests, reduced motion, phone layout and reload.
Check equipped armor idle/walk and weapon hand/grip orientation in a real browser
when available; report any unavailable visual/audio checks honestly.

Work on isolated branches from fresh `dev`. Only the parent grants dev publication
slots. Fetch again before integration, preserve all other contributions, push
without force, verify CI, and do not change `main` or bump versions.
