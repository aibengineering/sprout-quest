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


def pine_log():
    r = empty('i')
    box((0, 0, 0), (0.7, 0.28, 0.32), toon('#a8703e'), r, bevel=0.1, rot=(0, 0.3, 0))
    cylinder((0.35, 0, 0.1), 0.17, 0.08, toon('#f0dca0'), r, rot=(0, math.pi / 2 + 0.3, 0), seg=20)
    for x, a in ((-0.1, -0.5), (0.02, 0.1)):
        cone((x, -0.1, 0.24), 0.07, 0.2, toon('#2f7a45'), r, seg=8, rot=(0.2, a, 0), line=0.012)
    return r


def axe(blade, points, lash='#e8d8a0'):
    """Handle along X with the blade rising from its far end; tilted diagonally like the weapon icons."""
    r = empty('i')
    cylinder((0, 0, 0), 0.05, 1.0, toon('#b98a5a'), r, seg=10, rot=(0, math.pi / 2, 0))
    profile(points, 0.09, toon(blade, rim=0.35), r, bevel=0.02)
    box((0.39, 0, -0.04), (0.16, 0.1, 0.1), toon(blade), r, bevel=0.03)
    torus((0.28, 0, 0), 0.06, 0.02, toon(lash), r, rot=(0, math.pi / 2, 0), line=0.01)
    r.rotation_euler = (0, -math.pi / 4, 0)
    r.scale = (0.85, 0.85, 0.85)
    r.location = (0.02, 0, -0.14)
    return r


def ore(body, nugget):
    r = empty('i')
    sphere((0, 0, 0), (0.42, 0.36, 0.34), toon(body), r, seg=14, rot=(0.3, 0.2, 0.5))
    sphere((0.2, -0.1, -0.12), (0.2, 0.18, 0.16), toon(body), r, seg=10)
    if nugget:
        for x, z, s in ((-0.12, 0.12, 0.09), (0.12, 0.2, 0.08), (0.18, -0.05, 0.07), (-0.2, -0.1, 0.06)):
            crystal((x, -0.3, z), s, s * 1.8, toon(nugget, emit=0.35, rim=0.5), r, rot=(0.9, 0.3 * x, 0), sides=5, line=0.012)
    return r


def pick(head, lash='#e8d8a0'):
    """Handle along X with a curved two-pointed head across its far end; tilted like the axe icons."""
    r = empty('i')
    cylinder((0, 0, 0), 0.05, 1.0, toon('#b98a5a'), r, seg=10, rot=(0, math.pi / 2, 0))
    profile([(0.28, -0.44), (0.44, -0.24), (0.55, 0.0), (0.44, 0.24), (0.28, 0.44), (0.36, 0.2), (0.39, 0.0), (0.36, -0.2)], 0.12, toon(head, rim=0.35), r, bevel=0.025)
    box((0.42, 0, 0), (0.12, 0.11, 0.14), toon(head), r, bevel=0.03)
    torus((0.3, 0, 0), 0.06, 0.02, toon(lash), r, rot=(0, math.pi / 2, 0), line=0.01)
    r.rotation_euler = (0, -math.pi / 4, 0)
    r.scale = (0.85, 0.85, 0.85)
    r.location = (0.02, 0, -0.1)
    return r


def glimmer_jelly():
    r = empty('i')
    sphere((0, 0, 0), (0.36, 0.32, 0.3), toon('#b8a8f8', rim=0.4), r, seg=24)
    sphere((-0.12, -0.26, 0.12), (0.08, 0.03, 0.05), toon('#ffffff', rim=0), r, line=0)
    crystal((0.12, -0.05, 0.2), 0.06, 0.24, toon('#e0d0ff', rim=0.5), r, rot=(0, 0.3, 0), sides=5)
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


