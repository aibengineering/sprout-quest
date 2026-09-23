"""Trims rendered frames and packs them into WebP atlases for the game.

Usage: blender -b --factory-startup -P art/pack.py
Reads art/out/*.json, writes public/assets/{atlas-N.webp, atlas.json, icons/*.webp}.
"""
import glob
import json
import os

import bpy
import numpy as np

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, 'out')
DEST = os.path.join(HERE, '..', 'public', 'assets')
PAGE = 2048
PAD = 2


def load(path):
    im = bpy.data.images.load(path)
    w, h = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # top-down rows
    bpy.data.images.remove(im)
    return px


def save(px, path, quality=90):
    h, w = px.shape[:2]
    im = bpy.data.images.new('pack', w, h, alpha=True)
    im.pixels = px[::-1].ravel()
    sc = bpy.context.scene
    s = sc.render.image_settings
    s.file_format = 'WEBP'
    s.color_mode = 'RGBA'
    s.quality = quality
    sc.view_settings.view_transform = 'Standard'
    im.save_render(path, scene=sc)
    bpy.data.images.remove(im)


def trim(px):
    a = px[..., 3] > 0.01
    ys, xs = np.where(a)
    if len(xs) == 0:
        return px[:1, :1], 0, 0
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return px[y0:y1, x0:x1], x0, y0


def main():
    entries = []
    for f in sorted(glob.glob(os.path.join(OUT, '*.json'))):
        entries += json.load(open(f))
    os.makedirs(os.path.join(DEST, 'icons'), exist_ok=True)
    frames, sprites = {}, []
    for e in entries:
        px = load(e['file'])
        if e['name'].startswith('icon/'):
            save(px, os.path.join(DEST, 'icons', e['name'][5:] + '.webp'), quality=92)
            continue
        cut, x0, y0 = trim(px)
        sprites.append((e, cut, e['ax'] - x0, e['ay'] - y0))
    # Shelf packing, tallest first.
    sprites.sort(key=lambda s: (-s[1].shape[0], -s[1].shape[1]))
    pages = [np.zeros((PAGE, PAGE, 4), np.float32)]
    x = y = shelf = 0
    used_h = [0]
    for e, cut, ax, ay in sprites:
        h, w = cut.shape[:2]
        if x + w + PAD > PAGE:
            x, y, shelf = 0, y + shelf + PAD, 0
        if y + h + PAD > PAGE:
            pages.append(np.zeros((PAGE, PAGE, 4), np.float32))
            used_h.append(0)
            x = y = shelf = 0
        pages[-1][y:y + h, x:x + w] = cut
        frames[e['name']] = [len(pages) - 1, int(x), int(y), int(w), int(h), round(float(ax), 1), round(float(ay), 1), e['ppu']]
        used_h[-1] = max(used_h[-1], y + h)
        x += w + PAD
        shelf = max(shelf, h)
    files = []
    for i, p in enumerate(pages):
        name = f'atlas-{i}.webp'
        save(p[:used_h[i] + 1], os.path.join(DEST, name))
        files.append(name)
    with open(os.path.join(DEST, 'atlas.json'), 'w') as f:
        json.dump({'pages': files, 'frames': frames}, f, separators=(',', ':'))
    print(f'PACKED {len(frames)} frames into {len(files)} pages; icons done')


main()
