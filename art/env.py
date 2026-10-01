"""Overworld scenery. One map tile = 1.6 Blender units (so the 1.2-unit hero is ~3/4 of a tile tall).

Builders take a `seed` for small variations and return the root object. Buildings are sized in tiles
to match their collision boxes in world.ts.
"""
import math
import random

import buildings
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


def stump(bark, heart, ring='#c8a070', sprout=('#4fae4f', '#62c060'), glow=0.0):
    root = empty('stump')
    cylinder((0, 0, 0.11), 0.2, 0.22, toon(bark), root, seg=16, r2=0.17)
    cylinder((0, 0, 0.225), 0.165, 0.02, toon(heart, emit=glow), root, seg=16, line=0.012)
    torus((0, 0, 0.237), 0.09, 0.012, toon(ring, emit=glow), root, seg=20, line=0)
    for a in (0.4, 2.3, 4.2):
        cylinder((math.cos(a) * 0.2, math.sin(a) * 0.2, 0.04), 0.05, 0.18, toon(bark), root, seg=8, rot=(math.pi / 2, 0, a + math.pi / 2), line=0.014)
    # A little sprout: it's growing back.
    cylinder((0.06, -0.05, 0.3), 0.012, 0.12, toon(sprout[0]), root, seg=6, line=0.008)
    sphere((0.1, -0.05, 0.36), (0.06, 0.03, 0.035), toon(sprout[1], emit=glow), root, seg=10, rot=(0, -0.5, 0), line=0.01)
    return root


# Palettes shared by the map sprites and the minigame close-ups (art/gather.py) for the tier 3 and 4 trees.
GLIM = {'bark': '#e4e0f0', 'ridge': '#b4acd0', 'heart': '#f6f2ff', 'ring': '#c0b0f0',
        'leaves': ('#9a82e8', '#b8a0ff', '#9ae6ff', '#d8c8ff')}
EMBER = {'bark': '#3a3238', 'ridge': '#ff7a2a', 'heart': '#ffb45a', 'ring': '#e0602a',
         'leaves': ('#8a2a26', '#c8402a', '#ff7a3a', '#ffb45a')}


def _glow_line(root, pts, color, y, w=0.035, emit=0.9):
    """A bright crack drawn along a polyline on the front face (ember grain, obsidian veins)."""
    for a, b in zip(pts, pts[1:]):
        profile([a, (a[0] + w, a[1]), (b[0] + w, b[1]), b], 0.03, toon(color, emit=emit), root, loc=(0, y, 0), bevel=0, line=0)


def glimwood(seed=0):
    """A Glimmerwood tree: a pale, silvery trunk that forks into two limbs, crowned with glowing lilac and cyan leaf
    clusters and little crystal leaves poking out of them."""
    root = empty('glimwood')
    g = GLIM
    cylinder((0, 0, 0.35), 0.13, 0.7, toon(g['bark'], rim=0.4), root, seg=12, r2=0.1)
    for sx in (-1, 1):
        cylinder((sx * 0.12, 0, 0.78), 0.06, 0.34, toon(g['bark'], rim=0.4), root, seg=8, r2=0.035, rot=(0, sx * 0.6, 0), line=0.016)
    # Silver streaks up the bark.
    for x in (-0.05, 0.05):
        cylinder((x, -0.12, 0.36), 0.012, 0.5, toon(g['ridge']), root, seg=6, line=0)
    dark, mid, cyan, pale = g['leaves']
    # Leaf clusters back to front: deep lilac behind, lighter lilac, then small glowing cyan puffs in front.
    for x, y, z, s, col in ((-0.36, 0.14, 1.04, 0.3, dark), (0.36, 0.14, 1.08, 0.3, dark), (0, 0.16, 1.42, 0.34, dark),
                            (-0.22, -0.04, 1.26, 0.27, mid), (0.24, -0.04, 1.3, 0.26, mid), (0.02, -0.02, 1.02, 0.28, mid),
                            (-0.3, -0.26, 1.02, 0.15, cyan), (0.28, -0.24, 1.14, 0.14, cyan), (0.0, -0.24, 1.46, 0.14, cyan)):
        sphere((x, y, z), s, toon(col, rim=0.5, emit=0.22 if col != cyan else 0.4), root, seg=20)
    # Little crystal leaves tucked into the clusters, leaning out toward you.
    for x, z, tilt in ((-0.5, 1.2, -0.9), (0.5, 1.26, 0.9), (-0.16, 1.66, -0.5), (0.2, 1.68, 0.5)):
        crystal((x, -0.1, z), 0.05, 0.18, toon(pale, rim=0.5, emit=0.35), root, rot=(-0.5, tilt, 0), sides=5, line=0.012)
    for x, z in ((-0.12, 1.2), (0.14, 1.38), (-0.32, 1.3)):
        sphere((x, -0.34, z), 0.035, toon('#ffffff', emit=0.6), root, line=0.008)
    return root


