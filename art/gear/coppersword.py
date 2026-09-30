"""Copper Sword: folded copper blade and three visible bark grip laminations.

Grip at origin, blade tip +X=0.96, matching weaponPose.weaponLength.
build_weapon returns registered assembly groups; every object stays under the given root.
"""
import math
import bpy
from lib import box, cylinder, profile, sphere, toon

PARTS = ('bark-grip', 'copper-blade', 'copper-guard', 'copper-rivets')
LENGTH = 1.4
# Registered workbench camera for the shared diagonal weapon pose (Y=-pi/4,
# cross-axis scale 1.25). Equipped geometry retains its unrotated +X axis.
CAMERA = dict(ppu=237.246199, anchor=(.292398, .104754, .492827), elevation=math.radians(12))


def build_weapon(root):
    parts = {}
    def group(name, fn):
        before = set(bpy.data.objects)
        fn()
        parts[name] = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    copper, edge, dark = toon('#e8904a', rim=.3), toon('#ffc890', rim=.32), toon('#a85a2a')
    bark, ridge = toon('#7a5238'), toon('#bc8960')
    def grip():
        cylinder((.015, 0, 0), .048, .29, bark, root, rot=(0, math.pi/2, 0), seg=10, line=.014)
        for x in (-.087, .006, .099):
            box((x, -.039, 0), (.079, .028, .083), ridge, root, bevel=.009, line=.007, name='bark_lamination')
            box((x+.02, -.055, .011), (.006, .005, .047), bark, root, bevel=0, line=0, name='bark_fissure')
    def blade():
        profile([(.13,-.116),(.75,-.116),(.96,0),(.75,.116),(.13,.116)], .06, edge, root, bevel=.009, line=.015, name='copper_edge')
        profile([(.14,-.074),(.73,-.074),(.90,0),(.73,.074),(.14,.074)], .008, copper, root, loc=(0,-.035,0), bevel=.005, line=0, name='folded_copper_plate')
        box((.43,-.042,0),(.51,.009,.019), dark, root, bevel=.008, line=0, name='copper_fold')
    def guard():
        profile([(.055,-.17),(.12,-.16),(.15,-.055),(.15,.055),(.12,.16),(.055,.17),(.075,.04),(.075,-.04)], .095, copper, root, bevel=.015, line=.013, name='copper_guard')
        sphere((-.155,0,0),(.056,.05,.05), copper, root, seg=12, line=.012, name='copper_pommel')
    def rivets():
        for x,z in ((.10,-.12),(.10,.12),(.19,0)):
            sphere((x,-.06,z),.019, edge, root, seg=10, line=.005, name='copper_rivet')
    group(PARTS[0],grip); group(PARTS[1],blade); group(PARTS[2],guard); group(PARTS[3],rivets)
    return parts
