"""Hazel's herb infusion, crowned with two meadow flowers."""
import math
from lib import cylinder, lathe, sphere, toon, torus
from gear._consumable_shapes import icon, part, plate, steam


def build_item(root):
    parts = {}
    def cup():
        plate(root)
        lathe([(0,-.31),(.23,-.31),(.31,.07),(.31,.16),(.27,.16),(.24,0),(0,0)], toon('#f4dfb1'), root, seg=32, line=.014)
        torus((.33,0,-.035), .13, .035, toon('#f4dfb1'), root, rot=(math.pi/2,0,0), line=.012)
        torus((0,0,.16), .293, .016, toon('#598266'), root, seg=32, line=.005)
    part(parts, 'cup', root, cup)
    part(parts, 'herb-infusion', root, lambda: cylinder((0,0,.13), .272, .018, toon('#9ebf65'), root, seg=32, line=0))
    def leaves():
        for k in range(3):
            sphere((-.13+k*.085,-.06,.15), (.042,.080,.009), toon('#52814c'), root, rot=(0,0,k*.65), line=.006)
    part(parts, 'herb-leaves', root, leaves)
    def flowers():
        for x,y in ((.12,.08),(-.10,.10)):
            for k in range(5):
                a=k*math.tau/5
                sphere((x+math.cos(a)*.036,y+math.sin(a)*.036,.155), (.028,.025,.010), toon('#fff0cb'), root, line=.004)
            sphere((x,y,.169), .017, toon('#eeb755'), root, line=0)
    part(parts, 'flower', root, flowers)
    part(parts, 'steam', root, lambda: steam(root, -.045, .27))
    return parts


def build_icon():
    return icon(build_item)
