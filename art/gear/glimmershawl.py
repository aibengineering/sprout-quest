"""Glimmer Shawl: Glimmer Jelly with a soft cloth lining (soft glowing drape, hardened glass shards) + one Golem Core."""
import math
from lib import profile, sphere, toon, torus
from gear._crystal_glimmer_detail import GLOW, GLOW_DEEP, GLOW_PINK, ICE, ICE_MID, SHINE, glow, shard
from gear._woodland_shapes import add, pivots

from gear._garment import lining, binding

PARTS = ('fluff-lining', 'goo-seams', 'jelly-drape', 'jelly-collar', 'shard-left', 'shard-right', 'core-brooch')


def _hem(width, top, bottom, bumps):
    """A rounded bubbly hem: soft jelly drips instead of pointed wing scallops."""
    # Rounded shoulders: no square corners or wing peaks.
    pts = [(-width * .86, top - .16), (-width * .5, top), (width * .5, top), (width * .86, top - .16)]
    n = bumps * 8
    for i in range(n + 1):
        t = i / n
        x = width - 2 * width * t
        z = bottom + .045 * abs(math.cos(t * bumps * math.pi))
        pts.append((x, z))
    return pts


def build(body, arms=None, head=None):
    arms, _ = pivots(body, arms, head)
    parts = {key: [] for key in PARTS}
    lining(parts, 'fluff-lining', body, arms)
    binding(parts, 'goo-seams', body, arms)

    # Wide rounded glow cape behind: reads as one luminous jelly bell at phone size.
    add(parts, 'jelly-drape', profile(_hem(.42, .56, .10, 5), .07, glow(GLOW, emit=.2), body,
                                      loc=(0, .2, 0), bevel=.02, line=.012, name='glimmer_drape'))
    for i in range(6):
        x = -.36 + .144 * i
        add(parts, 'jelly-drape', sphere((x, .16, .115), .034, glow(GLOW_PINK, emit=.3), body,
                                          seg=12, line=.004, name='glimmer_drip'))
    # Soft jelly shawl wrapped round the shoulders, with two rounded front lapels.
    add(parts, 'jelly-collar', torus((0, 0, .5), .215, .062, glow(GLOW, emit=.22), body,
                                      line=.010, seg=28, name='glimmer_wrap'))
    for side in (-1, 1):
        add(parts, 'jelly-collar', profile([(side * x, z) for x, z in
                    ((.03, .50), (.19, .50), (.25, .36), (.21, .22), (.13, .18), (.05, .22))],
                    .035, glow(GLOW_PINK, emit=.24), body, loc=(0, -.232, 0), bevel=.015, line=.011,
                    name='glimmer_lapel'))
        for x, z in ((.07, .21), (.14, .185), (.21, .215)):
            add(parts, 'jelly-collar', sphere((side * x, -.255, z), .022, toon(SHINE, emit=.35, rim=.2),
                                               body, seg=10, line=.003, name='glimmer_bead'))
        # Hardened glimmer glass: an icy shard cluster rising from a jelly shoulder.
        arm, key = arms[side], 'shard-left' if side < 0 else 'shard-right'
        add(parts, key, sphere((side * .03, 0, .03), (.11, .105, .075), glow(GLOW_DEEP, emit=.18), arm,
                               seg=14, line=.010, name='glimmer_shoulder'))
        for (x, y, z), r, h, tilt, color in (((.03, .0, .06), .046, .30, .5, ICE),
                                            ((.09, -.03, .03), .034, .20, 1.0, ICE_MID),
                                            ((-.03, .02, .06), .03, .17, .12, GLOW_PINK),
                                            ((.05, -.075, .03), .024, .12, .78, GLOW_PINK)):
            add(parts, key, shard(arm, (side * x, y, z), r, .02, h, color, rot=(0, side * tilt, 0), sides=5,
                                  line=.008))
    # Exactly one Golem Core, held in a ring of glowing jelly.
    add(parts, 'core-brooch', sphere((0, -.272, .44), (.062, .03, .06), toon('#76898c'), body, seg=16,
                                     line=.008, name='single_golem_core'))
    add(parts, 'core-brooch', sphere((0, -.30, .44), .03, toon('#91e9dd', emit=.15), body, seg=12, line=0))
    add(parts, 'core-brooch', torus((0, -.275, .44), .07, .014, glow(GLOW_PINK, emit=.3), body,
                                    rot=(math.pi / 2, 0, 0), line=.004, seg=20))
    add(parts, 'core-brooch', sphere((-.02, -.318, .455), (.01, .003, .014), toon(SHINE, emit=.4), body, seg=10, line=0))
    return parts


def build_armor(P):
    return build(P['body'], {side: P[f'arm{side}'] for side in (-1, 1)}, P['head'])
