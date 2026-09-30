"""Registered transparent pieces for the tactile crafting assembly.

Run: blender -b --factory-startup -P art/crafting.py
All PNGs use one 512-square camera; never independently trim or fit a part. The
same geometry is equipped by hero.build('fluffvest'), so the ingredients remain
visible after crafting. Blender also packs the WebPs; no extra dependencies.

    blender -b --factory-startup -P art/crafting.py
    blender -b --factory-startup -P art/crafting.py -- pack

Pass -- complete to Blender for a fast look at the assembled garment.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, 'out', 'crafting')
DEST = os.path.join(HERE, '..', 'public', 'assets', 'crafting')
PARTS = ('left-panel', 'right-panel', 'left-cuff', 'right-cuff', 'collar', 'goo-seams')
# Village buildings rise on a wider 4:3 canvas and have their own folder (their map icons come from the atlas).
BUILDINGS = os.path.join(HERE, '..', 'public', 'assets', 'buildings')
BUILDING_SIZE = (640, 480)


def pack(item_id="fluffvest", parts=PARTS, icon_id=None, quality=100, src=OUT, dest=DEST, size=(512, 512), icon=True):
    import bpy
    import numpy as np
    os.makedirs(dest, exist_ok=True)
    folder = os.path.basename(os.path.normpath(dest))
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = quality
    manifest = {'size': list(size), 'parts': {}, 'stack': list(parts)}
    for name in (*parts, 'complete'):
        image = bpy.data.images.load(os.path.join(src, f'{item_id}-{name}.png'))
        width, height = image.size
        pixels = np.array(image.pixels[:], dtype=np.float32).reshape(height, width, 4)[::-1]
        ys, xs = np.where(pixels[..., 3] > 0)
        if not len(xs):
            raise ValueError(item_id + '-' + name + ': no visible pixels in registered camera')
        if (width, height) != tuple(size):
            raise ValueError(item_id + '-' + name + f': components must share a {size[0]}x{size[1]} canvas')
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        image.save_render(os.path.join(dest, f'{item_id}-{name}.webp'), scene=sc)
        manifest['parts'][name] = {
            'src': f'assets/{folder}/{item_id}-{name}.webp',
            'center': [round((x0 + x1) / 2 / width, 4), round((y0 + y1) / 2 / height, 4)],
            'bounds': [x0, y0, x1, y1],
        }
        if name == 'complete' and icon:
            image.scale(128, 128)
            image.save_render(os.path.join(dest, '..', 'icons', (icon_id or item_id) + '.webp'), scene=sc)
        bpy.data.images.remove(image)
    with open(os.path.join(dest, item_id + '.json'), 'w') as file:
        json.dump(manifest, file, indent=2)
        file.write('\n')
    print('PACKED ' + item_id + (' crafting layers and standalone inventory icon' if icon else ' assembly layers'))


def render():
    sys.path.insert(0, HERE)
    import bpy
    import hero
    import lib

    lib.reset()
    root = lib.empty('craft_fluffvest')
    parts = hero.build_fluffvest(root)
    sc = bpy.context.scene
    if hasattr(sc, 'eevee'):
        sc.eevee.taa_render_samples = 64
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    names = args or [*PARTS, 'complete']
    for name in names:
        for key, objects in parts.items():
            for obj in objects:
                obj.hide_render = name != 'complete' and key != name
        # Slightly raised frontal camera shows the neck opening and soft thickness.
        # The full garment fits in ~86% of the frame, with enough room for the lift.
        lib.render(os.path.join(OUT, f'fluffvest-{name}.png'), 512, 512, 515,
                   anchor=(0, 0, 0.365), elevation=math.radians(12), fit_origin=0.5)
        print('RENDERED crafting/fluffvest-' + name)


def render_item(item_id):
    """All layers share one camera and the equipped item's component builder."""
    sys.path.insert(0, HERE)
    import bpy
    import lib
    from gear_parts import item_module, preview_parts

    item = item_module(item_id)
    if item is None:
        raise ValueError('No geometry contribution for ' + item_id)
    lib.reset()
    root, parts = preview_parts(item)
    if not parts or any(not objects for objects in parts.values()):
        raise ValueError(item_id + ': every component must contain visible geometry')
    if any(not name or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in name)
           or name == 'complete' for name in parts):
        raise ValueError(item_id + ': component ids must be lowercase letters/digits/hyphens, except complete')
    sc = bpy.context.scene
    if hasattr(sc, 'eevee'):
        sc.eevee.taa_render_samples = 64
    weapon = hasattr(item, 'build_weapon')
    defaults = dict(ppu=240 if weapon else 320, anchor=(.42, 0, .42) if weapon else (0, 0, .55),
                    elevation=0 if weapon else math.radians(12), fit_origin=.5)
    defaults.update(getattr(item, 'CAMERA', {}))
    # Only registered component objects render. Geometry attached to empty pivots
    # keeps the exact transforms used by the equipped build.
    for name in (*parts, 'complete'):
        for key, objects in parts.items():
            for obj in objects:
                obj.hide_render = (key not in getattr(item, 'COMPLETE_PARTS', parts)) if name == 'complete' else key != name
        lib.render(os.path.join(OUT, f'{item_id}-{name}.png'), 512, 512,
                   **defaults)
        print('RENDERED crafting/' + item_id + '-' + name)
    icon_id = getattr(item, 'ICON_ID', 'meal_' + item_id if item_id in ('pancakes', 'tea', 'goojelly', 'stew') else item_id)
    pack(item_id, tuple(parts), icon_id, getattr(item, 'WEBP_QUALITY', 100))