def echowing():
    """The Echo Queen's trophy: a dusky wing that shimmers lilac, with a little crystal at its joint."""
    r = empty('i')
    pts = [(-0.45, 0.2), (-0.1, 0.4), (0.4, 0.3), (0.45, -0.05), (0.3, -0.25), (0.15, -0.05), (0.0, -0.3), (-0.15, -0.05), (-0.35, -0.2)]
    profile(pts, 0.06, toon('#6a4ab8', rim=0.5), r, bevel=0.02)
    crystal((-0.2, -0.05, 0.05), 0.08, 0.22, toon('#e0d0ff', rim=0.5), r, rot=(0.3, 0, 0.4))
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


def plank(face='#e8c890', mark='#c8a070', grain=None, emit=0.0, knot=None):
    """Two sawn planks, crossed, tipped toward you so their faces show. Oak by default; other woods pass their colours,
    long grain lines along the boards (`grain`, glowing with `emit`) and a knot."""
    r = empty('i')
    for rot, z in ((0.35, -0.05), (-0.35, 0.05)):
        box((0, 0, z), (1.1, 0.26, 0.08), toon(face), r, rot=(0, 0, rot), bevel=0.02)
        for k in (-0.3, 0.1, 0.4):
            box((k * math.cos(rot), k * math.sin(rot), z + 0.045), (0.08, 0.2, 0.01), toon(mark, rim=0), r, rot=(0, 0, rot), bevel=0.003, line=0)
        if grain:
            for off, a, b in ((-0.07, -0.5, -0.05), (0.02, -0.2, 0.3), (0.08, 0.15, 0.5)):
                mid, ln = (a + b) / 2, b - a
                x, y = mid * math.cos(rot) - off * math.sin(rot), mid * math.sin(rot) + off * math.cos(rot)
                box((x, y, z + 0.046), (ln, 0.018, 0.01), toon(grain, rim=0, emit=emit), r, rot=(0, 0, rot), bevel=0, line=0)
        if knot:
            k = -0.12
            sphere((k * math.cos(rot) + 0.03 * math.sin(rot), k * math.sin(rot) - 0.03 * math.cos(rot), z + 0.045),
                   (0.045, 0.028, 0.008), toon(knot, rim=0, emit=emit), r, rot=(0, 0, rot), line=0)
    r.rotation_euler = (0.6, 0, 0)
    return r


def _log(bark_col, end, ring, grain=(), emit=0.0):
    """A log like the bark and pine icons: a chunky tilted log, its cut end showing, with lines of grain along it."""
    r = empty('i')
    log = empty('log', r)
    log.rotation_euler = (0, 0.3, 0)
    box((0, 0, 0), (0.7, 0.3, 0.34), toon(bark_col), log, bevel=0.1)
    cylinder((0.35, 0, 0), 0.18, 0.08, toon(end, emit=emit * 0.4), log, rot=(0, math.pi / 2, 0), seg=20)
    torus((0.395, 0, 0), 0.1, 0.014, toon(ring, emit=emit * 0.5), log, rot=(0, math.pi / 2, 0), seg=20, line=0)
    for z, x0, x1, col in grain:
        box(((x0 + x1) / 2, -0.152, z), (x1 - x0, 0.01, 0.028), toon(col, rim=0, emit=emit), log, bevel=0, line=0)
    return r


def glimwood_log():
    r = _log('#e4e0f0', '#f6f2ff', '#c0b0f0', ((0.07, -0.26, 0.12, '#b8a0ff'), (-0.06, -0.12, 0.26, '#9ae6ff')), 0.45)
    for x, a, col in ((-0.12, -0.5, '#d8c8ff'), (0.02, 0.2, '#9ae6ff')):
        crystal((x, -0.04, 0.2), 0.05, 0.2, toon(col, rim=0.5, emit=0.35), r, rot=(0.2, a, 0), sides=5, line=0.012)
    return r


def emberwood_log():
    r = _log('#3a3238', '#ffb45a', '#e0602a', ((0.08, -0.28, -0.02, '#ff7a2a'), (0.03, -0.04, 0.2, '#ff7a2a'),
                                                (-0.07, -0.18, 0.1, '#ffb45a')), 0.9)
    sphere((0.0, -0.1, 0.3), 0.04, toon('#ffd07a', emit=0.9), r, line=0.01)
    sphere((0.14, -0.1, 0.38), 0.03, toon('#ffd07a', emit=0.9), r, line=0.008)
    return r