def emberwood(seed=0):
    """An Emberwood tree: a gnarled, charcoal-black trunk split by glowing ember grain, bare twisting limbs and a few
    smouldering red-orange tufts, flat-topped like it grew up in the heat."""
    root = empty('emberwood')
    e = EMBER
    lathe([(0.0001, 0), (0.24, 0), (0.18, 0.1), (0.14, 0.4), (0.12, 0.72), (0.0001, 0.72)], toon(e['bark']), root, seg=14)
    _glow_line(root, ((-0.06, 0.05), (-0.03, 0.22), (-0.07, 0.4), (-0.04, 0.6)), e['ridge'], -0.155)
    _glow_line(root, ((0.05, 0.08), (0.03, 0.3), (0.06, 0.5)), e['ridge'], -0.15)
    # Twisting bare limbs.
    for x, z, tilt, l in ((-0.2, 0.86, -1.0, 0.46), (0.22, 0.9, 1.05, 0.5), (0.02, 0.98, 0.15, 0.4)):
        cylinder((x, 0, z), 0.06, l, toon(e['bark']), root, seg=8, r2=0.03, rot=(0, tilt, 0), line=0.016)
    dark, red, orange, hot = e['leaves']
    # A smouldering tuft at the end of each limb: a dark red puff, a brighter one and a hot glowing heart.
    for cx, cz, k in ((-0.42, 1.06, 1.0), (0.44, 1.12, 1.0), (0.04, 1.26, 1.15)):
        for dx, dy, dz, s, col, glow in ((0, 0.06, 0.02, 0.2, dark, 0.2), (-0.1, -0.02, -0.02, 0.15, red, 0.35), (0.1, -0.02, 0.0, 0.14, red, 0.35),
                                         (0, -0.1, 0.06, 0.13, orange, 0.6), (0.02, -0.18, 0.02, 0.07, hot, 0.8)):
            sphere((cx + dx * k, dy * k, cz + dz * k), (s * k, s * k * 0.85, s * k * 0.8), toon(col, emit=glow), root, seg=16, line=0.016)
    for x, z in ((-0.2, 1.42), (0.18, 1.5), (0.02, 1.62)):
        sphere((x, -0.2, z), 0.04, toon('#ffd07a', emit=0.9), root, line=0.01)
    return root


def glimwood_node():
    root = glimwood(0)
    ribbon(root, 0.3, 0.12)
    return root


def emberwood_node():
    root = emberwood(0)
    ribbon(root, 0.3, 0.155)
    return root


def obsidian_node():
    """An obsidian seam: a squat heap of glossy black glass shards, split by glowing ember veins."""
    root = empty('obsidian')
    glass, dark, vein = '#3a3248', '#241e2c', '#ff8a3a'
    sphere((0, 0, 0.22), (0.5, 0.42, 0.28), toon(dark, rim=0.6), root, seg=12, rot=(0, 0, 0.4))
    for x, y, h, tilt, r in ((-0.24, 0.04, 0.6, -0.45, 0.19), (0.1, 0.0, 0.74, 0.12, 0.21), (0.36, 0.06, 0.48, 0.6, 0.17)):
        crystal((x, y, 0.16), r, h, toon(glass, rim=0.9), root, rot=(0, tilt, 0), sides=5)
    # Glassy glints on the shards' faces.
    for pts in (((-0.3, 0.42), (-0.24, 0.44), (-0.33, 0.62)), ((0.06, 0.5), (0.12, 0.52), (0.08, 0.74)), ((0.38, 0.36), (0.43, 0.38), (0.44, 0.5))):
        profile(list(pts), 0.01, toon('#b8b0d8', emit=0.3), root, loc=(0, -0.24, 0), bevel=0, line=0)
    # Glowing veins across the front of the heap, and a couple of hot nuggets.
    for pts in (((-0.32, 0.12), (-0.2, 0.24), (-0.24, 0.36)), ((0.0, 0.1), (0.1, 0.26), (0.06, 0.4)), ((0.3, 0.1), (0.38, 0.26))):
        _glow_line(root, pts, vein, -0.38)
    for x, z, s in ((-0.1, 0.3, 0.05), (0.22, 0.34, 0.055)):
        crystal((x, -0.4, z), s, s * 1.8, toon('#ffb45a', emit=0.6, rim=0.5), root, rot=(0.9, 0.2 * x, 0), sides=5, line=0.012)
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