def render_building(building_id):
    """A village building rising from its materials: one shared camera, each layer on its own.

    Unlike gear, a building's parts stand in front of one another, and layers stack in build order. So each layer is
    rendered with the layers already laid as holdouts: what they hide is cut away, and what comes later simply draws
    on top. The stack then matches the complete render, which is also the map sprite (env.SCENERY uses this builder).
    """
    sys.path.insert(0, HERE)
    import bpy
    import buildings
    import lib

    item = buildings.module(building_id)
    if item is None:
        raise ValueError('No building module for ' + building_id)
    lib.reset()
    root = lib.empty('build_' + building_id)
    parts = item.build_building(root)
    if not parts or any(not objects for objects in parts.values()):
        raise ValueError(building_id + ': every layer must contain visible geometry')
    if any(not name or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in name)
           or name == 'complete' for name in parts):
        raise ValueError(building_id + ': layer ids must be lowercase letters/digits/hyphens, except complete')
    sc = bpy.context.scene
    if hasattr(sc, 'eevee'):
        sc.eevee.taa_render_samples = int(os.environ.get('BUILDING_SAMPLES', 64))  # fewer for quick looks
    camera = dict(ppu=80, anchor=(0, 0, 1.2), elevation=lib.ELEVATION, fit_origin=.5)
    camera.update(getattr(item, 'CAMERA', {}))
    names = list(parts)
    for i, name in enumerate((*names, 'complete')):
        for j, key in enumerate(names):
            for obj in parts[key]:
                obj.hide_render = name != 'complete' and j > i
                obj.is_holdout = name != 'complete' and j < i
        lib.render(os.path.join(OUT, 'buildings', f'{building_id}-{name}.png'), *BUILDING_SIZE, **camera)
        print('RENDERED buildings/' + building_id + '-' + name)
    pack(building_id, tuple(names), quality=getattr(item, 'WEBP_QUALITY', 80), src=os.path.join(OUT, 'buildings'),
         dest=BUILDINGS, size=BUILDING_SIZE, icon=False)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args[:1] == ['buildings']:
        sys.path.insert(0, HERE)
        import buildings
        for building_id in (args[1].split(',') if len(args) > 1 and args[1] != 'all' else buildings.ids()):
            render_building(building_id)
    elif args == ['pack']:
        pack()
    elif not args or args == ['all']:
        # Keep the pilot's exact camera and geometry unchanged.
        # "all" includes every installed contribution without a shared registry.
        sys.argv = sys.argv[:sys.argv.index('--')] if '--' in sys.argv else sys.argv
        render()
        pack()
        from gear_parts import item_ids
        for item_id in item_ids():
            if item_id != 'fluffvest':
                render_item(item_id)
    elif args[0] == 'fluffvest':
        sys.argv = sys.argv[:sys.argv.index('--')]
        render()
        pack()
    elif args[0] in (*PARTS, 'complete'):
        render()  # Existing pilot single-layer preview command.
    else:
        for item_id in args[0].split(','):
            render_item(item_id)
