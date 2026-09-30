"""Recipe-faithful tier-three weapon geometry. Grip origin and +X axis match the game rig.

Part helpers return mesh lists so assembly layers and equipped models share geometry.
No added leather/wood/gold: folded bat membrane makes the hunter weapon shafts.
"""
import math
import bpy
from lib import cylinder, profile, sphere, toon, torus

X = (0, math.pi / 2, 0)
PINE, GRAIN, END = '#a8703e', '#75472e', '#f0dca0'
IRON, EDGE, DARK = '#aab6c8', '#e6edf5', '#65758b'
WING, LASH, SEAM = '#5a3a8a', '#7a5ab8', '#b293d6'


def piece(fn):
    before = set(bpy.data.objects)
    fn()
    return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']


def pine(root, end, radius):
    start = -0.12
    cylinder(((start + end) / 2, 0, 0), radius, end - start, toon(PINE), root,
             rot=X, seg=12, line=.013)
    for dz in (-radius * .45, radius * .4):
        cylinder(((start + end) / 2, -radius * .94, dz), .005, (end - start) * .79,
                 toon(GRAIN), root, rot=X, seg=6, line=0)
    cylinder((start - .004, 0, 0), radius * .95, .008, toon(END), root, rot=X, seg=12, line=0)
    torus((start - .01, 0, 0), radius * .57, .005, toon(GRAIN), root, rot=X, seg=12, line=0)
    sphere(((start + end) / 2, -radius * .96, 0), (.025, .005, .012), toon(GRAIN), root, seg=12, line=0)


def collar(root, x, radius=.055):
    cylinder((x, 0, 0), radius, .05, toon(DARK), root, rot=X, seg=12, line=.009)
    torus((x-.018, 0, 0), radius, .008, toon(EDGE), root, rot=X, seg=16, line=0)


def membrane_shaft(root, end, radius=.043):
    cylinder(((end-.12)/2, 0, 0), radius, end+.12, toon(WING), root, rot=X, seg=12, line=.014)
    # Overlapping strips and a zig-zag seam read as folded wing hide, not timber.
    for x in [end * i / 5 for i in range(5)]:
        torus((x, 0, 0), radius * 1.03, .008, toon(SEAM), root, rot=X, seg=16, line=0)
    profile([(-.1, -.021), (end-.01, -.014), (end-.02, .014), (-.1, .021)],
            .004, toon('#72549f'), root, loc=(0, -radius-.002, 0), bevel=0, line=0)


def core(root, x, radius):
    # Same gray stone ring and lilac center as the actual Pebblor-core inventory art.
    torus((x, -.018, 0), radius, radius*.24, toon('#8a90a0'), root,
          rot=(math.pi/2, 0, 0), seg=20, line=.01)
    sphere((x, -.036, 0), (radius*.79, radius*.53, radius*.79), toon('#b8a0ff', emit=.25), root, seg=16, line=.009)
    sphere((x-radius*.24, -radius*.6, radius*.26), radius*.17, toon('#efe7ff'), root, seg=12, line=0)


def wing(root, x, side):
    pts = [(x, 0), (x-.08, side*.15), (x-.04, side*.29), (x+.1, side*.2),
           (x+.23, side*.32), (x+.22, side*.08), (x+.12, side*.11), (x+.1, side*.015)]
    profile(pts, .036, toon(WING), root, bevel=.012, line=.014)
    # Membrane ribs follow the scallops and remain broad enough for phone-size reads.
    for dx, dz in ((-.04, .26), (.22, .28)):
        profile([(x+.005, 0), (x+dx, side*dz), (x+dx+.015, side*(dz-.015)), (x+.02, 0)],
                .006, toon(SEAM), root, loc=(0, -.027, 0), bevel=0, line=0)
