"""Your home in Sowerby: the Cottage (oak and stone, a lucky clover over the door) and the Manor (Obsidian steps,
charcoal Emberwood beams, pale glowing Glimmerwood planking and crystal windows)."""
import math

from lib import box, cone, crystal, cylinder, profile, sphere, toon, torus

from buildings._common import (CRYSTAL, CRYSTAL_PINK, EMBER_WOOD, GLIM, GLIM_GRAIN, GLIM_ROOF, OAK_DARK, STONE,
                               STONE_DARK, TILE, Parts, ember_beam, glimwood, obsidian, plank_wall, stones)


def _clover(parent, loc, s=1.0):
    """Four round leaves facing the camera, and a dark heart."""
    x, y, z = loc
    for i in range(4):
        a = i / 4 * math.tau + math.pi / 4
        sphere((x + math.cos(a) * 0.075 * s, y, z + math.sin(a) * 0.075 * s), (0.07 * s, 0.025, 0.07 * s), toon('#5ac85a'), parent,
               line=0.01)
    sphere((x, y - 0.02, z), 0.024 * s, toon('#3a9a3a'), parent, line=0)


def cottage(root):
    P = Parts(root)
    w, d = 3 * TILE * 0.9, 3 * TILE * 0.55
    front = -d / 2
    # Stone: a footing course all round and a doorstep.
    footing = P('stone-footing')
    box((0, 0, 0.14), (w + 0.2, d + 0.2, 0.28), toon(STONE), footing, bevel=0.05)
    stones(footing, -w / 2 - 0.05, w / 2 + 0.05, front - 0.1, 0.1, rows=1, h=0.2, color=STONE_DARK)
    box((0, front - 0.32, 0.08), (0.9, 0.36, 0.16), toon(STONE_DARK), footing, bevel=0.04)
    # Oak: the frame first (posts, sill and plate, braces either side of the door), standing proud of the walls.
    frame = P('oak-frame')
    dark = OAK_DARK
    for x in (-w / 2 + 0.08, w / 2 - 0.08, -0.5, 0.5):
        box((x, front - 0.04, 1.14), (0.16, 0.12, 1.72), toon(dark), frame, bevel=0.025)
    for z in (0.34, 1.96):
        box((0, front - 0.04, z), (w + 0.04, 0.12, 0.14), toon(dark), frame, bevel=0.025)
    for side in (-1, 1):
        box((1.36 * side, front - 0.05, 1.47), (1.62, 0.1, 0.1), toon(dark), frame, bevel=0.02)
        for k, x in enumerate((0.9, 1.82)):
            box((x * side, front - 0.045, 0.9), (0.1, 0.09, 1.05), toon(dark), frame, bevel=0.02, rot=(0, 0.5 * side * (1 if k else -1), 0))
    # Then the wattle walls between the timbers, the door and the windows.
    walls = P('oak-walls')
    box((0, 0, 1.15), (w, d, 1.75), toon('#fff0dc'), walls, bevel=0.1)
    box((0, front - 0.05, 0.72), (0.66, 0.1, 1.0), toon('#9a6a44'), walls, bevel=0.18)
    for z in (0.5, 0.9):
        box((0, front - 0.105, z), (0.52, 0.02, 0.04), toon(dark), walls, bevel=0, line=0)
    sphere((0.2, front - 0.12, 0.7), 0.05, toon('#ffd35a'), walls, line=0.01)
    for s in (-1, 1):
        box((1.36 * s, front - 0.03, 1.02), (0.55, 0.08, 0.5), toon('#bfe8ff', rim=0.4), walls, bevel=0.06)
        box((1.36 * s, front - 0.06, 1.02), (0.04, 0.04, 0.5), toon(dark), walls, bevel=0, line=0.008)
        box((1.36 * s, front - 0.12, 0.72), (0.7, 0.22, 0.16), toon('#9a6a44'), walls, bevel=0.04)
    # Oak shingles on top, painted a mossy green, with dark barge boards.
    roof = P('roof')
    profile([(-w / 2 - 0.3, 1.95), (0, 3.25), (w / 2 + 0.3, 1.95)], d + 0.5, toon('#6ac86a'), roof, bevel=0.1)
    for i in range(1, 4):
        t = i / 4
        half = (w / 2 + 0.3) * (1 - t) - 0.1
        box((0, -(d + 0.5) / 2 - 0.02, 1.95 + t * 1.3 - 0.12), (half * 2, 0.03, 0.05), toon('#4fa850'), roof, bevel=0, line=0)
    for side in (-1, 1):
        a = math.atan2(1.3, w / 2 + 0.3)
        box((side * (w / 4 + 0.15), -(d + 0.5) / 2 - 0.05, 2.6 + 0.02), (math.hypot(w / 2 + 0.3, 1.3) + 0.1, 0.1, 0.14), toon(dark),
            roof, bevel=0.03, rot=(0, side * a, 0))
    # Stone again for the chimney.
    chim = P('chimney')
    box((0.95, 0.35, 2.9), (0.46, 0.46, 1.3), toon(STONE), chim, bevel=0.05)
    for z in (2.55, 2.95, 3.35):
        box((0.95, 0.11, z), (0.48, 0.04, 0.05), toon(STONE_DARK), chim, bevel=0, line=0)
    box((0.95, 0.35, 3.58), (0.56, 0.56, 0.12), toon(STONE_DARK), chim, bevel=0.03)
    # The Lucky Clover: over the door, and sprigs in both window boxes.
    luck = P('clover')
    box((0, front - 0.1, 1.5), (0.38, 0.05, 0.32), toon('#fff4d0'), luck, bevel=0.05, line=0.012)
    _clover(luck, (0, front - 0.14, 1.5), 1.3)
    for s in (-1, 1):
        for k in (-1, 0, 1):
            _clover(luck, (1.36 * s + k * 0.22, front - 0.24, 0.88 + (k == 0) * 0.04), 0.8)
    return P.objects()


