"""Validate each owned tool against the shared Blender hook without rendering.

blender -b --factory-startup --python-exit-code 1 -P tests/crafting/check-gathering-builders.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "art"))
import bpy
import lib
from gear_parts import item_module, preview_parts, item_ids
from gear._gathering_tools import IDS
assert set(IDS).issubset(item_ids()), item_ids()
for item_id in IDS:
    lib.reset()
    module = item_module(item_id)
    root, parts = preview_parts(module)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    supplied = [o for objects in parts.values() for o in objects]
    assert set(meshes) == set(supplied), item_id
    for mesh in supplied:
        ancestors = []
        parent = mesh.parent
        while parent:
            ancestors.append(parent)
            parent = parent.parent
        assert root in ancestors, (item_id, mesh.name)
    assert module.CAMERA['ppu'] == 520
    print('PASS geometry hook', item_id, len(meshes), 'meshes', flush=True)
