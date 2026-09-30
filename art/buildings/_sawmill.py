"""Bram's Sawmill: an open pine shed on a stone floor with a big round saw over its bench. Each upgrade swaps the blade
(copper, iron, crystal, obsidian) and adds its wood: a pine store, a plank deck and Glimmerwood logs, then Glimmerwood
trim and Emberwood logs."""
import math

from lib import box, crystal, cylinder, empty, toon

from buildings._common import (EMBER_GRAIN, EMBER_WOOD, GLIM, GLIM_GRAIN, IRON, OAK_END, PINE, PINE_DARK, PINE_END, STONE,
                               STONE_DARK, TILE, Parts, glimwood, obsidian, stones)

W, D = 3.4 * TILE * 0.92, 2.4 * TILE * 0.8
BLADE_AT = (0.95, -0.35, 1.25)


def blade(parent, r, disc, teeth, hub='#6a7080'):
    """A round saw standing up through the bench, teeth all round its rim."""
    rot = (math.pi / 2, 0, 0)
    x, y, z = BLADE_AT
    cylinder(BLADE_AT, r, 0.05, disc, parent, seg=28, rot=rot, line=0.012)
    cylinder(BLADE_AT, r * 0.22, 0.08, toon(hub), parent, seg=12, rot=rot, line=0.01)
    for i in range(14):
        a = i / 14 * math.tau
        box((x + math.cos(a) * r * 1.02, y, z + math.sin(a) * r * 1.02), (0.1, 0.05, 0.1), teeth, parent, rot=(0, -a, 0), bevel=0.01,
            line=0.008)


def logs(parent, loc, n, bark, end, glow=0.0, grain=None):
    """Logs stacked in a little pyramid, ends facing you."""
    x0, y0, _ = loc
    for row, count in enumerate(range(n, 0, -1)):
        for i in range(count):
            x, z = x0 + (i - (count - 1) / 2) * 0.42, 0.2 + row * 0.36
            cylinder((x, y0, z), 0.2, 1.3, toon(bark, emit=glow * 0.3), parent, seg=12, rot=(math.pi / 2, 0, 0))
            cylinder((x, y0 - 0.66, z), 0.17, 0.02, toon(end, emit=glow), parent, seg=12, rot=(math.pi / 2, 0, 0), line=0.01)
            if grain:
                cylinder((x, y0 - 0.675, z), 0.08, 0.01, toon(grain, emit=1.0), parent, seg=12, rot=(math.pi / 2, 0, 0), line=0)


