"""Sowerby's Guest Cottage, built from Bram's planks: oak plank walls on a stone footing, a rusty-red shingle roof, a
round green door (mole-sized), a copper lantern and weathervane, and a window box of flowers. The molehill was there
first."""
import math

from lib import box, cone, cylinder, empty, profile, sphere, toon, torus

from buildings._common import TILE, Parts


def build(root, level=1):
    P = Parts(root)
    w, d = 2.2 * TILE * 0.9, 1.4 * TILE * 0.8
    front = -d / 2
    # Already on the plot: a fresh molehill by the step, and a pebble or two.
    site = P('site')
    sphere((0.95, front - 0.45, 0.02), (0.26, 0.22, 0.15), toon('#9a7050'), site, line=0.012)
    for x, y in ((0.7, -0.62), (1.2, -0.3)):
        sphere((x, y + front, 0.04), (0.07, 0.06, 0.05), toon('#9aa0b0'), site, line=0.008)
    # Stone: a footing of rounded stones, and the doorstep.
    footing = P('stone-footing')
    for i in range(9):
        x = -w / 2 + (i + 0.5) * w / 9
        sphere((x, front + 0.02, 0.12), (0.22, 0.14, 0.14), toon('#9a9aa8' if i % 2 else '#8a8a98'), footing, line=0.012)
    box((0, 0, 0.12), (w, d, 0.24), toon('#8a8a98'), footing, bevel=0.06, line=0)
    box((0.25, front - 0.12, 0.26), (0.66, 0.12, 0.08), toon('#8a8a98'), footing, bevel=0.03, line=0.01)
    # Pine: the corner posts.
    frame = P('oak-frame')
    for x in (-w / 2, w / 2):
        box((x, front, 0.9), (0.16, 0.16, 1.3), toon('#9a6a44'), frame, bevel=0.03, line=0.01)
    # The Oak Plank: board after board of wall in two shades, the round green door, and a window with its flower box.
    walls = P('plank-walls')
    for i in range(6):
        z = 0.34 + i * 0.22
        box((0, 0, z), (w - 0.05, d - 0.05, 0.2), toon('#d8a868' if i % 2 else '#c8955a'), walls, bevel=0.03, line=0.008)
    cylinder((0.25, front - 0.02, 0.62), 0.38, 0.08, toon('#6a4a2a'), walls, rot=(math.pi / 2, 0, 0), seg=28, line=0.012)
    cylinder((0.25, front - 0.06, 0.62), 0.32, 0.06, toon('#5ab86a'), walls, rot=(math.pi / 2, 0, 0), seg=28, line=0.01)
    for dx in (-0.12, 0, 0.12):
        box((0.25 + dx, front - 0.1, 0.62), (0.015, 0.02, 0.52), toon('#4a9a5a'), walls, bevel=0.005, line=0)
    torus((-0.55, front - 0.04, 1.05), 0.22, 0.05, toon('#9a6a44'), walls, rot=(math.pi / 2, 0, 0), line=0.01)
    cylinder((-0.55, front - 0.02, 1.05), 0.2, 0.03, toon('#bfe8ff', rim=0.4), walls, rot=(math.pi / 2, 0, 0), seg=20, line=0)
    box((-0.55, front - 0.14, 0.76), (0.56, 0.18, 0.14), toon('#9a6a44'), walls, bevel=0.03, line=0.01)
    for k, col in enumerate(('#ff8ab0', '#ffd35a', '#ffffff', '#ff8ab0')):
        sphere((-0.76 + k * 0.14, front - 0.16, 0.87), 0.065, toon(col), walls, line=0.008)
    # Pine again: a steep roof with dark eaves, and a little round attic window in the gable.
    roof = P('plank-roof')
    profile([(-w / 2 - 0.3, 1.5), (0, 2.65), (w / 2 + 0.3, 1.5)], d + 0.5, toon('#d8664a'), roof, bevel=0.08)
    for side in (-1, 1):
        box((side * (w / 4 + 0.15), front - 0.27, 2.09), (w / 2 + 0.55, 0.08, 0.12), toon('#8a5a3a'), roof,
            rot=(0, side * math.atan2(1.15, w / 2 + 0.3), 0), bevel=0.02, line=0.01)
    torus((0, front - 0.26, 1.95), 0.16, 0.04, toon('#8a5a3a'), roof, rot=(math.pi / 2, 0, 0), line=0.01)
    cylinder((0, front - 0.25, 1.95), 0.14, 0.03, toon('#ffe9a0', rim=0.4, emit=0.3), roof, rot=(math.pi / 2, 0, 0), seg=20, line=0)
    # Stone for the chimney.
    chimney = P('stone-chimney')
    box((-w / 2 + 0.55, 0.25, 2.3), (0.34, 0.34, 1.0), toon('#9aa0b0'), chimney, bevel=0.06)
    box((-w / 2 + 0.55, 0.25, 2.84), (0.42, 0.42, 0.1), toon('#8a8a98'), chimney, bevel=0.03, line=0.01)
    # Copper: a weathervane (a little pick) on the peak, the door knob, and a lit lantern beside the door.
    copper = P('copper-touches')
    vane = front - 0.2
    cylinder((0, vane, 2.9), 0.025, 0.5, toon('#c8743a'), copper, seg=6, line=0.006)
    sphere((0, vane, 2.7), 0.07, toon('#e8904a', rim=0.4), copper, line=0.008)
    profile([(-0.26, 0.0), (0, 0.09), (0.26, 0.0), (0.26, -0.045), (0, 0.035), (-0.26, -0.045)], 0.04, toon('#e8904a', rim=0.4), copper,
            loc=(0, vane, 3.14), bevel=0.01, line=0.01)
    sphere((0.43, front - 0.12, 0.58), 0.045, toon('#e8904a', rim=0.4), copper, line=0.008)
    lamp = empty('lantern', copper, (0.8, front - 0.1, 1.05))
    box((0, 0, 0), (0.16, 0.16, 0.2), toon('#ffe9a0', rim=0.4, emit=0.5), lamp, bevel=0.03, line=0.01)
    cone((0, 0, 0.16), 0.13, 0.1, toon('#e8904a'), lamp, seg=4, rot=(0, 0, math.pi / 4), line=0.008)
    box((0, 0.1, 0.05), (0.04, 0.12, 0.04), toon('#c8743a'), lamp, bevel=0.01, line=0.006)
    return P.objects()
