"""Registered transparent Fluffy Vest pieces for the tactile Forge assembly.

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


def pack():
    import bpy
    import numpy as np
    os.makedirs(DEST, exist_ok=True)
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = 100
    manifest = {'size': [512, 512], 'parts': {}, 'stack': list(PARTS)}
    for name in (*PARTS, 'complete'):
        image = bpy.data.images.load(os.path.join(OUT, f'fluffvest-{name}.png'))
        width, height = image.size
        pixels = np.array(image.pixels[:], dtype=np.float32).reshape(height, width, 4)[::-1]
        ys, xs = np.where(pixels[..., 3] > 0)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
        image.save_render(os.path.join(DEST, f'fluffvest-{name}.webp'), scene=sc)
        manifest['parts'][name] = {
            'src': f'assets/crafting/fluffvest-{name}.webp',
            'center': [round((x0 + x1) / 1024, 4), round((y0 + y1) / 1024, 4)],
            'bounds': [x0, y0, x1, y1],
        }
        if name == 'complete':
            image.scale(128, 128)
            image.save_render(os.path.join(DEST, '..', 'icons', 'fluffvest.webp'), scene=sc)
        bpy.data.images.remove(image)
    with open(os.path.join(DEST, 'fluffvest.json'), 'w') as file:
        json.dump(manifest, file, indent=2)
        file.write('\n')
    print('PACKED Fluffy Vest crafting layers and standalone inventory icon')


def render():
    sys.path.insert(0, HERE)
    import bpy
    import hero
    import lib

    lib.reset()
    root = lib.empty('craft_fluffvest')
    parts = hero.build_fluffvest(root)
    sc = bpy.context.scene
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


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args == ['pack']:
        pack()
    else:
        render()
        if not args:
            pack()