# Poppy's Garden draws each plot's soil and crop on its beds (see art/buildings/_garden.py).
SOIL, SOIL_DRY = '#6a4630', '#c8a476'


def soil(dry=False):
    """One plot's soil, heaped in its bed: dark and damp with furrows, or pale and cracked when it's thirsty."""
    root = empty('soil')
    sphere((0, 0, 0.02), (0.54, 0.46, 0.1), toon(SOIL_DRY if dry else SOIL), root, seg=24, line=0.012)
    for k in (-1, 0, 1):
        box((0, k * 0.22, 0.1), (0.8 - abs(k) * 0.2, 0.035, 0.03), toon('#b89060' if dry else '#50321f'), root, bevel=0.01, line=0)
    if dry:
        for x, y, a in ((-0.28, 0.08, 0.6), (0.22, -0.1, -0.5), (0.05, 0.2, 1.3), (-0.1, -0.2, -1.1)):
            box((x, y, 0.1), (0.2, 0.02, 0.02), toon('#8a6440'), root, rot=(0, 0, a), bevel=0, line=0)
    return root


def _leaf(parent, loc, size, col, yaw=0.0, tilt=0.5):
    sphere(loc, (size, size * 0.35, size * 0.55), toon(col), parent, rot=(0, -tilt, yaw), seg=12, line=0.01)


def crop(kind, stage):
    """A plot's crop at a stage: 1 a sprout, 2 growing, 3 ready to pick. Chunky, so it reads at phone size."""
    root = empty('crop')
    if stage == 1:
        col = {'berry': '#6ac85a', 'herb': '#8ad86a', 'flower': '#5ab85a'}[kind]
        cylinder((0, 0, 0.2), 0.035, 0.32, toon('#4a9a3a'), root, seg=6, line=0.012)
        for s in (-1, 1):
            sphere((0.14 * s, 0, 0.37), (0.16, 0.07, 0.09), toon(col), root, rot=(0, -0.35 * s, 0), seg=12, line=0.014)
        return root
    if kind == 'berry':
        big = stage == 3
        leaf = toon('#4aa84a')
        for x, y, z, r in ((-0.2, 0.05, 0.22, 0.2), (0.2, 0.05, 0.22, 0.2), (0, 0.12, 0.34, 0.22), (0, -0.08, 0.2, 0.2)):
            k = 1.2 if big else 0.9
            sphere((x * k, y, z * k), r * k, leaf, root, seg=16, line=0.014)
        if big:
            for x, z in ((-0.27, 0.27), (-0.1, 0.44), (0.13, 0.36), (0.29, 0.24), (-0.02, 0.22), (0.2, 0.5), (-0.22, 0.47)):
                sphere((x, -0.3, z), 0.075, toon('#e8405a', rim=0.4), root, seg=12, line=0.01)
                sphere((x - 0.02, -0.36, z + 0.03), 0.02, toon('#ffffff', rim=0), root, seg=6, line=0)
        else:
            for x, z in ((-0.15, 0.32), (0.12, 0.4), (0.18, 0.2)):
                sphere((x, -0.2, z), 0.04, toon('#ffffff'), root, seg=8, line=0.006)
    elif kind == 'herb':
        h = 0.62 if stage == 3 else 0.36
        n = 9 if stage == 3 else 5
        for i in range(n):
            a = (i / n) * math.tau
            x, y = math.cos(a) * 0.14, math.sin(a) * 0.08
            cylinder((x, y, h / 2), 0.02, h, toon('#3a8a3a'), root, seg=6, line=0.008, rot=(math.sin(a) * 0.3, -math.cos(a) * 0.3, 0))
            _leaf(root, (x * 2.1, y * 2.1 - 0.02, h * 0.55), 0.18 if stage == 3 else 0.14, '#5ac86a', yaw=a, tilt=0.2)
            _leaf(root, (x * 1.5, y * 1.5 - 0.02, h * 0.95), 0.16 if stage == 3 else 0.12, '#9ae88a' if stage == 3 else '#6ad87a', yaw=a + 0.5, tilt=-0.3)
        if stage == 3:
            sphere((0, 0, h + 0.05), (0.12, 0.08, 0.1), toon('#9ae88a'), root, seg=12, line=0.01)
    else:
        spots = ((-0.22, 0.02, '#ff8ab0'), (0.04, 0.1, '#ffd35a'), (0.26, -0.04, '#b08aff'))
        for i, (x, y, col) in enumerate(spots):
            h = (0.5 + (i == 1) * 0.12) if stage == 3 else 0.32 + (i == 1) * 0.06
            cylinder((x, y, h / 2), 0.022, h, toon('#4a9a3a'), root, seg=6, line=0.008)
            _leaf(root, (x + 0.08, y, h * 0.4), 0.1, '#6ac85a', tilt=0.6)
            if stage == 3:
                for p in range(5):
                    a = p / 5 * math.tau
                    sphere((x + math.cos(a) * 0.1, y - 0.06, h + math.sin(a) * 0.1), (0.085, 0.04, 0.085), toon(col), root, seg=12, line=0.01)
                sphere((x, y - 0.1, h), 0.055, toon('#ffb03a'), root, seg=10, line=0.008)
            else:
                sphere((x, y, h + 0.04), (0.06, 0.06, 0.09), toon(col), root, seg=12, line=0.01)
                for s in (-1, 1):
                    sphere((x + 0.03 * s, y - 0.02, h + 0.0), (0.035, 0.03, 0.07), toon('#5ab85a'), root, rot=(0, 0.4 * s, 0), seg=8, line=0.006)
    return root


