"""Trims rendered frames and packs them into WebP atlases for the game.

Usage: blender -b --factory-startup -P art/pack.py
Reads art/out/*.json, writes public/assets/{atlas-N.webp, atlas.json, icons/*.webp}.
"""
import glob
import json
import os
import sys

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


# Characters (the hero, villagers and monsters) are 3D models in the game (art/models.py), so their rendered sprites
# stay in art/out as reference but aren't shipped. Everything shipped is squeezed hard: flat cel-shaded art hides WebP
# artefacts well.
NOT_SHIPPED = ('hero/', 'mon/', 'npc/')
ATLAS_QUALITY = 78
ICON_QUALITY = 85
INCREMENTAL = '--incremental' in sys.argv


def save(px, path, quality=ATLAS_QUALITY):
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
    # Newest render wins: partial re-renders (e.g. `bun run art env grass_cave`) override older full ones, and each
    # frame is packed once.
    latest = {}
    for f in sorted(glob.glob(os.path.join(OUT, '*.json')), key=os.path.getmtime):
        for e in json.load(open(f)):
            latest[e['name']] = e
    entries = list(latest.values())
    os.makedirs(os.path.join(DEST, 'icons'), exist_ok=True)
    frames, sprites = {}, []
    for e in entries:
        if e['name'].startswith(NOT_SHIPPED):
            continue
        px = load(e['file'])
        if e['name'].startswith('icon/'):
            save(px, os.path.join(DEST, 'icons', e['name'][5:] + '.webp'), quality=ICON_QUALITY)
            continue
        cut, x0, y0 = trim(px)
        sprites.append((e, cut, e['ax'] - x0, e['ay'] - y0))
    # Isolated gear worktrees do not have every historical art/out render. Preserve
    # unchanged shipped scenery/sprites when packing just one group or item.
    atlas_path = os.path.join(DEST, 'atlas.json')
    if INCREMENTAL and os.path.isfile(atlas_path):
        previous = json.load(open(atlas_path))
        updated = {e['name'] for e, _, _, _ in sprites}
        old_pages = {}
        for name, frame in previous['frames'].items():
            if name in updated:
                continue
            page, x, y, w, h, ax, ay, ppu = frame
            if page not in old_pages:
                old_pages[page] = load(os.path.join(DEST, previous['pages'][page]))
            cut = old_pages[page][y:y + h, x:x + w].copy()
            sprites.append(({'name': name, 'ppu': ppu}, cut, ax, ay))
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


if __name__ == '__main__':
    main()
