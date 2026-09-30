"""Glimmer Jelly 5 + Bat Wing 3 + Golem Core 1: wing-framed jelly star."""
import math
from lib import profile, sphere, toon, torus
from gear._crystal_glimmer_detail import JELLY, WING_RIB, X, bead, rod, wing_panel

PARTS = ('wing-stem', 'wing-frame', 'core-heart', 'jelly-star')


def build_parts(root):
    stem = [rod(root, -.10, .73, .033, '#59426f')]
    for x in (-.055, .025, .105, .185):
        stem.append(torus((x, 0, 0), .034, .008, toon(WING_RIB), root, rot=X, line=.005, seg=12))
    frame = []
    for s in (-1, 1):
        frame.append(wing_panel(root, [(.61, .035 * s), (.70, .215 * s), (.765, .14 * s),
                                      (.86, .19 * s), (.90, .035 * s), (.81, .08 * s)]))
    # Golem core sits visibly behind the jelly star, with its own mint center.
    core = [sphere((.81, 0, 0), (.094, .05, .095), toon('#76898c'), root, seg=10, line=.010),
            sphere((.81, -.06, 0), .035, toon('#91e9dd', emit=.10), root, seg=8, line=0)]
    points = []
    for i in range(10):
        a = i / 10 * math.tau
        radius = .152 if i % 2 == 0 else .071
        points.append((.81 + math.cos(a) * radius, math.sin(a) * radius))
    jelly = [profile(points, .082, toon(JELLY, rim=.3), root, bevel=0, line=.012)]
    jelly[0].location.y = -.056
    # A mint inset repeats the core through the jelly star.
    jelly.append(sphere((.81, -.105, 0), .035, toon('#91e9dd', rim=.2, emit=.10), root, seg=8, line=0))
    jelly.append(bead(root, .87, .045, .020))
    jelly.append(profile([(.26, -.009), (.69, -.009), (.72, 0), (.69, .009), (.26, .009)], .012,
                         toon(JELLY, rim=.22), root, bevel=0, line=0))
    jelly[-1].location.y = -.032
    return dict(zip(PARTS, (stem, frame, core, jelly)))


def build_weapon(root):
    return build_parts(root)


CAMERA = dict(ppu=390, anchor=(0.43, 0, 0), elevation=0.15707963267948966)
LENGTH = 1.3
