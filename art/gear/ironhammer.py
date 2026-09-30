"""6 Iron Ore + 3 Pine Logs: pine shaft, substantial iron head and peened collars."""
from lib import box, sphere, toon
from gear._iron_bat_common import IRON, EDGE, DARK, collar, piece, pine


def build_weapon(root):
    def head():
        box((.95,0,0),(.33,.26,.5),toon(IRON,rim=.3),root,bevel=.055,line=.016)
        for s in (-1,1):
            box((.95,0,s*.243),(.32,.25,.035),toon(EDGE),root,bevel=.016,line=.01)
        box((.95,0,0),(.35,.29,.075),toon(DARK),root,bevel=.026,line=.012)
        for x in (.84,1.06): sphere((x,-.151,0),.022,toon(EDGE),root,seg=12,line=0)
    return {'pine-shaft':piece(lambda:pine(root,1.03,.046)), 'iron-head':piece(head),
            'iron-collars':piece(lambda:[collar(root,x,.064 if x>.5 else .054) for x in (-.105,.68,.79)])}


LENGTH = 1.45

# Assembly camera after standard diagonal weapon presentation (root Y=-pi/4, scale=(1,1.25,1.25)).
CAMERA = dict(ppu=347.05882352941177, anchor=(0.44187499999999996, 0, 0.44187499999999996), elevation=0)
