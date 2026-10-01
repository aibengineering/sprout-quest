"""Faceted crystal scales in an iron frame, anchored by stone. No cloth."""
import math
from lib import box, crystal, sphere, toon, torus
from gear._metal import pivots, shell, shoulder, stone

PARTS = ('iron-frame', 'crystal-scales', 'left-crystal', 'right-crystal', 'stone-anchors')


def build_armor(P):
    return build(P['body'], {s: P[f'arm{s}'] for s in (-1, 1)}, P['head'])


def build(body, arms=None, head=None):
    arms, _ = pivots(body, arms, head)
    parts = {p: [] for p in PARTS}
    parts['iron-frame'] = shell(body, '#718496', 'iron_crystal_foundation')
    gem = toon('#80dfee', rim=.3, emit=.035)
    pale = toon('#c4f8ff', rim=.24, emit=.025)
    # Overlapping pointed scales face the camera; broad facets read at phone size.
    for row, z in enumerate((.19, .29, .395)):
        for col, x in enumerate((-.125, 0, .125)):
            parts['crystal-scales'].append(crystal((x, -.234, z), .065, .115,
                                                  pale if (row + col) % 2 else gem, body,
                                                  rot=(math.pi / 2, 0, 0), sides=5,
                                                  line=.006, name='crystal_chest_scale'))
    for side, part in ((-1, 'left-crystal'), (1, 'right-crystal')):
        arm = arms[side]
        parts['iron-frame'].append(shoulder(arm, '#718496', 'iron_crystal_socket', (.117, .128, .058)))
        parts[part].append(crystal((side * .015, .015, .087), .081, .23, pale, arm,
                                  rot=(0, side * .47, 0), sides=5, line=.009, name='crystal_pauldron'))
        parts[part].append(crystal((side * .077, -.06, .046), .042, .13, gem, arm,
                                  rot=(0, side * .7, 0), sides=5, line=.007, name='crystal_shoulder_scale'))
        parts['stone-anchors'].append(stone((side * .028, -.139, .051), arm, 'stone_crystal_anchor'))
        for z in (.16, .31):
            parts['stone-anchors'].append(stone((side * .228, -.148, z), body, 'stone_side_anchor', (.04, .024, .036)))
        parts['iron-frame'].append(box((side * .211, -.166, .307), (.023, .027, .292),
                                       toon('#afc1cd', rim=.15), body, bevel=.006, line=.004))
    parts['iron-frame'].append(torus((0, 0, .143), .26, .014, toon('#afc1cd', rim=.15), body, line=.006))
    return parts