def obsidian():
    """A chunk of glossy black volcanic glass with glowing ember veins."""
    r = empty('i')
    glass = '#3a3248'
    crystal((0, 0, -0.4), 0.3, 0.82, toon(glass, rim=0.9), r, rot=(0, 0.15, 0), sides=5)
    crystal((-0.26, 0.04, -0.42), 0.18, 0.5, toon(glass, rim=0.9), r, rot=(0, -0.5, 0), sides=5)
    crystal((0.28, 0.04, -0.42), 0.16, 0.42, toon(glass, rim=0.9), r, rot=(0, 0.55, 0), sides=5)
    profile([(-0.02, 0.1), (0.05, 0.12), (-0.04, 0.36)], 0.01, toon('#c8c0e8', emit=0.3), r, loc=(0, -0.3, 0), bevel=0, line=0)
    for pts in (((-0.1, -0.36), (0.02, -0.16), (-0.04, 0.02)), ((0.02, -0.16), (0.14, -0.06))):
        for a, b in zip(pts, pts[1:]):
            profile([a, (a[0] + 0.045, a[1]), (b[0] + 0.045, b[1]), b], 0.02, toon('#ff8a3a', emit=0.9), r, loc=(0, -0.3, 0),
                    bevel=0, line=0)
    r.scale = (0.85,) * 3
    return r


def pie():
    """Granny's pie for Bram: a golden lattice crust in a tin."""
    r = empty('i')
    cylinder((0, 0, -0.1), 0.48, 0.14, toon('#b8bcc8'), r, seg=28, r2=0.42)
    cylinder((0, 0, -0.02), 0.45, 0.08, toon('#e8a860'), r, seg=28)
    for k in range(-2, 3):
        box((k * 0.15, 0, 0.03), (0.06, 0.8 - abs(k) * 0.12, 0.03), toon('#f0c070'), r, bevel=0.01, line=0.008)
        box((0, k * 0.15, 0.05), (0.8 - abs(k) * 0.12, 0.06, 0.03), toon('#f0c070'), r, bevel=0.01, line=0.008)
    sphere((0.12, -0.1, 0.04), (0.05, 0.05, 0.02), toon('#c83a5a'), r, line=0)
    r.rotation_euler = (0.7, 0, 0)
    return r


def _plate(r, z=-0.3, rad=0.5):
    cylinder((0, 0, z), rad, 0.05, toon('#ffffff'), r, seg=28, r2=rad * 0.8)


def pancakes():
    r = empty('i')
    _plate(r)
    for i in range(3):
        cylinder((0, 0, -0.22 + i * 0.12), 0.34, 0.1, toon('#e8b060'), r, seg=24)
    cylinder((0, 0, 0.1), 0.3, 0.03, toon('#b86a2a', rim=0.3), r, seg=24, line=0)  # syrup
    box((0, 0, 0.16), (0.14, 0.14, 0.08), toon('#fff0a0'), r, bevel=0.02)  # butter
    r.rotation_euler = (0.5, 0, 0)
    return r


def tea():
    r = empty('i')
    cylinder((0, 0, -0.35), 0.42, 0.04, toon('#ffffff'), r, seg=24)
    cylinder((0, 0, -0.05), 0.3, 0.55, toon('#f0f4ff'), r, seg=24, r2=0.25)
    cylinder((0, 0, 0.2), 0.27, 0.02, toon('#9ac85a', rim=0.3), r, seg=24, line=0)
    torus((0.33, 0, -0.05), 0.12, 0.035, toon('#f0f4ff'), r, rot=(math.pi / 2, 0, 0))
    clover_leaves(r, 0.24, 0.35)
    r.rotation_euler = (0.45, 0, 0)
    return r