def weeds():
    """Weeds crowding a plot's corners: spiky dark tufts and a dandelion, over whatever's growing."""
    root = empty('weeds')
    for cx, cy in ((-0.42, -0.12), (0.4, 0.14), (0.1, -0.3)):
        for i in range(7):
            a = (i - 3) * 0.3
            cone((cx + (i - 3) * 0.04, cy, 0.17), 0.06, 0.38, toon('#2e6e34' if i % 2 else '#3e8a3a'), root, rot=(0, a, 0), seg=4, line=0.01)
    cylinder((0.42, 0.12, 0.2), 0.012, 0.3, toon('#3e8a3a'), root, seg=6, line=0.006)
    sphere((0.42, 0.1, 0.36), 0.07, toon('#ffd83a'), root, seg=12, line=0.01)
    return root


def warpstone():
    """The Waystone's ruins: its broken stones on the old plinth (rebuilt, it's art/buildings/warp1.py)."""
    root = empty('warp')
    lathe([(0.0001, 0), (0.9, 0), (0.95, 0.15), (0.7, 0.25), (0.0001, 0.25)], toon('#9aa0b0'), root, seg=8)
    for x, y, h, r in ((-0.3, 0.1, 0.5, 0.3), (0.35, -0.1, 0.3, 0.4), (0.1, 0.35, 0.4, -0.2)):
        box((x, y, 0.25 + h / 2), (0.3, 0.3, h), toon('#8a8098'), root, bevel=0.05, rot=(0, r, 0.4))
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


def sawmill():
    """Where Bram's Sawmill will stand: a staked-out site with a pile of logs and some planks (built, it's
    art/buildings/sawmill<level>.py)."""
    root = empty('sawmill')
    w, d = 3.4 * TILE * 0.92, 2.4 * TILE * 0.8
    dark, plank = toon('#8a5a3a'), toon('#e8c890')
    box((0, 0, 0.03), (w, d, 0.06), toon('#c8a070'), root, bevel=0.03, line=0.012)
    for x in (-w / 2, w / 2):
        for y in (-d / 2, d / 2):
            cylinder((x, y, 0.3), 0.06, 0.6, dark, root, seg=6)
    log_pile(empty('pile', root, (-0.9, 0.2, 0)), 3)
    for i in range(3):
        box((1.1, -0.2 + i * 0.05, 0.06 + i * 0.09), (1.5, 0.35, 0.08), plank, root, bevel=0.02, rot=(0, 0, 0.1 * i))
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


