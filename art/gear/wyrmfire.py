"""An Imp Horn stem/cage holding Crystal, Dragon Scale and an Ember lens.

No recipe wood or metal: the shaft itself is horn. Tip remains X=1.06.
"""
import math
import lib

LENGTH = 1.35
CAMERA = dict(ppu=350, anchor=(0.44, 0, 0), elevation=0)
PARTS = ('horn', 'scale', 'crystal', 'ember')


def build_weapon(root):
    import bpy
    parts = {}
    def group(key,fn):
        before=set(bpy.data.objects)
        fn()
        parts[key]=list(set(bpy.data.objects)-before)
    def horn():
        lib.cylinder((.25,0,0),.036,.72,lib.toon('#e6cba7'),root,rot=(0,math.pi/2,0),seg=10,r2=.024,line=.012)
        for s in (-1,1):
            lib.profile([(.57,.024*s),(.68,.14*s),(.83,.23*s),(.99,.115*s),(.89,.14*s),(.78,.16*s),(.65,.06*s)],.057,lib.toon('#f4dec2'),root,bevel=.01,line=.012)
    group('horn',horn)
    def scales():
        for x in (.25,.39,.53):
            lib.profile([(x-.07,-.05),(x+.02,-.05),(x+.075,0),(x+.02,.05),(x-.07,.05)],.035,lib.toon('#bc4048'),root,loc=(0,-.035,0),bevel=.006,line=.008)
        lib.profile([(.67,-.1),(.8,-.13),(.94,-.08),(1.0,0),(.94,.08),(.8,.13),(.67,.1)],.05,lib.toon('#963945'),root,loc=(0,.03,0),bevel=.012,line=.012)
    group('scale',scales)
    def crystal():
        lib.profile([(.68,0),(.8,-.105),(.98,0),(.8,.105)],.065,lib.toon('#9bddec',rim=.35),root,loc=(0,-.035,0),bevel=0,line=.011)
        lib.profile([(.78,0),(.83,-.065),(1.06,0),(.83,.065)],.022,lib.toon('#d4f0f6',rim=.35),root,loc=(0,-.075,0),bevel=0,line=.006)
    group('crystal',crystal)
    def ember():
        lib.profile([(.73,0),(.8,-.05),(.91,0),(.8,.05)],.02,lib.toon('#f69240',emit=.12),root,loc=(0,-.092,0),bevel=0,line=.006)
        for x in (-.06,.04):
            lib.torus((x,0,0),.036,.008,lib.toon('#f69240',emit=.08),root,rot=(0,math.pi/2,0),seg=12,line=0)
    group('ember',ember)
    return parts