def goojelly():
    r = empty('i')
    _plate(r, -0.35)
    lathe([(0.0, -0.3), (0.34, -0.3), (0.3, 0.0), (0.2, 0.18), (0.0, 0.22)], toon('#62d85a', rim=0.45), r)
    sphere((-0.08, -0.12, 0.08), (0.05, 0.03, 0.07), toon('#ffffff', rim=0), r, line=0)
    sphere((0, 0, 0.3), 0.07, toon('#e8404a'), r, line=0.01)  # a berry on top
    r.rotation_euler = (0.45, 0, 0)
    return r


def stew():
    r = empty('i')
    lathe([(0.0, -0.35), (0.3, -0.35), (0.48, -0.1), (0.5, 0.05), (0.0, 0.05)], toon('#a8743a'), r)
    cylinder((0, 0, 0.02), 0.44, 0.04, toon('#c8743a', rim=0.3), r, seg=24, line=0)
    for x, y, c in ((-0.15, 0.05, '#ff9a4a'), (0.12, -0.1, '#8ad85a'), (0.05, 0.18, '#e8c890')):
        sphere((x, y, 0.07), 0.07, toon(c), r, line=0.01)
    cylinder((0.3, 0.2, 0.25), 0.03, 0.6, toon('#c89a6a'), r, seg=8, rot=(0, 0.6, 0.4))
    r.rotation_euler = (0.55, 0, 0)
    return r


# ----------------------------------------------------------------------------- Poppy's Garden


def seed_packet(paper, emblem):
    """A little paper seed packet, folded over at the top, with what it grows on the front and a few seeds spilling out."""
    r = empty('i')
    box((0, 0, 0), (0.62, 0.1, 0.78), toon(paper), r, bevel=0.04)
    box((0, 0.0, 0.42), (0.64, 0.12, 0.12), toon('#fff4e2'), r, bevel=0.03, line=0.012)
    cylinder((0, -0.06, -0.02), 0.2, 0.02, toon('#fff4e2', rim=0), r, seg=24, rot=(math.pi / 2, 0, 0), line=0.01)
    emblem(r)
    for x, z in ((0.34, -0.42), (0.44, -0.36), (0.26, -0.47)):
        sphere((x, -0.12, z), (0.05, 0.04, 0.035), toon('#a8784e'), r, seg=10, line=0.008)
    r.rotation_euler = (0, 0.18, 0.12)
    return r


def _berry_emblem(r):
    for x, z in ((-0.06, -0.06), (0.07, -0.05), (0.0, 0.05)):
        sphere((x, -0.12, z), 0.065, toon('#e8405a', rim=0.4), r, seg=12, line=0.008)
    sphere((0.0, -0.12, 0.13), (0.07, 0.02, 0.035), toon('#4aa84a'), r, seg=10, line=0.006)


def _herb_emblem(r):
    for a in (-0.6, 0, 0.6):
        sphere((math.sin(a) * 0.08, -0.12, math.cos(a) * 0.08 - 0.04), (0.04, 0.02, 0.1), toon('#5ac86a'), r, rot=(0, a, 0), seg=10, line=0.006)


def _flower_emblem(r):
    for p in range(5):
        a = p / 5 * math.tau
        sphere((math.cos(a) * 0.07, -0.12, math.sin(a) * 0.07), 0.05, toon('#ff8ab0'), r, seg=10, line=0.006)
    sphere((0, -0.14, 0), 0.035, toon('#ffb03a'), r, seg=8, line=0)


def berry():
    """A handful of ripe red berries on a sprig."""
    r = empty('i')
    for x, y, z, s in ((-0.2, 0, -0.12, 0.2), (0.2, 0, -0.14, 0.19), (0.0, 0, 0.1, 0.21), (-0.02, 0, -0.3, 0.17), (0.02, -0.12, -0.08, 0.16)):
        sphere((x, y, z), s, toon('#e8405a', rim=0.4), r, seg=20)
        sphere((x - s * 0.35, y - s * 0.9, z + s * 0.35), s * 0.22, toon('#ffffff', rim=0), r, seg=8, line=0)
    for s in (-1, 1):
        sphere((0.12 * s, 0.05, 0.36), (0.2, 0.06, 0.09), toon('#4aa84a'), r, rot=(0, -0.5 * s, 0), seg=12)
    cylinder((0, 0.02, 0.36), 0.025, 0.2, toon('#3a8a3a'), r, seg=6, line=0.01)
    return r


