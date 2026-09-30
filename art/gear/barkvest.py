"""Timber Vest: Oak Log lamellae, end grain shoulders, six Stone fasteners."""
import math
from lib import box, cylinder, sphere, toon
from gear._woodland_shapes import add, pivots, vest

PARTS = ('oak-back', 'oak-left', 'oak-right', 'oak-shoulders', 'stone-fasteners')
CAMERA = dict(ppu=532.792128, anchor=(0, 0.067111, 0.315734), elevation=math.radians(12))


def build(body, arms=None, head=None):
    arms, _ = pivots(body, arms, head)
    parts = {key: [] for key in PARTS}
    vest(parts, 'oak-back', body, arms, '#68472f')
    wood, cut, grain = toon('#a66f45'), toon('#d9ae73'), toon('#6e472f')
    # Rounded shingles overlap across the front; warm narrow channels read as oak grain.
    for side, key in ((-1, 'oak-left'), (1, 'oak-right')):
        for row, z in enumerate((.23, .365, .49)):
            add(parts, key, box((side * .145, -.224, z), (.262, .055, .153), wood, body,
                                rot=(0, side * -.09, side * -.07), bevel=.027, line=.012,
                                name='oak_shingle'))
            for dx in (-.055, .045):
                add(parts, key, box((side * .145 + dx, -.257, z), (.009, .007, .09), grain,
                                    body, bevel=.003, line=0, name='oak_grain'))
        # The side/back is wood too, rather than a recolored fabric sphere.
        for y in (.04, .17):
            add(parts, 'oak-back', box((side * .227, y, .31), (.063, .16, .29), wood,
                                       body, rot=(0, 0, side * -.25), bevel=.025, line=.01))
        shoulder = add(parts, 'oak-shoulders', cylinder((side * .05, 0, .022), .106, .072,
                           cut, arms[side], seg=12, rot=(0, math.pi / 2, 0), line=.011,
                           name='oak_end_grain'))
        # Dark concentric cross-section marks explicitly preserve the log ingredient.
        for radius in (.04, .075):
            from lib import torus
            add(parts, 'oak-shoulders', torus((side * .09, 0, .022), radius, .0045, grain,
                                              arms[side], rot=(0, math.pi / 2, 0), line=0, seg=16))
    stone = toon('#a4a8b0', rim=.13)
    for side in (-1, 1):
        for z in (.22, .355, .49):
            add(parts, 'stone-fasteners', sphere((side * .056, -.272, z), (.047, .028, .043),
                                                 stone, body, seg=14, line=.009, name='stone_button'))
    return parts


def build_armor(P):
    return build(P['body'], {side: P[f'arm{side}'] for side in (-1, 1)}, P['head'])
