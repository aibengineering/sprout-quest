"""Overworld scenery. One map tile = 1.6 Blender units (so the 1.2-unit hero is ~3/4 of a tile tall).

Builders take a `seed` for small variations and return the root object. Buildings are sized in tiles
to match their collision boxes in world.ts.
"""
import math
import random

from lib import box, cone, crystal, cylinder, empty, lathe, profile, sphere, toon, torus

TILE = 1.6


def tree(seed):
    r = random.Random(seed)
    root = empty('tree')
    cylinder((0, 0, 0.35), 0.16, 0.7, toon('#9a6a44'), root, seg=12, r2=0.12)
    greens = [('#4fae4f', '#62c060'), ('#56b85a', '#6ccc68'), ('#48a44a', '#5cbc58')][seed % 3]
    for i, (x, y, z, s) in enumerate(((-0.32, 0.05, 0.95, 0.46), (0.32, 0.05, 0.95, 0.46), (0, -0.12, 1.25, 0.56), (0, 0.18, 1.05, 0.5))):
        sphere((x + r.uniform(-0.05, 0.05), y, z + r.uniform(-0.05, 0.05)), s, toon(greens[i == 2]), root, seg=24)
    if seed % 3 == 1:
        for x, y, z in ((-0.3, -0.35, 1.0), (0.25, -0.4, 1.15), (0.05, -0.55, 1.4)):
            sphere((x, y, z), 0.08, toon('#ff6a6a'), root, line=0.014)
    return root


def pine(seed):
    root = empty('pine')
    cylinder((0, 0, 0.25), 0.12, 0.5, toon('#7a5238'), root, seg=10)
    col = ['#2f7a45', '#347f4a', '#2a7040'][seed % 3]
    h = 1.0 + (seed % 3) * 0.12
    for i in range(3):
        lathe([(0.0001, 0.62 - i * 0.02), (0.62 - i * 0.15, 0.0), (0.5 - i * 0.13, -0.06), (0.0001, -0.02)],
              toon(col if i % 2 == 0 else '#3d8f52'), root, loc=(0, 0, 0.45 + i * 0.4 * h), seg=16)
    if seed % 3 == 2:
        sphere((0, 0, 0.45 + 0.8 * h + 0.66), 0.08, toon('#fff6c0', emit=0.3), root, line=0.012)
    return root


def crystals(seed):
    r = random.Random(seed)
    root = empty('crystals')
    sphere((0, 0, 0.02), (0.5, 0.42, 0.12), toon('#6a6488'), root)
    pal = [('#b8a0ff', '#8a70e0'), ('#8ae8ff', '#50b8e0'), ('#ffb0e8', '#d880c8')][seed % 3]
    for i, (x, y, h, tilt) in enumerate(((0, 0.05, 1.3, 0), (-0.3, 0, 0.8, -0.4), (0.3, -0.05, 0.9, 0.35), (0.12, -0.28, 0.55, 0.2), (-0.18, 0.25, 0.7, -0.2))):
        crystal((x, y, 0), 0.14 + r.uniform(-0.02, 0.03), h, toon(pal[i % 2], rim=0.45), root, rot=(r.uniform(-0.15, 0.15), tilt, 0))
    return root


def rock(seed):
    r = random.Random(seed)
    root = empty('rock')
    col = ['#8a6a5e', '#7a5a50', '#94746a'][seed % 3]
    sphere((0, 0, 0.36), (0.66, 0.55, 0.46), toon(col), root, seg=12, rot=(0, 0, r.uniform(0, 3)))
    sphere((0.35, -0.2, 0.2), (0.3, 0.26, 0.24), toon(col), root, seg=10)
    if seed % 3 == 1:
        for a, b in (((-0.1, 0.62), (0.15, 0.3)), ((0.2, 0.55), (0.35, 0.3))):
            profile([a, (a[0] + 0.04, a[1]), (b[0] + 0.04, b[1]), b], 0.04, toon('#ff8a3a', emit=0.8), root, loc=(0, -0.5, 0), bevel=0, line=0)
    return root