def herb():
    """A bunch of fresh herbs, tied with twine."""
    r = empty('i')
    base = (0, -0.42)
    for i, a in enumerate((-0.55, -0.2, 0.2, 0.55, 0.0)):
        # Each sprig fans up from the tie, with leaves in pairs along it and a light tip.
        n = 3 if i < 4 else 4
        for k in range(n):
            t = 0.22 + k * 0.2
            x, z = base[0] + math.sin(a) * t, base[1] + math.cos(a) * t
            for s in (-1, 1):
                sphere((x + math.cos(a) * 0.07 * s, -0.02 - 0.01 * i, z - math.sin(a) * 0.07 * s + 0.03), (0.045, 0.03, 0.11),
                       toon('#5ac86a' if k < n - 1 else '#9ae88a'), r, rot=(0, a + 0.9 * s, 0), seg=12, line=0.01)
        cylinder((base[0] + math.sin(a) * 0.35, 0, base[1] + math.cos(a) * 0.35), 0.022, 0.7, toon('#3a8a3a'), r, seg=6, rot=(0, a, 0), line=0.01)
    torus((0, -0.02, -0.28), 0.06, 0.03, toon('#e8c890'), r, rot=(math.pi / 2, 0, 0), line=0.008)
    return r


def flower():
    """Three picked flowers: pink, yellow and lilac."""
    r = empty('i')
    bx, bz = 0.02, -0.45
    for x, z, col in ((-0.22, 0.12, '#ff8ab0'), (0.05, 0.28, '#ffd35a'), (0.26, 0.08, '#b08aff')):
        dx, dz = x - bx, z - bz
        cylinder(((x + bx) / 2, 0.05, (z + bz) / 2), 0.022, math.hypot(dx, dz), toon('#4a9a3a'), r, seg=6, rot=(0, math.atan2(dx, dz), 0), line=0.01)
        for p in range(5):
            t = p / 5 * math.tau
            sphere((x + math.cos(t) * 0.1, 0, z + math.sin(t) * 0.1), (0.085, 0.04, 0.085), toon(col), r, seg=12, line=0.012)
        sphere((x, -0.04, z), 0.055, toon('#ffb03a'), r, seg=10, line=0.008)
    sphere((0.1, 0.02, -0.25), (0.12, 0.03, 0.05), toon('#6ac85a'), r, rot=(0, -0.5, 0), seg=10)
    return r


def echoanklet():
    """The Pebblors' gift: tiny drum-stones strung on a cord, with one glowing echo bead."""
    r = empty('i')
    loop = empty('loop', r)
    loop.rotation_euler = (1.15, 0, 0.2)
    torus((0, 0, 0), 0.36, 0.024, toon('#a87a52'), loop, seg=40, line=0.01)
    n = 7
    for i in range(n):
        a = i / n * math.tau + 0.35
        d = empty('drum', loop, (math.cos(a) * 0.36, math.sin(a) * 0.36, 0))
        d.rotation_euler = (math.pi / 2, 0, a + math.pi / 2)
        if i == 3:
            sphere((0, 0, 0), 0.095, toon('#8ae8ff', rim=0.5, emit=0.5), d, seg=16, line=0.012)
            continue
        cylinder((0, 0, 0), 0.095, 0.13, toon(('#9aa0b0', '#8a8e9e')[i % 2]), d, seg=16, line=0.012)
        cylinder((0, 0, 0.067), 0.088, 0.014, toon('#f4e2c0'), d, seg=16, line=0.006)
        cylinder((0, 0, -0.067), 0.088, 0.014, toon('#f4e2c0'), d, seg=16, line=0.006)
        torus((0, 0, 0), 0.097, 0.014, toon('#6a4a32'), d, seg=16, line=0)
    # The knot, and its two loose ends.
    sphere((0, -0.36, 0), 0.04, toon('#8a5a3a'), loop, line=0.008)
    for s in (-1, 1):
        cylinder((0.04 * s, -0.46, 0), 0.016, 0.2, toon('#a87a52'), loop, rot=(math.pi / 2, 0, 0.3 * s), seg=6, line=0.006)
    return r


