"""Spore Whip: mushroom tissue coils, fang grip and fang lash tip; no wood.

All stowed lash geometry lies beyond X=.225 or uses GEAR.sporewhip.color, so
the existing whipGrip extractor removes it during lashes. Outlet remains X=.22.
"""
import math
import bpy
from lib import cylinder, profile, sphere, toon, torus

PARTS = ('fang-grip', 'cap-wraps', 'cap-coils', 'fang-tip')
LENGTH = .9


def build_weapon(root):
    parts = {}
    def group(name, fn):
        before = set(bpy.data.objects)
        fn()
        parts[name] = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    fang, shade = toon('#fff0d8',rim=.2), toon('#d6b6a3')
    cap, fiber = toon('#e8505a'), toon('#ca7886')
    def grip():
        profile([(-.17,-.012),(-.10,-.041),(.17,-.033),(.21,0),(.17,.033),(-.10,.041)],.07,fang,root,bevel=.012,line=.013,name='wolf_fang_grip')
        cylinder((.025,-.039,0),.006,.22,shade,root,rot=(0,math.pi/2,0),seg=8,line=0,name='fang_ridge')
    def wraps():
        for x in (-.075,-.015,.05,.11):
            torus((x,0,0),.04,.011,fiber,root,rot=(0,math.pi/2,0),line=.004,seg=12,name='cap_tissue_wrap')
        sphere((.19,0,0),.038,fiber,root,seg=12,line=.008,name='mushroom_fiber_socket')
    def coils():
        for i in range(3):
            torus((.28+.05*i,0,-.10-.03*i),.13-.02*i,.025,cap,root,rot=(math.pi/2,0,.35*i),line=.01,seg=16,name='cap_fiber_coil')
        for x,z in ((.30,-.22),(.35,-.25),(.38,-.13)):
            sphere((x,-.025,z),(.023,.012,.015),fang,root,seg=10,line=.004,name='cap_spot')
    def tip():
        profile([(.405,-.22),(.452,-.235),(.455,-.29),(.43,-.335),(.427,-.28),(.40,-.265)],.04,fang,root,bevel=.008,line=.009,name='wolf_fang_lash_tip')
    group(PARTS[0],grip); group(PARTS[1],wraps); group(PARTS[2],coils); group(PARTS[3],tip)
    return parts
