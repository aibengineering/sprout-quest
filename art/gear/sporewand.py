"""Spore Wand: mushroom stem shaft, cap crown, gills and three fang braces.

No wood/gold materials. Cap crown outlet remains X=.96 for the shot rig.
"""
import math
import bpy
from lib import cylinder, lathe, profile, sphere, toon

PARTS = ('cap-stem', 'cap-crown', 'cap-gills', 'fang-braces')
LENGTH = 1.3


def build_weapon(root):
    parts = {}
    def group(name, fn):
        before = set(bpy.data.objects)
        fn()
        parts[name] = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    stem, fiber = toon('#eacdb8'), toon('#bb8294')
    cap, fang = toon('#e8505a'), toon('#fff0d8',rim=.2)
    def shaft():
        cylinder((.31,0,0),.04,.82,stem,root,rot=(0,math.pi/2,0),seg=12,r2=.029,line=.013,name='mushroom_stem')
        for z in (-.017,.017):
            cylinder((.30,-.036,z),.004,.68,fiber,root,rot=(0,math.pi/2,0),seg=8,line=0,name='mushroom_fiber')
        sphere((-.12,0,0),(.05,.043,.043),stem,root,seg=12,line=.012,name='stem_root')
    def crown():
        lathe([(.0001,.14),(.09,.13),(.165,.055),(.18,-.01),(.165,-.03),(.0001,-.03)],cap,root,loc=(.82,0,0),rot=(0,math.pi/2,0),seg=20,line=.014,name='spotted_mushroom_cap')
        for y,z in ((-.09,.07),(-.115,-.065),(.055,.11),(.10,-.07)):
            sphere((.895,y,z),(.018,.032,.026),fang,root,seg=12,line=.004,name='cap_spot')
    def gills():
        # A frilled ring under the cap whose edge shows just past its rim.
        for i in range(8):
            a=i*math.tau/8
            profile([(.77,.035),(.79,.195),(.81,.195),(.80,.035)],.018,fiber,root,rot=(a,0,0),bevel=.004,line=.004,name='mushroom_gill')
    def braces():
        for i in range(3):
            a=i*math.tau/3
            # Each fang curls up from the shaft and out past the cap's rim, where you can see it cup the crown.
            profile([(.60,.027),(.65,.07),(.75,.15),(.81,.215),(.77,.13),(.66,.03)],.04,fang,root,rot=(a,0,0),bevel=.008,line=.008,name='wolf_fang_brace')
    group(PARTS[0],shaft); group(PARTS[1],crown); group(PARTS[2],gills); group(PARTS[3],braces)
    return parts