def build(root, level):
    P = Parts(root)
    P('site' if level == 1 else 'base')
    part = lambda lv, name: P(name if lv == level else 'base')
    oak = part(1, 'site')
    # The logs and planks waiting on the site before there was a mill.
    logs(oak, (-W / 2 - 0.3, 0.1, 0), 3, '#8a5a3a', OAK_END)
    for i in range(4):
        box((W / 2 - 0.4, -D / 2 + 0.1, 0.26 + i * 0.1), (0.5, 1.2, 0.08), toon(OAK_END), oak, bevel=0.02, rot=(0, 0, 0.05 * (i % 2)))

    # 1: the Sawmill, with its copper blade.
    floor = part(1, 'stone-floor')
    box((0, 0, 0.1), (W, D, 0.2), toon('#a8a0a0'), floor, bevel=0.04)
    stones(floor, -W / 2, W / 2, -D / 2 - 0.02, 0.1, h=0.18, color=STONE_DARK)
    for x in (-W / 2 + 0.2, W / 2 - 0.2):
        for y in (-0.1, D / 2 - 0.2):
            box((x, y, 0.26), (0.36, 0.36, 0.14), toon(STONE), floor, bevel=0.03)
    frame = part(1, 'pine-frame')
    dark, wood = toon(PINE_DARK), toon(PINE)
    for x in (-W / 2 + 0.2, W / 2 - 0.2):
        box((x, D / 2 - 0.2, 1.5), (0.22, 0.22, 3.0), dark, frame, bevel=0.03)
        box((x, -0.1, 1.2), (0.22, 0.22, 2.4), dark, frame, bevel=0.03)
    box((0, D / 2 - 0.1, 1.2), (W - 0.3, 0.12, 2.1), wood, frame, bevel=0.03)
    for i in range(1, 7):
        box((0, D / 2 - 0.17, 0.15 + i * 0.3), (W - 0.4, 0.02, 0.03), dark, frame, bevel=0, line=0)
    box((0.2, -0.35, 0.75), (2.6, 0.9, 0.12), wood, frame, bevel=0.03)
    for x in (-0.9, 1.3):
        box((x, -0.35, 0.4), (0.15, 0.7, 0.7), dark, frame, bevel=0.02)
    cylinder((-0.3, -0.35, 1.02), 0.24, 1.6, toon('#8a5a3a'), frame, seg=12, rot=(0, math.pi / 2, 0))
    cylinder((-1.1, -0.35, 1.02), 0.21, 0.02, toon(OAK_END), frame, seg=12, rot=(0, math.pi / 2, 0), line=0.01)
    roof = empty('roof', part(1, 'pine-roof'), (0, D / 4, 2.75))
    roof.rotation_euler = (0.4, 0, 0)
    box((0, 0, 0), (W + 0.4, D * 0.7, 0.12), toon('#8aa06a'), roof, bevel=0.04)
    for i in range(7):
        box((-W / 2 + (i + 0.5) * (W + 0.4) / 7 - 0.2, 0, 0.07), (0.05, D * 0.7, 0.04), toon('#6a8a5a'), roof, bevel=0.01, line=0)
    if level == 1:
        blade(P('copper-blade'), 0.75, toon('#e8904a', rim=0.35), toon('#e8904a', rim=0.35))

    # 2: the Iron Sawmill: a stone ramp for the logs, a pine store, and the iron blade.
    if level >= 2:
        ramp = part(2, 'stone-ramp')
        for i in range(3):
            box((-W / 2 + 0.75 - i * 0.2, -D / 2 - 0.35, 0.14 + i * 0.14), (1.3 - i * 0.4, 0.7, 0.28 + i * 0.28), toon(STONE if i % 2 else STONE_DARK),
                ramp, bevel=0.04)
        store = part(2, 'pine-store')
        logs(store, (W / 2 + 0.7, 0.9, 0), 2, PINE_DARK, PINE_END)
        lean = empty('lean', store, (W / 2 + 0.7, 0.75, 1.3))
        lean.rotation_euler = (0, -0.35, 0)
        box((0, 0, 0), (1.3, 1.5, 0.08), toon('#8aa06a'), lean, bevel=0.02)
        for x in (W / 2 + 1.25,):
            box((x, 0.2, 0.6), (0.12, 0.12, 1.2), toon(PINE_DARK), store, bevel=0.02)
        if level == 2:
            iron = P('iron-blade')
            blade(iron, 0.75, toon('#c8d4e8', rim=0.35), toon('#c8d4e8', rim=0.35))
        bands = part(2, 'iron-blade') if level == 2 else P('base')
        for x in (-W / 2 + 0.2, W / 2 - 0.2):
            for z in (0.5, 1.6):
                box((x, -0.1, z), (0.28, 0.28, 0.08), toon('#8a92a8'), bands, bevel=0.01, line=0.008)

    # 3: the Crystal Sawmill: a pine-plank deck, Glimmerwood waiting its turn, and the crystal blade.
    if level >= 3:
        deck = part(3, 'plank-deck')
        box((0.55, -D / 2 - 0.55, 0.14), (W - 2.3, 0.9, 0.1), toon('#e8b878'), deck, bevel=0.02)
        for i in range(1, 8):
            box((0.55 - (W - 2.3) / 2 + i * (W - 2.3) / 8, -D / 2 - 0.55, 0.195), (0.03, 0.86, 0.02), toon(PINE_DARK), deck, bevel=0, line=0)
        for x in (0.55 - (W - 2.3) / 2, 0.55 + (W - 2.3) / 2):
            box((x, -D / 2 - 0.98, 0.3), (0.08, 0.08, 0.3), toon('#d8a868'), deck, bevel=0.01, line=0.01)
        glim = part(3, 'glimwood-logs')
        logs(glim, (W / 2 + 0.65, -0.55, 0), 2, '#b8a8e8', GLIM, glow=0.35, grain=GLIM_GRAIN)
        if level == 3:
            cr = P('crystal-blade')
            blade(cr, 0.78, toon('#bfeefc', rim=0.7, emit=0.35), toon('#e8faff', rim=0.7, emit=0.5), hub='#8ab0d0')
            cylinder((-0.5, -0.35, 2.45), 0.01, 0.35, toon(IRON), cr, seg=6, line=0)
            crystal((-0.5, -0.35, 2.0), 0.08, 0.28, toon('#9ae6ff', rim=0.6, emit=0.6), cr, sides=6)

    # 4: the Obsidian Sawmill: Glimmerwood trim, Emberwood logs and the obsidian blade.
    if level >= 4:
        trim = part(4, 'glimplank-trim')
        fascia = empty('fascia', trim, (0, D / 4, 2.75))
        fascia.rotation_euler = (0.4, 0, 0)
        box((0, -D * 0.35 - 0.04, -0.02), (W + 0.5, 0.1, 0.2), glimwood(0.35), fascia, bevel=0.02)
        for x in (-1.1, 0.1):
            cylinder((x, -0.45, 2.2), 0.012, 0.25, toon(IRON), trim, seg=6, line=0)
        box((-0.5, -0.47, 1.94), (1.5, 0.06, 0.36), glimwood(0.25), trim, bevel=0.04, line=0.012)
        for dx in (-0.35, 0, 0.35):
            box((-0.5 + dx, -0.51, 1.94), (0.22, 0.02, 0.04), toon(GLIM_GRAIN, emit=0.3), trim, bevel=0, line=0)
        ember = part(4, 'emberwood-logs')
        logs(ember, (-W / 2 - 0.3, -1.3, 0), 2, EMBER_WOOD, '#5a3a3a', grain=EMBER_GRAIN)
        ob = P('obsidian-blade')
        blade(ob, 0.8, obsidian(), toon('#ff8a3a', emit=0.8), hub='#1e1824')
        for x in (-0.9, 1.3):
            box((x, -0.35, 0.1), (0.3, 0.8, 0.12), obsidian(), ob, bevel=0.02)
    return P.objects()
