"""Copper Hammer: visible pine shaft, folded copper head plates, peened rivets.

Head center X=.9, contact extent X=1.07, matching the existing hammer rig.
"""
import math
import bpy
from lib import box, cylinder, sphere, toon

PARTS = ('pine-shaft', 'copper-core', 'copper-plates', 'copper-rivets')
LENGTH = 1.4
CAMERA = dict(ppu=206.958760, anchor=(.423448, .157465, .740816), elevation=math.radians(12))


def build_weapon(root):
    parts = {}
    def group(name, fn):
        before = set(bpy.data.objects)
        fn()
        parts[name] = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    pine, grain = toon('#c39965'), toon('#7b593b')
    copper, edge, dark = toon('#e8904a',rim=.3), toon('#ffc890',rim=.3), toon('#a85a2a')
    def shaft():
        cylinder((.355,0,0),.044,.95,pine,root,rot=(0,math.pi/2,0),seg=10,line=.013,name='pine_shaft')
        for z in (-.018,.017):
            box((.34,-.043,z),(.76,.006,.009),grain,root,bevel=.004,line=0,name='pine_grain')
        sphere((.40,-.044,0),(.035,.004,.019),grain,root,seg=10,line=0,name='pine_knot')
        sphere((.40,-.05,0),(.019,.004,.009),pine,root,seg=10,line=0)
    def core():
        box((.9,0,0),(.26,.22,.40),copper,root,bevel=.045,line=.014,name='copper_head')
        box((.73,0,0),(.075,.11,.11),dark,root,bevel=.012,line=.01,name='copper_socket')
    def plates():
        for z in (-.21,.21):
            box((.9,0,z),(.34,.27,.06),edge,root,bevel=.025,line=.012,name='folded_striking_plate')
        box((.9,-.13,0),(.31,.035,.12),dark,root,bevel=.013,line=.009,name='copper_spine_plate')
    def rivets():
        for x,z in ((.81,-.15),(.99,-.15),(.81,.15),(.99,.15)):
            sphere((x,-.12,z),.02,edge,root,seg=10,line=.005,name='peened_copper_rivet')
        cylinder((.75,0,0),.06,.035,copper,root,rot=(0,math.pi/2,0),seg=10,line=.008,name='pine_socket_collar')
    group(PARTS[0],shaft); group(PARTS[1],core); group(PARTS[2],plates); group(PARTS[3],rivets)
    return parts
