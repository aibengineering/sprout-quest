"""Four bent Imp Horn segments clasp three warm embers; no invented gold/gem."""
import math
from lib import empty, sphere, toon
from gear._charm_shapes import collect, cord


CAMERA = {'ppu': 445, 'anchor': (0, 0, 0), 'elevation': math.radians(12)}


def build_item(root):
    parts = {}
    for i in range(4):
        def horn(i=i):
            start = math.pi/4 + i*math.pi/2
            points = []
            for j in range(11):
                a = start + j/10*(math.pi/2+.055)
                # Curved ivory horn taper remains visible along the band.
                points.append((math.sin(a)*.265, .016, math.cos(a)*.265-.075))
            cord(root, points, .038, '#fff0d0', f'horn-band-{i+1}')
            for j in (2, 5, 8):
                a = start + j/10*math.pi/2
                sphere((math.sin(a)*.265, -.023, math.cos(a)*.265-.075), (.038, .011, .021), toon('#d7bda0'), root, seg=12, line=0, rot=(0, a, 0))
            if i in (0, 3):
                side = 1 if i == 0 else -1
                cord(root, [(side*.19, -.01, .10), (side*.17, -.01, .22), (side*.10, -.02, .30)], .033, '#fff0d0', 'horn-clasp')
        parts[f'horn-{i+1}'] = collect(horn)
    for i, x, z, s in [(1, -.11, .22, .072), (2, 0, .25, .112), (3, .11, .22, .072)]:
        def ember(x=x, z=z, s=s):
            sphere((x, -.035, z), (s, s*.73, s*.9), toon('#ef6541', rim=.1, emit=.08), root, seg=16, line=.013)
            sphere((x-.012, -.035-s*.68, z+.015), (s*.55, .012, s*.48), toon('#ffbd60', rim=.1, emit=.1), root, seg=12, line=0)
            sphere((x-.022, -.045-s*.70, z+.034), (.016, .008, .020), toon('#ffe9a6'), root, seg=12, line=0)
        parts[f'ember-{i}'] = collect(ember)
    return parts
