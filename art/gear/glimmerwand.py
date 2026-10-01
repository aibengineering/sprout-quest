"""Glimmer Jelly 7 + Golem Core 1: a hardened-glass jelly wand cradling a glowing orb."""
import math
from lib import profile, sphere, toon, torus
from gear._crystal_glimmer_detail import (GLOW, GLOW_DEEP, GLOW_PINK, ICE, ICE_MID, SHINE, X,
                                          glow, shard)

PARTS = ('glass-shaft', 'shard-crown', 'core-heart', 'jelly-orb')
ALONG_X = (0, math.pi / 2, 0)


def _toward(a):
    """Lathe rotation that points local +Z at angle a (radians) from +X toward +Z."""
    return (0, math.pi / 2 - a, 0)


def build_parts(root):
    # Hardened jelly glass: a pale faceted hex rod with a pointed pommel.
    stem = [shard(root, (-.10, 0, 0), .034, .07, .70, ICE_MID, rot=ALONG_X, mid=.66)]
    # A pink light channel glows down the glass, plus two soft jelly grip bands.
    stem.append(profile([(-.02, -.010), (.57, -.010), (.60, 0), (.57, .010), (-.02, .010)], .012,
                        glow(GLOW_PINK, emit=.3, rim=.2), root, bevel=0, line=0))
    stem[-1].location.y = -.036
    for x in (-.04, .06):
        stem.append(torus((x, 0, 0), .038, .011, glow(GLOW_DEEP, emit=.15), root, rot=X, line=.005, seg=14))
    # Clear icy shards fan out from the collar and cup the orb from both sides.
    crown = []
    for s in (-1, 1):
        crown.append(shard(root, (.59, 0, .012 * s), .036, .03, .30, ICE, rot=_toward(s * math.radians(38)), sides=5))
        crown.append(shard(root, (.60, 0, .02 * s), .026, .02, .17, ICE_MID, rot=_toward(s * math.radians(74)), sides=5))
    crown.append(torus((.60, 0, 0), .044, .014, glow(ICE, emit=.1), root, rot=X, line=.006, seg=12))
    # The Golem Core shows through the front of the jelly orb.
    core = [sphere((.80, -.045, 0), (.062, .05, .062), toon('#76898c'), root, seg=12, line=.010),
            sphere((.80, -.098, 0), .032, toon('#91e9dd', emit=.12), root, seg=10, line=0)]
    orb = [sphere((.80, 0, 0), (.125, .085, .125), glow(GLOW, emit=.26), root, seg=20, line=.012),
           torus((.80, -.02, 0), .118, .012, glow(GLOW_PINK, emit=.3), root, rot=(math.pi / 2, 0, 0), line=0, seg=24),
           sphere((.755, -.09, .062), (.03, .008, .016), toon(SHINE, emit=.5, rim=0), root, seg=10, line=0),
           # Tip shard: the wand's length ends exactly at 0.962 along +X.
           shard(root, (.905, 0, 0), .024, .01, .057, ICE, rot=ALONG_X, sides=5, line=.008)]
    orb.append(sphere((.855, -.07, -.06), .016, toon(SHINE, emit=.3, rim=.2), root, seg=8, line=0))
    return dict(zip(PARTS, (stem, crown, core, orb)))


def build_weapon(root):
    return build_parts(root)


# Standard diagonal weapon presentation (root Y=-pi/4, scale=(1,1.25,1.25)); icon == complete.
LENGTH = 1.3