def _cairn(root, r=0.36, n=6, color='#8a8e9e'):
    """A ring of rounded stones round a foot, with a little moss."""
    for i in range(n):
        a = i / n * math.tau + 0.3
        sphere((math.cos(a) * r, math.sin(a) * r * 0.8, 0.07), (0.13, 0.11, 0.09), toon(color), root, seg=10, line=0.014)
    sphere((-r * 0.7, -r * 0.5, 0.13), (0.1, 0.08, 0.03), toon('#7ab86a'), root, line=0.008)


def _hand_drum(root, loc, r, h, wood='#c8704a', skin='#f8ead0'):
    """A small drum hung on a totem, its skin facing out, laced round the side."""
    d = empty('drum', root, loc)
    # Its axis points at you, the skin on the near end.
    d.rotation_euler = (math.pi / 2, 0, 0)
    cylinder((0, 0, 0), r, h, toon(wood), d, seg=18, line=0.014)
    cylinder((0, 0, h / 2 + 0.008), r * 0.96, 0.02, toon(skin), d, seg=18, line=0.01)
    torus((0, 0, h / 2), r * 1.02, 0.018, toon('#6a3a2a'), d, seg=20, line=0)
    torus((0, 0, -h / 2), r * 1.02, 0.018, toon('#6a3a2a'), d, seg=20, line=0)
    for i in range(6):
        a = i / 6 * math.tau
        cylinder((math.cos(a) * r * 1.03, math.sin(a) * r * 1.03, 0), 0.012, h * 0.95, toon('#f0e0b8'), d, seg=4, line=0,
                 rot=(0.4 * math.sin(a), -0.4 * math.cos(a), 0))
    return d


def _closed_eyes(root, loc, w=0.09, color='#4a3a4a'):
    """Two little carved arcs: eyes shut, peaceful."""
    for s in (-1, 1):
        box((loc[0] + w * s, loc[1], loc[2]), (0.08, 0.02, 0.022), toon(color), root, rot=(0, 0.25 * s, 0), bevel=0.008, line=0)


def flower_at(root, loc, color):
    f = empty('flower', root, loc)
    for i in range(5):
        a = i / 5 * math.tau
        sphere((math.cos(a) * 0.05, math.sin(a) * 0.05, 0.03), (0.045, 0.045, 0.015), toon(color), f, line=0.006)
    sphere((0, 0, 0.04), 0.025, toon('#ffd35a'), f, line=0)
    return f