ITEMS = {'echoanklet': echoanklet, 'pie': pie, 'meal_pancakes': pancakes, 'meal_tea': tea, 'meal_goojelly': goojelly, 'meal_stew': stew}

CHARMS = {'clovercharm': clovercharm, 'toothcharm': toothcharm, 'crystalheart': crystalheart, 'impring': impring}
MATERIALS = {
    'goo': goo, 'fluff': fluff, 'clover': clover, 'cap': cap, 'bark': bark, 'pine': pine_log, 'fang': fang, 'wing': wing,
    'stone': lambda: ore('#9aa0b0', None),
    'glimmer': glimmer_jelly, 'copper': lambda: ore('#8a7a6a', '#ff9a4a'), 'iron': lambda: ore('#5e6272', '#c8dcf8'),
    'crystal': crystal_mat, 'core': core, 'ember': ember, 'horn': horn, 'scale': scale,
    'royaljelly': royaljelly, 'alphapelt': alphapelt, 'echowing': echowing, 'kingcrystal': kingcrystal, 'plank': plank,
    'glimwood': glimwood_log, 'emberwood': emberwood_log, 'obsidian': obsidian,
    'pineplank': lambda: plank('#e0a060', '#b0703a', '#a8643a', knot='#7a4424'),
    'glimplank': lambda: plank('#ece6fa', '#c0b0f0', '#b8a0ff', emit=0.45),
    'emberplank': lambda: plank('#3e353c', '#5a4a50', '#ff7a2a', emit=0.9),
    'berryseed': lambda: seed_packet('#f4a0b4', _berry_emblem), 'herbseed': lambda: seed_packet('#a8dc8a', _herb_emblem),
    'flowerseed': lambda: seed_packet('#ffe08a', _flower_emblem), 'berry': berry, 'herb': herb, 'flower': flower,
}
TOOLS = {
    'axe1': lambda: axe('#9aa0b0', [(0.32, 0.03), (0.46, 0.03), (0.56, 0.3), (0.48, 0.37), (0.4, 0.38), (0.32, 0.37), (0.24, 0.3)]),
    'axe2': lambda: axe('#e8904a', [(0.32, 0.03), (0.46, 0.03), (0.56, 0.3), (0.48, 0.37), (0.4, 0.38), (0.32, 0.37), (0.24, 0.3)], '#8a5a3a'),
    'axe3': lambda: axe('#c8d4e8', [(0.32, 0.03), (0.46, 0.03), (0.56, 0.3), (0.48, 0.37), (0.4, 0.38), (0.32, 0.37), (0.24, 0.3)], '#5e6272'),
    'axe4': lambda: axe('#9ae6ff', [(0.32, 0.03), (0.46, 0.03), (0.56, 0.3), (0.48, 0.37), (0.4, 0.38), (0.32, 0.37), (0.24, 0.3)], '#b8a0ff'),
    'pick1': lambda: pick('#9aa0b0'),
    'pick2': lambda: pick('#e8904a', '#8a5a3a'),
    'pick3': lambda: pick('#c8d4e8', '#5e6272'),
    'pick4': lambda: pick('#9ae6ff', '#8a70e0'),
}

# Charms, tools and prepared meals use the worker's same physical component builder.
from gear_parts import item_module, item_icon


def contributed_icon(item_id, legacy):
    def build():
        item = item_module(item_id)
        return item_icon(item_id) if item and hasattr(item, 'build_item') else legacy()
    return build


CHARMS = {key: contributed_icon(key, build) for key, build in CHARMS.items()}
TOOLS = {key: contributed_icon(key, build) for key, build in TOOLS.items()}
ITEMS = {key: contributed_icon(key.removeprefix('meal_'), build) for key, build in ITEMS.items()}
