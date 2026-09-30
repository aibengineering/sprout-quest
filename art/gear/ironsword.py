"""5 Iron Ore + 3 Pine Logs: broad forged blade, pine grip, iron fittings."""
from lib import box, profile, sphere, toon
from gear._iron_bat_common import IRON, EDGE, DARK, collar, piece, pine


def build_weapon(root):
    def blade():
        pts = [(.1,-.12),(.79,-.12),(1.03,0),(.79,.12),(.1,.12)]
        profile(pts,.06,toon(IRON,rim=.3),root,bevel=.012,line=.014)
        for s in (-1,1):
            profile([(.15,s*.095),(.78,s*.095),(1.015,0),(.79,s*.119),(.15,s*.119)],
                    .006,toon(EDGE),root,loc=(0,-.036,0),bevel=0,line=0)
        profile([(.17,-.012),(.73,-.012),(.86,0),(.73,.012),(.17,.012)],
                .006,toon(DARK),root,loc=(0,-.036,0),bevel=0,line=0)
    def fittings():
        box((.08,0,0),(.075,.095,.37),toon(DARK),root,bevel=.022,line=.013)
        for z in (-.15,.15): sphere((.08,-.053,z),.017,toon(EDGE),root,seg=12,line=0)
        collar(root,-.105,.053)
        collar(root,.028,.053)
    return {'pine-grip':piece(lambda:pine(root,.05,.043)), 'iron-blade':piece(blade), 'iron-fittings':piece(fittings)}


LENGTH = 1.5

# Assembly camera after standard diagonal weapon presentation (root Y=-pi/4, scale=(1,1.25,1.25)).
CAMERA = dict(ppu=337.1428571428571, anchor=(0.45955, 0, 0.45955), elevation=0)
