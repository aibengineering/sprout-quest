"""Render only this owned family's registered layers/icons/swing frames.

    blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_gathering_tools.py
    ... -- axe1,pick1                  # subset

Does not write an aggregate atlas or shared registry. The coordinator can call
gear.<id>.build() from the full generation pipeline, using this same geometry.
"""
import importlib
import json
import math
import os
import sys
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ART))
import bpy
import numpy as np
import lib
from gear._gathering_tools import IDS

OUT = ART / 'out' / 'gathering-tools'
DEST = ART.parent / 'public' / 'assets'


def save_webp(png, dest, size=None):
    image = bpy.data.images.load(str(png))
    sc = bpy.context.scene
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = 92
    w, h = image.size
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    ys, xs = np.where(pixels[..., 3] > 0)
    bounds = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    if size:
        image.scale(*size)
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save_render(str(dest), scene=sc)
    bpy.data.images.remove(image)
    return bounds


def render(item_id):
    lib.reset()
    built = importlib.import_module('gear.' + item_id).build()
    parts = built['parts']
    sc = bpy.context.scene
    sc.eevee.taa_render_samples = 32
    manifest = {'size': [512, 512], 'stack': list(parts), 'existing': built['existing'], 'parts': {}}
    # One fixed camera and canvas across every part. Do not fit pieces separately.
    for name in [*parts, 'complete']:
        for key, objects in parts.items():
            for obj in objects:
                obj.hide_render = name != 'complete' and key != name
        sc.render.image_settings.file_format = 'PNG'
        png = OUT / f'{item_id}-{name}.png'
        lib.render(str(png), 512, 512, 520, anchor=(0, 0, .39), elevation=math.radians(8), fit_origin=.5)
        webp = DEST / 'crafting' / f'{item_id}-{name}.webp'
        bounds = save_webp(png, webp)
        manifest['parts'][name] = {'src': f'assets/crafting/{item_id}-{name}.webp', 'bounds': bounds,
                                 'center': [round((bounds[0] + bounds[2]) / 1024, 4), round((bounds[1] + bounds[3]) / 1024, 4)]}
        if name == 'complete':
            save_webp(png, DEST / 'icons' / f'{item_id}.webp', (128, 128))
    (DEST / 'crafting' / f'{item_id}.json').write_text(json.dumps(manifest, indent=2) + '\n')
    # Gathering matches its established canvas, camera, pixel scale and grip.
    # Standalone frame is deliberately not packed here: shared owner registers it.
    for objects in parts.values():
        for obj in objects:
            obj.hide_render = False
    sc.render.image_settings.file_format = 'PNG'
    png = OUT / f'{item_id}-swing.png'
    ax, ay = lib.render(str(png), 220, 260, 240, elevation=0, fit_origin=.92)
    save_webp(png, DEST / 'gather' / f'{item_id}.webp')
    (DEST / 'gather' / f'{item_id}.json').write_text(json.dumps({'name': 'gather/' + item_id,
        'src': f'assets/gather/{item_id}.webp', 'size': [220, 260], 'ax': ax, 'ay': ay, 'ppu': 240,
        'grip': list(built['grip']), 'tip': list(built['tip'])}, indent=2) + '\n')
    print('RENDERED gathering tool ' + item_id, flush=True)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args == ['pack']:
        for png in sorted(OUT.glob('*.png')):
            item_id, name = png.stem.split('-', 1)
            save_webp(png, DEST / ('gather' if name == 'swing' else 'crafting') / (item_id + '.webp' if name == 'swing' else png.stem + '.webp'))
            if name == 'complete':
                save_webp(png, DEST / 'icons' / f'{item_id}.webp', (128, 128))
    else:
        for item_id in args[0].split(',') if args else IDS:
            render(item_id)
