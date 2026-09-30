"""2 Slime Goo become the green infusion; 1 Bunny Fluff becomes its soft white foam."""
from lib import sphere, toon
from gear._consumable_shapes import GOO, FLUFF, bottle, icon, liquid, part


def build_item(root):
    parts = {}
    part(parts, 'bottle', root, lambda: bottle(root, GOO))
    part(parts, 'goo-infusion', root, lambda: liquid(root, GOO))
    def foam():
        for x,y,z,s in ((-.075,-.005,.425,.082),(.075,0,.425,.085),(0,-.06,.451,.08),(0,.055,.445,.07)):
            sphere((x,y,z), (s,s*.75,s*.60), toon(FLUFF), root, line=.009, name='fluff_foam')
        for x,y,z in ((-.13,-.24,-.1),(.07,-.30,.03),(.15,-.24,.12)):
            sphere((x,y,z), .018, toon(FLUFF, rim=0), root, line=0, name='soft_bubble')
    part(parts, 'fluff-foam', root, foam)
    return parts


def build_icon():
    return icon(build_item)


CAMERA = dict(ppu=440, anchor=(0, 0, -.015), elevation=0.41887902047863906)

# Keep this recipe’s on-demand assembly set inside its mobile byte budget.
WEBP_QUALITY = 92
