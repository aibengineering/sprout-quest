"""2 Herbs steep into a clear green tonic, with a sprig of fresh leaves in the neck."""
import math
from lib import cylinder, sphere, toon
from gear._consumable_shapes import bottle, icon, liquid, part

HERB = '#5ac86a'


def build_item(root):
    parts = {}
    part(parts, 'bottle', root, lambda: bottle(root, HERB, tall=True))
    part(parts, 'herb-infusion', root, lambda: liquid(root, '#8ad88a', tall=True))
    def leaves():
        cylinder((0,0,.58), .018, .26, toon('#3a8a3a'), root, seg=6, line=.006, name='herb_stem')
        for k,z in enumerate((.56,.63,.70)):
            for s in (-1,1):
                sphere((.06*s,-.02,z), (.07,.02,.035), toon(HERB if k<2 else '#9ae88a'), root, rot=(0,-.5*s,0), seg=10, line=.006, name='herb_leaf')
        for x,z in ((-.12,-.1),(.1,.05),(0,-.22)):
            sphere((x,-.2,z), (.05,.012,.025), toon('#4aa84a', rim=.2), root, rot=(0,.5,0), seg=10, line=.005, name='steeped_leaf')
    part(parts, 'herb-leaves', root, leaves)
    return parts


def build_icon():
    return icon(build_item)


CAMERA = dict(ppu=360, anchor=(0, 0, .1), elevation=0.41887902047863906)

# Keep this recipe’s on-demand assembly set inside its mobile byte budget.
WEBP_QUALITY = 92
