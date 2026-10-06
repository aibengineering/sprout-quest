"""Magma Mail: iron, ember, Imp Horn and crystal, shared by equipment and assembly.

The arm pivots are the existing hero pivots. No geometry hangs from the weapon hand.
"""
import math

from lib import box, crystal, empty, profile, sphere, toon, torus

PARTS = ('iron-shell', 'ember-seams', 'left-horns', 'right-horns', 'crystal-clasps')
HELMET = False


def build_armor(P):
    return build(P['body'], {side: P['arm' + str(side)] for side in (-1, 1)}, P['head'])


def build(body, arms=None, head=None):
    arms = arms or {side: empty('magma_arm' + str(side), body, (side * .29, 0, .37)) for side in (-1, 1)}
    parts = {name: [] for name in PARTS}
    iron = toon('#667080', rim=.16)
    dark = toon('#4a4a5e', rim=.1)
    edge = toon('#a7b0c0', rim=.2)
    ember = toon('#ff993f', rim=.08, emit=.16)
    horn = toon('#e5ba92', rim=.1)
    horn_edge = toon('#b58b76', rim=.1)
    gem = toon('#a5e5ed', rim=.24, emit=.025)
    shell = parts['iron-shell']
    shell.append(sphere((0, .012, .335), (.283, .226, .253), dark, body, seg=20, line=.018, name='magma_iron_back'))
    shell.append(profile([(-.21, .17), (.21, .17), (.27, .39), (.21, .51), (-.21, .51), (-.27, .39)],
                         .10, iron, body, loc=(0, -.193, 0), bevel=.025, line=.015, name='magma_iron_breastplate'))
    shell.append(torus((0, 0, .19), .244, .023, edge, body, seg=20, line=.009, name='magma_iron_hem'))
    # Four broad glowing seams read as warm inlays, not unprovided basalt cracks.
    for x, z, width, angle in ((-.09, .405, .19, -.22), (.09, .405, .19, .22),
                                (-.07, .28, .15, .2), (.07, .28, .15, -.2)):
        parts['ember-seams'].append(box((x, -.256, z), (width, .018, .021), ember, body,
                                       bevel=.005, line=0, rot=(0, angle, 0), name='magma_ember_inlay'))
    for side in (-1, 1):
        arm = arms[side]
        shell.append(sphere((.01 * side, 0, -.04), (.095, .09, .104), iron, arm, seg=16, line=.013, name='magma_iron_sleeve'))
        shell.append(sphere((.015 * side, .005, .1), (.14, .125, .085), iron, arm, seg=16, line=.014, name='magma_iron_shoulder'))
        # Two recognizable curved horns on each shoulder, retained as four recipe pieces.
        for i in range(2):
            name = 'left-horns' if side == -1 else 'right-horns'
            outline = [(0, 0), (.092 * side, .016), (.15 * side, .11), (.137 * side, .185),
                       (.09 * side, .24), (.11 * side, .135), (.057 * side, .066)]
            parts[name].append(profile(outline, .07, horn, arm, loc=(.048 * side, -.055 + .102 * i, .12),
                                       bevel=.012, line=.012, name='magma_imp_horn'))
            parts[name].append(sphere((.074 * side, -.055 + .102 * i, .145), (.046, .041, .026),
                                     horn_edge, arm, seg=12, line=.006, name='magma_horn_root'))
        parts['ember-seams'].append(box((.023 * side, -.11, .091), (.125, .018, .017), ember, arm,
                                       bevel=.005, line=0, name='magma_shoulder_ember'))
        parts['crystal-clasps'].append(crystal((.023 * side, -.13, .109), .05, .085, gem, arm,
                                             rot=(math.pi / 2, 0, 0), sides=5, line=.01, name='magma_crystal_rivet'))
        for z in (.223, .468):
            parts['crystal-clasps'].append(crystal((.172 * side, -.27, z), .05, .085, gem, body,
                                                 rot=(math.pi / 2, 0, 0), sides=5, line=.01, name='magma_crystal_rivet'))
    return parts
