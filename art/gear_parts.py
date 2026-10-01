"""Isolated gear contributions shared by equipped geometry, icons and assembly art.

An item lives in gear/<id>.py. Import lazily so builders can reuse hero/weapons
helpers without a circular initialization dependency. Missing contributions keep
the existing model; errors in present modules must surface rather than be hidden.
"""
from functools import lru_cache
import importlib
import math
import os


@lru_cache(maxsize=None)
def item_module(item_id):
    path = os.path.join(os.path.dirname(__file__), 'gear', item_id + '.py')
    return importlib.import_module('gear.' + item_id) if os.path.isfile(path) else None


def item_ids():
    folder = os.path.join(os.path.dirname(__file__), 'gear')
    if not os.path.isdir(folder):
        return []
    return sorted(name[:-3] for name in os.listdir(folder)
                  if name.endswith('.py') and not name.startswith('_'))


def preview_parts(item):
    """The same builder on the same pivots as equipped art, without the person."""
    from lib import empty
    root = empty('craft_' + item.__name__.split('.')[-1])
    if hasattr(item, 'build_armor'):
        body = empty('bodyPivot', root)
        pivots = {'root': root, 'body': body, 'head': empty('head', body, (0, 0, .8))}
        for side in (-1, 1):
            pivots['arm' + str(side)] = empty('arm' + str(side), body, (.29 * side, 0, .37))
        parts = item.build_armor(pivots)
        settle_head(body, pivots['head'])
        return root, parts
    weapon = hasattr(item, 'build_weapon')
    builder = getattr(item, 'build_weapon', None) or item.build_item
    parts = builder(root)
    if weapon:
        root.rotation_euler = getattr(item, 'PREVIEW_ROTATION', (0, -math.pi / 4, 0))
        root.scale = getattr(item, 'PREVIEW_SCALE', (1, 1.25, 1.25))
    return root, parts


def settle_head(body, head, overlap=.03):
    """Worn, a helmet sits on the hero's head; on the bench there's no head, so it would float a head's height above
    the armour. Lowers the head pivot until the helmet (the biggest piece on the head) rests on the top of the rest,
    so the piece reads as one: anything hanging from the helmet (a hood's cowl) tucks into the body."""
    import bpy
    from mathutils import Vector
    bpy.context.view_layer.update()

    def corners(o):
        return [o.matrix_world @ Vector(c) for c in o.bound_box]

    def volume(o):
        pts = corners(o)
        return math.prod(max(p[i] for p in pts) - min(p[i] for p in pts) for i in range(3))

    on_head = [o for o in head.children_recursive if o.type == 'MESH']
    rest = [p.z for o in body.children_recursive if o.type == 'MESH' and o not in on_head for p in corners(o)]
    if not on_head or not rest:
        return
    rim = min(p.z for p in corners(max(on_head, key=volume)))
    if rim > max(rest) - overlap:
        head.location.z -= rim - (max(rest) - overlap)


def item_icon(item_id):
    from lib import empty
    item = item_module(item_id)
    root = empty('icon_' + item_id)
    item.build_item(root)
    return root
