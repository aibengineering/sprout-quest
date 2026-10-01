"""Iron plates, copper fastenings, stone guards and pine braces. No plume."""
from lib import box, lathe, toon
from gear._metal import beam, pivots, rivet, shell, shoulder, stone

PARTS = ('pine-braces', 'iron-shell', 'iron-helmet', 'stone-guards', 'copper-rivets')
HELMET = True


def build_armor(P):
    return build(P['body'], {s: P[f'arm{s}'] for s in (-1, 1)}, P['head'])


def build(body, arms=None, head=None):
    arms, head = pivots(body, arms, head)
    parts = {p: [] for p in PARTS}
    parts['iron-shell'] = shell(body, '#aebbc9', 'iron_overlapping_band')
    # Pine cheek braces sit outside the iron bands and run to the shoulder.
    for side in (-1, 1):
        parts['pine-braces'] += beam((side * .21, -.182, .338), body, 'pine_side_brace', (.075, .05, .37), side * .13)
        arm = arms[side]
        parts['iron-shell'].append(shoulder(arm, '#8999ad', 'iron_pauldron', (.13, .135, .068)))
        parts['stone-guards'].append(stone((side * .028, -.133, .052), arm, 'stone_shoulder_guard', (.09, .03, .064)))
        for z in (.18, .3, .422):
            parts['copper-rivets'].append(rivet((side * .138, -.232, z), body, 'copper_iron_rivet', .03))
    # Open-faced helm: the eye line and both hand pivots remain unobstructed.
    parts['iron-helmet'].append(lathe([(.386, .095), (.402, .16), (.348, .285), (.21, .371), (.001, .416)],
                                      toon('#9eafc4', rim=.16), head, loc=(0, .047, 0),
                                      seg=24, line=.013, name='iron_open_helm'))
    parts['iron-helmet'].append(box((0, -.282, .098), (.57, .054, .079), toon('#748498', rim=.12), head,
                                   bevel=.024, line=.012, name='iron_brow'))
    parts['pine-braces'] += beam((0, -.007, .415), head, 'pine_helm_ridge', (.11, .3, .075))
    for side in (-1, 1):
        parts['copper-rivets'].append(rivet((side * .235, -.322, .099), head, 'copper_helm_rivet', .036))
    parts['stone-guards'].append(stone((0, -.258, .182), body, 'stone_waist_guard', (.1, .032, .062)))
    parts['copper-rivets'].append(box((0, -.25, .46), (.1, .03, .05), toon('#e9a466', rim=.16), body,
                                     bevel=.005, line=.005, name='copper_neck_clasp'))
    return parts
