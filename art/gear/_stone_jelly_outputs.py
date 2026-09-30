"""Rebuild only the four meadow weapons; never packs or edits shared atlases.

blender -b --factory-startup --python-exit-code 1 -P art/gear/_stone_jelly_outputs.py
blender -b --factory-startup --python-exit-code 1 -P art/gear/_stone_jelly_outputs.py -- models

The shared generator can call each gear.<id>.build_weapon(root) directly. Layers keep
the exact complete model camera, including its untrimmed 512-square bounds.
"""
import importlib
import json
import math
import os
import runpy
import sys

ART = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ART)
IDS = ('stonesword', 'stonehammer', 'jellywhip', 'jellywand')
DEST = os.path.join(ART, '..', 'public', 'assets')
OUT = os.path.join(ART, 'out', 'stone-jelly')


def models():
    # Reuse the canonical vertex-color exporter without copying or changing it.
    # Lazy import ensures lib.toon's tags are installed before geometry binds it.
    import weapons
    for wid in IDS:
        weapons.WEAPONS[wid] = (lambda root, wid=wid: importlib.import_module(f'gear.{wid}').build_weapon(root), weapons.WEAPONS[wid][1])
    sys.argv = ['models.py', '--', ','.join(f'wpn_{wid}' for wid in IDS)]
    runpy.run_path(os.path.join(ART, 'models.py'), run_name='__main__')


def save_webp(png, dest):
    import bpy
    import numpy as np
    image = bpy.data.images.load(png, check_existing=False)
    width, height = image.size
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(height, width, 4)[::-1]
    ys, xs = np.where(pixels[..., 3] > 0)
    bounds = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    sc = bpy.context.scene
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = 100
    image.save_render(dest, scene=sc)
    bpy.data.images.remove(image)
    sc.render.image_settings.file_format = 'PNG'
    return {'src': os.path.relpath(dest, os.path.dirname(DEST)),
            'center': [round((bounds[0] + bounds[2]) / (width * 2), 4),
                       round((bounds[1] + bounds[3]) / (height * 2), 4)], 'bounds': bounds}


def render(wid):
    import bpy
    import lib
    import weapons
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(os.path.join(DEST, 'crafting'), exist_ok=True)
    lib.reset()
    root = lib.empty('weapon')
    legacy = {
        'stonesword': lambda root: weapons.metal_sword(root, 'stone', 1),
        'stonehammer': lambda root: weapons.metal_hammer(root, 'stone', 1),
        'jellywhip': lambda root: weapons.whip(root, '#6fdc7a', '#ffb4c8', '#8a5a8a'),
        'jellywand': lambda root: weapons.wand(root, '#8a5a8a', 'jelly'),
    }
    legacy[wid](root)
    lib.render_fit(os.path.join(OUT, f'{wid}-before.png'), 512, elevation=0)

    lib.reset()
    module = importlib.import_module(f'gear.{wid}')
    root = lib.empty('weapon')
    parts = module.build_weapon(root)
    sc = bpy.context.scene
    sc.eevee.taa_render_samples = 32
    # Fit complete once, then render every layer using this registered camera.
    complete = os.path.join(OUT, f'{wid}-complete.png')
    lib.render(complete, 512, 512, fit_origin=.5, **module.CAMERA)
    manifest = {'size': [512, 512], 'parts': {}, 'stack': list(parts)}
    manifest['parts']['complete'] = save_webp(complete, os.path.join(DEST, 'crafting', f'{wid}-complete.webp'))
    for name, objects in parts.items():
        for all_objects in parts.values():
            for obj in all_objects:
                obj.hide_render = obj not in objects
        png = os.path.join(OUT, f'{wid}-{name}.png')
        sc.render.filepath = png
        bpy.ops.render.render(write_still=True)
        manifest['parts'][name] = save_webp(png, os.path.join(DEST, 'crafting', f'{wid}-{name}.webp'))
    with open(os.path.join(DEST, 'crafting', f'{wid}.json'), 'w') as file:
        json.dump(manifest, file, indent=2)
        file.write('\n')

    for objects in parts.values():
        for obj in objects:
            obj.hide_render = False
    # Shared contract: the inventory icon is the same registered completed piece.
    image = bpy.data.images.load(complete, check_existing=False)
    image.scale(128, 128)
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.quality = 100
    image.save_render(os.path.join(DEST, 'icons', f'{wid}.webp'), scene=sc)
    bpy.data.images.remove(image)
    sc.render.image_settings.file_format = 'PNG'
    # Parent packs this canonical item sprite into its exclusively owned atlas.
    root.rotation_euler = (0, 0, 0)
    root.scale = (1, 1.4, 1.4)
    width = int((module.LENGTH + .7) * 100)
    sprite = os.path.join(ART, 'out', 'weapons', f'wpn__{wid}.png')
    ax, ay = lib.render(sprite, width, 200, 100, elevation=0,
                        fit_origin=.5, fit_x=.3 / (module.LENGTH + .7) + .02)
    with open(os.path.join(OUT, f'{wid}-sprite.json'), 'w') as file:
        json.dump({'name': f'wpn/{wid}', 'file': sprite, 'ax': ax, 'ay': ay, 'ppu': 100}, file)
    print('RENDERED item-specific layers/icon/sprite:', wid)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args == ['models']:
        models()
    else:
        for wid in args or IDS:
            if wid not in IDS:
                raise ValueError(wid)
            render(wid)
