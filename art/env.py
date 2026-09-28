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


def ribbon(root, z, radius, color='#ff5a7a', bow=None):
    """A big bow tied around the trunk, facing the camera: marks a tree you can chop. `bow` moves the bow itself
    (e.g. onto a pine's skirt, where the trunk is hidden)."""
    torus((0, 0, z), radius, 0.04, toon(color), root, seg=24)
    y, bz = bow if bow else (-radius - 0.03, z)
    for sx in (-1, 1):
        sphere((sx * 0.11, y, bz + 0.05), (0.11, 0.04, 0.075), toon(color), root, seg=14, rot=(0, sx * 0.45, 0), line=0.014)
        cylinder((sx * 0.06, y, bz - 0.12), 0.03, 0.2, toon(color), root, seg=8, rot=(0, sx * 0.4, 0), line=0.012)
    sphere((0, y - 0.01, bz + 0.02), 0.05, toon('#ffd35a'), root, seg=12, line=0.012)


def oak_node():
    root = tree(1)
    ribbon(root, 0.3, 0.15)
    return root


def pine_node():
    root = pine(0)
    ribbon(root, 0.2, 0.125, '#ff5a7a', bow=(-0.5, 0.52))
    return root


def stump(bark, heart):
    root = empty('stump')
    cylinder((0, 0, 0.11), 0.2, 0.22, toon(bark), root, seg=16, r2=0.17)
    cylinder((0, 0, 0.225), 0.165, 0.02, toon(heart), root, seg=16, line=0.012)
    torus((0, 0, 0.237), 0.09, 0.012, toon('#c8a070'), root, seg=20, line=0)
    for a in (0.4, 2.3, 4.2):
        cylinder((math.cos(a) * 0.2, math.sin(a) * 0.2, 0.04), 0.05, 0.18, toon(bark), root, seg=8, rot=(math.pi / 2, 0, a + math.pi / 2), line=0.014)
    # A little sprout: it's growing back.
    cylinder((0.06, -0.05, 0.3), 0.012, 0.12, toon('#4fae4f'), root, seg=6, line=0.008)
    sphere((0.1, -0.05, 0.36), (0.06, 0.03, 0.035), toon('#62c060'), root, seg=10, rot=(0, -0.5, 0), line=0.01)
    return root


def ore_node(body, dark, nugget):
    """A mineable boulder: chunky stone studded with glinting nuggets of whatever it holds."""
    root = empty('ore')
    sphere((0, 0, 0.3), (0.5, 0.42, 0.36), toon(body), root, seg=14, rot=(0, 0, 0.4))
    sphere((0.3, -0.12, 0.18), (0.26, 0.22, 0.2), toon(dark), root, seg=10)
    sphere((-0.28, 0.05, 0.16), (0.22, 0.2, 0.18), toon(dark), root, seg=10)
    for x, z, s in ((-0.2, 0.42, 0.07), (0.1, 0.52, 0.06), (0.22, 0.3, 0.075), (-0.05, 0.25, 0.05), (0.34, 0.2, 0.05)):
        crystal((x, -0.36, z), s, s * 1.8, toon(nugget, emit=0.35, rim=0.5), root, rot=(0.9, 0.2 * x, 0), sides=5, line=0.012)
    return root


def crystal_node():
    """A mineable crystal cluster: a stubby rock base sprouting big glowing shards."""
    root = empty('xtal')
    sphere((0, 0, 0.18), (0.42, 0.36, 0.22), toon('#6a6488'), root, seg=12)
    for x, y, h, tilt, col in ((-0.16, 0, 0.62, -0.35, '#9ae6ff'), (0.14, -0.05, 0.78, 0.2, '#c8b0ff'), (0.3, 0.05, 0.5, 0.5, '#9ae6ff'), (-0.02, -0.18, 0.42, -0.1, '#e0d0ff')):
        crystal((x, y, 0.22), 0.1, h, toon(col, rim=0.5, emit=0.15), root, rot=(0, tilt, 0), sides=6)
    return root


def rubble(body, nugget):
    """What's left once a rock is mined out: a scatter of pebbles and a fleck or two."""
    root = empty('rubble')
    for x, y, s in ((0, 0, 0.16), (0.2, -0.08, 0.12), (-0.2, 0.02, 0.13), (0.06, 0.14, 0.1), (-0.08, -0.16, 0.09)):
        sphere((x, y, s * 0.6), (s, s * 0.9, s * 0.7), toon(body), root, seg=8, line=0.014)
    crystal((0.1, -0.2, 0.05), 0.04, 0.07, toon(nugget, emit=0.3), root, rot=(0.9, 0, 0), sides=5, line=0)
    return root


def crystals(seed):
    r = random.Random(seed)
    root = empty('crystals')
    sphere((0, 0, 0.02), (0.5, 0.42, 0.12), toon('#6a6488'), root)
    pal = [('#b8a0ff', '#8a70e0'), ('#8ae8ff', '#50b8e0'), ('#ffb0e8', '#d880c8')][seed % 3]
    for i, (x, y, h, tilt) in enumerate(((0, 0.05, 1.3, 0), (-0.3, 0, 0.8, -0.4), (0.3, -0.05, 0.9, 0.35), (0.12, -0.28, 0.55, 0.2), (-0.18, 0.25, 0.7, -0.2))):
        crystal((x, y, 0), 0.14 + r.uniform(-0.02, 0.03), h, toon(pal[i % 2], rim=0.45), root, rot=(r.uniform(-0.15, 0.15), tilt, 0))
    return root


def rock(seed, cols=('#8a6a5e', '#7a5a50', '#94746a')):
    r = random.Random(seed)
    root = empty('rock')
    col = cols[seed % 3]
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


