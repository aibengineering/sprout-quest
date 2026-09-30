"""A glossy Glimmer Jelly heart in three wing membranes, sealed with one clover.

The historical name is retained; there is deliberately no crystal or metal.
"""
import math
from lib import empty, profile, sphere, toon, torus
from gear._charm_shapes import collect, cord, jelly_heart, leaf_cluster


CAMERA = {'ppu': 445, 'anchor': (0, 0, 0), 'elevation': math.radians(12)}


def build_item(root):
    parts = {}
    for side, name in [(-1, 'left-wing'), (1, 'right-wing')]:
        def wing(side=side):
            pts = [(side*x, z) for x, z in [(.04, .12), (.30, .30), (.46, .18), (.42, -.08), (.34, .025), (.25, -.20), (.20, -.065), (.10, -.30)]]
            profile(pts, .055, toon('#5a3a8a'), root, loc=(0, .085, 0), bevel=.018, line=.012)
            for x, z in [(.42, .16), (.34, .025), (.25, -.20)]:
                cord(root, [(side*.11, .045, .13), (side*x, .045, z)], .012, '#aa8bd4', 'wing-vein')
        parts[name] = collect(wing)
    def bail():
        torus((0, .04, .35), .073, .025, toon('#5a3a8a'), root, rot=(math.pi/2, 0, 0), line=.012, seg=24)
        profile([(-.06, .28), (0, .18), (.06, .28), (0, .32)], .06, toon('#7e57a8'), root, loc=(0, .02, 0), bevel=.012)
    parts['wing-loop'] = collect(bail)
    def heart():
        jelly_heart(root, .95, -.055)
        jelly_heart(root, .71, -.13, '#cfc0ff')
        sphere((-.105, -.207, .105), (.066, .018, .039), toon('#f2edff', rim=0), root, seg=16, line=0, rot=(0, -.35, 0))
        sphere((-.185, -.168, .015), .017, toon('#f2edff'), root, seg=12, line=0)
    parts['glimmer-heart'] = collect(heart)
    parts['clover-seal'] = collect(lambda: leaf_cluster(root, 0, -.225, -.135, .43))
    return parts
