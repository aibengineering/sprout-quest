"""Glimmer Jelly 8 + Golem Core 1: glassy jelly grip, glowing coils, an icy shard tip."""
import math
from lib import profile, sphere, toon, torus
from gear._crystal_glimmer_detail import (GLOW_DEEP, GLOW_PINK, ICE, ICE_MID, JELLY, SHINE, X,
                                          bead, glow, shard)

PARTS = ('core-anchor', 'glass-grip', 'jelly-lash', 'shard-tip')


def _toward(a):
    """Lathe rotation that points local +Z at angle a (radians) from +X toward +Z."""
    return (0, math.pi / 2 - a, 0)


def build_parts(root):
    # Grip and core stay before X=.225, the renderer's uncoiled boundary.
    core = [sphere((-.145, 0, 0), (.064, .058, .058), toon('#76898c'), root, seg=10, line=.012),
            sphere((-.145, -.054, 0), .026, toon('#91e9dd', rim=.25, emit=.1), root, seg=8, line=0)]
    grip = [shard(root, (-.09, 0, 0), .045, .0001, .31, ICE_MID, rot=_toward(0), mid=.285)]
    for x in (-.05, .04, .13):
        grip.append(torus((x, 0, 0), .047, .011, glow(GLOW_DEEP, emit=.15), root, rot=X, line=.006, seg=12))
    # Two small hardened-jelly guard shards flare at the collar.
    for s in (-1, 1):
        grip.append(shard(root, (.18, 0, .03 * s), .018, .01, .085, ICE, rot=_toward(s * math.radians(66)), sides=5, line=.008))
    grip.append(bead(root, .09, 0, .018))
    # Luminous jelly coils (the combat renderer strips JELLY when the lash extends).
    lash = [profile([(.227, .012), (.33, -.05), (.37, -.10), (.32, -.115), (.227, -.030)],
                    .036, toon(JELLY, rim=.24, emit=.08), root, bevel=0, line=.010)]
    for i in range(3):
        x, z, radius = .36 + .035 * i, -.13 - .03 * i, .10 - .02 * i
        lash.append(torus((x, 0, z), radius, .030, toon(JELLY, rim=.24, emit=.08), root,
                          rot=(math.pi / 2, 0, .35 * i), line=.010, seg=18))
        # A pink glow line rides the front of each coil.
        lash.append(torus((x, -.024, z), radius, .010, glow(GLOW_PINK, emit=.35, rim=.1), root,
                          rot=(math.pi / 2, 0, .35 * i), line=0, seg=18))
        lash.append(sphere((x - radius * .55, -.035, z + radius * .6), .014, toon(SHINE, emit=.4, rim=0),
                           root, seg=8, line=0))
    # Hardened jelly shard at the end of the lash: a clear icy point, not a wing tab.
    tip = [shard(root, (.45, 0, -.265), .036, .035, .15, ICE, rot=_toward(math.radians(-58)), sides=5),
           shard(root, (.43, 0, -.25), .02, .01, .08, ICE_MID, rot=_toward(math.radians(-100)), sides=5, line=.008)]
    return dict(zip(PARTS, (core, grip, lash, tip)))


def build_weapon(root):
    return build_parts(root)


# Standard diagonal weapon presentation (root Y=-pi/4, scale=(1,1.25,1.25)); icon == complete.
LENGTH = 0.9