def house(roof_color):
    root = empty('house')
    w = 3 * TILE * 0.9
    d = 3 * TILE * 0.55
    box((0, 0, 0.9), (w, d, 1.8), toon('#fff0dc'), root, bevel=0.12)
    box((0, 0, 0.12), (w + 0.12, d + 0.12, 0.24), toon('#c8b8a8'), root, bevel=0.06)
    roof = profile([(-w / 2 - 0.3, 1.7), (0, 3.2), (w / 2 + 0.3, 1.7)], d + 0.5, toon(roof_color), root, bevel=0.1)
    roof.rotation_euler = (0, 0, 0)
    box((0, -d / 2 - 0.02, 0.6), (0.62, 0.1, 1.05), toon('#8a5a3a'), root, bevel=0.2)
    sphere((0.18, -d / 2 - 0.08, 0.6), 0.05, toon('#ffd35a'), root, line=0.01)
    for s in (-1, 1):
        box((1.05 * s, -d / 2 - 0.02, 1.15), (0.55, 0.08, 0.5), toon('#bfe8ff', rim=0.4), root, bevel=0.06)
        box((1.05 * s, -d / 2 - 0.08, 0.84), (0.66, 0.2, 0.16), toon('#9a6a44'), root, bevel=0.04)
        for k in (-1, 0, 1):
            sphere((1.05 * s + k * 0.2, -d / 2 - 0.12, 0.98), 0.08, toon(['#ff8ab0', '#ffd35a', '#ffffff'][k + 1]), root, line=0.01)
    cylinder((0.9, 0.4, 2.7), 0.18, 0.9, toon('#c8b8a8'), root, seg=12)
    return root


def forge():
    root = empty('forge')
    w = 4 * TILE * 0.9
    d = 3 * TILE * 0.55
    box((0, 0, 0.95), (w, d, 1.9), toon('#b8aca8'), root, bevel=0.1)
    for i in range(6):
        for j in range(3):
            box((-w / 2 + 0.45 + i * (w - 0.9) / 5 + (j % 2) * 0.2, -d / 2 - 0.01, 0.35 + j * 0.55), (0.5, 0.04, 0.22), toon('#a89c98'), root, bevel=0.04, line=0.008)
    profile([(-w / 2 - 0.35, 1.8), (0, 3.3), (w / 2 + 0.35, 1.8)], d + 0.5, toon('#d0583a'), root, bevel=0.1)
    box((-0.6, -d / 2 - 0.02, 0.65), (0.8, 0.1, 1.15), toon('#6a4a3a'), root, bevel=0.3)
    box((1.2, -d / 2 - 0.02, 1.05), (0.9, 0.1, 0.7), toon('#ffb03a', emit=0.8), root, bevel=0.15)
    box((1.2, -d / 2 - 0.05, 1.05), (1.05, 0.06, 0.08), toon('#6a4a3a'), root, bevel=0.02, line=0.01)
    box((1.8, 0.2, 3.0), (0.5, 0.5, 1.4), toon('#8a8090'), root, bevel=0.08)
    # Anvil out front
    an = empty('anvil', root, (1.9, -d / 2 - 0.55, 0))
    box((0, 0, 0.18), (0.25, 0.25, 0.36), toon('#6a5a4a'), an, bevel=0.04)
    box((0, 0, 0.42), (0.6, 0.28, 0.16), toon('#5a5a6a'), an, bevel=0.05)
    cone((0.38, 0, 0.44), 0.08, 0.2, toon('#5a5a6a'), an, rot=(0, math.pi / 2, 0), seg=8)
    # Sign with hammer
    box((-1.9, -d / 2 - 0.1, 1.75), (0.7, 0.08, 0.45), toon('#c89a6a'), root, bevel=0.05)
    cylinder((-1.9, -d / 2 - 0.16, 1.75), 0.03, 0.4, toon('#6a4a3a'), root, rot=(0, 0.8, 0), seg=8, line=0.01)
    box((-1.78, -d / 2 - 0.16, 1.87), (0.16, 0.08, 0.1), toon('#9aa0b0'), root, bevel=0.02, line=0.01, rot=(0, 0.8, 0))
    return root


