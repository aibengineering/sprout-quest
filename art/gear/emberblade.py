"""Iron flame blade, visible Imp Horn guard, Crystal channels and Ember inlays.

Grip remains at origin, blade tip +X=1.15 to match weaponPose.weaponLength.
build_weapon(root) returns material-keyed geometry for the registered crafting layers.
"""
import math
import lib

LENGTH = 1.6
PARTS = ('iron', 'horn', 'crystal', 'ember')


def build_weapon(root):
    parts = {}
    def group(key, fn):
        import bpy
        before = set(bpy.data.objects)
        fn()
        parts[key] = list(set(bpy.data.objects) - before)

    def iron():
        lib.cylinder((0, 0, 0), .045, .28, lib.toon('#596476'), root, rot=(0, math.pi / 2, 0), seg=12, line=.013)
        lib.profile([(.1, -.14), (.45, -.15), (.65, -.11), (.85, -.13), (1.15, 0), (.91, .17), (.64, .13), (.35, .18), (.1, .14)], .07, lib.toon('#bbc8da'), root, bevel=.008, line=.014)
        lib.sphere((-.15, 0, 0), .059, lib.toon('#596476'), root, seg=12, line=.012)
    group('iron', iron)

    def horn():
        for s in (-1, 1):
            lib.profile([(.04, .035*s), (.12, .055*s), (.18, .25*s), (.1, .3*s), (.075, .16*s), (.0, .09*s)], .09, lib.toon('#f4dec2'), root, bevel=.012, line=.013)
        for x in (-.09, -.025, .04):
            lib.torus((x, 0, 0), .046, .011, lib.toon('#f4dec2'), root, rot=(0, math.pi/2, 0), seg=12, line=.005)
    group('horn', horn)

    def crystal():
        for x in (.29, .48, .67, .86):
            lib.profile([(x-.065, 0), (x, -.043), (x+.095, 0), (x, .043)], .025, lib.toon('#98d9ed', rim=.32), root, loc=(0, -.052, 0), bevel=0, line=.008)
    group('crystal', crystal)

    def ember():
        for s in (-1, 1):
            lib.profile([(.17, .095*s), (.37, .13*s), (.62, .085*s), (.81, .1*s), (1.06, .012*s), (.79, .045*s), (.55, .042*s), (.32, .07*s)], .018, lib.toon('#f4893d', emit=.12), root, loc=(0, -.046, 0), bevel=0, line=.004)
        lib.sphere((-.15, -.038, 0), .025, lib.toon('#f4893d', emit=.12), root, seg=10, line=0)
    group('ember', ember)
    return parts
