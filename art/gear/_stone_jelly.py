"""Small, scoped helpers for the four meadow weapons. No registry side effects."""
import math
import bpy
from lib import cylinder, sphere, toon

X = (0, math.pi / 2, 0)
OAK = '#b98a5a'
OAK_DARK = '#7a5238'
FLUFF = '#fff1e6'
GOO = '#6fdc7a'


def component(parts, name, make):
    before = set(bpy.data.objects)
    make()
    parts[name] = [o for o in bpy.data.objects if o not in before]
    for i, obj in enumerate(parts[name]):
        obj.name = f'{name}_{i}'


def oak(root, length, radius=0.045):
    cylinder((-0.12 + length / 2, 0, 0), radius, length,
             toon(OAK), root, rot=X, seg=10, line=0.014, r2=radius * 0.88)
    # Broad bark grooves read at phone size; everything here is oak, not metal trim.
    for z in (-radius * .45, radius * .45):
        cylinder((-0.12 + length / 2, -radius * .86, z), .006, length * .76,
                 toon(OAK_DARK), root, rot=X, seg=6, line=0)


def felt_grip(root):
    cylinder((.015, 0, 0), .053, .27, toon(FLUFF), root,
             rot=X, seg=12, line=.012)
    for i in range(5):
        x = -.105 + i * .055
        sphere((x, 0, 0), (.034, .063, .062), toon(FLUFF), root,
               seg=10, line=.009)


def shine(root, loc, scale):
    # Opaque cel highlight, not transparency or emissive metal.
    sphere(loc, scale, toon('#b5f5b4', rim=.1), root, seg=10, line=0)