def forge_ruins():
    """The old forge before you repair it: cracked walls, a caved-in roof, rubble and a cold window."""
    root = empty('forge0')
    w = 4 * TILE * 0.9
    d = 3 * TILE * 0.55
    box((0, 0, 0.75), (w, d, 1.5), toon('#a89c98'), root, bevel=0.1)
    for i in range(6):
        for j in range(2):
            box((-w / 2 + 0.45 + i * (w - 0.9) / 5 + (j % 2) * 0.2, -d / 2 - 0.01, 0.35 + j * 0.55), (0.5, 0.04, 0.22), toon('#968a86'), root, bevel=0.04, line=0.008)
    # Half a roof, sagging, with a hole.
    profile([(-w / 2 - 0.35, 1.45), (-0.4, 2.6), (0.2, 2.2), (0.5, 2.5), (0.9, 1.45)], d + 0.5, toon('#8a4a3a'), root, bevel=0.08)
    for x, y, z, r in ((1.0, -d / 2 - 0.4, 0.15, 0.3), (1.6, -d / 2 - 0.2, 0.12, -0.4), (2.0, -d / 2 - 0.6, 0.1, 0.8), (0.6, -d / 2 - 0.8, 0.08, 0.2)):
        box((x, y, z), (0.5, 0.3, 0.22), toon('#9a8a86'), root, bevel=0.05, rot=(0, 0, r))
    for x, y in ((1.3, -d / 2 - 0.9), (2.3, -d / 2 - 0.3)):
        box((x, y, 0.1), (0.9, 0.18, 0.12), toon('#8a5a3a'), root, bevel=0.03, rot=(0, 0, 0.6))
    box((-0.6, -d / 2 - 0.02, 0.6), (0.8, 0.1, 1.05), toon('#4a3a3a'), root, bevel=0.3)
    box((1.2, -d / 2 - 0.02, 0.95), (0.9, 0.1, 0.6), toon('#3a3040'), root, bevel=0.15)
    box((1.8, 0.2, 1.9), (0.5, 0.5, 0.9), toon('#8a8090'), root, bevel=0.08, rot=(0.15, 0.2, 0))
    an = empty('anvil', root, (-1.9, -d / 2 - 0.55, 0))
    box((0, 0, 0.12), (0.6, 0.28, 0.16), toon('#5a5a6a'), an, bevel=0.05, rot=(0.3, 0.2, 0.4))
    for x in (-2.3, 2.6):
        sphere((x, -d / 2 - 0.2, 0.2), (0.35, 0.25, 0.25), toon('#6ab85a'), root)
    return root


def forge(level=1):
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
    if level >= 2:
        # Upgraded: a second chimney, bellows and a banner.
        box((-1.2, 0.3, 3.0), (0.45, 0.45, 1.2), toon('#8a8090'), root, bevel=0.08)
        profile([(0, 0), (0.55, 0), (0.55, -0.9), (0.27, -0.7), (0, -0.9)], 0.04, toon('#6a9ae0'), root, loc=(-2.6, -d / 2 - 0.1, 1.9), bevel=0.01)
        sphere((-2.35, -d / 2 - 0.9, 0.35), (0.3, 0.22, 0.2), toon('#8a5a3a'), root)
    if level >= 3:
        # Iron Smithy: iron bands across the walls, an iron ridge on the roof and a quench barrel by the door.
        for z in (0.5, 1.45):
            box((0, -d / 2 - 0.03, z), (w + 0.04, 0.05, 0.1), toon('#5e6272'), root, bevel=0.02, line=0.01)
        box((0, 0, 3.32), (0.34, d + 0.62, 0.16), toon('#5e6272'), root, bevel=0.04, line=0.012)
        for x in (-w / 2 - 0.2, w / 2 + 0.2):
            box((x, -d / 2 - 0.28, 1.83), (0.22, 0.12, 0.14), toon('#5e6272'), root, bevel=0.03, line=0.01)
        barrel = empty('barrel', root, (-2.3, -d / 2 - 0.5, 0))
        cylinder((0, 0, 0.3), 0.3, 0.6, toon('#7a5238'), barrel, seg=16)
        for z in (0.12, 0.48):
            torus((0, 0, z), 0.31, 0.025, toon('#4a4d5c'), barrel, seg=20, line=0)
        cylinder((0, 0, 0.6), 0.26, 0.02, toon('#6ac8f0', rim=0.5), barrel, seg=16, line=0)
    if level >= 4:
        # Crystal Kiln: a domed kiln on the right, crystals growing from it and its mouth glowing blue.
        kiln = empty('kiln', root, (w / 2 + 0.75, -0.3, 0))
        kiln.scale = (1.35, 1.35, 1.35)
        lathe([(0.0001, 0.0), (0.75, 0.0), (0.72, 0.6), (0.45, 1.15), (0.2, 1.3), (0.0001, 1.32)], toon('#8a8090'), kiln, seg=20)
        box((0, -0.68, 0.4), (0.45, 0.1, 0.45), toon('#9ae6ff', emit=0.9), kiln, bevel=0.15, line=0.01)
        for x, y, h, tilt, col in ((-0.2, 0, 0.55, -0.4, '#9ae6ff'), (0.1, 0.1, 0.7, 0.2, '#c8b0ff'), (0.3, -0.1, 0.45, 0.5, '#9ae6ff')):
            crystal((x, y, 1.05), 0.09, h, toon(col, rim=0.5, emit=0.2), kiln, rot=(0, tilt, 0), sides=6)
    if level >= 5:
        # Master forge: golden anvil, glowing crucible and a crown banner.
        box((1.9, -d / 2 - 0.55, 0.5), (0.62, 0.3, 0.18), toon('#ffd35a', rim=0.4), root, bevel=0.05)
        lathe([(0.0001, 0.0), (0.35, 0.0), (0.4, 0.45), (0.3, 0.45), (0.0001, 0.3)], toon('#5a5a6a'), root, loc=(0.4, -d / 2 - 0.6, 0), seg=16)
        cylinder((0.4, -d / 2 - 0.6, 0.42), 0.28, 0.04, toon('#ffb03a', emit=0.9), root, seg=16, line=0)
        profile([(0, 0), (0.55, 0), (0.55, -0.9), (0.27, -0.7), (0, -0.9)], 0.04, toon('#ffd35a'), root, loc=(2.3, -d / 2 - 0.1, 1.9), bevel=0.01)
    return root


def fountain():
    root = empty('fountain')
    lathe([(0.0001, 0.0), (1.35, 0.0), (1.4, 0.35), (1.25, 0.42), (1.2, 0.2), (0.0001, 0.2)], toon('#b8b0c8'), root, seg=32)
    cylinder((0, 0, 0.3), 1.2, 0.04, toon('#6ac8f0', rim=0.5), root, seg=32, line=0)
    cylinder((0, 0, 0.7), 0.16, 1.0, toon('#d0c8e0'), root, seg=16)
    lathe([(0.0001, 1.1), (0.5, 1.12), (0.55, 1.25), (0.45, 1.28), (0.0001, 1.2)], toon('#d0c8e0'), root, seg=24)
    cylinder((0, 0, 1.24), 0.42, 0.04, toon('#8ad8f8', rim=0.5), root, seg=24, line=0)
    # Veyra's Spring: the goddess stands over the water.
    statue = veyra(0.55, plinth=False)
    statue.parent = root
    statue.location = (0, 0, 1.24)
    return root