def fountain():
    root = empty('fountain')
    lathe([(0.0001, 0.0), (1.35, 0.0), (1.4, 0.35), (1.25, 0.42), (1.2, 0.2), (0.0001, 0.2)], toon('#b8b0c8'), root, seg=32)
    cylinder((0, 0, 0.3), 1.2, 0.04, toon('#6ac8f0', rim=0.5), root, seg=32, line=0)
    cylinder((0, 0, 0.7), 0.16, 1.0, toon('#d0c8e0'), root, seg=16)
    lathe([(0.0001, 1.1), (0.5, 1.12), (0.55, 1.25), (0.45, 1.28), (0.0001, 1.2)], toon('#d0c8e0'), root, seg=24)
    cylinder((0, 0, 1.24), 0.42, 0.04, toon('#8ad8f8', rim=0.5), root, seg=24, line=0)
    sphere((0, 0, 1.45), 0.15, toon('#8ad8f8', rim=0.5), root, line=0.012)
    return root


def sign():
    root = empty('sign')
    cylinder((0, 0, 0.35), 0.06, 0.7, toon('#8a5a3a'), root, seg=8)
    box((0, 0, 0.72), (0.9, 0.1, 0.5), toon('#c89a6a'), root, bevel=0.06)
    for i, w in enumerate((0.55, 0.38)):
        box((-0.08 + (0.55 - w) / 2 * -1, -0.06, 0.8 - i * 0.14), (w, 0.02, 0.05), toon('#8a5a3a'), root, bevel=0.01, line=0)
    return root


def lair():
    root = empty('lair')
    rockm = toon('#6a3a30')
    for x, y, z, s in ((0, 0.3, 0.9, (2.6, 1.5, 1.5)), (-1.8, 0.2, 0.5, (1.1, 1.0, 0.9)), (1.9, 0.1, 0.55, (1.1, 1.0, 1.0)), (0.3, 0.4, 2.0, (1.4, 1.0, 0.8))):
        sphere((x, y, z), s, rockm, root, seg=16)
    sphere((0, -1.1, 0.55), (1.0, 0.25, 0.85), toon('#1a0a14', rim=0), root, line=0)
    for s in (-1, 1):
        sphere((0.3 * s, -1.33, 0.75), (0.1, 0.03, 0.07), toon('#ffb03a', emit=1.0), root, line=0)
        cone((1.2 * s, -0.6, 1.9), 0.25, 0.9, toon('#4a2a28'), root, rot=(0.2, -0.4 * s, 0), seg=6)
    for x in (-0.7, -0.35, 0, 0.35, 0.7):
        cone((x, -1.28, 1.3), 0.08, 0.28, toon('#fff0d0'), root, rot=(math.pi, 0, 0), seg=6, line=0.01)
    return root


def grass(color, tip, seed=0):
    r = random.Random(seed)
    root = empty('grass')
    for i in range(7):
        x = -0.36 + i * 0.12 + r.uniform(-0.03, 0.03)
        h = 0.42 + r.uniform(-0.08, 0.12) + (0.1 if i in (2, 4) else 0)
        cone((x, r.uniform(-0.08, 0.08), h / 2), 0.075, h, toon(color if i % 2 else tip), root,
             rot=(r.uniform(-0.2, 0.2), (x) * 0.6, 0), seg=4, line=0.014)
    return root


