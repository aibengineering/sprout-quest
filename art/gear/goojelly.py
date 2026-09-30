"""Pure eight-Goo jelly: fluted, glossy and springy, with no uncosted berry garnish."""
import math
from lib import lathe, sphere, toon
from gear._consumable_shapes import GOO, icon, part, plate


def build_item(root):
    parts = {}
    part(parts, 'plate', root, lambda: plate(root))
    part(parts, 'jelly-base', root, lambda: lathe([(0,-.285),(.36,-.285),(.36,-.14),(0,-.14)], toon('#5fc875',rim=.3), root, seg=40, name='jelly_base'))
    def belly():
        lathe([(0,-.14),(.34,-.14),(.28,.15),(0,.15)], toon(GOO,rim=.4), root, seg=40, name='jelly_belly')
        for i in range(10):
            a=i/10*math.tau
            sphere((math.cos(a)*.26,math.sin(a)*.26,-.035),(.065,.065,.19),toon(GOO,rim=.3),root,line=.006,name='mold_flute')
        sphere((-.10,-.27,.04),(.06,.018,.08),toon('#e7ffd9',rim=0),root,line=0)
    part(parts, 'jelly-belly', root, belly)
    part(parts, 'jelly-top', root, lambda: sphere((0,0,.16),(.24,.24,.055),toon('#97e78b',rim=.3),root,line=.008,name='jelly_crown'))
    return parts


def build_icon():
    return icon(build_item)


CAMERA = dict(ppu=385, anchor=(0, 0, -.015), elevation=0.41887902047863906)

# Keep this recipe’s on-demand assembly set inside its mobile byte budget.
WEBP_QUALITY = 92
