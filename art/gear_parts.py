"""Isolated gear contributions shared by equipped geometry, icons and assembly art.

An item lives in gear/<id>.py. Import lazily so builders can reuse hero/weapons
helpers without a circular initialization dependency. Missing contributions keep
the existing model; errors in present modules must surface rather than be hidden.
"""
from functools import lru_cache
import importlib
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
        return root, item.build_armor(pivots)
    builder = getattr(item, 'build_weapon', None) or item.build_item
    return root, builder(root)


def item_icon(item_id):
    from lib import empty
    item = item_module(item_id)
    root = empty('icon_' + item_id)
    item.build_item(root)
    return root
