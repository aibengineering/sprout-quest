"""Check exported item topology without rendering or modifying any canonical asset.

blender -b --factory-startup --python-exit-code 1 -P tests/crafting-items/consumables-geometry.py
"""
import json
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'art'))
import bpy
import gear_parts
import lib

IDS = ('jellypot','shroombrew','embertonic','pancakes','tea','goojelly','stew')
for item_id in IDS:
    lib.reset()
    module = gear_parts.item_module(item_id)
    assert callable(module.build_item)
    root, parts = gear_parts.preview_parts(module)
    expected = json.load(open(os.path.join(ROOT,'public','assets','crafting',item_id+'.json')))
    assert set(parts) == set(expected['stack']), item_id
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    mapped = [o for group in parts.values() for o in group]
    assert len(set(mapped)) == len(mapped), item_id+' has a mesh in multiple layers'
    assert set(meshes) == set(mapped), item_id+' has a visible mesh missing from the layer map'
    for mesh in mapped:
        assert mesh.type == 'MESH' and len(mesh.data.polygons), item_id+' has an empty layer'
        assert mesh.parent == root, item_id+' has an unparented part'
        assert all(math.isfinite(v) for v in mesh.location), item_id+' has invalid coordinates'
    assert module.WEBP_QUALITY == expected['webpQuality'] == 92
    assert module.CAMERA['ppu'] == expected['camera']['ppu']
    assert module.CAMERA['anchor'] == tuple(expected['camera']['anchor'])
    assert math.isclose(module.CAMERA['elevation'], math.radians(expected['camera']['elevation']))
    if item_id == 'stew':
        assert 'pine-fuel' not in module.COMPLETE_PARTS
        assert all(part in parts for part in module.COMPLETE_PARTS)
    print('CHECKED', item_id, len(meshes), 'meshes', flush=True)
assert not any(name.startswith('_') for name in gear_parts.item_ids())
print('All seven consumable geometry contracts passed', flush=True)