def totem(variant=0, fresh=False):
    """A Pebblor bone totem in their chamber: a pole of carved bone on a stone foot, a small drum hung on it, a round
    stone face with its eyes shut on top, moss, and little offerings at its foot. `fresh`: the new one, pale and clean,
    with a garland of flowers instead of moss."""
    root = empty('totem')
    bone, ring = ('#f6f0e2', '#d8ccb0') if fresh else ('#e8dcc2', '#bfae8a')
    stone = '#9ea2b2' if fresh else '#8a8e9e'
    _cairn(root, color=stone)
    cylinder((0, 0, 0.2), 0.22, 0.4, toon(stone), root, seg=14, r2=0.19)
    # The pole: carved bone segments with rings between, tapering up.
    z = 0.4
    for h, r in ((0.42, 0.15), (0.36, 0.135), (0.3, 0.12)):
        cylinder((0, 0, z + h / 2), r, h, toon(bone), root, seg=14, r2=r * 0.9)
        torus((0, 0, z + h), r * 0.96, 0.03, toon(ring), root, seg=20, line=0.01)
        z += h
    # Its face: a round stone, eyes shut.
    sphere((0, 0, z + 0.2), (0.24, 0.21, 0.22), toon(stone), root, seg=20)
    _closed_eyes(root, (0, -0.2, z + 0.2))
    if variant == 1:
        # Two little bone horns, like a Pebblor's crystals, and two drums.
        for s in (-1, 1):
            cone((0.14 * s, 0, z + 0.38), 0.05, 0.22, toon(bone), root, rot=(0, 0.45 * s, 0), seg=10, line=0.012)
        _hand_drum(root, (0.15, -0.2, 0.68), 0.15, 0.14)
        _hand_drum(root, (-0.13, -0.19, 0.98), 0.12, 0.12)
    else:
        crystal((0.08, 0.02, z + 0.33), 0.05, 0.2, toon('#8ae8ff', rim=0.4, emit=0.2), root, rot=(0, 0.3, 0))
        _hand_drum(root, (0, -0.22, 0.82), 0.18, 0.16)
    if fresh:
        # A garland of flowers round its neck, a little stack of pebbles and a flower at its foot.
        for i in range(10):
            a = i / 10 * math.tau
            col = ('#ff9ac0', '#ffffff', '#ffd35a')[i % 3]
            sphere((math.cos(a) * 0.19, math.sin(a) * 0.17, z - 0.05 - 0.04 * math.sin(a)), 0.05, toon(col), root, seg=10, line=0.008)
        for zz, r in ((0.05, 0.07), (0.15, 0.055), (0.23, 0.04)):
            sphere((0.36, -0.28, zz), (r, r * 0.9, r * 0.7), toon('#b0b4c4'), root, seg=10, line=0.01)
        flower_at(root, (-0.3, -0.34, 0.02), '#ff9ac0')
    else:
        sphere((0.12, -0.08, 0.42), (0.13, 0.1, 0.04), toon('#7ab86a'), root, line=0.01)
        sphere((-0.1, 0.06, 1.05), (0.1, 0.09, 0.03), toon('#6aa85a'), root, line=0.008)
        # An offering: a small glowing pebble, like a Pebblor's eye.
        sphere((0.3, -0.3, 0.06), (0.07, 0.06, 0.05), toon('#bfeeff', emit=0.5), root, seg=12, line=0.01)
    return root


def stone_figure():
    """The one who didn't come back: a little Pebblor of plain stone, sitting still with its head bowed and its eyes
    shut, no glow in them, moss on its shoulder and a white flower in its lap."""
    root = empty('figure')
    stone, dark = toon('#a8acba'), toon('#8a8e9e')
    for s in (-1, 1):
        box((0.14 * s, -0.12, 0.09), (0.17, 0.26, 0.16), dark, root, bevel=0.05)
    box((0, 0, 0.36), (0.5, 0.38, 0.4), stone, root, bevel=0.1)
    head = empty('head', root, (0, -0.03, 0.66))
    head.rotation_euler = (0.32, 0, 0)
    box((0, 0, 0), (0.34, 0.29, 0.25), stone, head, bevel=0.07)
    _closed_eyes(head, (0, -0.15, -0.01), w=0.07)
    for s in (-1, 1):
        box((0.3 * s, -0.04, 0.3), (0.15, 0.17, 0.26), dark, root, bevel=0.05, rot=(0.25, 0, 0))
    sphere((0.14, 0.04, 0.57), (0.13, 0.11, 0.035), toon('#7ab86a'), root, line=0.008)
    crystal((-0.1, 0.06, 0.1), 0.04, 0.15, toon('#c8ccd8', rim=0.3), head, rot=(0, -0.3, 0))
    flower_at(root, (0, -0.22, 0.2), '#ffffff')
    return root


def petals():
    """A few petals dropped on the ground: Poppy's trail home."""
    root = empty('petals')
    r = random.Random(4)
    for i in range(6):
        a = r.uniform(0, math.tau)
        col = ('#ff9ac0', '#ffc8dc', '#ffffff')[i % 3]
        sphere((math.cos(a) * r.uniform(0.05, 0.28), math.sin(a) * r.uniform(0.05, 0.2), 0.015), (0.07, 0.04, 0.012), toon(col), root,
               rot=(0, 0, r.uniform(0, math.pi)), seg=10, line=0.006)
    return root


