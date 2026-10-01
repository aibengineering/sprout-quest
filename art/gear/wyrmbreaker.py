"""Iron striking frame, Dragon Scale shell, Crystal faces and Ember hearth.

Head center remains +X=1.05 and reach +X=1.4, matching the existing rig.
"""
import math
import lib

LENGTH = 1.7
PARTS = ('iron', 'scale', 'crystal', 'ember')


def build_weapon(root):
    import bpy
    parts = {}
    def group(key, fn):
        before = set(bpy.data.objects)
        fn()
        parts[key] = list(set(bpy.data.objects) - before)
    def iron():
        lib.cylinder((.43, 0, 0), .05, 1.12, lib.toon('#526073'), root, rot=(0, math.pi/2, 0), seg=12, line=.013)
        lib.box((1.05, 0, 0), (.38, .27, .53), lib.toon('#8796ac'), root, bevel=.045, line=.014)
        lib.cone((1.33, 0, 0), .07, .14, lib.toon('#bbc8da'), root, rot=(0, math.pi/2, 0), seg=6, line=.012)
        for x in (-.08, .05, .18, .79):
            lib.torus((x, 0, 0), .05, .014, lib.toon('#bbc8da'), root, rot=(0, math.pi/2, 0), seg=12, line=.005)
    group('iron', iron)
    def scales():
        for x in (.93, 1.055, 1.18):
            lib.profile([(x-.085,-.19),(x+.045,-.19),(x+.105,0),(x+.045,.19),(x-.085,.19),(x-.035,0)], .055, lib.toon('#bc4048'), root, loc=(0,-.178,0), bevel=.012, line=.011)
        for x in (.38,.52,.66):
            lib.profile([(x-.08,-.058),(x+.02,-.058),(x+.07,0),(x+.02,.058),(x-.08,.058)], .03, lib.toon('#bc4048'), root, loc=(0,-.045,0), bevel=.005, line=.007)
    group('scale', scales)
    def crystal():
        for s in (-1,1):
            lib.box((1.05,0,.3*s),(.41,.32,.09),lib.toon('#a6e0ee',rim=.35),root,bevel=.025,line=.013)
            lib.crystal((1.05,-.04,.34*s),.055,.085,lib.toon('#d2eef6',rim=.35),root,rot=(0,0,0) if s>0 else (math.pi,0,0),sides=6,line=.008)
    group('crystal', crystal)
    def ember():
        lib.profile([(.99,-.07),(1.1,-.07),(1.15,0),(1.1,.07),(.99,.07),(.95,0)],.028,lib.toon('#f69240',emit=.12),root,loc=(0,-.218,0),bevel=.006,line=.008)
        for x in (.9,1.22):
            lib.box((x,-.2,0),(.025,.016,.24),lib.toon('#f69240',emit=.08),root,bevel=.006,line=0)
    group('ember', ember)
    return parts
