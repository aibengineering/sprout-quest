"""Hardened goo rod with a small felted fluff grip, goo wraps and a springy slime crown."""
import math
from lib import cylinder, sphere, toon, torus
from ._stone_jelly import component, shine, FLUFF, GOO

LENGTH = 1.25
CAMERA = dict(ppu=378.14685182881, anchor=(0.4313320368528366, 0, -0.022999994456768036), elevation=0)
# Keep the level, untilted pose of the shipped meadow-weapon icon and workbench view.
PREVIEW_ROTATION = (0, 0, 0)
PREVIEW_SCALE = (1, 1, 1)
PARTS = ('goo-rod', 'fluff-grip', 'goo-wraps', 'goo-crown', 'goo-drip')
X = (0, math.pi / 2, 0)
ROD = '#52b866'


def build_weapon(root):
    parts = {}

    def rod():
        # One solid stick of set Slime Goo: a long glassy highlight and a few
        # suspended bubbles read as translucent without any segmenting.
        cylinder((.29, 0, 0), .034, .86, toon(ROD, rim=.32), root,
                 rot=X, seg=12, r2=.027, line=.011)
        sphere((-.14, 0, 0), (.046, .046, .046), toon(ROD, rim=.32), root, seg=12, line=.01)
        cylinder((.36, -.03, .014), .007, .6, toon('#b5f5b4', rim=.1), root,
                 rot=X, seg=6, line=0)
        for x, z, r in ((.2, -.01, .008), (.46, .008, .006), (.63, -.006, .007)):
            sphere((x, -.029, z), (r, r * .6, r), toon('#9fe8a6', rim=.1), root, seg=8, line=0)
    component(parts, 'goo-rod', rod)

    def grip():
        # Bunny Fluff: only a short, soft felted wrap where the hand goes.
        cylinder((-.02, 0, 0), .05, .17, toon(FLUFF), root, rot=X, seg=12, line=.011)
        for i in range(3):
            sphere((-.08 + i * .06, 0, 0), (.028, .058, .058), toon(FLUFF), root,
                   seg=10, line=.008)
    component(parts, 'fluff-grip', grip)

    def wraps():
        for i in range(4):
            torus((.22 + i * .13, 0, 0), .039, .012, toon('#3f8f50'),
                  root, rot=X, seg=12, line=.006)
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
