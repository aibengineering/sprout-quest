"""The Forge, from the repaired Forge to the Master Forge. Each upgrade adds its own materials to what already stands
(the `base` layer): a porch, copper and royal bellows; iron bands, pine fuel and golem cores; a crystal kiln; obsidian
and the King Crystal."""
import math

from lib import box, cone, crystal, cylinder, empty, lathe, profile, sphere, toon, torus

from buildings._common import (COPPER, CRYSTAL, CRYSTAL_PINK, GLIM_GRAIN, IRON, OAK, OAK_DARK, PINE_DARK, PINE_END,
                               STONE, STONE_DARK, TILE, Parts, glimwood, obsidian, stones)

W, D = 4 * TILE * 0.9, 3 * TILE * 0.55
FRONT = -D / 2


def _bellows(parent, loc, s, leather, seal, glow=0.0):
    """A pair of bellows lying on the ground, nozzle to the wall, its seams sealed."""
    x, y, z = loc
    sphere((x, y, z + 0.2 * s), (0.36 * s, 0.26 * s, 0.14 * s), toon(leather), parent)
    box((x, y, z + 0.36 * s), (0.6 * s, 0.4 * s, 0.05 * s), toon(OAK_DARK), parent, bevel=0.02)
    cone((x + 0.42 * s, y, z + 0.22 * s), 0.07 * s, 0.3 * s, toon('#5a5a6a'), parent, rot=(0, math.pi / 2, 0), seg=10)
    for k in (-1, 0, 1):
        sphere((x + k * 0.18 * s, y - 0.25 * s, z + 0.22 * s), (0.08 * s, 0.04 * s, 0.07 * s), toon(seal, rim=0.5, emit=glow), parent,
               line=0.01)


