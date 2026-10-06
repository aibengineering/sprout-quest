"""The Waystone, rebuilt on its old plinth: iron bands binding its crystal back together, a ring of pine posts, and the
Alpha Pelt draped at its foot."""
import math

from lib import box, crystal, cylinder, lathe, sphere, toon, torus

from buildings._common import CRYSTAL, CRYSTAL_PINK, IRON, PINE, PINE_END, Parts, lantern


def build(root, level=1):
    P = Parts(root)
    lathe([(0.0001, 0), (0.9, 0), (0.95, 0.15), (0.7, 0.25), (0.0001, 0.25)], toon('#9aa0b0'), P('base'), seg=8)
    posts = P('pine-posts')
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4
        x, y = math.cos(a) * 1.15, math.sin(a) * 0.95
        cylinder((x, y, 0.45), 0.08, 0.9, toon(PINE), posts, seg=8)
        cylinder((x, y, 0.905), 0.075, 0.02, toon(PINE_END), posts, seg=8, line=0.008)
    for s in (-1, 1):
        box((0, -0.67 if s < 0 else 0.67, 0.62), (1.62, 0.07, 0.07), toon(PINE), posts, bevel=0.015, line=0.012)
        box((s * 0.81, 0, 0.62), (0.07, 1.34, 0.07), toon(PINE), posts, bevel=0.015, line=0.012)
    lantern(posts, (math.cos(math.pi * 1.25) * 1.15, math.sin(math.pi * 1.25) * 0.95, 1.02), glow='#9ae6ff')
    iron = P('iron-cradle')
    crystal((0, 0, 0.2), 0.32, 2.4, toon(CRYSTAL, rim=0.5, emit=0.2), iron)
    for a in range(4):
        ang = a / 4 * math.tau + 0.4
        crystal((math.cos(ang) * 0.5, math.sin(ang) * 0.45, 0.15), 0.12, 0.7, toon(CRYSTAL_PINK, rim=0.5), iron,
                rot=(math.sin(ang) * 0.4, -math.cos(ang) * 0.4, 0))
    for z, r in ((0.55, 0.36), (1.25, 0.36)):
        torus((0, 0, z), r, 0.05, toon(IRON, rim=0.4), iron, seg=24, line=0.012)
    for i in range(3):
        a = i / 3 * math.tau - math.pi / 2
        box((math.cos(a) * 0.33, math.sin(a) * 0.33, 0.4), (0.08, 0.08, 0.4), toon(IRON), iron, bevel=0.02, line=0.01,
            rot=(math.sin(a) * 0.2, -math.cos(a) * 0.2, 0))
    # The pelt lies over the plinth's front edge: silver fur with dark stripes, its head and paws hanging down.
    pelt = P('alpha-pelt')
    fur, dark = toon('#c8c8d8', rim=0.4), toon('#5a5a70')
    sphere((0, -0.62, 0.27), (0.62, 0.3, 0.07), fur, pelt, seg=18, rot=(0.35, 0, 0))
    for x in (-0.3, 0.0, 0.3):
        sphere((x, -0.74, 0.25), (0.07, 0.16, 0.03), dark, pelt, seg=8, rot=(0.35, 0, 0), line=0)
    for s in (-1, 1):
        sphere((0.58 * s, -0.8, 0.12), (0.13, 0.12, 0.08), fur, pelt, seg=10, line=0.012)
    sphere((0, -0.92, 0.18), (0.16, 0.13, 0.12), fur, pelt, seg=12, line=0.012)
    for s in (-1, 1):
        sphere((0.1 * s, -0.96, 0.3), (0.05, 0.03, 0.07), dark, pelt, seg=8, line=0.008)
    return P.objects()
