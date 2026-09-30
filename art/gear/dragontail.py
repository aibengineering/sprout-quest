"""Pine grip, three articulated Dragon Scale coils, Imp Horn tip and Ember seams.

Pine grip and horn ferrules stay at X<=.225 so whipGrip retains them when
the renderer removes the stowed coils during a lash. No iron/gold fittings.
"""
import math
import lib

LENGTH = .95
CAMERA = dict(ppu=680, anchor=(0.15, 0, -0.14), elevation=0)
PARTS = ('pine', 'horn', 'scale', 'ember')


def build_weapon(root):
    import bpy
    parts = {}
    def group(key, fn):
        before = set(bpy.data.objects)
        fn()
        parts[key] = list(set(bpy.data.objects)-before)
    def pine():
        lib.cylinder((.04,0,0),.044,.34,lib.toon('#885e43'),root,rot=(0,math.pi/2,0),seg=12,line=.013)
        # Large grain marks read on the equipped grip, without busy noise.
        for z in (-.021,.021):
            lib.box((.02,-.043,z),(.2,.012,.006),lib.toon('#d7a971'),root,bevel=.003,line=0)
    group('pine',pine)
    def horn():
        for x in (-.09,.13):
            lib.torus((x,0,0),.048,.015,lib.toon('#f4dec2'),root,rot=(0,math.pi/2,0),seg=12,line=.006)
        lib.cone((.43,0,-.345),.045,.16,lib.toon('#f4dec2'),root,rot=(math.pi,-.32,0),seg=8,line=.01)
        lib.sphere((-.14,0,0),.054,lib.toon('#f4dec2'),root,seg=12,line=.01)
    group('horn',horn)
    def scale():
        for i in range(3):
            x,z,r=.265+i*.05,-.1-i*.036,.13-i*.018
            lib.torus((x,0,z),r,.025,lib.toon('#c83a3a'),root,rot=(math.pi/2,0,0),seg=16,line=.01)
            for j in range(5):
                a=j/5*math.tau
                cx,cz=x+math.cos(a)*r,z+math.sin(a)*r
                lib.profile([(cx-.023,cz-.017),(cx+.016,cz-.02),(cx+.029,cz),(cx+.016,cz+.02),(cx-.023,cz+.017)],.032,lib.toon('#b63c47'),root,loc=(0,-.027-i*.006,0),bevel=.003,line=.004)
    group('scale',scale)
    def ember():
        for x in (-.04,.045):
            lib.torus((x,0,0),.048,.007,lib.toon('#f4893d',emit=.08),root,rot=(0,math.pi/2,0),seg=12,line=0)
        for i in range(3):
            lib.sphere((.27+i*.05,-.047,-.225-i*.018),.018,lib.toon('#f4893d',emit=.12),root,seg=8,line=0)
    group('ember',ember)
    return parts
