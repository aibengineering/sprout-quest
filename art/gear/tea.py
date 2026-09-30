"""Two whole Clover leaves open on the surface of pale green tea."""
import math
from lib import cylinder, lathe, toon, torus
from gear._consumable_shapes import clover, icon, part, plate, steam


def build_item(root):
    parts = {}
    def cup():
        plate(root)
        lathe([(0,-.31),(.23,-.31),(.31,.07),(.31,.16),(.27,.16),(.24,.0),(0,.0)],
              toon('#e8f0d9'), root, seg=40, line=.014, name='tea_cup')
        torus((.33,0,-.035), .13, .035, toon('#e8f0d9'), root, rot=(math.pi/2,0,0), line=.012, name='handle')
        torus((0,0,.16), .293, .016, toon('#87ae83'), root, seg=40, line=.005, name='cup_rim')
    part(parts, 'cup', root, cup)
    part(parts, 'clover-infusion', root, lambda: cylinder((0,0,.13), .272, .018, toon('#a3d785', rim=.25), root, seg=40, line=0))
    part(parts, 'clover-leaves', root, lambda: (clover(root,-.09,-.07,.15,.09),clover(root,.10,.07,.15,.077)))
    part(parts, 'steam', root, lambda: steam(root, -.045, .27))
    return parts


def build_icon():
    return icon(build_item)


CAMERA = dict(ppu=385, anchor=(0, 0, -.015), elevation=0.41887902047863906)

# Keep this recipe’s on-demand assembly set inside its mobile byte budget.
WEBP_QUALITY = 92
