"""Glimmer Jelly 6 + Bat Wing 3 + Golem Core 1: luminous membrane lash."""
import math
from lib import profile, sphere, toon, torus
from gear._crystal_glimmer_detail import JELLY, WING, WING_RIB, X, bead, rod, wing_panel

PARTS = ('core-anchor', 'wing-grip', 'wing-lash', 'jelly-channels')


def build_parts(root):
    # Entire grip/core stays before X=.225, the renderer's uncoiled boundary.
    core = [sphere((-.145, 0, 0), (.064, .058, .058), toon('#76898c'), root, seg=10, line=.012),
            sphere((-.145, -.054, 0), .026, toon('#91e9dd', rim=.25, emit=.1), root, seg=8, line=0)]
    grip = [rod(root, -.10, .195, .045, WING)]
    for x in (-.075, .01, .095):
        grip.append(torus((x, 0, 0), .046, .009, toon(WING_RIB), root, rot=X, line=.006, seg=12))
    grip.append(wing_panel(root, [(.12, 0), (.16, .1), (.195, .04), (.22, .06), (.22, -.055)]))
    lash = [profile([(.226, -.025), (.33, -.06), (.365, -.105), (.32, -.12), (.226, -.045)],
                    .040, toon(WING), root, bevel=0, line=.010)]
    jelly = [profile([(.216, -.031), (.327, -.069), (.352, -.097), (.327, -.103), (.216, -.041)],
                     .016, toon(JELLY, rim=.24), root, bevel=0, line=0)]
    jelly[0].location.y = -.025
    for i in range(3):
        x, z, radius = .36 + .035 * i, -.13 - .03 * i, .10 - .02 * i
        # Keep both membrane and jelly entirely past the uncoiled cutoff.
        # Dark membrane must disappear with the coils when the lash extends.
        lash.append(torus((x, .013, z), radius, .029, toon(WING), root,
                          rot=(math.pi / 2, 0, .35 * i), line=.010, seg=16))
        jelly.append(torus((x, -.013, z), radius, .018, toon(JELLY, rim=.24), root,
                           rot=(math.pi / 2, 0, .35 * i), line=.006, seg=16))
        jelly.append(bead(root, x + radius * .6, z + radius * .6, .018))
    lash.append(profile([(.39, -.265), (.45, -.25), (.49, -.29), (.44, -.32)], .034,
                        toon(WING_RIB), root, bevel=0, line=.010))
    jelly.append(bead(root, .44, -.278, .026))
    # A glimmer inset is kept inside the grip when the lash extends.
    jelly.append(bead(root, .15, 0, .020))
    return dict(zip(PARTS, (core, grip, lash, jelly)))


def build_weapon(root):
    return build_parts(root)


CAMERA = dict(ppu=575, anchor=(0.17, 0, -0.12), elevation=0.15707963267948966)
LENGTH = 0.9
