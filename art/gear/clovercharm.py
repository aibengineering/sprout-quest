"""Three pressed clovers cushioned and bound by the recipe's green Slime Goo."""
import math
from lib import empty, sphere, toon, torus
from gear._charm_shapes import collect, cord, leaf_cluster


CAMERA = {'ppu': 445, 'anchor': (0, 0, 0), 'elevation': math.radians(12)}


def build_item(root):
    parts = {}
    def goo():
        torus((0, .025, .40), .082, .027, toon('#6fdc7a'), root, rot=(math.pi/2, 0, 0), line=.012)
        sphere((0, .025, -.035), (.32, .065, .34), toon('#6fdc7a'), root, line=.014)
        cord(root, [(-.16, -.04, -.20), (0, -.085, -.29), (.17, -.04, -.19)], .024, '#8de788', 'goo-binding')
        sphere((-.12, -.055, -.32), .039, toon('#6fdc7a'), root, line=.008)
    parts['goo-binding'] = collect(goo)
    for name, x, z, s, color in [('left-clover', -.18, -.04, .72, '#40ad64'), ('right-clover', .17, -.07, .74, '#65c95e'), ('center-clover', 0, .09, 1.12, '#5ac85a')]:
        def clover(x=x, z=z, s=s, color=color):
            y = -.10 if x else -.15
            leaf_cluster(root, x, y, z, s, color)
            cord(root, [(x, y, z), (x*.65, y, z-.14), (.035, -.095, -.28)], .015, '#338d49', 'clover-stem')
        parts[name] = collect(clover)
    return parts
