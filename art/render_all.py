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
    return ONLY is None or key in ONLY.split(',')


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
            if gold and (kind == 'dragon' or kind in monsters.BOSS_SCALE):
                continue
            lib.clear_objects()
            P, anim = monsters.build(kind, gold)
            P['root'].rotation_euler = (0, 0, math.radians(MONSTER_YAW))
            size = (520, 460) if kind == 'dragon' else (400, 400) if kind in monsters.BOSS_SCALE else (240, 240)
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

elif GROUP == 'npc':
    lib.clear_objects()
    P = hero.build_elder()
    for f in range(4):
        ph = f / 4 * math.tau
        P['body'].scale = (1 + 0.02 * math.sin(ph), 1, 1 - 0.025 * math.sin(ph))
        P['hat'].rotation_euler = (0, 0.06 * math.sin(ph), 0)
        shot(f'npc/elder/{f}', 200, 220, 80)

elif GROUP == 'icons2':
    # Auto-framed icons for guardians and village buildings.
    for kind in ('kingslime', 'alphawolf', 'crystalking', 'dragon'):
        if not wanted(kind):
            continue
        lib.clear_objects()
        P, anim = monsters.build(kind)
        P['root'].rotation_euler = (0, 0, math.radians(20))
        anim(P, 0.25)
        path = os.path.join(OUT, 'icons2', f'{kind}.png')
        lib.render_fit(path, 128, math.radians(15))
        frames.append({'name': f'icon/boss_{kind}', 'file': path, 'ax': 0, 'ay': 0, 'ppu': 0})
    if wanted('npc_elder'):
        lib.clear_objects()
        hero.build_elder()
        path = os.path.join(OUT, 'icons2', 'npc_elder.png')
        lib.render_fit(path, 128, math.radians(12))
        frames.append({'name': 'icon/npc_elder', 'file': path, 'ax': 0, 'ay': 0, 'ppu': 0})
    for name in ('home1', 'home2', 'home3', 'forge', 'forge2', 'forge3', 'garden1', 'garden2', 'garden3',
                 'training1', 'training2', 'training3', 'warp0', 'warp1', 'campfire', 'plot'):
        if not wanted(name):
            continue
        lib.clear_objects()
        env.SCENERY[name][0]()
        path = os.path.join(OUT, 'icons2', f'{name}.png')
        lib.render_fit(path, 128, math.radians(25))
        frames.append({'name': f'icon/b_{name}', 'file': path, 'ax': 0, 'ay': 0, 'ppu': 0})

else:
    raise SystemExit(f'unknown group {GROUP}')

suffix = f".{ONLY.replace(',', '_')}" if ONLY else ''
with open(os.path.join(OUT, f'{GROUP}{suffix}.json'), 'w') as f:
    json.dump(frames, f, indent=1)
print(f'RENDERED {len(frames)} frames for {GROUP}{suffix}')
