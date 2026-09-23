"""Small models used only as menu icons: charms and crafting materials."""
import math

from lib import box, cone, crystal, cylinder, empty, lathe, profile, sphere, toon, torus

GOLD = '#ffd35a'


def clover_leaves(root, z=0.0, s=1.0, color='#5ac85a'):
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4
        sphere((math.cos(a) * 0.17 * s, -0.05, z + math.sin(a) * 0.17 * s), (0.15 * s, 0.05, 0.15 * s), toon(color), root)
    sphere((0, -0.09, z), 0.05 * s, toon('#3a9a3a'), root, line=0)


def heart(root, color, s=1.0, y=0.0):
    pts = []
    for i in range(40):
        t = i / 40 * math.tau
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 17 * 0.4 * s, z / 17 * 0.4 * s))
    return profile(pts, 0.16 * s, toon(color, rim=0.5), root, loc=(0, y, 0), bevel=0.05)


# ----------------------------------------------------------------------------- charms


def clovercharm():
    r = empty('i')
    torus((0, 0, 0.42), 0.08, 0.02, toon(GOLD), r, rot=(math.pi / 2, 0, 0))
    clover_leaves(r, s=1.3)
    cylinder((0.05, -0.05, -0.3), 0.025, 0.3, toon('#3a9a3a'), r, rot=(0, 0.3, 0), seg=8)
    return r


def toothcharm():
    r = empty('i')
    torus((0, 0, 0.15), 0.38, 0.025, toon('#8a5a3a'), r, rot=(math.pi / 2, 0, 0), seg=40)
    for i, a in enumerate((-0.5, 0, 0.5)):
        cone((math.sin(a) * 0.38, -0.05, 0.15 - math.cos(a) * 0.38 - 0.08), 0.07 + (i == 1) * 0.03, 0.26 + (i == 1) * 0.08, toon('#f4eee0'), r, rot=(math.pi, a * 0.5, 0), seg=10)
    return r


def crystalheart():
    r = empty('i')
    heart(r, '#ff8ac8', 1.25)
    heart(r, '#ffd0ec', 0.6, y=-0.08)
    return r


def impring():
    r = empty('i')
    torus((0, 0, -0.08), 0.3, 0.07, toon(GOLD), r, rot=(math.pi / 2 - 0.5, 0, 0), seg=40)
    crystal((0, -0.05, 0.2), 0.14, 0.3, toon('#ff4a5a', rim=0.5), r)
    for s in (-1, 1):
        cone((0.16 * s, 0.0, 0.26), 0.05, 0.22, toon('#fff0d0'), r, rot=(0, 0.4 * s, 0), seg=8)
    return r


# ----------------------------------------------------------------------------- materials


def goo():
    r = empty('i')
    sphere((0, 0, -0.1), (0.42, 0.36, 0.32), toon('#6fdc7a'), r)
    sphere((-0.15, -0.3, 0.02), (0.1, 0.04, 0.06), toon('#ffffff', rim=0), r, line=0)
    sphere((0.3, -0.1, -0.35), 0.1, toon('#6fdc7a'), r)
    return r


def fluff():
    r = empty('i')
    for x, z, s in ((-0.25, -0.05, 0.25), (0.25, -0.05, 0.25), (0, 0.12, 0.3), (0, -0.15, 0.25)):
        sphere((x, 0, z), s, toon('#ffffff'), r)
    return r


def clover():
    r = empty('i')
    clover_leaves(r, s=1.5)
    return r


def cap():
    r = empty('i')
    lathe([(0.0001, 0.36), (0.3, 0.3), (0.46, 0.1), (0.48, 0.0), (0.0001, 0.02)], toon('#e8505a'), r, loc=(0, 0, -0.2), rot=(0.4, 0, 0))
    for x, z in ((-0.18, 0.02), (0.15, 0.0), (0.0, 0.14)):
        sphere((x, -0.32, z), 0.06, toon('#ffffff'), r, line=0.01)
    return r


def bark():
    r = empty('i')
    box((0, 0, 0), (0.7, 0.3, 0.36), toon('#9a6a44'), r, bevel=0.1, rot=(0, 0.3, 0))
    cylinder((0.35, 0, 0.1), 0.19, 0.08, toon('#e8c890'), r, rot=(0, math.pi / 2 + 0.3, 0), seg=20)
    return r


def fang():
    r = empty('i')
    profile([(-0.12, 0.4), (0.12, 0.4), (0.14, 0.1), (0.05, -0.2), (-0.1, -0.45), (-0.08, -0.1), (-0.14, 0.15)], 0.16, toon('#f4eee0'), r, bevel=0.05)
    return r


