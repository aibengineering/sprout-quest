"""Felted fluff spine wrapped in goo, with a large springy slime crown."""
import math
from lib import cylinder, sphere, toon, torus
from ._stone_jelly import component, felt_grip, shine, FLUFF, GOO

LENGTH = 1.25
CAMERA = dict(ppu=378.14685182881, anchor=(0.4313320368528366, 0, -0.022999994456768036), elevation=0)
PARTS = ('fluff-spine', 'goo-wraps', 'goo-crown', 'goo-drip')


def build_weapon(root):
    parts = {}

    def spine():
        felt_grip(root)
        cylinder((.4, 0, 0), .031, .62, toon(FLUFF), root,
                 rot=(0, math.pi / 2, 0), seg=10, r2=.023, line=.01)
        for i in range(3):
            sphere((.23 + i * .16, -.028, .018), (.033, .012, .022),
                   toon('#ffffff'), root, seg=8, line=0)
    component(parts, 'fluff-spine', spine)

    def wraps():
        for i in range(5):
            torus((.18 + i * .12, 0, 0), .035, .012, toon('#459c58'),
                  root, rot=(0, math.pi / 2, 0), seg=12, line=.006)
    component(parts, 'goo-wraps', wraps)

    def crown():
        sphere((.83, 0, .015), (.17, .135, .15), toon(GOO, rim=.33), root, seg=16, line=.013)
        shine(root, (.855, -.114, .078), (.058, .024, .035))
        shine(root, (.76, -.108, .072), (.019, .01, .02))
    component(parts, 'goo-crown', crown)

    def drip():
        sphere((.79, 0, -.14), (.041, .038, .071), toon(GOO, rim=.3), root, seg=10, line=.009)
        shine(root, (.785, -.034, -.125), (.013, .01, .023))
    component(parts, 'goo-drip', drip)
    return parts
