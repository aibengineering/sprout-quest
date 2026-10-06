"""Compressed Bunny Fluff grip and springy Slime Goo coils; no wood or metal."""
import math
from lib import sphere, toon, torus
from ._stone_jelly import component, felt_grip, shine, GOO

LENGTH = .9
PARTS = ('fluff-grip', 'goo-collar', 'goo-coils', 'goo-tip')


def build_weapon(root):
    parts = {}
    component(parts, 'fluff-grip', lambda: felt_grip(root))
    # Dark goo stays on the grip during uncoiled combat (the renderer strips GOO).
    component(parts, 'goo-collar', lambda: torus((.16, 0, 0), .055, .015,
              toon('#459c58'), root, rot=(0, math.pi / 2, 0), seg=12, line=.008))

    def coils():
        for i in range(3):
            x, z = .39 + i * .07, -.07 - i * .045
            torus((x, 0, z), .115 - i * .019, .028, toon(GOO, rim=.32),
                  root, rot=(math.pi / 2, 0, 0), seg=16, line=.009)
            shine(root, (x - .038, -.029, z + .095 - i * .019), (.027, .012, .015))
        sphere((.244, 0, -.018), (.078, .026, .028), toon(GOO), root, seg=10, line=.008)
    component(parts, 'goo-coils', coils)

    def tip():
        sphere((.61, 0, -.21), (.065, .041, .05), toon(GOO, rim=.32), root, seg=12, line=.009)
        shine(root, (.61, -.037, -.185), (.027, .012, .012))
    component(parts, 'goo-tip', tip)
    return parts
