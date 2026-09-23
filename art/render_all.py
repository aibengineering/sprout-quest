"""Renders one group of sprites to art/out/<group>/ plus art/out/<group>.json (frame anchors).

Usage: blender -b --factory-startup -P art/render_all.py -- <group> [filter]
Groups: hero, monsters, weapons, env, icons
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import env  # noqa: E402
import hero  # noqa: E402
import icons  # noqa: E402
import lib  # noqa: E402
import monsters  # noqa: E402
import weapons  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
GROUP = args[0]
ONLY = args[1] if len(args) > 1 else None
OUT = os.path.join(os.path.dirname(__file__), 'out')
frames = []

# Hero facing angles: S, SE, E, NE, N (west-facing frames are mirrored in-game).
HERO_DIRS = [0, 45, 90, 135, 180]
MONSTER_YAW = 25
CHUNKY = 1.4  # weapons are exaggerated perpendicular to their length so they read at small sizes


def shot(name, w, h, ppu, **kw):
    path = os.path.join(OUT, GROUP, name.replace('/', '__') + '.png')
    ax, ay = lib.render(path, w, h, ppu, **kw)
    frames.append({'name': name, 'file': path, 'ax': ax, 'ay': ay, 'ppu': ppu})


def wanted(key):
    return ONLY is None or key == ONLY


lib.reset()

if GROUP == 'hero':
    for armor in hero.ARMORS:
        if not wanted(armor):
            continue
        lib.clear_objects()
        P = hero.build(armor)
        for d, ang in enumerate(HERO_DIRS):
            P['root'].rotation_euler = (0, 0, math.radians(ang))
            hero.pose(P, 0, False)
            shot(f'hero/{armor}/{d}/0', 200, 200, 80)
            for f in range(4):
                hero.pose(P, f / 4 + 0.125, True)
                shot(f'hero/{armor}/{d}/{f + 1}', 200, 200, 80)

elif GROUP == 'monsters':
    for kind in monsters.BUILDERS:
        if not wanted(kind):
            continue
        for gold in (False, True):
            if gold and kind == 'dragon':
                continue
            lib.clear_objects()
            P, anim = monsters.build(kind, gold)
            P['root'].rotation_euler = (0, 0, math.radians(MONSTER_YAW))
            size = (520, 460) if kind == 'dragon' else (240, 240)
            for f in range(6):
                anim(P, f / 6)
                shot(f"mon/{kind}{'_gold' if gold else ''}/{f}", *size, 80)

elif GROUP == 'weapons':
    for wid, (fn, length) in weapons.WEAPONS.items():
        if not wanted(wid):
            continue
        lib.clear_objects()
        root = lib.empty('w')
        fn(root)
        root.scale = (1, CHUNKY, CHUNKY)
        w = int((length + 0.7) * 100)
        shot(f'wpn/{wid}', w, 200, 100, elevation=0, fit_origin=0.5, fit_x=0.3 / (length + 0.7) * 1.0 + 0.02)

elif GROUP == 'env':
    for name, (fn, w, h) in env.SCENERY.items():
        if not wanted(name):
            continue
        lib.clear_objects()
        fn()
        shot(f'env/{name}', int(w * 1.3), int(h * 1.25), 64, fit_origin=0.86)

elif GROUP == 'icons':
    # Weapons tilted diagonally, centered.
    for wid, (fn, length) in weapons.WEAPONS.items():
        if not wanted(wid):
            continue
        lib.clear_objects()
        root = lib.empty('w')
        fn(root)
        root.scale = (1, CHUNKY, CHUNKY)
        root.rotation_euler = (0, -math.pi / 4, 0)
        mid = length / 2 - 0.1
        shot(f'icon/{wid}', 128, 128, 118 / (length * 0.8 + 0.2), anchor=(mid * 0.707, 0, mid * 0.707), elevation=0, fit_origin=0.5)
    for armor in hero.ARMORS:
        if not wanted(armor):
            continue
        lib.clear_objects()
        P = hero.build(armor)
        P['root'].rotation_euler = (0, 0, math.radians(15))
        hero.pose(P, 0, False)
        shot(f'icon/{armor}', 128, 128, 88, anchor=(0, 0, 0.64), elevation=math.radians(12), fit_origin=0.5)
    for name, fn in {**icons.CHARMS, **icons.MATERIALS}.items():
        if not wanted(name):
            continue
        lib.clear_objects()
        fn()
        shot(f'icon/{name}', 128, 128, 120, elevation=math.radians(12), fit_origin=0.5)

else:
    raise SystemExit(f'unknown group {GROUP}')

suffix = f'.{ONLY}' if ONLY else ''
with open(os.path.join(OUT, f'{GROUP}{suffix}.json'), 'w') as f:
    json.dump(frames, f, indent=1)
print(f'RENDERED {len(frames)} frames for {GROUP}{suffix}')
