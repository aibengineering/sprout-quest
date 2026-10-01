#!/usr/bin/env bash
# Regenerates every sprite with Blender, then packs them into public/assets/.
# Usage: bun run art            (all groups, then the 3D character models)
#        bun run art monsters   (one group; the rest are reused from art/out)
#        bun run art models     (just the 3D character models)
#        bun run art crafting   (registered assembly layers and icons [id,id,...])
#        bun run art buildings  (village buildings rising from their materials [id,id,...])
#        bun run art rooms      (the Kitchen's and Sawmill's props and the Garden's tools: their own atlas)
set -euo pipefail
cd "$(dirname "$0")"
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
  "$BLENDER" -b --factory-startup -P models.py -- "${1:-}" 2>&1 | grep -E "EXPORTED|Error|Traceback" || true
  for raw in ../public/assets/models/*.raw.glb; do
    [ -e "$raw" ] || continue
    bunx gltfpack -i "$raw" -o "${raw%.raw.glb}.glb" -cc > /dev/null
    rm "$raw"
  done
  echo "MODELS $(ls ../public/assets/models/*.glb | wc -l) files, $(du -ch ../public/assets/models/*.glb | tail -1 | cut -f1)"
}

if [ "${1:-}" = models ]; then
  models "${2:-}"
  exit 0
fi

crafting() {
  "$BLENDER" -b --factory-startup --python-exit-code 1 -P crafting.py -- "${1:-all}"
}

if [ "${1:-}" = crafting ]; then
  crafting "${2:-all}"
  exit 0
fi

# Village buildings rising from their materials (art/buildings), into public/assets/buildings. Their map sprites and
# menu icons are the same models: re-render those with `bun run art env <names>` and `bun run art icons2 <names>`.
if [ "${1:-}" = buildings ]; then
  "$BLENDER" -b --factory-startup --python-exit-code 1 -P crafting.py -- buildings "${2:-all}"
  exit 0
fi

# The rooms you walk into (Granny's Kitchen, Bram's Sawmill) and the Garden's hand tools: their own atlas, in
# public/assets/rooms/ (the main one is left alone).
if [ "${1:-}" = rooms ]; then
  rm -rf out/rooms out/rooms.json
  render rooms
  "$BLENDER" -b --factory-startup --python-exit-code 1 -P pack.py -- --group rooms 2>&1 | grep -E "PACKED|Error|Traceback"
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

# Registered complete renders remain the canonical icons after atlas packing.
if [ $# -eq 0 ]; then crafting all; fi
