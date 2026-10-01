"""Village buildings, one module per project level (<project><level>.py), split into the materials that build them.

Each module exports `build_building(root)` returning `{layer_id: [bpy objects]}` in build order, and `CAMERA`. The
map sprite (env.SCENERY), the assembly layers (`bun run art buildings`) and the 3D scene models (`... --glb`) share that
one builder, so the finished building on the map is the scene's final frame. A level's `base` layer is what
already stood before the upgrade.
"""
import importlib
import os


def module(building_id):
    path = os.path.join(os.path.dirname(__file__), building_id + '.py')
    return importlib.import_module('buildings.' + building_id) if os.path.isfile(path) else None


def ids():
    folder = os.path.dirname(__file__)
    return sorted(name[:-3] for name in os.listdir(folder) if name.endswith('.py') and not name.startswith('_'))


def whole(building_id):
    """The finished building as one model, for the map sprite and the menu icon."""
    from lib import empty
    root = empty(building_id)
    module(building_id).build_building(root)
    return root