def flower(color, seed=0):
    root = empty('flower')
    cylinder((0, 0, 0.12), 0.015, 0.24, toon('#4a9a3a'), root, seg=6, line=0)
    for i in range(5):
        a = i / 5 * math.tau
        sphere((math.cos(a) * 0.07, math.sin(a) * 0.07 - 0.02, 0.26), (0.06, 0.06, 0.03), toon(color), root, line=0.01, rot=(0.6, 0, 0))
    sphere((0, -0.04, 0.27), 0.035, toon('#ffb03a'), root, line=0)
    sphere((0.08, 0.02, 0.06), (0.07, 0.03, 0.02), toon('#6ab84a'), root, line=0)
    return root


def mushroom(color):
    root = empty('mushroom')
    cylinder((0, 0, 0.08), 0.04, 0.16, toon('#fff0d8'), root, seg=8)
    lathe([(0.0001, 0.12), (0.1, 0.1), (0.14, 0.03), (0.0001, 0.02)], toon(color), root, loc=(0, 0, 0.13), seg=12)
    cylinder((0.12, 0.05, 0.05), 0.025, 0.1, toon('#fff0d8'), root, seg=8)
    lathe([(0.0001, 0.07), (0.06, 0.06), (0.08, 0.015), (0.0001, 0.01)], toon(color), root, loc=(0.12, 0.05, 0.09), seg=12)
    return root


def gem(color):
    root = empty('gem')
    crystal((0, 0, 0), 0.06, 0.28, toon(color, rim=0.5), root, rot=(0, 0.2, 0))
    crystal((0.1, 0.02, 0), 0.045, 0.18, toon(color, rim=0.5), root, rot=(0, 0.5, 0))
    return root


def pebbles(color):
    root = empty('pebbles')
    sphere((0, 0, 0.05), (0.14, 0.11, 0.08), toon(color), root, seg=10)
    sphere((0.15, 0.05, 0.03), (0.08, 0.07, 0.05), toon(color), root, seg=10)
    return root


GRASS = {
    'village': ('#5fbf4a', '#86dc5e'),
    'meadow': ('#4fb043', '#86dc5e'),
    'woods': ('#3a8a3e', '#5aa84a'),
    'cave': ('#6a5fb0', '#a898f0'),
    'peak': ('#8a4a3a', '#e0804a'),
}

# name → (builder, frame w, frame h) in pixels at PPU 64
SCENERY = {}
for i in range(3):
    SCENERY[f'tree{i}'] = (lambda i=i: tree(i), 150, 190)
    SCENERY[f'pine{i}'] = (lambda i=i: pine(i), 130, 200)
    SCENERY[f'crystal{i}'] = (lambda i=i: crystals(i), 130, 150)
    SCENERY[f'rock{i}'] = (lambda i=i: rock(i), 130, 110)
SCENERY['forge'] = (forge, 480, 420)
SCENERY['house_blue'] = (lambda: house('#6a9ae0'), 380, 360)
SCENERY['house_pink'] = (lambda: house('#e88ab0'), 380, 360)
SCENERY['fountain'] = (fountain, 220, 180)
SCENERY['sign'] = (sign, 90, 90)
SCENERY['lair'] = (lair, 400, 300)
for zone, (c, t) in GRASS.items():
    SCENERY[f'grass_{zone}'] = (lambda c=c, t=t: grass(c, t, 3), 70, 50)
for i, col in enumerate(('#ff8ab0', '#ffd35a', '#ffffff', '#b08aff')):
    SCENERY[f'flower{i}'] = (lambda col=col: flower(col), 40, 40)
SCENERY['mush0'] = (lambda: mushroom('#e8505a'), 40, 40)
SCENERY['mush1'] = (lambda: mushroom('#d8a060'), 40, 40)
SCENERY['gem0'] = (lambda: gem('#a8f0ff'), 40, 40)
SCENERY['gem1'] = (lambda: gem('#e0b0ff'), 40, 40)
SCENERY['pebble0'] = (lambda: pebbles('#8a6a5a'), 40, 40)
SCENERY['pebble1'] = (lambda: pebbles('#ff9a4a'), 40, 40)
