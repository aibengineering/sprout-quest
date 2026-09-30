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


def pack(item_id="fluffvest", parts=PARTS, icon_id=None):
    import bpy
    import numpy as np
    os.makedirs(DEST, exist_ok=True)
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = 100
    manifest = {'size': [512, 512], 'parts': {}, 'stack': list(parts)}
    for name in (*parts, 'complete'):
        image = bpy.data.images.load(os.path.join(OUT, f'{item_id}-{name}.png'))
        width, height = image.size
        pixels = np.array(image.pixels[:], dtype=np.float32).reshape(height, width, 4)[::-1]
        ys, xs = np.where(pixels[..., 3] > 0)
        if not len(xs):
            raise ValueError(item_id + '-' + name + ': no visible pixels in registered camera')
        if width != 512 or height != 512:
            raise ValueError(item_id + '-' + name + ': components must share a 512-square canvas')
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        image.save_render(os.path.join(DEST, f'{item_id}-{name}.webp'), scene=sc)
        manifest['parts'][name] = {
            'src': f'assets/crafting/{item_id}-{name}.webp',
            'center': [round((x0 + x1) / 1024, 4), round((y0 + y1) / 1024, 4)],
            'bounds': [x0, y0, x1, y1],
        }
        if name == 'complete':
            image.scale(128, 128)
            image.save_render(os.path.join(DEST, '..', 'icons', (icon_id or item_id) + '.webp'), scene=sc)
        bpy.data.images.remove(image)
    with open(os.path.join(DEST, item_id + '.json'), 'w') as file:
        json.dump(manifest, file, indent=2)
        file.write('\n')
    print('PACKED ' + item_id + ' crafting layers and standalone inventory icon')


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
                    elevation=0 if weapon else math.radians(12))
    defaults.update(getattr(item, 'CAMERA', {}))
    # Only registered component objects render. Geometry attached to empty pivots
    # keeps the exact transforms used by the equipped build.
    for name in (*parts, 'complete'):
        for key, objects in parts.items():
            for obj in objects:
                obj.hide_render = (key not in getattr(item, 'COMPLETE_PARTS', parts)) if name == 'complete' else key != name
        lib.render(os.path.join(OUT, f'{item_id}-{name}.png'), 512, 512,
                   fit_origin=.5, **defaults)
        print('RENDERED crafting/' + item_id + '-' + name)
    icon_id = getattr(item, 'ICON_ID', 'meal_' + item_id if item_id in ('pancakes', 'tea', 'goojelly', 'stew') else item_id)
    pack(item_id, tuple(parts), icon_id)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args == ['pack']:
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
