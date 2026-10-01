#!/usr/bin/env bash
# Regenerates every sprite with Blender, then packs them into public/assets/.
# Usage: bun run art            (all groups, then the 3D character models)
#        bun run art monsters   (one group; the rest are reused from art/out)
#        bun run art models     (just the 3D models: characters, armour, weapons and crafting scenes [name,name,...])
#        bun run art crafting   (the crafting scenes' 3D models [id,id,...])
#        bun run art buildings  (the village buildings' 3D models, for their scenes [id,id,...])
#        bun run art icons3d    (inventory icons rendered from the items' 3D models [id,id,...]; no Blender needed)
set -euo pipefail
cd "$(dirname "$0")"

# Gear, tool, potion and meal icons come from their 3D models (scripts/icons3d.ts), so a changed model changes its icon.
#   bun run art icons3d [id,id,...] [--sheet before-after.png]
if [ "${1:-}" = icons3d ]; then
  shift
  exec bun ../scripts/icons3d.ts "$@"
fi
BLENDER="${BLENDER:-blender}"
command -v "$BLENDER" >/dev/null || { echo "Blender not found (set BLENDER=/path/to/blender)"; exit 1; }

render() {
  "$BLENDER" -b --factory-startup -P render_all.py -- "$@" 2>&1 | grep -E "RENDERED|Error|Traceback|File \"" || true
}
export -f render
export BLENDER

# Characters are 3D models for the game's renderer: exported from Blender, then compressed with gltfpack.
#   bun run art models [name,name,...]
models() {
  # (`models -` only packs what's been exported.)
  if [ "${1:-}" != - ]; then
    "$BLENDER" -b --factory-startup -P models.py -- "${1:-}" 2>&1 | grep -E "EXPORTED|Error|Traceback" || true
  fi
  for raw in ../public/assets/models/*.raw.glb ../public/assets/crafting3d/*.raw.glb; do
    [ -e "$raw" ] || continue
    # Armour pieces and crafting layers are found by their node names (they have no animations to keep them): keep them.
    keep=()
    case "$raw" in */armor_*|*/crafting3d/*) keep=(-kn) ;; esac
    bunx gltfpack -i "$raw" -o "${raw%.raw.glb}.glb" -cc "${keep[@]}" > /dev/null
    rm "$raw"
  done
  echo "MODELS $(ls ../public/assets/models/*.glb | wc -l) files, $(du -ch ../public/assets/models/*.glb | tail -1 | cut -f1)"
  if ls ../public/assets/crafting3d/*.glb > /dev/null 2>&1; then
    echo "CRAFTING $(ls ../public/assets/crafting3d/*.glb | wc -l) files, $(du -ch ../public/assets/crafting3d/*.glb | tail -1 | cut -f1)"
  fi
}

if [ "${1:-}" = models ]; then
  models "${2:-}"
  exit 0
fi

# Crafting scenes: every gear, tool, potion and meal as a 3D model of its layers, from the same builders the game wears
# and holds (art/models.py), into public/assets/crafting3d.
#   bun run art crafting [id,id,...]
if [ "${1:-}" = crafting ]; then
  if [ "${2:-all}" = all ]; then models crafts; else models "$(echo "$2" | sed 's/\([^,]*\)/craft_\1/g')"; fi
  exit 0
fi

# Village buildings rising from their materials (art/buildings), as 3D models for their crafting scenes
# (art/building_models.py), into public/assets/crafting3d. Their map sprites and menu icons are the same models:
# re-render those with `bun run art env <names>` and `bun run art icons2 <names>`.
#   bun run art buildings [id,id,...]
buildings() {
  "$BLENDER" -b --factory-startup --python-exit-code 1 -P building_models.py -- "${1:-all}" 2>&1 | grep -E "EXPORTED|Error|Traceback|File \"" || true
  models -
}

if [ "${1:-}" = buildings ]; then
  buildings "${2:-all}"
  exit 0
fi

if [ $# -eq 2 ]; then
  # A single item within a group (e.g. `bun run art monsters kingslime`): keep the rest of the group.
  render "$@"
elif [ $# -eq 1 ]; then
  rm -rf "out/$1" out/"$1".*json out/"$1".json
  render "$@"
else
  rm -rf out
  # The hero is the biggest job, so split it per armor and run everything a few at a time.
  jobs=(monsters weapons env icons icons2 npc gather)
  for a in tunic fluffvest barkvest shroomhood coppermail batcloak ironplate glimmershawl crystalmail magmamail dragonmail; do jobs+=("hero $a"); done
  printf '%s\n' "${jobs[@]}" | xargs -P "${ART_JOBS:-3}" -I{} bash -c 'render {}'
  models
fi
PACK_ARGS=()
if [ $# -gt 0 ]; then PACK_ARGS=(-- --incremental); fi
"$BLENDER" -b --factory-startup --python-exit-code 1 -P pack.py "${PACK_ARGS[@]}" 2>&1 | grep -E "PACKED|Error|Traceback"

if [ $# -eq 0 ]; then buildings all; fi
# Packing rewrites the icons from art/out; the model icons are always redrawn from their models after it.
bun ../scripts/icons3d.ts
