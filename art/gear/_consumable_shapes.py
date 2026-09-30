"""Geometry helpers used only by the seven potion/Kitchen contributions.

Cookware and bottles are reusable presentation props, never extra recipe inputs.
All builders keep parts in one coordinate system for registered 512px layers.
"""
import math

import bpy
from lib import cylinder, empty, lathe, sphere, toon, torus

GOO = '#70d97d'
FLUFF = '#fff1df'
CAP = '#e65b67'
EMBER = '#ffa04d'
CLOVER = '#62c967'


def part(parts, key, parent, build):
    before = set(bpy.data.objects)
    build()
    parts[key] = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    for o in parts[key]:
        o.name = f'{key}_{o.name}'
    return parts[key]


def plate(root, z=-.36):
    lathe([(0, z-.035), (.46, z-.035), (.57, z+.025), (.57, z+.065), (.44, z+.018), (0, z+.018)],
          toon('#f4edf7', rim=.2), root, seg=40, line=.014, name='plate')
    torus((0, 0, z+.035), .50, .012, toon('#ac92c5', rim=.1), root, seg=40, line=0)


def bottle(root, color, tall=False):
    """A thick glass heel, open rim and two highlights suggest glass without hiding the infusion."""
    z = .53 if tall else .40
    lathe([(0, -.42), (.19, -.42), (.25, -.37), (.25, -.32), (.19, -.32), (0, -.32)],
          toon('#d6eff1'), root, seg=32, line=.014, name='glass_heel')
    cylinder((0, 0, z-.10), .125, .21, toon('#c8ece4'), root, seg=24, line=.012, name='glass_neck')
    torus((0, 0, z+.015), .137, .025, toon('#e1f8ef'), root, seg=32, line=.01, name='open_rim')
    cylinder((0, 0, z+.015), .113, .009, toon(color, rim=.25), root, seg=24, line=0)
    sphere((-.20, -.28, -.04), (.030, .020, .13), toon('#eafff4', rim=0), root, line=0, name='glass_glint')
    sphere((-.15, -.31, -.20), (.02, .012, .027), toon('#ffffff', rim=0), root, line=0)


def liquid(root, color, tall=False):
    pts = [(0, -.365), (.24, -.365), (.32, -.23), (.33, .05), (.24, .25), (.115, .30), (.11, .43 if tall else .30), (0, .43 if tall else .30)]
    lathe(pts, toon(color, rim=.3), root, seg=40, line=.016, name='infusion')


def clover(root, x=0, y=0, z=0, size=.10):
    for dx, dy in ((-1,-1),(-1,1),(1,-1),(1,1)):
        sphere((x+dx*size*.57, y+dy*size*.57, z), (size*.65, size*.65, size*.20),
               toon(CLOVER, rim=.15), root, line=.007, name='clover_leaf')
    cylinder((x, y, z-.035), .009, .10, toon('#36894a'), root, seg=8, line=.005, name='clover_stem')


def mushroom(root, x, y, z, size=.16):
    cylinder((x, y, z-.045), size*.20, .085, toon('#fff2df'), root, seg=12, line=.006, name='cap_stem')
    lathe([(0, 0), (size, 0), (size*.9, size*.45), (size*.55, size*.70), (0, size*.76)],
          toon(CAP, rim=.2), root, loc=(x,y,z), seg=24, line=.009, name='shroom_cap')
    for dx, dy in ((-.32,-.38),(.34,-.23),(0,.35)):
        sphere((x+dx*size, y+dy*size, z+size*.65), (size*.17,size*.17,.008),
               toon('#fff0df', rim=0), root, line=0, name='cap_spot')


def steam(root, x=0, z=.5):
    # Sparse raised cream wisps, separate layer: these settle instead of flashing.
    for k in range(3):
        sphere((x+math.sin(k*1.5)*.035, .10, z+k*.065), (.025,.022,.042),
               toon('#e9e4ef', rim=.1), root, line=0, name='steam')


def icon(builder):
    root = empty('consumable_icon')
    builder(root)
    return root
