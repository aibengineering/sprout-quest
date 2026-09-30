"""Scoped charm preview/layer renderer, without changing aggregate atlases.

Run: blender -b --factory-startup --python-exit-code 1 -P art/gear/render_charms.py
Pass -- <id> [complete] to inspect one charm. All parts keep one fixed camera.
The coordinator may call each gear.<id>.build from the aggregate art pipeline.
"""
import importlib
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, HERE)
import bpy
import numpy as np
import lib

IDS = ('clovercharm', 'toothcharm', 'crystalheart', 'impring')
DEST = os.path.join(HERE, '..', 'public', 'assets', 'crafting')
OUT = os.path.join(HERE, 'out', 'charm-crafting')


def render(item_id, complete_only=False):
    lib.reset()
    module = importlib.import_module('gear.' + item_id)
    parts = module.build_item(lib.empty(item_id))
    sc = bpy.context.scene
    sc.eevee.taa_render_samples = 32
    # 1.15 world-unit canvas, identical camera for all parts of each charm.
    # Fixed origin .5 makes target centers usable directly by the runtime.
    names = ['complete'] if complete_only else [*parts, 'complete']
    manifest = {'size': [512, 512], 'parts': {}, 'stack': list(parts)}
    os.makedirs(DEST, exist_ok=True)
    for name in names:
        for key, objects in parts.items():
            for obj in objects:
                obj.hide_render = name != 'complete' and key != name
        path = os.path.join(OUT, f'{item_id}-{name}.png')
        lib.render(path, 512, 512, **module.CAMERA, fit_origin=.5)
        image = bpy.data.images.load(path)
        pixels = np.array(image.pixels[:], dtype=np.float32).reshape(512, 512, 4)[::-1]
        ys, xs = np.where(pixels[..., 3] > .01)
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1
        sc.render.image_settings.file_format = 'WEBP'
        sc.render.image_settings.quality = 100
        image.save_render(os.path.join(DEST, f'{item_id}-{name}.webp'), scene=sc)
        sc.render.image_settings.file_format = 'PNG'
        manifest['parts'][name] = {'src': f'assets/crafting/{item_id}-{name}.webp', 'center': [round((x0+x1)/1024, 4), round((y0+y1)/1024, 4)], 'bounds': [x0, y0, x1, y1]}
        if name == 'complete':
            image.scale(128, 128)
            sc.render.image_settings.file_format = 'WEBP'
            image.save_render(os.path.join(DEST, '..', 'icons', f'{item_id}.webp'), scene=sc)
            sc.render.image_settings.file_format = 'PNG'
        bpy.data.images.remove(image)
        print(f'RENDERED {item_id}/{name}', flush=True)
    if not complete_only:
        with open(os.path.join(DEST, item_id + '.json'), 'w') as f:
            json.dump(manifest, f, indent=2)
            f.write('\n')


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    for item_id in ([args[0]] if args else IDS):
        if item_id not in IDS:
            raise ValueError('Unknown charm: ' + item_id)
        render(item_id, 'complete' in args)
