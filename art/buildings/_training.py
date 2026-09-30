"""The Training Yard: an oak post stuffed with Bunny Fluff, then a fang-studded sparring post, a rack of copper blades
and a Royal Jelly target, then a Dojo deck and gate of pine planks with iron and Imp Horns."""
import math

from lib import box, cone, cylinder, empty, sphere, toon, torus

from buildings._common import COPPER, IRON, OAK_DARK, PINE, PINE_DARK, Parts

W, D = 3.4, 1.9


def build(root, level):
    P = Parts(root)
    if level > 1:
        P('base')
    part = lambda lv, name: P(name if lv == level else 'base')

    # 1: the Straw Dummy.
    post = part(1, 'oak-post')
    box((0, 0, 0.04), (W, D, 0.08), toon('#d8b888'), post, bevel=0.04, line=0.012)
    cylinder((0, 0, 0.6), 0.07, 1.2, toon(OAK_DARK), post, seg=8)
    cylinder((0, 0, 0.95), 0.05, 0.95, toon(OAK_DARK), post, rot=(0, math.pi / 2, 0), seg=8)
    box((0, 0, 0.12), (0.4, 0.4, 0.1), toon('#9a6a44'), post, bevel=0.02)
    stuffing = part(1, 'fluff-stuffing')
    sphere((0, 0, 0.9), (0.28, 0.24, 0.34), toon('#f4ecdc'), stuffing)
    sphere((0, 0, 1.38), 0.2, toon('#f4ecdc'), stuffing)
    for s in (-1, 1):
        sphere((0.43 * s, 0, 0.95), (0.1, 0.1, 0.09), toon('#ffffff'), stuffing, line=0.012)
    torus((0, 0, 0.72), 0.25, 0.025, toon('#c89a6a'), stuffing, seg=20, line=0.008)
    sphere((0, -0.22, 0.92), 0.08, toon('#e8505a'), stuffing, line=0.01)
    torus((0, -0.21, 0.92), 0.13, 0.018, toon('#e8505a'), stuffing, rot=(math.pi / 2, 0, 0), seg=20, line=0)

    # 2: the Training Yard.
    if level >= 2:
        fangs = part(2, 'fang-post')
        cylinder((-1.0, -0.35, 0.55), 0.13, 1.1, toon('#7a5238'), fangs, seg=10)
        for z in (0.35, 0.65, 0.95):
            for a in (-0.6, 0.0, 0.6):
                cone((-1.0 + math.sin(a) * 0.14, -0.35 - math.cos(a) * 0.14, z), 0.035, 0.14, toon('#f4eee0'), fangs,
                     rot=(math.pi / 2, 0, -a), seg=8, line=0.01)
        rack = part(2, 'copper-rack')
        box((-1.35, 0.6, 0.5), (0.9, 0.16, 0.08), toon('#9a6a44'), rack, bevel=0.02)
        for x in (-1.75, -0.95):
            box((x, 0.6, 0.45), (0.08, 0.14, 0.9), toon('#9a6a44'), rack, bevel=0.02)
        for i in range(3):
            x = -1.6 + i * 0.26
            box((x, 0.5, 0.72), (0.07, 0.03, 0.72), toon(COPPER, rim=0.45), rack, bevel=0.01, line=0.01)
            box((x, 0.5, 0.33), (0.18, 0.05, 0.05), toon('#7a4a2a'), rack, bevel=0.01, line=0.008)
        box((-1.35, 0.6, 0.92), (0.9, 0.16, 0.08), toon(COPPER, rim=0.45), rack, bevel=0.02)
        target = part(2, 'royal-target')
        for s in (-1, 1):
            box((1.2 + 0.25 * s, 0.35, 0.5), (0.07, 0.07, 1.0), toon('#9a6a44'), target, bevel=0.02, rot=(0, 0.2 * s, 0))
        tgt = empty('target', target, (1.2, 0.25, 0.85))
        for r, col in ((0.42, '#fff0dc'), (0.3, '#e8505a'), (0.18, '#fff0dc')):
            cylinder((0, -0.02 * (0.42 - r) * 10, 0), r, 0.06, toon(col), tgt, rot=(math.pi / 2, 0, 0), seg=24, line=0.012)
        sphere((0, -0.08, 0), (0.1, 0.05, 0.1), toon('#ffd35a', rim=0.5, emit=0.5), tgt, line=0.01)

    # 3: the Dojo.
    if level >= 3:
        deck = part(3, 'pine-deck')
        box((0, 0.1, 0.1), (W + 0.3, D + 0.1, 0.08), toon(PINE), deck, bevel=0.02)
        for i in range(1, 9):
            box((-W / 2 - 0.15 + i * (W + 0.3) / 9, -D / 2 + 0.04, 0.1), (0.02, 0.02, 0.07), toon(PINE_DARK), deck, bevel=0, line=0)
        for x in (-1.75, 1.75):
            box((x, 0.95, 1.1), (0.16, 0.16, 2.2), toon(PINE), deck, bevel=0.03)
        box((0, 0.95, 2.1), (4.2, 0.2, 0.18), toon(PINE), deck, bevel=0.03)
        box((0, 0.95, 1.75), (3.7, 0.14, 0.12), toon(PINE_DARK), deck, bevel=0.02)
        iron = part(3, 'iron-gong')
        cylinder((0.75, 0.95, 1.95), 0.01, 0.35, toon(IRON), iron, seg=6, line=0)
        cylinder((0.75, 0.9, 1.42), 0.3, 0.05, toon('#6a6e80', rim=0.5), iron, rot=(math.pi / 2, 0, 0), seg=24)
        cylinder((0.75, 0.86, 1.42), 0.1, 0.03, toon('#8a8ea0', rim=0.5), iron, rot=(math.pi / 2, 0, 0), seg=16, line=0.008)
        for x in (-1.75, 1.75):
            box((x, 0.95, 1.75), (0.22, 0.22, 0.14), toon(IRON), iron, bevel=0.02, line=0.01)
        horns = part(3, 'imp-horns')
        for x in (-1.75, 1.75):
            for s in (-1, 1):
                cone((x + 0.09 * s, 0.95, 2.35), 0.09, 0.44, toon('#b04a5a'), horns, rot=(0, 0.4 * s, 0), seg=8, line=0.012)
        for s in (-1, 1):
            cone((0.17 * s, 0.84, 2.32), 0.1, 0.5, toon('#b04a5a'), horns, rot=(0, 0.5 * s, 0), seg=8, line=0.012)
        sphere((0, 0.84, 2.14), (0.14, 0.06, 0.1), toon('#6a2a3a'), horns, line=0.012)
    return P.objects()
