"""Bat Cloak: folded wing membranes, scalloped hems and Wolf Fang closures."""
import math
from lib import profile, toon
from gear._woodland_shapes import add, fang, membrane, pivots, vest

PARTS = ('wing-back-left', 'wing-back-right', 'wing-lapels', 'wing-collar', 'fang-clasps')
CAMERA = dict(ppu=467.027826, anchor=(0, 0.067771, 0.318838), elevation=math.radians(12))


def build(body, arms=None, head=None):
    arms, _ = pivots(body, arms, head)
    parts = {key: [] for key in PARTS}
    vest(parts, 'wing-lapels', body, arms, '#62468e')
    for side in (-1, 1):
        membrane(parts, 'wing-back-left' if side < 0 else 'wing-back-right', body, side, '#62468e')
        # Short front overlaps leave hands and the weapon grip clear.
        add(parts, 'wing-lapels', profile([(side * x, z) for x, z in
                    ((.025, .52), (.25, .52), (.30, .26), (.22, .19), (.15, .25), (.025, .22))],
                    .035, toon('#7e59ac'), body, loc=(0, -.235, 0), bevel=.015, line=.011))
        add(parts, 'wing-collar', profile([(side * x, z) for x, z in
                    ((.065, .51), (.14, .65), (.26, .58), (.22, .48))], .05,
                    toon('#9874c5'), body, loc=(0, -.09, 0), bevel=.018, line=.012,
                    name='folded_wing_collar'))
        for z in (.275, .37, .465):
            fang(parts, 'fang-clasps', body, (side * .075, -.272, z), .095, side * .45)
    return parts


def build_armor(P):
    return build(P['body'], {side: P[f'arm{side}'] for side in (-1, 1)}, P['head'])
