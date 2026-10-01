"""Check exported item topology without rendering or modifying any canonical asset.

blender -b --factory-startup --python-exit-code 1 -P tests/crafting-items/consumables-geometry.py
"""
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'art'))
import bpy
import gear_parts
import lib

IDS = ('jellypot','shroombrew','embertonic','pancakes','tea','goojelly','stew','rockcandy')
for item_id in IDS:
    lib.reset()
    module = gear_parts.item_module(item_id)
    assert callable(module.build_item)
    root, parts = gear_parts.preview_parts(module)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    mapped = [o for group in parts.values() for o in group]
    assert len(set(mapped)) == len(mapped), item_id+' has a mesh in multiple layers'
    assert set(meshes) == set(mapped), item_id+' has a visible mesh missing from the layer map'
    for mesh in mapped:
        assert mesh.type == 'MESH' and len(mesh.data.polygons), item_id+' has an empty layer'
        assert mesh.parent == root, item_id+' has an unparented part'
        assert all(math.isfinite(v) for v in mesh.location), item_id+' has invalid coordinates'
    if item_id == 'stew':
        # The fuel is a layer of its own, so the scene can leave it on the bench (src/crafting/items/stew.ts).
        assert 'pine-fuel' in parts
    print('CHECKED', item_id, len(meshes), 'meshes', flush=True)
assert not any(name.startswith('_') for name in gear_parts.item_ids())
print('All seven consumable geometry contracts passed', flush=True)
