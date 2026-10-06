"""Cloth foundations and stitched bindings for wearable armour.

Keep quilting and hems broad enough to read in the inventory and on the hero.
"""
from lib import box, profile, sphere, toon, torus


def lining(parts, key, body, arms, color='#eee1c8'):
    cloth = toon(color, rim=.04)
    parts[key].append(sphere((0, .015, .31), (.265, .213, .235), cloth, body,
                             seg=20, line=.009, name='padded_lining'))
    parts[key].append(profile([(-.235, .26), (.235, .26), (.245, .09),
                               (.13, .075), (0, .095), (-.13, .075), (-.245, .09)],
                              .045, cloth, body, loc=(0, -.155, 0), bevel=.015,
                              line=.008, name='cloth_skirt'))
    for side in (-1, 1):
        parts[key].append(sphere((side * .012, .012, -.037), (.09, .09, .12), cloth,
                                 arms[side], seg=16, line=.009, name='padded_sleeve'))
    for x in (-.16, -.08, 0, .08, .16):
        parts[key].append(box((x, -.187, .13), (.007, .007, .062),
                              toon('#c1ae98', rim=.02), body, bevel=.002, line=0,
                              name='quilt_stitch'))


def binding(parts, key, body, arms, color='#86725d'):
    mat = toon(color, rim=.04)
    parts[key].append(torus((0, .012, .12), .236, .009, mat, body,
                            seg=24, line=.003, name='bound_hem'))
    for side in (-1, 1):
        parts[key].append(torus((side * .012, .012, -.10), .081, .008, mat,
                                arms[side], seg=16, line=.003, name='bound_cuff'))