def climb_slope():
    """The way back up out of the tunnel below: a slope of rubble up to a crack of light, and an old root to hold."""
    root = empty('climb')
    r = random.Random(7)
    for row in range(4):
        for i in range(4 - row):
            x = (i - (3 - row) / 2) * 0.32 + r.uniform(-0.05, 0.05)
            sphere((x, 0.3 + row * 0.18, 0.08 + row * 0.2), (0.17, 0.14, 0.12), toon(('#8a8e9e', '#7a7e8e', '#9498a8')[(i + row) % 3]),
                   root, seg=10, line=0.014)
    # A thin crack of daylight at the top.
    profile([(0, 0), (0.06, 0.12), (0.01, 0.22), (0.07, 0.36), (0.02, 0.46), (-0.03, 0.36), (0.02, 0.22), (-0.04, 0.12)], 0.04,
            toon('#fff4c8', emit=0.9), root, loc=(0.0, 0.85, 0.8), line=0)
    for i in range(6):
        a = i / 6
        cylinder((0.3 + math.sin(a * 5) * 0.05, 0.62 - a * 0.25, 1.1 - a * 0.95), 0.03, 0.22, toon('#8a5a3a'), root, seg=6,
                 rot=(0.25, 0, 0), line=0.01)
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
SCENERY['glimwood_node'] = (glimwood_node, 150, 200)
SCENERY['glimwood_stump'] = (lambda: stump(GLIM['bark'], GLIM['heart'], GLIM['ring'], ('#b4acd0', '#b8a0ff'), 0.2), 80, 70)
SCENERY['emberwood_node'] = (emberwood_node, 150, 190)
SCENERY['emberwood_stump'] = (lambda: stump(EMBER['bark'], EMBER['heart'], EMBER['ring'], ('#3a3238', '#ff7a3a'), 0.4), 80, 70)
SCENERY['obsidian_node'] = (obsidian_node, 130, 140)
SCENERY['obsidian_rubble'] = (lambda: rubble('#2e2836', '#ff8a3a'), 80, 60)
SCENERY['forge0'] = (forge_ruins, 480, 380)
SCENERY['home1'] = (tent, 300, 260)
SCENERY['plot'] = (plot, 260, 150)
SCENERY['warp0'] = (warpstone, 150, 110)
# Every built level is its assembly scene's finished building (art/buildings), so the map shows what you watched rise.
for name, w, h in (('home2', 380, 360), ('home3', 420, 520), ('forge1', 500, 440), ('forge2', 520, 440), ('forge3', 560, 440),
                   ('forge4', 640, 440), ('forge5', 640, 460), ('warp1', 180, 230), ('sawmill1', 380, 340), ('sawmill2', 420, 340),
                   ('sawmill3', 440, 360), ('sawmill4', 440, 360), ('cottage1', 260, 290), ('garden1', 300, 180), ('garden2', 300, 180),
                   ('garden3', 300, 200), ('training1', 300, 240), ('training2', 300, 240), ('training3', 300, 240)):
    # The map and the menus call the repaired Forge plain "forge".
    SCENERY['forge' if name == 'forge1' else name] = (lambda name=name: buildings.whole(name), w, h)
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
SCENERY['sawmill0'] = (sawmill, 320, 220)
SCENERY['bramhut'] = (bramhut, 230, 260)
SCENERY['prop_campstump'] = (camp_stump, 170, 150)
SCENERY['prop_campmill'] = (camp_mill, 330, 230)
SCENERY['prop_logs'] = (lambda: log_pile(None, 3), 150, 130)
# The Pebblors' chamber in Echo Cavern (the drums in the dark): their bone totems, the new one, the stone figure laid
# before it, Poppy's petals home, and the slope out of the tunnel below.
SCENERY['prop_totem0'] = (lambda: totem(0), 90, 170)
SCENERY['prop_totem1'] = (lambda: totem(1), 90, 170)
SCENERY['prop_totem_new'] = (lambda: totem(0, fresh=True), 90, 170)
SCENERY['prop_stonefigure'] = (stone_figure, 80, 90)
SCENERY['prop_petals'] = (petals, 60, 40)
SCENERY['prop_climb'] = (climb_slope, 110, 130)
# Poppy's plots: soil (damp or thirsty), each crop at each stage, and weeds to lay over them.
SCENERY['soil'] = (soil, 90, 60)
SCENERY['soil_dry'] = (lambda: soil(True), 90, 60)
for kind in ('berry', 'herb', 'flower'):
    for st in (1, 2, 3):
        SCENERY[f'crop_{kind}_{st}'] = (lambda k=kind, s=st: crop(k, s), 90, 90)
SCENERY['weeds'] = (weeds, 90, 70)
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
