"""Glimmer Shawl: bat membrane support, visible Jelly edging, a single Golem Core."""
import math
from lib import sphere, toon, torus
from gear._woodland_shapes import add, jelly_dot, membrane, pivots, vest

PARTS = ('wing-left', 'wing-right', 'jelly-weave', 'jelly-edging', 'core-brooch')
CAMERA = dict(ppu=459.343707, anchor=(0, 0.067111, 0.315734), elevation=math.radians(12))


def build(body, arms=None, head=None):
    arms, _ = pivots(body, arms, head)
    parts = {key: [] for key in PARTS}
    vest(parts, 'wing-left', body, arms, '#aa8ad2')
    for side in (-1, 1):
        membrane(parts, 'wing-left' if side < 0 else 'wing-right', body, side, '#b09adb', front=True)
        for z, x in ((.19, .21), (.28, .25), (.39, .245), (.50, .19)):
            add(parts, 'jelly-weave', sphere((side * x, -.219, z), (.072, .027, .016),
                      toon('#d8bcfa', rim=.2, emit=.05), body, seg=12, line=.003, name='jelly_inlay'))
        # Soft scalloped edging is still jelly, not unexplained metal or crystal.
        for x, z in ((.05, .17), (.12, .135), (.20, .16), (.28, .12), (.35, .205), (.43, .19)):
            jelly_dot(parts, 'jelly-edging', body, (side * x, -.218, z), .027)
        for i in range(5):
            jelly_dot(parts, 'jelly-edging', body, (side * (.07 + .064 * i), -.218, .55 - .016 * i), .024)
    # Exactly one core is a focal brooch; the transparent-blue setting is stretched jelly.
    add(parts, 'core-brooch', sphere((0, -.277, .452), (.071, .034, .065),
                toon('#886ac8', rim=.22, emit=.16), body, seg=20, line=.008, name='single_golem_core'))
    add(parts, 'core-brooch', torus((0, -.28, .452), .075, .012,
                toon('#b7edf3', rim=.3, emit=.08), body, rot=(1.5707963, 0, 0), line=.004, seg=20))
    add(parts, 'core-brooch', sphere((-.016, -.311, .469), (.012, .003, .019),
                toon('#f3e8ff', emit=.25), body, seg=12, line=0))
    return parts


def build_armor(P):
    return build(P['body'], {side: P[f'arm{side}'] for side in (-1, 1)}, P['head'])
