"""Copper plates and matte stone studs. Recipe: copper 12, stone 8."""
from lib import box, toon, torus
from gear._metal import pivots, rivet, shell, shoulder, stone

PARTS = ('copper-shell', 'left-pauldron', 'right-pauldron', 'stone-studs', 'copper-bindings')


def build_armor(P):
    return build(P['body'], {s: P[f'arm{s}'] for s in (-1, 1)}, P['head'])


def build(body, arms=None, head=None):
    arms, _ = pivots(body, arms, head)
    parts = {p: [] for p in PARTS}
    parts['copper-shell'] = shell(body, '#d8884b', 'copper_hammered_band')
    for side, part in ((-1, 'left-pauldron'), (1, 'right-pauldron')):
        arm = arms[side]
        parts[part].append(shoulder(arm, '#e89a58', 'copper_pauldron'))
        # Two broad hammer marks, visible at inventory and equipped scale.
        for dx in (-.032, .032):
            parts[part].append(box((side * .025 + dx, -.128, .104), (.03, .006, .016),
                                   toon('#f3b572', rim=.1), arm, bevel=.004, line=0))
        parts['stone-studs'].append(stone((side * .026, -.134, .06), arm, 'stone_shoulder_stud'))
        for x, z in ((.11, .42), (.15, .3), (.105, .19)):
            parts['stone-studs'].append(stone((side * x, -.236 if z < .4 else -.225, z), body, 'stone_copper_stud'))
        for z in (.21, .335, .455):
            parts['copper-bindings'].append(rivet((side * .042, -.24 if z < .4 else -.211, z), body, 'copper_closure'))
    parts['copper-bindings'].append(torus((0, 0, .145), .258, .018, toon('#f0ad69', rim=.16), body, line=.007))
    parts['copper-bindings'].append(box((0, -.232, .34), (.028, .018, .35),
                                       toon('#b96537', rim=.12), body, bevel=.006, line=.005))
    return parts