STONE, STONE_DARK, GOLD = '#d4cfe0', '#a9a3bd', '#ffd35a'


def sickle(parent, loc, s=1.0, rot=(0, 0, 0), mat=None):
    """Veyra's sickle: a short handle and a crescent blade (a partial torus), made of the same stone unless `mat`."""
    root = empty('sickle', parent, loc)
    root.rotation_euler = rot
    root.scale = (s, s, s)
    m = mat or toon(STONE)
    cylinder((0, 0, 0.14), 0.035, 0.28, m, root, seg=8, line=0.014)
    root_blade = empty('blade', root, (0, 0, 0.28))
    profile(crescent(0.17, 0.11), 0.03, m, root_blade, bevel=0.005, line=0.014)
    return root


def crescent(r, inner, steps=10):
    """A sickle blade in the XZ plane: an outer arc from the handle up and over, and a thinner inner arc back."""
    outer = [(r - math.cos(math.radians(a)) * r, math.sin(math.radians(a)) * r) for a in range(-10, 200, 210 // steps)]
    back = [(r - math.cos(math.radians(a)) * inner * 1.1 + 0.02, math.sin(math.radians(a)) * inner) for a in range(190, -10, -200 // steps)]
    return outer + back


def veyra(scale=1.0, plinth=True, weathered=False, offerings=False):
    """A statue of Veyra, the Sower: a tall veiled woman in a long robe, a glowing golden seed cupped in one hand and a
    sickle held low in the other. Pale stone and a gold seed. `weathered`: long forgotten out in the wild, draped in moss
    and ivy with wildflowers at her feet and a cracked, sunken plinth. `offerings`: fresh flowers laid at her feet."""
    root = empty('veyra')
    s = scale
    stone = toon(STONE if not weathered else '#bdb6c9')
    dark = toon(STONE_DARK)
    z0 = 0.0
    if plinth:
        tilt = (0, 0.04, 0.03) if weathered else (0, 0, 0)
        box((0, 0, 0.14 * s), (0.72 * s, 0.6 * s, 0.28 * s), dark, root, bevel=0.03, rot=tilt)
        box((0, 0, 0.31 * s), (0.6 * s, 0.5 * s, 0.07 * s), stone, root, bevel=0.02, rot=tilt)
        # A carved band of seeds around the plinth.
        for i in range(5):
            sphere(((-0.24 + i * 0.12) * s, -0.305 * s, 0.17 * s), (0.028 * s, 0.01 * s, 0.04 * s), toon('#8d86a3'), root, seg=8, line=0)
        z0 = 0.35 * s
    # A long robe flaring to the ground, a sash, and shoulders under a veil that falls to her elbows.
    cylinder((0, 0, z0 + 0.42 * s), 0.3 * s, 0.84 * s, stone, root, seg=24, r2=0.15 * s)
    # Folds in the robe: soft ridges running down the front.
    for x in (-0.12, 0.0, 0.12):
        cylinder((x * s, -0.215 * s + abs(x) * 0.25 * s, z0 + 0.38 * s), 0.022 * s, 0.7 * s, stone, root, seg=8, r2=0.012 * s,
                 rot=(0.2, -x * 0.9, 0), line=0.01)
    torus((0, 0, z0 + 0.62 * s), 0.2 * s, 0.03 * s, toon(GOLD), root, seg=24, line=0.01)
    sphere((0, 0, z0 + 0.9 * s), (0.22 * s, 0.15 * s, 0.15 * s), stone, root, seg=20)
    cylinder((0, 0.02 * s, z0 + 0.94 * s), 0.25 * s, 0.34 * s, stone, root, seg=24, r2=0.12 * s)
    # The hood, with its rim framing a face lost in shadow and two closed eyes.
    sphere((0, 0.03 * s, z0 + 1.17 * s), (0.15 * s, 0.15 * s, 0.17 * s), stone, root, seg=24)
    torus((0, -0.08 * s, z0 + 1.15 * s), 0.1 * s, 0.025 * s, stone, root, rot=(1.35, 0, 0), seg=20, line=0.01)
    sphere((0, -0.1 * s, z0 + 1.14 * s), (0.085 * s, 0.03 * s, 0.1 * s), toon('#8d86a3'), root, seg=14, line=0)
    for side in (-1, 1):
        box((0.035 * side * s, -0.13 * s, z0 + 1.15 * s), (0.03 * s, 0.01 * s, 0.006 * s), toon('#5e5775'), root, bevel=0, line=0)
    # One hand held out with the golden seed, the other low with the sickle.
    sphere((-0.2 * s, -0.12 * s, z0 + 0.86 * s), (0.07 * s, 0.13 * s, 0.06 * s), stone, root, seg=12, rot=(0.7, 0, -0.3))
    sphere((-0.22 * s, -0.24 * s, z0 + 0.93 * s), 0.085 * s, toon(GOLD, emit=0.5, rim=0.5), root, seg=16, line=0.012)
    sphere((0.23 * s, -0.04 * s, z0 + 0.74 * s), (0.07 * s, 0.07 * s, 0.13 * s), stone, root, seg=12)
    sickle(root, (0.27 * s, -0.1 * s, z0 + 0.5 * s), 1.2 * s, rot=(0, 0.25, 0))
    moss, moss_light = toon('#5f9a4a'), toon('#7ab85a')
    if weathered:
        # Moss draped over the hood and shoulders, and gathered in the folds and on the plinth.
        for x, y, z, rx, ry, rz in ((0.02, 0.02, 1.3, 0.14, 0.13, 0.05), (-0.16, 0.0, 1.06, 0.1, 0.12, 0.05),
                                    (0.19, 0.02, 1.02, 0.09, 0.11, 0.05), (0.0, -0.12, 0.2, 0.2, 0.08, 0.05),
                                    (-0.22, -0.02, 0.52, 0.07, 0.09, 0.12), (0.2, -0.1, 0.3, 0.08, 0.06, 0.1)):
            sphere((x * s, y * s, z0 + z * s), (rx * s, ry * s, rz * s), moss, root, seg=12, line=0.012)
        for x, y, z, r in ((0.06, -0.06, 1.33, 0.04), (-0.12, -0.08, 1.1, 0.035), (0.14, -0.1, 0.62, 0.035), (-0.05, -0.22, 0.12, 0.04)):
            sphere((x * s, y * s, z0 + z * s), r * s, moss_light, root, seg=8, line=0)
        # Ivy trailing from her shoulder down the robe: a line of small leaves.
        for k in range(8):
            t = k / 7
            x, z = (-0.2 + 0.1 * t + 0.04 * math.sin(t * 7)) * s, z0 + (1.0 - 0.9 * t) * s
            sphere((x, (-0.2 - 0.06 * (1 - t)) * s, z), (0.045 * s, 0.015 * s, 0.03 * s), moss_light if k % 2 else moss, root,
                   seg=8, rot=(0, 0.6 if k % 2 else -0.6, 0), line=0.008)
        # Moss on the plinth, wildflowers and grass at her feet.
        for x, y in ((-0.3, -0.26), (0.28, -0.24), (0.3, 0.2), (-0.25, 0.22)):
            sphere((x * s, y * s, 0.3 * s), (0.12 * s, 0.1 * s, 0.05 * s), moss, root, seg=10, line=0.012)
        _flowers(root, s, [(-0.42, -0.34, '#ffffff'), (-0.34, -0.42, '#ffd35a'), (0.4, -0.36, '#ff8ab0'), (0.46, -0.24, '#ffffff'), (0.32, -0.44, '#b08aff')])
    if offerings:
        _flowers(root, s, [(-0.12, -0.36, '#ff8ab0'), (0.0, -0.4, '#ffd35a'), (0.13, -0.36, '#ffffff'), (0.26, -0.34, '#ff8ab0')], z=0.34 * s if plinth else 0)
    return root


def _flowers(root, s, spots, z=0.0):
    """Little flowers (a stem and a five-petal head) at the given (x, y, colour) spots."""
    for x, y, col in spots:
        cylinder((x * s, y * s, z + 0.05 * s), 0.008 * s, 0.1 * s, toon('#4fae4f'), root, seg=6, line=0)
        for p in range(5):
            a = p / 5 * math.tau
            sphere((x * s + math.cos(a) * 0.025 * s, y * s, z + 0.11 * s + math.sin(a) * 0.025 * s), 0.02 * s, toon(col), root, seg=8, line=0.006)
        sphere((x * s, (y - 0.01) * s, z + 0.11 * s), 0.013 * s, toon('#ffb03a'), root, seg=8, line=0)


def crowned_king():
    """An old, cracked statue of a crowned king on a broken plinth, its face chiselled flat. Older than Veyra's; nobody
    says whose it is."""
    root = empty('king')
    stone, dark, moss = toon('#9a93a8'), toon('#77708a'), toon('#6a9a52')
    box((0, 0, 0.16), (0.8, 0.66, 0.32), dark, root, bevel=0.03, rot=(0, 0, 0.05))
    box((0.28, -0.3, 0.05), (0.2, 0.14, 0.1), dark, root, bevel=0.02, rot=(0, 0, 0.6))
    cylinder((0, 0, 0.72), 0.26, 0.8, stone, root, seg=10, r2=0.2)
    sphere((0, 0, 1.18), (0.22, 0.18, 0.2), stone, root, seg=16)
    # Shoulders with a cloak, a sword planted before him.
    for side in (-1, 1):
        sphere((0.24 * side, 0, 1.06), (0.1, 0.1, 0.09), stone, root, seg=12)
    box((0, -0.27, 0.72), (0.05, 0.03, 0.7), dark, root, bevel=0.01)
    box((0, -0.27, 1.02), (0.2, 0.04, 0.04), dark, root, bevel=0.01)
    # The head, its face cut away to a flat scar, under a heavy crown.
    sphere((0, 0, 1.42), (0.15, 0.14, 0.16), stone, root, seg=16)
    box((0, -0.13, 1.4), (0.2, 0.03, 0.18), toon('#c2bccf'), root, bevel=0.005, line=0.01)
    cylinder((0, 0, 1.57), 0.16, 0.1, toon('#b8a86a'), root, seg=16)
    for i in range(6):
        a = i / 6 * math.tau
        cone((math.cos(a) * 0.14, math.sin(a) * 0.14, 1.66), 0.035, 0.1, toon('#b8a86a'), root, seg=6, line=0.01)
    for x, y, z, r in ((-0.3, -0.2, 0.34, 0.12), (0.2, 0.25, 0.36, 0.14), (-0.12, 0.05, 1.62, 0.07), (0.22, -0.15, 0.9, 0.07)):
        sphere((x, y, z), r, moss, root, seg=10, line=0.012)
    return root


def waystone():
    """A small shrine stone by each campfire: Veyra's sickle carved on it and a golden seed on top."""
    root = empty('waystone')
    box((0, 0, 0.26), (0.26, 0.2, 0.52), toon(STONE), root, bevel=0.05)
    box((0, 0, 0.04), (0.34, 0.28, 0.08), toon(STONE_DARK), root, bevel=0.02)
    sickle(root, (0, -0.11, 0.2), 0.7, mat=toon(STONE_DARK))
    sphere((0, 0, 0.58), 0.07, toon(GOLD, emit=0.5, rim=0.5), root, seg=14, line=0.012)
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


def tent():
    root = empty('tent')
    w = 3 * TILE * 0.7
    profile([(-w / 2, 0), (0, 2.0), (w / 2, 0)], 2.2, toon('#f0c878'), root, bevel=0.06)
    profile([(-0.45, 0), (0, 1.1), (0.45, 0)], 0.1, toon('#8a5a3a'), root, loc=(0, -1.12, 0), bevel=0.02)
    cylinder((0, 0, 2.15), 0.05, 0.5, toon('#8a5a3a'), root, seg=8)
    profile([(0, 0), (0.45, -0.12), (0, -0.25)], 0.03, toon('#ff8a5a'), root, loc=(0.03, 0, 2.35), bevel=0)
    for s in (-1, 1):
        cylinder((1.9 * s, -0.8, 0.12), 0.05, 0.3, toon('#9a6a44'), root, seg=6)
    sphere((1.5, -1.3, 0.12), (0.2, 0.2, 0.12), toon('#9aa0b0'), root)
    return root


def manor():
    root = empty('manor')
    w, d = 3 * TILE * 0.95, 3 * TILE * 0.55
    box((0, 0, 1.4), (w, d, 2.8), toon('#fff4e8'), root, bevel=0.12)
    box((0, -d / 2 - 0.02, 1.45), (w + 0.1, 0.1, 0.14), toon('#c8b0a0'), root, bevel=0.03)
    profile([(-w / 2 - 0.3, 2.7), (0, 4.0), (w / 2 + 0.3, 2.7)], d + 0.5, toon('#7a6ae0'), root, bevel=0.1)
    box((0, -d / 2 - 0.02, 0.62), (0.7, 0.1, 1.1), toon('#8a5a3a'), root, bevel=0.25)
    for s in (-1, 1):
        for z in (0.95, 2.1):
            box((1.3 * s, -d / 2 - 0.02, z), (0.5, 0.08, 0.5), toon('#bfe8ff', rim=0.4), root, bevel=0.06)
    # Tower
    cylinder((w / 2 - 0.2, -0.3, 2.0), 0.6, 4.0, toon('#fff4e8'), root, seg=20)
    cone((w / 2 - 0.2, -0.3, 4.5), 0.78, 1.2, toon('#7a6ae0'), root, seg=20)
    cylinder((w / 2 - 0.2, -0.3, 5.3), 0.03, 0.5, toon('#8a5a3a'), root, seg=6)
    profile([(0, 0), (0.45, -0.12), (0, -0.25)], 0.03, toon('#7ad85a'), root, loc=(w / 2 - 0.17, -0.3, 5.5), bevel=0)
    box((w / 2 - 0.2, -0.92, 2.9), (0.3, 0.08, 0.45), toon('#bfe8ff', rim=0.4), root, bevel=0.05)
    for x in (-1.6, -0.9, 0.9):
        sphere((x, -d / 2 - 0.3, 0.2), (0.25, 0.2, 0.2), toon('#5ab85a'), root)
    return root


def plot():
    """An empty building site: a fenced patch of dirt and a little sign."""
    root = empty('plot')
    box((0, 0, 0.03), (3.2, 1.8, 0.06), toon('#c8a070'), root, bevel=0.03, line=0.012)
    for x in (-1.6, -0.8, 0, 0.8, 1.6):
        cylinder((x, -0.95, 0.2), 0.05, 0.4, toon('#9a6a44'), root, seg=6)
    box((0, -0.95, 0.3), (3.3, 0.06, 0.06), toon('#9a6a44'), root, bevel=0.01, line=0.01)
    cylinder((1.2, -0.3, 0.4), 0.05, 0.8, toon('#8a5a3a'), root, seg=6)
    box((1.2, -0.35, 0.8), (0.6, 0.06, 0.35), toon('#c89a6a'), root, bevel=0.04)
    for x, z in ((-0.9, 0.2), (-0.5, 0.3)):
        box((x, 0.1, z), (0.5, 0.3, 0.2), toon('#b98a5a'), root, bevel=0.03, rot=(0, 0, 0.3))
    return root


def garden(level):
    root = empty('garden')
    box((0, 0, 0.05), (3.4, 1.9, 0.1), toon('#8a6a4a'), root, bevel=0.04, line=0.012)
    for x in (-1.7, -0.85, 0, 0.85, 1.7):
        box((x, -1.0, 0.18), (0.08, 0.08, 0.36), toon('#fff0dc'), root, bevel=0.02, line=0.01)
    box((0, -1.0, 0.28), (3.5, 0.06, 0.06), toon('#fff0dc'), root, bevel=0.01, line=0.01)
    fruit = ['#7ad85a', '#ff6a8a', '#ffd35a'][level - 1]
    for row in range(2):
        for i in range(5):
            x, y = -1.3 + i * 0.65, -0.35 + row * 0.7
            h = 0.25 + level * 0.12
            cylinder((x, y, 0.1 + h / 2), 0.03, h, toon('#4a9a3a'), root, seg=6, line=0.01)
            for s in (-1, 1):
                sphere((x + 0.1 * s, y, 0.1 + h * 0.6), (0.12, 0.05, 0.06), toon('#6ac85a'), root, rot=(0, -0.4 * s, 0), line=0.01)
            if level >= 2:
                sphere((x, y - 0.03, 0.12 + h), 0.09 + level * 0.02, toon(fruit), root, line=0.012)
    if level >= 3:
        cylinder((1.9, 0.6, 0.35), 0.25, 0.5, toon('#9aa0b0'), root, seg=12)
        cylinder((1.9, 0.6, 0.6), 0.2, 0.03, toon('#6ac8f0'), root, seg=12, line=0)
    return root


def training(level):
    root = empty('training')
    box((0, 0, 0.04), (3.4, 1.9, 0.08), toon('#d8b888'), root, bevel=0.04, line=0.012)
    for k, x in enumerate([0, -1.1, 1.1][:level]):
        d = empty('dummy', root, (x, 0, 0))
        cylinder((0, 0, 0.5), 0.06, 1.0, toon('#8a5a3a'), d, seg=8)
        sphere((0, 0, 0.9), (0.28, 0.24, 0.34), toon('#e8c890'), d)
        sphere((0, 0, 1.38), 0.2, toon('#e8c890'), d)
        cylinder((0, 0, 0.95), 0.05, 0.9, toon('#8a5a3a'), d, rot=(0, math.pi / 2, 0), seg=8)
        sphere((0, -0.22, 0.92), 0.08, toon('#e8505a'), d, line=0.01)
    if level >= 2:
        box((-1.4, 0.55, 0.5), (0.9, 0.2, 1.0), toon('#9a6a44'), root, bevel=0.04)
        for i in range(3):
            cylinder((-1.7 + i * 0.3, 0.42, 0.75), 0.03, 0.9, toon('#dfe6f0'), root, seg=6, line=0.01)
    if level >= 3:
        cylinder((1.5, 0.6, 1.0), 0.05, 2.0, toon('#8a5a3a'), root, seg=8)
        profile([(0, 0), (0.7, 0), (0.7, -1.0), (0.35, -0.8), (0, -1.0)], 0.04, toon('#e8505a'), root, loc=(1.53, 0.6, 1.95), bevel=0.01)
    return root


def warpstone(level):
    root = empty('warp')
    lathe([(0.0001, 0), (0.9, 0), (0.95, 0.15), (0.7, 0.25), (0.0001, 0.25)], toon('#9aa0b0'), root, seg=8)
    if level == 0:
        for x, y, h, r in ((-0.3, 0.1, 0.5, 0.3), (0.35, -0.1, 0.3, 0.4), (0.1, 0.35, 0.4, -0.2)):
            box((x, y, 0.25 + h / 2), (0.3, 0.3, h), toon('#8a8098'), root, bevel=0.05, rot=(0, r, 0.4))
        return root
    crystal((0, 0, 0.2), 0.32, 2.4, toon('#9ae6ff', rim=0.5, emit=0.2), root)
    for a in range(4):
        ang = a / 4 * math.tau + 0.4
        crystal((math.cos(ang) * 0.55, math.sin(ang) * 0.5, 0.15), 0.12, 0.7, toon('#c8b0ff', rim=0.5), root, rot=(math.sin(ang) * 0.4, -math.cos(ang) * 0.4, 0))
    torus((0, 0, 1.3), 0.55, 0.04, toon('#ffd35a'), root, rot=(0.3, 0, 0))
    return root


def campfire():
    root = empty('campfire')
    for i in range(7):
        a = i / 7 * math.tau
        sphere((math.cos(a) * 0.45, math.sin(a) * 0.38, 0.08), (0.14, 0.12, 0.1), toon('#9aa0b0'), root, seg=10)
    for a in (0.5, 2.1, 3.7):
        cylinder((0, 0, 0.14), 0.07, 0.7, toon('#8a5a3a'), root, rot=(math.pi / 2 - 0.3, 0, a), seg=8)
    for s, z, c in ((0.26, 0.2, '#ff7a2a'), (0.18, 0.3, '#ffb03a'), (0.1, 0.38, '#ffe07a')):
        sphere((0, 0, z), s, toon(c, emit=0.8), root, line=0.012 if s > 0.2 else 0)
        cone((0, 0, z + s * 1.3), s * 0.8, s * 2.4, toon(c, emit=0.8), root, seg=12, line=0.012 if s > 0.2 else 0)
    cylinder((0.75, 0.15, 0.12), 0.18, 0.24, toon('#9a6a44'), root, seg=12)
    return root


def gate(kind):
    """One tile of a guardian's roadblock."""
    root = empty('gate')
    if kind == 'bramble':
        for x, y, z, s in ((0, 0, 0.45, 0.6), (-0.35, 0.2, 0.35, 0.45), (0.35, -0.1, 0.4, 0.45), (0.1, 0.3, 0.75, 0.4)):
            sphere((x, y, z), s, toon('#3a8a4a'), root, seg=12)
        for i in range(10):
            a = i / 10 * math.tau
            cone((math.cos(a) * 0.55, math.sin(a) * 0.4 - 0.1, 0.5 + math.sin(i * 1.7) * 0.25), 0.05, 0.22, toon('#c89a6a'), root,
                 rot=(math.pi / 2, 0, a - math.pi / 2), seg=6, line=0.01)
        for x, z in ((-0.2, 0.7), (0.3, 0.55)):
            sphere((x, -0.55, z), 0.08, toon('#e8505a'), root, line=0.01)
    elif kind == 'crystal':
        pal = ['#b8a0ff', '#8ae8ff', '#e0b0ff']
        for i, (x, h, t) in enumerate(((0, 1.5, 0), (-0.4, 1.0, -0.3), (0.4, 1.1, 0.3), (0.15, 0.7, 0.5), (-0.2, 0.8, -0.5))):
            crystal((x, (i % 2) * 0.2 - 0.1, 0), 0.2, h, toon(pal[i % 3], rim=0.5), root, rot=(0, t, 0))
    else:  # rock (with magma)
        sphere((0, 0, 0.5), (0.75, 0.6, 0.55), toon('#6a4a44'), root, seg=12)
        sphere((0.3, -0.25, 0.9), (0.4, 0.35, 0.35), toon('#7a5a50'), root, seg=10)
        for a, b in (((-0.3, 0.8), (-0.1, 0.35)), ((0.2, 0.6), (0.45, 0.25))):
            profile([a, (a[0] + 0.05, a[1]), (b[0] + 0.05, b[1]), b], 0.05, toon('#ff8a3a', emit=0.8), root, loc=(0, -0.6, 0), bevel=0, line=0)
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
    'cave': ('#4f8a6a', '#7ac89a'),
    'hollow': ('#6a5fb0', '#a898f0'),
    'peak': ('#8a4a3a', '#e0804a'),
}

# name → (builder, frame w, frame h) in pixels at PPU 64
def _saw_blade(parent, loc, r, rot=(math.pi / 2, 0, 0), broken=False, metal='#c8d0dc'):
    """A round saw blade with teeth; `broken` leaves a gap in it. `metal`: copper, iron or old steel."""
    steel = toon(metal, rim=0.35)
    cylinder(loc, r, 0.05, steel, parent, seg=28, rot=rot, line=0.012)
    cylinder(loc, r * 0.22, 0.08, toon('#6a7080'), parent, seg=12, rot=rot, line=0.01)
    n = 14
    for i in range(n):
        if broken and i in (3, 4, 5):
            continue
        a = i / n * math.tau
        # Teeth around the rim, in the blade's plane (XZ when it stands upright).
        x, z = math.cos(a) * r * 1.02, math.sin(a) * r * 1.02
        box((loc[0] + x, loc[1], loc[2] + z), (0.1, 0.05, 0.1), steel, parent, rot=(0, -a, 0), bevel=0.01, line=0.008)


def _log(parent, loc, length, r, rot, bark='#8a5a3a', end='#e8c890'):
    cylinder(loc, r, length, toon(bark), parent, seg=12, rot=rot)
    return parent


def log_pile(root=None, n=3, bark='#8a5a3a', end='#e8c890'):
    """Logs stacked in a little pyramid, ends facing you (oak by default; pass pine's colours for pine)."""
    root = root or empty('logs')
    for row, count in enumerate(range(n, 0, -1)):
        for i in range(count):
            x = (i - (count - 1) / 2) * 0.42
            z = 0.2 + row * 0.36
            cylinder((x, 0, z), 0.2, 1.3, toon(bark), root, seg=12, rot=(math.pi / 2, 0, 0))
            cylinder((x, -0.66, z), 0.17, 0.02, toon(end), root, seg=12, rot=(math.pi / 2, 0, 0), line=0.01)
    return root


def sawmill(level):
    """Bram's Sawmill in Sowerby: at 0 a staked-out site with a pile of pine; built, an open timber shed with a big round
    saw over its bench, a log ramp, and planks stacked beside it."""
    root = empty('sawmill')
    w, d = 3.4 * TILE * 0.92, 2.4 * TILE * 0.8
    wood, dark, plank = toon('#b98a5a'), toon('#8a5a3a'), toon('#e8c890')
    if level == 0:
        box((0, 0, 0.03), (w, d, 0.06), toon('#c8a070'), root, bevel=0.03, line=0.012)
        for x in (-w / 2, w / 2):
            for y in (-d / 2, d / 2):
                cylinder((x, y, 0.3), 0.06, 0.6, dark, root, seg=6)
        log_pile(empty('pile', root, (-0.9, 0.2, 0)), 3)
        for i in range(3):
            box((1.1, -0.2 + i * 0.05, 0.06 + i * 0.09), (1.5, 0.35, 0.08), plank, root, bevel=0.02, rot=(0, 0, 0.1 * i))
        return root
    box((0, 0, 0.1), (w, d, 0.2), toon('#a88a6a'), root, bevel=0.04)
    # A lean-to over the back half, open at the front so you can see the saw at work.
    for x in (-w / 2 + 0.2, w / 2 - 0.2):
        box((x, d / 2 - 0.2, 1.5), (0.22, 0.22, 3.0), dark, root, bevel=0.03)
        box((x, -0.1, 1.2), (0.22, 0.22, 2.4), dark, root, bevel=0.03)
    box((0, d / 2 - 0.1, 1.2), (w - 0.3, 0.12, 2.1), wood, root, bevel=0.03)  # back wall
    roof = empty('roof', root, (0, d / 4, 2.75))
    roof.rotation_euler = (0.4, 0, 0)
    box((0, 0, 0), (w + 0.4, d * 0.7, 0.12), toon('#8aa06a'), roof, bevel=0.04)
    for i in range(7):
        box((-w / 2 + (i + 0.5) * (w + 0.4) / 7 - 0.2, 0, 0.07), (0.05, d * 0.7, 0.04), toon('#6a8a5a'), roof, bevel=0.01, line=0)
    # The saw bench, a log on it, and the big blade standing up through it.
    box((0.2, -0.35, 0.75), (2.6, 0.9, 0.12), wood, root, bevel=0.03)
    for x in (-0.9, 1.3):
        box((x, -0.35, 0.4), (0.15, 0.7, 0.7), dark, root, bevel=0.02)
    cylinder((-0.3, -0.35, 1.02), 0.24, 1.6, toon('#8a5a3a'), root, seg=12, rot=(0, math.pi / 2, 0))
    cylinder((-1.1, -0.35, 1.02), 0.21, 0.02, plank, root, seg=12, rot=(0, math.pi / 2, 0), line=0.01)
    # The blade is what you paid for: copper at first, iron once upgraded (with iron bands on the posts).
    _saw_blade(root, (0.95, -0.35, 1.25), 0.75, rot=(math.pi / 2, 0, 0), metal='#e8904a' if level == 1 else '#c8d4e8')
    if level >= 2:
        for x in (-w / 2 + 0.2, w / 2 - 0.2):
            for z in (0.5, 1.6):
                box((x, -0.1, z), (0.28, 0.28, 0.08), toon('#8a92a8'), root, bevel=0.01, line=0.008)
        # Pine waiting its turn, beside the oak.
        log_pile(empty('pines', root, (w / 2 + 0.7, 0.9, 0)), 2, '#7a5238', '#f0dca0')
    # Planks stacked by the front corner, and logs waiting at the side.
    for i in range(4):
        box((w / 2 - 0.4, -d / 2 + 0.1, 0.26 + i * 0.1), (0.5, 1.2, 0.08), plank, root, bevel=0.02, rot=(0, 0, 0.05 * (i % 2)))
    log_pile(empty('pile', root, (-w / 2 - 0.3, 0.1, 0)), 3)
    return root


def bramhut():
    """Bram's hut beside the Sawmill: a little log cabin with a shingle roof, a stone chimney and his axe by the door."""
    root = empty('bramhut')
    w, d = 2 * TILE * 0.9, 1.9 * TILE * 0.7
    for i in range(5):
        z = 0.18 + i * 0.3
        for y in (-d / 2, d / 2):
            cylinder((0, y, z), 0.16, w + 0.2, toon('#9a6a44' if i % 2 else '#8a5a3a'), root, seg=10, rot=(0, math.pi / 2, 0))
        for x in (-w / 2, w / 2):
            cylinder((x, 0, z + 0.15), 0.16, d + 0.2, toon('#8a5a3a' if i % 2 else '#9a6a44'), root, seg=10, rot=(math.pi / 2, 0, 0))
    box((0, 0, 0.8), (w - 0.1, d - 0.1, 1.5), toon('#c89a6a'), root, bevel=0.05, line=0)
    profile([(-w / 2 - 0.35, 1.55), (0, 2.6), (w / 2 + 0.35, 1.55)], d + 0.6, toon('#6a8a5a'), root, bevel=0.08)
    box((0, -d / 2 - 0.2, 0.55), (0.55, 0.1, 0.95), toon('#6a4a2a'), root, bevel=0.1)
    box((-0.75, -d / 2 - 0.2, 0.95), (0.42, 0.08, 0.36), toon('#ffe9a0', rim=0.4, emit=0.2), root, bevel=0.05)
    box((w / 2 - 0.3, 0.2, 2.1), (0.38, 0.38, 1.4), toon('#9aa0b0'), root, bevel=0.06)
    # His axe, leaning by the door.
    ax = empty('axe', root, (0.62, -d / 2 - 0.3, 0.05))
    ax.rotation_euler = (0.25, 0, 0.1)
    cylinder((0, 0, 0.5), 0.035, 1.0, toon('#c89a6a'), ax, seg=8)
    profile([(0, 0), (0.28, -0.08), (0.3, 0.2), (0, 0.14)], 0.05, toon('#c8d0dc', rim=0.35), ax, loc=(0.02, 0, 0.82), bevel=0.01)
    return root


def camp_stump():
    """The huge old stump at Bram's camp, his axe still buried in it."""
    root = empty('campstump')
    cylinder((0, 0, 0.3), 0.8, 0.6, toon('#7a5238'), root, seg=20, r2=0.7)
    cylinder((0, 0, 0.61), 0.7, 0.03, toon('#f0dca0'), root, seg=20, line=0.012)
    for r in (0.2, 0.38, 0.55):
        torus((0, 0, 0.63), r, 0.012, toon('#c8a070'), root, seg=24, line=0)
    for a in (0.3, 1.9, 3.4, 5.0):
        cylinder((math.cos(a) * 0.75, math.sin(a) * 0.75, 0.12), 0.14, 0.5, toon('#7a5238'), root, seg=8, rot=(math.pi / 2, 0, a + math.pi / 2), line=0.014)
    ax = empty('axe', root, (0.15, 0, 0.62))
    ax.rotation_euler = (0, 0.5, 0.3)
    profile([(0, 0), (0.42, -0.1), (0.46, 0.28), (0, 0.2)], 0.06, toon('#c8d0dc', rim=0.35), ax, loc=(-0.2, 0, -0.1), bevel=0.01)
    cylinder((0.0, 0, 0.55), 0.045, 1.1, toon('#c89a6a'), ax, seg=8)
    return root


def camp_mill():
    """What's left of Bram's old mill: a lean-to with its roof caved in, and a broken saw blade."""
    root = empty('campmill')
    dark, wood = toon('#6a4a32'), toon('#9a7a5a')
    box((0, 0, 0.08), (3.2, 1.8, 0.16), toon('#8a7a62'), root, bevel=0.04)
    for x, h, tilt in ((-1.4, 1.8, 0), (1.4, 1.1, 0.25), (-1.4, 1.8, 0)):
        box((x, 0.7, h / 2), (0.18, 0.18, h), dark, root, bevel=0.02, rot=(0, tilt, 0))
    box((-1.4, -0.7, 0.8), (0.18, 0.18, 1.6), dark, root, bevel=0.02)
    # The roof has slumped down to the ground at one end.
    box((0, 0, 1.2), (3.3, 2.0, 0.1), wood, root, bevel=0.03, rot=(0, 0.42, 0))
    for i in range(3):
        box((0.6 + i * 0.35, -0.9, 0.08), (0.9, 0.12, 0.08), wood, root, bevel=0.02, rot=(0, 0, 0.6 * i - 0.4))
    _saw_blade(root, (-0.4, -0.85, 0.5), 0.5, rot=(math.pi / 2, 0, 0.3), broken=True)
    log_pile(empty('pile', root, (1.9, 0.5, 0)), 2)
    return root


SCENERY = {}
for i in range(3):
    SCENERY[f'tree{i}'] = (lambda i=i: tree(i), 150, 190)
    SCENERY[f'pine{i}'] = (lambda i=i: pine(i), 130, 200)
    SCENERY[f'crystal{i}'] = (lambda i=i: crystals(i), 130, 150)
    SCENERY[f'rock{i}'] = (lambda i=i: rock(i), 130, 110)
SCENERY['oak_node'] = (oak_node, 150, 190)
SCENERY['pine_node'] = (pine_node, 130, 200)
SCENERY['oak_stump'] = (lambda: stump('#9a6a44', '#e8c890'), 80, 70)
SCENERY['pine_stump'] = (lambda: stump('#7a5238', '#f0dca0'), 80, 70)
for name, (body, dark, nugget) in {'rock': ('#9aa0b0', '#80869a', '#f0f0f8'), 'copper': ('#8a7a6a', '#6e6054', '#ff9a4a'), 'iron': ('#5e6272', '#4a4d5c', '#c8dcf8')}.items():
    SCENERY[f'{name}_node'] = (lambda b=body, d=dark, n=nugget: ore_node(b, d, n), 130, 120)
    SCENERY[f'{name}_rubble'] = (lambda b=body, n=nugget: rubble(b, n), 80, 60)
for i in range(3):
    SCENERY[f'boulder{i}'] = (lambda i=i: rock(i, ('#8a8e9e', '#7a7e8e', '#9498a8')), 130, 110)
SCENERY['crystal_node'] = (lambda: crystal_node(), 130, 150)
SCENERY['crystal_rubble'] = (lambda: rubble('#8e89ad', '#9ae6ff'), 80, 60)
SCENERY['forge0'] = (forge_ruins, 480, 380)
SCENERY['forge'] = (forge, 480, 420)
SCENERY['forge2'] = (lambda: forge(2), 520, 420)
SCENERY['forge3'] = (lambda: forge(3), 520, 420)
SCENERY['forge4'] = (lambda: forge(4), 600, 420)
SCENERY['forge5'] = (lambda: forge(5), 600, 420)
SCENERY['home1'] = (tent, 300, 260)
SCENERY['home2'] = (lambda: house('#6ac86a'), 380, 360)
SCENERY['home3'] = (manor, 420, 480)
SCENERY['plot'] = (plot, 260, 150)
for lv in (1, 2, 3):
    SCENERY[f'garden{lv}'] = (lambda lv=lv: garden(lv), 280, 160)
    SCENERY[f'training{lv}'] = (lambda lv=lv: training(lv), 280, 220)
SCENERY['warp0'] = (lambda: warpstone(0), 150, 110)
SCENERY['warp1'] = (lambda: warpstone(1), 150, 230)
SCENERY['campfire'] = (campfire, 120, 110)
for g in ('bramble', 'crystal', 'rock'):
    SCENERY[f'gate_{g}'] = (lambda g=g: gate(g), 130, 150)
SCENERY['house_blue'] = (lambda: house('#6a9ae0'), 380, 360)
SCENERY['house_pink'] = (lambda: house('#e88ab0'), 380, 360)
SCENERY['fountain'] = (fountain, 220, 240)
SCENERY['statue_veyra'] = (lambda: veyra(1.0, offerings=True), 140, 220)
SCENERY['statue_veyra_wild'] = (lambda: veyra(1.0, weathered=True), 140, 220)
SCENERY['statue_king'] = (crowned_king, 140, 220)
SCENERY['waystone'] = (waystone, 70, 90)
SCENERY['sign'] = (sign, 90, 90)
SCENERY['lair'] = (lair, 400, 300)
SCENERY['sawmill0'] = (lambda: sawmill(0), 320, 220)
SCENERY['sawmill1'] = (lambda: sawmill(1), 360, 340)
SCENERY['sawmill2'] = (lambda: sawmill(2), 380, 340)
SCENERY['bramhut'] = (bramhut, 230, 260)
SCENERY['prop_campstump'] = (camp_stump, 170, 150)
SCENERY['prop_campmill'] = (camp_mill, 330, 230)
SCENERY['prop_logs'] = (lambda: log_pile(None, 3), 150, 130)
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
