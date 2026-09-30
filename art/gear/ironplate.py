"""Iron plates, copper fastenings, stone guards and pine braces. No plume."""
import math
from lib import box, lathe, toon
from gear._metal import beam, pivots, rivet, shell, shoulder, stone

PARTS = ('pine-braces', 'iron-shell', 'iron-helmet', 'stone-guards', 'copper-rivets')
HELMET = True
CAMERA = dict(ppu=370, anchor=(0, 0, .67), elevation=math.radians(12))


def build_armor(P):
    return build(P['body'], {s: P[f'arm{s}'] for s in (-1, 1)}, P['head'])


def build(body, arms=None, head=None):
    arms, head = pivots(body, arms, head)
    parts = {p: [] for p in PARTS}
    parts['iron-shell'] = shell(body, '#aebbc9', 'iron_overlapping_band')
    # Pine cheek braces sit outside the iron bands and run to the shoulder.
    for side in (-1, 1):
        parts['pine-braces'] += beam((side * .206, -.174, .338), body, 'pine_side_brace', (.045, .039, .35), side * .13)
        arm = arms[side]
        parts['iron-shell'].append(shoulder(arm, '#8999ad', 'iron_pauldron', (.13, .135, .068)))
        parts['stone-guards'].append(stone((side * .028, -.133, .052), arm, 'stone_shoulder_guard', (.073, .022, .049)))
        for z in (.18, .3, .422):
            parts['copper-rivets'].append(rivet((side * .138, -.23, z), body, 'copper_iron_rivet'))
    # Open-faced helm: the eye line and both hand pivots remain unobstructed.
    parts['iron-helmet'].append(lathe([(.386, .095), (.402, .16), (.348, .285), (.21, .371), (.001, .416)],
                                      toon('#9eafc4', rim=.16), head, loc=(0, .047, 0),
                                      seg=24, line=.013, name='iron_open_helm'))
    parts['iron-helmet'].append(box((0, -.282, .098), (.57, .054, .079), toon('#748498', rim=.12), head,
                                   bevel=.024, line=.012, name='iron_brow'))
    parts['pine-braces'] += beam((0, -.007, .41), head, 'pine_helm_ridge', (.072, .25, .057))
    for side in (-1, 1):
        parts['copper-rivets'].append(rivet((side * .239, -.318, .099), head, 'copper_helm_rivet', .023))
    parts['stone-guards'].append(stone((0, -.253, .182), body, 'stone_waist_guard', (.075, .025, .046)))
    parts['copper-rivets'].append(box((0, -.246, .46), (.048, .022, .024), toon('#e9a466', rim=.16), body,
                                     bevel=.005, line=.005, name='copper_neck_clasp'))
    return parts
