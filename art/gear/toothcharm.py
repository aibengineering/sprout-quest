"""Four curved Woolf fangs on two braided, spotted Shroom Cap fiber strands."""
import math
from lib import empty, profile, sphere, toon, torus
from gear._charm_shapes import collect, cord


def build_item(root):
    parts = {}
    for strand, color in [('red-braid', '#e8505a'), ('cream-braid', '#f0d8ac')]:
        def braid(strand=strand, color=color):
            phase = 0 if strand == 'red-braid' else math.pi
            points = []
            for i in range(65):
                a = i / 64 * math.tau
                r = .30 + .014 * math.sin(a*12 + phase)
                points.append((math.sin(a)*r, .018*math.cos(a*12 + phase), .12 + math.cos(a)*r))
            cord(root, points, .026, color, strand)
            if strand == 'red-braid':
                for a in (-.8, .1, .8, 1.4, -1.4):
                    sphere((math.sin(a)*.30, -.03, .12+math.cos(a)*.30), (.022, .012, .026), toon('#fff0d0'), root, seg=12, line=0)
        parts[strand] = collect(braid)
    for i, a in enumerate((-.69, -.23, .23, .69)):
        def fang(a=a, i=i):
            x, z = math.sin(a)*.30, .12-math.cos(a)*.30
            length = .31 if i in (1, 2) else .24
            torus((x, -.022, z), .042, .012, toon('#e8505a'), root, rot=(math.pi/2, 0, 0), line=.008, seg=16)
            profile([(-.053, .045), (.052, .045), (.056, -.07), (.026, -length*.7), (-.025, -length), (-.036, -.11)], .09, toon('#f4eee0'), root, loc=(x, -.065, z-.03), rot=(0, -a*.28, 0), bevel=.018, line=.012)
            cord(root, [(x-.038, -.118, z-.04), (x+.038, -.118, z-.055)], .012, '#d6c4a5', 'fang-root-ridge')
        parts[f'fang-{i+1}'] = collect(fang)
    return parts
