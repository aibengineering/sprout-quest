"""Granny's Berry Tart: 2 Bunny Fluff bake into a golden pastry case; 4 Berries become its glossy filling and the berries on top."""
import math
from lib import lathe, sphere, toon, torus
from gear._consumable_shapes import FLUFF, icon, part, plate

BERRY = '#e8405a'


def build_item(root):
    parts = {}
    part(parts, 'plate', root, lambda: plate(root))
    def crust():
        lathe([(0,-.32),(.36,-.32),(.42,-.22),(.42,-.08),(.37,-.08),(.33,-.20),(0,-.20)], toon('#f0c27a'), root, seg=40, line=.012, name='fluff_pastry')
        for i in range(16):
            a = i/16*math.tau
            sphere((math.cos(a)*.40, math.sin(a)*.40, -.08), .045, toon('#f6d49a'), root, seg=10, line=.006, name='crimp')
        sphere((-.20,-.34,-.2), (.02,.01,.015), toon(FLUFF, rim=0), root, line=0)
    part(parts, 'fluff-crust', root, crust)
    part(parts, 'berry-filling', root, lambda: lathe([(0,-.2),(.35,-.2),(.35,-.10),(0,-.07)], toon('#c8304a', rim=.35), root, seg=40, line=.01, name='berry_filling'))
    def berries():
        for x,y in ((-.14,-.12),(.13,-.14),(0,.06),(-.17,.13),(.18,.1),(0,-.02),(.02,.22),(-.02,-.25)):
            sphere((x,y,-.03), .075, toon(BERRY, rim=.4), root, seg=14, line=.008, name='berry')
            sphere((x-.025,y-.05,.01), .018, toon('#ffffff', rim=0), root, seg=6, line=0)
        for s in (-1,1):
            sphere((.04*s,.02,.06), (.07,.025,.03), toon('#4aa84a'), root, rot=(0,0,.6*s), seg=10, line=.006, name='mint')
    part(parts, 'berries', root, berries)
    return parts


def build_icon():
    return icon(build_item)