def wing():
    r = empty('i')
    pts = [(-0.45, 0.2), (-0.1, 0.4), (0.4, 0.3), (0.45, -0.05), (0.3, -0.25), (0.15, -0.05), (0.0, -0.3), (-0.15, -0.05), (-0.35, -0.2)]
    profile(pts, 0.06, toon('#5a3a8a'), r, bevel=0.02)
    return r


def crystal_mat():
    r = empty('i')
    for x, h, tilt, c in ((0, 0.8, 0, '#b8a0ff'), (-0.22, 0.5, -0.4, '#8ae8ff'), (0.22, 0.55, 0.4, '#8ae8ff')):
        crystal((x, 0, -0.38), 0.12, h, toon(c, rim=0.45), r, rot=(0, tilt, 0))
    return r


def core():
    r = empty('i')
    torus((0, 0, 0), 0.33, 0.1, toon('#8a90a0'), r, rot=(math.pi / 2, 0, 0))
    sphere((0, 0, 0), 0.26, toon('#b8a0ff', emit=0.4), r)
    sphere((-0.08, -0.2, 0.08), 0.06, toon('#ffffff', rim=0), r, line=0)
    return r


def ember():
    r = empty('i')
    for s, z, c in ((0.3, -0.2, '#ff5a2a'), (0.2, -0.05, '#ff9a3a'), (0.11, 0.08, '#ffe07a')):
        sphere((0, -0.05 * (1 - s), z), s, toon(c, emit=0.6), r, line=0.016 if s > 0.25 else 0)
        cone((0, -0.05 * (1 - s), z + s * 1.2), s * 0.85, s * 2.2, toon(c, emit=0.6), r, seg=16, line=0.016 if s > 0.25 else 0)
    return r


def horn():
    r = empty('i')
    for i in range(8):
        t = i / 7
        sphere((-0.25 + t * 0.4, 0, -0.35 + t * 0.6 + math.sin(t * 2.5) * 0.1), 0.15 * (1 - t * 0.75), toon('#fff0d0'), r, line=0.016)
    return r


def scale():
    r = empty('i')
    pts = [(-0.35, 0.35), (0.35, 0.35), (0.3, -0.05), (0.0, -0.45), (-0.3, -0.05)]
    profile(pts, 0.1, toon('#e8603c'), r, bevel=0.06)
    profile([(-0.2, 0.25), (0.2, 0.25), (0.15, 0.0), (0, -0.22), (-0.15, 0.0)], 0.12, toon('#ff9a6a'), r, bevel=0.03, line=0)
    return r


def royaljelly():
    r = empty('i')
    from lib import lathe
    lathe([(0.0001, -0.4), (0.3, -0.4), (0.36, -0.1), (0.3, 0.2), (0.22, 0.28), (0.0001, 0.28)], toon('#8ac8ff', rim=0.5), r, seg=24)
    cylinder((0, 0, 0.32), 0.2, 0.1, toon('#ffd35a'), r, seg=20)
    for i in range(5):
        a = i / 5 * math.tau
        cone((math.cos(a) * 0.18, math.sin(a) * 0.18, 0.42), 0.04, 0.12, toon('#ffd35a'), r, seg=6, line=0.01)
    sphere((-0.12, -0.3, 0.0), (0.06, 0.03, 0.1), toon('#ffffff', rim=0), r, line=0)
    return r


def alphapelt():
    r = empty('i')
    profile([(-0.45, 0.3), (-0.2, 0.42), (0.2, 0.42), (0.45, 0.3), (0.4, -0.2), (0.2, -0.4), (0, -0.3), (-0.2, -0.4), (-0.4, -0.2)], 0.1, toon('#5a6488'), r, bevel=0.06)
    profile([(-0.25, 0.2), (0.25, 0.2), (0.2, -0.15), (0, -0.25), (-0.2, -0.15)], 0.12, toon('#f0f4ff'), r, bevel=0.04, line=0)
    return r


def kingcrystal():
    r = empty('i')
    crystal((0, 0, -0.45), 0.2, 0.9, toon('#e0c8ff', rim=0.5), r)
    crystal((-0.25, 0.05, -0.45), 0.12, 0.55, toon('#b8a0ff', rim=0.5), r, rot=(0, -0.4, 0))
    crystal((0.25, 0.05, -0.45), 0.12, 0.55, toon('#b8a0ff', rim=0.5), r, rot=(0, 0.4, 0))
    return r


CHARMS = {'clovercharm': clovercharm, 'toothcharm': toothcharm, 'crystalheart': crystalheart, 'impring': impring}
MATERIALS = {
    'goo': goo, 'fluff': fluff, 'clover': clover, 'cap': cap, 'bark': bark, 'fang': fang, 'wing': wing,
    'crystal': crystal_mat, 'core': core, 'ember': ember, 'horn': horn, 'scale': scale,
    'royaljelly': royaljelly, 'alphapelt': alphapelt, 'kingcrystal': kingcrystal,
}
