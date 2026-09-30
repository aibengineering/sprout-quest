"""blender -b --factory-startup --python-exit-code 1 -P tests/charm-geometry.py"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(ROOT, 'art'))
import lib
import icons
from gear_parts import item_ids, item_module, preview_parts

IDS = ('clovercharm', 'toothcharm', 'crystalheart', 'impring')
assert not {'_charm_shapes', '_render_charms'} & set(item_ids())
for item_id in IDS:
    lib.reset()
    module = item_module(item_id)
    root, parts = preview_parts(module)
    with open(os.path.join(ROOT, 'public', 'assets', 'crafting', item_id + '.json')) as f:
        manifest = json.load(f)
    assert list(parts) == manifest['stack'], item_id + ': layer order'
    objects = [o for group in parts.values() for o in group]
    assert len(set(objects)) == len(objects), item_id + ': duplicate part objects'
    assert all(parts.values()), item_id + ': empty layer'
    assert set(objects) == set(root.children_recursive), item_id + ': untracked geometry or parenting'
    assert all(o.type == 'MESH' for o in objects), item_id + ': unfinished curve conversion'
    assert module.CAMERA['ppu'] == 445
    lib.clear_objects()
    icon = icons.CHARMS[item_id]()
    assert icon.children_recursive, item_id + ': shared icon hook missed contribution'
    print('PASS', item_id, 'registered layers, complete parenting, shared icon hook', flush=True)
