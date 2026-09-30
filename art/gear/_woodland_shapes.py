"""Small geometry helpers owned by the four woodland armor contributions."""
import math
from lib import box, cone, cylinder, empty, profile, sphere, toon


def pivots(body, arms=None, head=None):
    arms = arms or {s: empty('garment_arm' + str(s), body, (.29 * s, 0, .37)) for s in (-1, 1)}
    return arms, head or empty('garment_head', body, (0, 0, .8))


def add(parts, key, obj):
    parts.setdefault(key, []).append(obj)
    return obj


def vest(parts, key, body, arms, color):
    """Material-colored continuous underlayer: prevents gaps behind the ingredient panels."""
    mat = toon(color)
    add(parts, key, sphere((0, 0, .33), (.272, .226, .245), mat, body, seg=20, line=.012))
    for s in (-1, 1):
        add(parts, key, sphere((.018 * s, 0, -.035), (.086, .085, .09), mat, arms[s], seg=16, line=.01))


def fang(parts, key, parent, loc, size=.075, tilt=0):
    """Rounded ivory fang toggle, root above and tapered tip pointing down."""
    mat = toon('#fff2d7', rim=.1)
    add(parts, key, cone(loc, size * .42, size, mat, parent, seg=12,
                         rot=(math.pi, tilt, 0), line=.01, r2=.004, name='wolf_fang_toggle'))
    # A warm knot at the root: the fang is visibly tied on, and the toggle reads at icon size.
    root = (loc[0] - math.sin(tilt) * size * .5, loc[1] - .004, loc[2] + math.cos(tilt) * size * .5)
    add(parts, key, sphere(root, (size * .36, size * .24, size * .3), toon('#8a5a3c', rim=.08), parent,
                           seg=12, line=.008, name='wolf_fang_knot'))


def membrane(parts, key, body, side, color, front=False):
    """A folded bat membrane with three distinct scallops and raised structural ribs."""
    mat = toon(color, rim=.12)
    points = [(0, .55), (.22, .57), (.45, .39), (.44, .14), (.34, .20),
              (.27, .085), (.18, .15), (.08, .09), (0, .15)]
    y = -.19 if front else .2
    depth = .04
    add(parts, key, profile([(side * x, z) for x, z in points], depth, mat, body,
                            loc=(0, y, 0), bevel=.013, line=.012, name='bat_membrane'))
    rib = toon('#a58acb' if color == '#62468e' else '#d0c0f6', rim=.12)
    for x, z in ((.27, .09), (.43, .15)):
        dx, dz = side * (x - .14), z - .53
        length = math.hypot(dx, dz)
        add(parts, key, cylinder((side * (.14 + x) / 2, y - .026, (.53 + z) / 2),
                                .009, length, rib, body, seg=8,
                                rot=(0, math.atan2(dx, dz), 0), line=.004, name='wing_rib'))


def jelly_dot(parts, key, body, loc, size=.022):
    add(parts, key, sphere(loc, size, toon('#e4c4ff', rim=.25, emit=.16), body,
                          seg=12, line=.003, name='glimmer_jelly'))
