# Gathering tool contribution

Owned recipes: `axe1`, `axe2`, `pick1`, `pick2`, `pick3`, `pick4`.

Recipe costs, gathering power, skill gates and drops are unchanged.

| Recipe | Existing parts | New visible material roles | Automatic bench sequence |
| --- | --- | --- | --- |
| Stone Axe | Oswin's worn stone head and wooden haft | 2 goo seat the head; 1 fluff makes grip and securing wrap | Existing tool waits on bench → goo flexes into joint → fluff winds grip and head wrap → repaired tool settles |
| Stone Pick | Oswin's worn stone head and wooden haft | 2 goo seat the head; 2 fluff make grip and securing wrap | Existing tool waits on bench → goo flexes into joint → one fluff winds grip and one winds head wrap → repaired tool settles |
| Copper Axe | None | 4 bark form a ridged haft; 3 copper form head and socket | Bark presses into haft → copper presses into blade/socket → head seats with a restrained tap |
| Copper Pick | None | 3 bark form a ridged haft; 4 copper form head and socket | Bark presses into haft → copper curves into pick head/socket → head seats with a restrained tap |
| Iron Pick | None | 3 pine form a warm grained shaft; 4 iron form head/socket | Pine slides into shaft → iron presses into head/socket → firm seat and settle |
| Crystal Pick | None | 3 iron form shaft and collar; 4 crystal form broad faceted working head | Iron forms shaft → crystal facets join across head → iron collar seats → brief clear reveal |

The Crystal Pick has an iron shaft and forged iron grip because its recipe has no wood or leather. Stone repairs preserve inherited material rather than displaying flights of unlisted stone/wood. No balance proposal is needed to support these designs.

## Generation

Run from the repository root:

```sh
blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_gathering_tools.py
```

Optional subset: append `-- axe1,pick1`. Each `art/gear/<id>.py` has an isolated `build_item(root)` entrypoint following the shared contract; `build(parent=None)` also supplies owned swing-render metadata. The family's helper returns `root`, `parts`, `existing`, `grip` and `tip`. Shared pipeline hooks should reuse the geometry rather than copy its primitives.

All assembly parts use one fixed 512×512 camera per tool. Their `<id>.json` records centers/bounds and existing parts. Icon outputs are 128×128. Standalone gathering frames are 220×260 at the established 240 pixels/unit, grip at `(110,239.2)`, and share the existing tool contact geometry.

## Shared hooks required

- Treat a layer without an ingredient target as a pre-existing visible bench part (`existing-tool` for stone repairs).
- Register the six assembly definitions in the shared crafting registry.
- Open the automatic assembly after the existing `craftTool` transaction is saved, from both Forge Craft and Bag Mend. Keep that transaction guarded by the shared craft mutex; skip/reduced motion/reload must never charge again.
- Register `public/assets/gather/<id>.webp` as replacements for `gather/<id>`, using their per-item frame JSON, or pack these six canonical images through the shared aggregate packer. This contribution does not regenerate or edit the atlas.
- Route the six tool icon builders to the same per-item geometry so a later full art build retains the recipe-led design.
- Existing tools are visible in gathering close-ups. They are not attached to the overworld hero or treated as combat weapons. No hero attachment rig is added by this contribution.

## Verification record

Scaffold merged from `f71d591`; baseline `ab09e97` and the intervening matched-roll browser fix are preserved.

- `bun run typecheck`: passed.
- `bun test`: 197 passed, 0 failed. This includes 6 owned contract/asset tests (570 assertions), recipe accounting, contact bounds, visible destinations, increasing phases and a reveal after every contact.
- `bun run build`: passed, 1013.3 KiB JavaScript (definitions await shared catalog registration).
- `CHROMIUM_PATH=/usr/bin/chromium bun tests/crafting/gathering-tools-preview.ts`: all six tools passed at 320×720, at rest and during strikes, with no horizontal overflow or page errors. This uses a local atlas route override to preview the standalone frames through the real `GatherView`; production registration is still the shared owner's hook.
- Existing browser smoke: Iron Pick mines Glimmer Hollow crystal, slowly: passed. Tree falls and rock breaks through harvest: passed.
- Blender shared-hook check: every tool's `build_item(root)` supplies every visible mesh, all parented beneath its supplied root. Mesh counts 10–17 per tool. Helpers are underscore-prefixed so shared module discovery sees only actual item ids.
- Shipped family image/JSON bytes 190,365 (186 KiB), of which images are 183,636 bytes (179 KiB), with the largest registered layer under 12 KiB. Images use quality 92 WebP; each frame is decoded/validated as its specified dimensions. The owned tests cap image bytes at 300 KiB and any layer at 40 KiB.

Local, untracked QA images `gathering-tools-before-after.png` and `gathering-tools-equipped.jpg` compare finished art and show all six tool sprites at phone width. They are not published reference deliverables. Full rest/strike screenshots are reproducibly generated under `tests/e2e/out/gathering-tools/`.

Tool sprites are inspected in game; there is no existing hero attachment rig for gathering tools. No combat weapon or hero rig changes, GLB outputs, or balance changes are included. Audio and complete/skip/reduced-motion/reload crafting browser checks require the coordinator's generic playback and saved-tool hooks; these cannot be claimed from the data modules alone.