def manor(root):
    P = Parts(root)
    w, d = 3 * TILE * 0.95, 3 * TILE * 0.55
    front = -d / 2
    tx, ty = w / 2 - 0.2, -0.3
    # Obsidian: a glossy black plinth, the tower's base and steps up to the door.
    base = P('obsidian-plinth')
    box((0, 0, 0.16), (w + 0.3, d + 0.3, 0.32), obsidian(), base, bevel=0.05)
    cylinder((tx, ty, 0.16), 0.74, 0.32, obsidian(), base, seg=24)
    for i in range(3):
        box((0, front - 0.62 + i * 0.16, 0.06 + i * 0.1), (1.1 - i * 0.14, 0.34, 0.12), obsidian(), base, bevel=0.03)
    for x in (-w / 2 - 0.1, w / 2 + 0.1):
        box((x, front - 0.12, 0.2), (0.12, 0.04, 0.1), toon('#6a5a8a', emit=0.2), base, bevel=0, line=0)
    # Emberwood: charcoal beams framing the walls and tower, ember glowing in the grain, and the front door.
    frame = P('ember-frame')
    for x in (-w / 2 + 0.1, -0.62, 0.62, w / 2 - 0.9):
        ember_beam(frame, (x, front - 0.06, 1.55), (0.2, 0.12, 2.5))
    for z in (0.4, 1.5, 2.7):
        ember_beam(frame, (-0.2, front - 0.06, z), (w - 0.4, 0.12, 0.16))
    for z in (0.45, 1.6, 2.8, 3.9):
        torus((tx, ty, z), 0.63, 0.06, toon(EMBER_WOOD, shade='#241a22', rim=0.35), frame, seg=32)
    box((0, front - 0.08, 0.86), (0.72, 0.12, 1.08), toon(EMBER_WOOD, shade='#241a22', rim=0.35), frame, bevel=0.25)
    for x in (-0.14, 0.14):
        box((x, front - 0.145, 0.82), (0.03, 0.02, 0.7), toon('#ff8a3a', emit=1.2), frame, bevel=0, line=0)
    sphere((0.22, front - 0.16, 0.86), 0.05, toon('#ffd35a'), frame, line=0.01)
    # Glimmerwood: pale planking that glows softly, on the house and the tower.
    walls = P('glim-walls')
    plank_wall(walls, (0, 0, 1.56), w, 2.5, GLIM, GLIM_GRAIN, depth=d, n=8, glow=0.2)
    cylinder((tx, ty, 2.2), 0.6, 3.6, glimwood(0.2), walls, seg=24)
    for k in range(1, 9):
        torus((tx, ty, 0.4 + k * 0.42), 0.6, 0.012, toon(GLIM_GRAIN, emit=0.2), walls, seg=32, line=0)
    # Glimmerwood shingles for the roof and the tower's cap, in its deep violet.
    roof = P('glim-roof')
    profile([(-w / 2 - 0.3, 2.75), (0, 4.05), (w / 2 + 0.3, 2.75)], d + 0.5, toon(GLIM_ROOF, rim=0.45, emit=0.1), roof, bevel=0.1)
    for i in range(1, 4):
        t = i / 4
        half = (w / 2 + 0.3) * (1 - t) - 0.1
        box((0, -(d + 0.5) / 2 - 0.02, 2.75 + t * 1.3 - 0.12), (half * 2, 0.03, 0.05), toon('#6a58c8', emit=0.1), roof, bevel=0, line=0)
    cone((tx, ty, 4.62), 0.8, 1.3, toon(GLIM_ROOF, rim=0.45, emit=0.1), roof, seg=24)
    # Crystal: every window, a lamp by the door, and a spire on the tower.
    glass = P('crystal-windows')
    pane = toon(CRYSTAL, rim=0.6, emit=0.45)
    for s in (-1, 1):
        for z in (1.0, 2.12):
            x = -1.35 if s < 0 else 1.1
            if s > 0 and z > 2:
                continue
            box((x, front - 0.08, z), (0.52, 0.08, 0.56), pane, glass, bevel=0.08)
            box((x, front - 0.125, z), (0.04, 0.02, 0.5), toon('#ffffff', emit=0.6), glass, bevel=0, line=0)
    box((-0.0, front - 0.08, 2.12), (0.52, 0.08, 0.56), pane, glass, bevel=0.08)
    for z in (1.1, 2.3, 3.35):
        box((tx - 0.12, ty - 0.6, z), (0.3, 0.1, 0.42), pane, glass, bevel=0.07, rot=(0, 0, 0.2))
    crystal((tx, ty, 5.15), 0.14, 0.7, toon(CRYSTAL, rim=0.6, emit=0.5), glass, sides=6)
    for a in (-0.5, 0.5):
        crystal((tx + a * 0.25, ty, 5.15), 0.07, 0.36, toon(CRYSTAL_PINK, rim=0.6, emit=0.4), glass, rot=(0, a, 0), sides=5)
    for x in (-0.55, 0.55):
        crystal((x, front - 0.2, 1.2), 0.08, 0.26, toon(CRYSTAL, rim=0.6, emit=0.6), glass, sides=6)
        box((x, front - 0.2, 1.17), (0.16, 0.14, 0.04), toon(EMBER_WOOD), glass, bevel=0.01, line=0.008)
    # Poppy's Flowers: a box under each window downstairs, and a bed either side of the steps.
    bloom = P('flower-boxes')
    cols = ('#ff8ab0', '#ffd35a', '#ffffff', '#b08aff')
    for x in (-1.35, 1.1):
        box((x, front - 0.18, 0.64), (0.72, 0.22, 0.16), toon(EMBER_WOOD, shade='#241a22', rim=0.35), bloom, bevel=0.03, line=0.012)
        for k in range(5):
            sphere((x - 0.28 + k * 0.14, front - 0.24, 0.78 + (k % 2) * 0.04), 0.09, toon(cols[k % 4]), bloom, line=0.008)
    for x in (-0.95, 0.95):
        sphere((x, front - 0.5, 0.05), (0.38, 0.24, 0.1), toon('#5ab85a'), bloom, line=0.012)
        for k in range(4):
            sphere((x - 0.21 + k * 0.14, front - 0.6 + (k % 2) * 0.1, 0.18), 0.085, toon(cols[(k + 1) % 4]), bloom, line=0.008)
    return P.objects()
