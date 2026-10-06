"""A lined travelling cloak: wing drapes, copper shoulder clasp and fang ornaments."""
import math
from lib import box, profile, sphere, toon, torus
from gear._woodland_shapes import add, fang, membrane, pivots
from gear._garment import lining, binding

PARTS = ('fluff-lining', 'goo-seams', 'wing-back-left', 'wing-back-right',
         'wing-lapels', 'wing-collar', 'copper-clasp', 'fang-ornaments')


def build(body, arms=None, head=None):
    arms, _ = pivots(body, arms, head)
    parts = {key: [] for key in PARTS}
    lining(parts, 'fluff-lining', body, arms, '#ded2e8')
    binding(parts, 'goo-seams', body, arms, '#9d7db8')
    for side in (-1, 1):
        membrane(parts, 'wing-back-left' if side < 0 else 'wing-back-right', body, side, '#62468e')
        # A capelet over each shoulder connects to the drape, with a soft folded collar.
        add(parts, 'wing-collar', sphere((side * .17, .015, .49), (.19, .21, .09),
                                        toon('#76539c'), body, seg=20, line=.012))
        add(parts, 'wing-collar', profile([(side * x, z) for x, z in
                    ((.055, .50), (.11, .60), (.24, .55), (.19, .47))], .04,
                    toon('#9874c5'), body, loc=(0, -.10, 0), bevel=.024, line=.009))
    # One broad diagonal overlap reads as wrapped fabric instead of a toothed opening.
    add(parts, 'wing-lapels', profile([(-.24, .48), (.16, .52), (.27, .39),
                                      (.18, .17), (.035, .13), (-.20, .27)],
                                     .045, toon('#7e59ac'), body, loc=(0, -.225, 0),
                                     bevel=.025, line=.010, name='cloak_cross_fold'))
    add(parts, 'wing-lapels', box((.115, -.263, .32), (.012, .007, .23),
                                  toon('#a58acb'), body, rot=(0, .35, 0),
                                  bevel=.004, line=0, name='cloak_fold_edge'))
    add(parts, 'copper-clasp', torus((-.17, -.267, .465), .047, .011, toon('#df9a61'),
                                    body, rot=(math.pi / 2, 0, 0), line=.004, seg=20))
    add(parts, 'copper-clasp', sphere((-.17, -.28, .465), (.029, .012, .029),
                                     toon('#efa663'), body, seg=12, line=.004))
    # Small hanging trophies on one shoulder only, parallel tips down. No chest teeth.
    for x, z in ((-.235, .405), (-.175, .39)):
        fang(parts, 'fang-ornaments', body, (x, -.281, z), .06, -.08)
    return parts


def build_armor(P):
    return build(P['body'], {side: P[f'arm{side}'] for side in (-1, 1)}, P['head'])