def build(root, level):
    P = Parts(root)
    if level > 1:
        P('base')
    part = lambda lv, name: P(name if lv == level else 'base')

    # ------------------------------------------------------------------ 1: the Forge, repaired
    walls = part(1, 'stone-walls')
    box((0, 0, 0.95), (W, D, 1.9), toon(STONE), walls, bevel=0.1)
    for i in range(6):
        for j in range(3):
            box((-W / 2 + 0.45 + i * (W - 0.9) / 5 + (j % 2) * 0.2, FRONT - 0.01, 0.35 + j * 0.55), (0.5, 0.04, 0.22), toon(STONE_DARK),
                walls, bevel=0.04, line=0.008)
    stones(walls, -W / 2, W / 2, FRONT - 0.06, 0.1, h=0.2, color='#9a8e8a')
    box((1.8, 0.2, 3.0), (0.5, 0.5, 1.4), toon('#8a8090'), walls, bevel=0.08)
    an = empty('anvil', walls, (1.9, FRONT - 0.55, 0))
    box((0, 0, 0.18), (0.25, 0.25, 0.36), toon('#8a8090'), an, bevel=0.04)
    box((0, 0, 0.42), (0.6, 0.28, 0.16), toon('#5a5a6a'), an, bevel=0.05)
    cone((0.38, 0, 0.44), 0.08, 0.2, toon('#5a5a6a'), an, rot=(0, math.pi / 2, 0), seg=8)
    roof = part(1, 'oak-roof')
    profile([(-W / 2 - 0.35, 1.8), (0, 3.3), (W / 2 + 0.35, 1.8)], D + 0.5, toon('#d0583a'), roof, bevel=0.1)
    for i in range(1, 4):
        t = i / 4
        half = (W / 2 + 0.35) * (1 - t) - 0.1
        box((0, -(D + 0.5) / 2 - 0.02, 1.8 + t * 1.5 - 0.12), (half * 2, 0.03, 0.05), toon('#b04a32'), roof, bevel=0, line=0)
    a = math.atan2(1.5, W / 2 + 0.35)
    for side in (-1, 1):
        box((side * (W / 4 + 0.17), -(D + 0.5) / 2 - 0.05, 2.55 + 0.02), (math.hypot(W / 2 + 0.35, 1.5) + 0.1, 0.1, 0.14),
            toon(OAK_DARK), roof, bevel=0.03, rot=(0, side * a, 0))
    door = part(1, 'oak-door')
    box((-0.6, FRONT - 0.02, 0.65), (0.8, 0.1, 1.15), toon('#6a4a3a'), door, bevel=0.3)
    for x in (-0.78, -0.42):
        box((x, FRONT - 0.075, 0.6), (0.04, 0.02, 0.9), toon('#4a3228'), door, bevel=0, line=0)
    box((1.2, FRONT - 0.06, 1.44), (1.1, 0.12, 0.12), toon(OAK_DARK), door, bevel=0.02)
    box((-1.9, FRONT - 0.1, 1.75), (0.7, 0.08, 0.45), toon('#c89a6a'), door, bevel=0.05)
    cylinder((-1.9, FRONT - 0.16, 1.75), 0.03, 0.4, toon('#6a4a3a'), door, rot=(0, 0.8, 0), seg=8, line=0.01)
    box((-1.78, FRONT - 0.16, 1.87), (0.16, 0.08, 0.1), toon('#9aa0b0'), door, bevel=0.02, line=0.01, rot=(0, 0.8, 0))
    hearth = part(1, 'goo-hearth')
    box((1.2, FRONT - 0.02, 1.0), (0.9, 0.1, 0.7), toon('#ffb03a', emit=0.8), hearth, bevel=0.15)
    box((1.2, FRONT - 0.05, 1.0), (1.05, 0.06, 0.08), toon('#6a4a3a'), hearth, bevel=0.02, line=0.01)
    _bellows(hearth, (0.3, FRONT - 0.5, 0), 1.2, '#8a5a3a', '#6fdc7a')

    # ------------------------------------------------------------------ 2: the Smithy
    if level >= 2:
        porch = part(2, 'oak-porch')
        for x in (-1.5, 0.3):
            box((x, FRONT - 0.85, 0.8), (0.14, 0.14, 1.6), toon(OAK_DARK), porch, bevel=0.02)
        box((-0.6, FRONT - 0.85, 1.62), (2.2, 0.16, 0.14), toon(OAK_DARK), porch, bevel=0.02)
        box((-0.6, FRONT - 0.5, 1.72), (2.5, 1.1, 0.08), toon(OAK), porch, bevel=0.02, rot=(0.35, 0, 0))
        for i in range(6):
            box((-1.65 + i * 0.42, FRONT - 0.52, 1.77), (0.03, 1.06, 0.03), toon(OAK_DARK), porch, bevel=0, line=0, rot=(0.35, 0, 0))
        trim = part(2, 'copper-trim')
        box((0, 0, 3.32), (0.3, D + 0.62, 0.14), toon(COPPER, rim=0.45), trim, bevel=0.04, line=0.012)
        box((1.8, 0.2, 3.74), (0.64, 0.64, 0.1), toon(COPPER, rim=0.45), trim, bevel=0.03)
        box((-1.2, 0.3, 3.0), (0.45, 0.45, 1.2), toon('#b8703a', rim=0.4), trim, bevel=0.08)
        cone((-1.2, 0.3, 3.75), 0.42, 0.34, toon(COPPER, rim=0.45), trim, seg=4, rot=(0, 0, math.pi / 4))
        cylinder((0, 0, 3.6), 0.02, 0.5, toon('#a05a2a'), trim, seg=6, line=0.008)
        profile([(0, 0), (0.3, 0.06), (0.22, 0.18), (0.05, 0.14), (-0.12, 0.2), (-0.1, 0.05)], 0.03, toon(COPPER, rim=0.45),
                trim, loc=(0, 0, 3.82), bevel=0.005, line=0.012)
        royal = part(2, 'royal-bellows')
        _bellows(royal, (-2.45, FRONT - 0.7, 0), 1.7, '#9a6a44', '#ffd35a', glow=0.5)
        for k, x in enumerate((-2.05, -1.9, -1.75)):
            cone((x, FRONT - 0.15, 2.07 + (k == 1) * 0.04), 0.035, 0.1 + (k == 1) * 0.04, toon('#ffd35a', emit=0.4), royal, seg=6, line=0.008)
        box((-1.9, FRONT - 0.15, 2.0), (0.34, 0.04, 0.05), toon('#ffd35a', emit=0.4), royal, bevel=0, line=0.008)

    # ------------------------------------------------------------------ 3: the Iron Smithy
    if level >= 3:
        fuel = part(3, 'pine-fuel')
        for row, n in enumerate((3, 2, 1)):
            for i in range(n):
                x = -W / 2 - 0.5 + (i - (n - 1) / 2) * 0.36
                cylinder((x, -0.35, 0.18 + row * 0.31), 0.17, 1.2, toon(PINE_DARK), fuel, seg=12, rot=(math.pi / 2, 0, 0))
                cylinder((x, -0.96, 0.18 + row * 0.31), 0.14, 0.02, toon(PINE_END), fuel, seg=12, rot=(math.pi / 2, 0, 0), line=0.01)
        barrel = empty('barrel', fuel, (-2.4, FRONT - 0.5, 0))
        cylinder((0, 0, 0.3), 0.3, 0.6, toon('#a8703e'), barrel, seg=16)
        cylinder((0, 0, 0.6), 0.26, 0.02, toon('#6ac8f0', rim=0.5), barrel, seg=16, line=0)
        bands = part(3, 'iron-bands')
        for z in (0.5, 1.45):
            box((0, FRONT - 0.04, z), (W + 0.04, 0.05, 0.1), toon(IRON), bands, bevel=0.02, line=0.01)
        for x in (-W / 2 + 0.05, W / 2 - 0.05):
            box((x, FRONT - 0.05, 0.95), (0.14, 0.07, 1.9), toon(IRON), bands, bevel=0.02, line=0.01)
        for z in (0.35, 0.95):
            box((-0.6, FRONT - 0.09, z), (0.84, 0.03, 0.07), toon('#4a4d5c'), bands, bevel=0, line=0.008)
        for i in range(2):
            torus((0, 0, 0.14 + i * 0.34), 0.31, 0.025, toon('#4a4d5c'), empty('hoops', bands, (-2.4, FRONT - 0.5, 0)), seg=20, line=0)
        cores = part(3, 'golem-core')
        for x in (0.42, 1.98):
            box((x, FRONT - 0.08, 1.0), (0.3, 0.14, 0.3), toon(IRON), cores, bevel=0.03, line=0.01)
            sphere((x, FRONT - 0.2, 1.02), 0.19, toon('#b08aff', rim=0.5, emit=0.8), cores, line=0.012)

    # ------------------------------------------------------------------ 4: the Crystal Kiln
    if level >= 4:
        kiln_at = (W / 2 + 0.85, -0.25, 0)
        kiln = empty('kiln', part(4, 'crystal-kiln'), kiln_at)
        kiln.scale = (1.3, 1.3, 1.3)
        lathe([(0.0001, 0.0), (0.75, 0.0), (0.72, 0.6), (0.45, 1.15), (0.2, 1.3), (0.0001, 1.32)], toon('#9fb6d0', rim=0.5), kiln, seg=20)
        for x, y, h, tilt, col in ((-0.2, 0, 0.55, -0.4, CRYSTAL), (0.1, 0.1, 0.7, 0.2, CRYSTAL_PINK), (0.3, -0.1, 0.45, 0.5, CRYSTAL),
                                   (-0.5, -0.3, 0.35, -0.7, CRYSTAL_PINK)):
            crystal((x, y, 1.0 if x > -0.4 else 0.55), 0.09, h, toon(col, rim=0.5, emit=0.25), kiln, rot=(0, tilt, 0), sides=6)
        glaze = empty('glaze', part(4, 'glimmer-glaze'), kiln_at)
        glaze.scale = (1.3, 1.3, 1.3)
        box((0, -0.7, 0.4), (0.45, 0.1, 0.45), toon('#c8b0ff', emit=0.9), glaze, bevel=0.15, line=0.01)
        for z, r in ((0.3, 0.74), (0.75, 0.62)):
            torus((0, 0, z), r, 0.04, toon('#b8a8f8', rim=0.5, emit=0.6), glaze, seg=28, line=0.008)
        vane = empty('vane', part(4, 'echo-vane'), (kiln_at[0], kiln_at[1], 1.72))
        vane.scale = (1.7, 1.7, 1.7)
        cylinder((0, 0, 0.2), 0.03, 0.5, toon(IRON), vane, seg=6, line=0.01)
        for side in (-1, 1):
            profile([(0, 0), (0.42 * side, 0.2), (0.34 * side, 0.02), (0.24 * side, 0.1), (0.16 * side, -0.04), (0.08 * side, 0.04)],
                    0.03, toon('#6a4a8a', rim=0.4), vane, loc=(0, 0, 0.42), bevel=0.005, line=0.012)
        sphere((0, 0, 0.45), 0.06, toon('#8a6aaa'), vane, line=0.01)

    # ------------------------------------------------------------------ 5: the Master Forge
    if level >= 5:
        obs = part(5, 'obsidian')
        for i in range(2):
            box((-0.6, FRONT - 0.5 + i * 0.16, 0.06 + i * 0.1), (1.1 - i * 0.16, 0.34, 0.12), obsidian(), obs, bevel=0.03)
        lathe([(0.0001, 0.0), (0.35, 0.0), (0.4, 0.45), (0.3, 0.45), (0.0001, 0.3)], obsidian(), obs, loc=(0.75, FRONT - 0.75, 0), seg=16)
        cylinder((0.75, FRONT - 0.75, 0.42), 0.28, 0.04, toon('#ffb03a', emit=0.9), obs, seg=16, line=0)
        box((1.9, FRONT - 0.55, 0.53), (0.66, 0.32, 0.08), obsidian(), obs, bevel=0.03)
        glim = part(5, 'glim-gable')
        for side in (-1, 1):
            # Darker grain and a soft glow: the paler Glimmerwood reads as a white bar across the roof in the live scene.
            box((side * (W / 4 + 0.17), -(D + 0.5) / 2 - 0.05, 2.55 + 0.08), (math.hypot(W / 2 + 0.35, 1.5) + 0.1, 0.08, 0.1),
                toon(GLIM_GRAIN, emit=0.1), glim, bevel=0.03, rot=(0, side * a, 0))
        box((-1.9, FRONT - 0.16, 1.75), (0.84, 0.05, 0.56), glimwood(0.2), glim, bevel=0.05, line=0.014)
        box((-1.9, FRONT - 0.2, 1.75), (0.6, 0.02, 0.03), toon(GLIM_GRAIN), glim, bevel=0, line=0)
        cylinder((2.45, FRONT - 0.2, 1.4), 0.05, 2.8, toon(GLIM_GRAIN, emit=0.1), glim, seg=8)
        profile([(0, 0), (0.6, 0), (0.6, -0.95), (0.3, -0.75), (0, -0.95)], 0.04, toon('#ffd35a'), glim, loc=(2.48, FRONT - 0.2, 2.7), bevel=0.01)
        king = empty('king', part(5, 'king-crystal'), (0, -(D + 0.5) / 2 + 0.25, 3.22))
        king.scale = (1.5, 1.5, 1.5)
        box((0, 0, 0.06), (0.34, 0.3, 0.14), toon('#ffd35a'), king, bevel=0.03)
        crystal((0, 0, 0.12), 0.17, 0.8, toon('#8af0ff', rim=0.7, emit=0.6), king, sides=6)
        for a2, col in ((-0.55, CRYSTAL_PINK), (0.55, '#b8f8ff')):
            crystal((a2 * 0.28, 0, 0.12), 0.08, 0.42, toon(col, rim=0.6, emit=0.5), king, rot=(0, a2, 0), sides=5)
    return P.objects()
