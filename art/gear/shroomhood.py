"""Shroom Hood: thick spotted cap canopy, layered cap mantle, soft lining and hip charms."""
from lib import lathe, profile, sphere, toon
from gear._woodland_shapes import add, fang, pivots

from gear._garment import lining, binding

PARTS = ('fluff-lining', 'goo-seams', 'cap-mantle', 'cap-left', 'cap-right', 'cap-canopy', 'fang-ornaments')
HELMET = True


def build(body, arms=None, head=None):
    arms, head = pivots(body, arms, head)
    parts = {key: [] for key in PARTS}
    lining(parts, 'fluff-lining', body, arms)
    binding(parts, 'goo-seams', body, arms)

    red, cream = toon('#e8505a'), toon('#fff0d8', rim=.12)
    # Hood underside has a lip and radial gills instead of floating polka-dot balls.
    add(parts, 'cap-canopy', lathe([(.001, .46), (.15, .45), (.32, .36), (.45, .22),
                                   (.47, .16), (.42, .12), (.001, .13)], red, head,
                                  seg=32, line=.014, name='shroom_canopy'))
    add(parts, 'cap-canopy', lathe([(.001, .115), (.37, .115), (.43, .14), (.001, .14)],
                                  cream, head, seg=32, line=.008, name='cap_gills'))
    # Two folded cap sides connect the canopy to the mantle, leaving a face opening.
    for side in (-1, 1):
        add(parts, 'cap-canopy', profile([(side * x, z) for x, z in
                  ((.34, .15), (.43, .14), (.42, -.25), (.27, -.34), (.24, -.24), (.32, -.17))],
                  .09, red, head, loc=(0, .13, 0), bevel=.035, line=.011, name='cap_cowl'))
    for x, y, z, sx, sy in ((-.22, -.26, .33, .073, .053), (.18, -.3, .32, .064, .054),
                            (0, -.08, .457, .08, .066), (.30, .05, .35, .065, .054),
                            (-.26, .13, .38, .07, .05)):
        add(parts, 'cap-canopy', sphere((x, y, z), (sx, sy, .017), cream, head,
                                       seg=16, rot=(.42 if y < -.2 else 0, -.4 if x < 0 else .3, 0),
                                       line=.003, name='cap_spot'))
    for side, key in ((-1, 'cap-left'), (1, 'cap-right')):
        add(parts, key, sphere((side * .205, -.055, .48), (.175, .196, .075), red, body,
                               seg=20, rot=(0, side * .3, 0), line=.012, name='folded_cap_mantle'))
        add(parts, key, sphere((side * .2, -.16, .515), (.053, .03, .011), cream, body,
                               seg=12, line=.003))
        add(parts, key, profile([(side * x, z) for x, z in
                     ((.045, .46), (.22, .46), (.265, .30), (.225, .15), (.09, .12), (.055, .23))],
                     .045, red, body, loc=(0, -.235, 0), bevel=.024, line=.009,
                     name='tailored_cap_panel'))
    # A small charm hangs at one hip, clear of the front opening.
    for x in (.20, .25):
        fang(parts, 'fang-ornaments', body, (x, -.29, .22), .06, .06)
    add(parts, 'cap-mantle', sphere((0, -.265, .455), (.032, .016, .027), red, body,
                                  seg=12, line=.005, name='cap_cloth_button'))
    return parts


def build_armor(P):
    return build(P['body'], {side: P[f'arm{side}'] for side in (-1, 1)}, P['head'])
