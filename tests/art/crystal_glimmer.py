"""Blender-only graph/rig check; run with --python-exit-code 1, no renders."""
import importlib
import os
import sys

import bpy

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'art')))
import lib

for item_id in ('crystalsword', 'crystalhammer', 'glimmerwhip', 'glimmerwand'):
    lib.reset()
    root = lib.empty('weapon')
    item = importlib.import_module('gear.' + item_id)
    parts = item.build_weapon(root)
    bpy.context.view_layer.update()
    listed = [obj for objects in parts.values() for obj in objects]
    meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    assert len(listed) == len(set(listed)), 'A mesh belongs to two layers'
    assert set(listed) == set(meshes), 'A visible mesh is absent from the assembly layers'
    assert tuple(parts) == item.PARTS
    assert all(obj.parent is root for obj in listed), 'Attachment origin changed'
    if item_id == 'glimmerwhip':
        for obj in parts['wing-lash']:
            assert min((obj.matrix_world @ vertex.co).x for vertex in obj.data.vertices) > .225, 'Membrane coil survives uncoiling'
        core_max = max((obj.matrix_world @ vertex.co).x for obj in parts['core-anchor'] for vertex in obj.data.vertices)
        assert core_max < .225, 'Core disappears when uncoiled'
    print('PASS geometry layers and attachment graph:', item_id, flush=True)
