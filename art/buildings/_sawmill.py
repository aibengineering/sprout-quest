"""Bram's Sawmill: a pine mill house on a stone floor, its door standing open in the middle of the front (you walk in
through it to the saw), and its big round blade hung on the gable over the door like a sign. Each upgrade swaps the
blade (copper, iron, crystal, obsidian) and adds its wood: a pine store, a plank deck and Glimmerwood logs, then
Glimmerwood trim and Emberwood logs."""
import math

from lib import box, crystal, cylinder, empty, profile, toon

from buildings._common import (EMBER_GRAIN, EMBER_WOOD, GLIM, GLIM_GRAIN, IRON, OAK_END, PINE, PINE_DARK, PINE_END, STONE,
                               STONE_DARK, TILE, Parts, glimwood, obsidian, plank_wall, stones)

W, D = 3.4 * TILE * 0.92, 2.4 * TILE * 0.8
# The walls' height, the ridge's, and the doorway (centred on the front, a tile wide).
WALL, RIDGE = 1.95, 3.05
DOOR_W, DOOR_H = 1.3, 1.6
FRONT = -D / 2 + 0.12
BLADE_AT = (0, FRONT - 0.16, 2.42)
INSIDE = '#2a1c24'


def blade(parent, r, disc, teeth, hub='#6a7080'):
    """The round saw hung on the gable, face on, teeth all round its rim."""
    rot = (math.pi / 2, 0, 0)
    x, y, z = BLADE_AT
    cylinder(BLADE_AT, r, 0.05, disc, parent, seg=28, rot=rot, line=0.012)
    cylinder((x, y - 0.03, z), r * 0.22, 0.08, toon(hub), parent, seg=12, rot=rot, line=0.01)
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


def gable_edges(parent, mat, y, lift=0.0, size=0.14):
    """Two boards along the gable's sloping edges (the roof's front edge, or trim over it)."""
    half, rise = W / 2 + 0.25, RIDGE - WALL + 0.12
    slope = math.atan2(rise, half)
    length = math.hypot(half, rise)
    for side in (-1, 1):
        box((side * half / 2, y, WALL - 0.06 + rise / 2 + lift), (length + 0.1, 0.12, size), mat, parent, rot=(0, side * slope, 0),
            bevel=0.02)


def build(root, level):
    P = Parts(root)
    P('site' if level == 1 else 'base')
    part = lambda lv, name: P(name if lv == level else 'base')
    oak = part(1, 'site')
    # The logs and planks waiting on the site before there was a mill.
    logs(oak, (-W / 2 - 0.3, 0.1, 0), 3, '#8a5a3a', OAK_END)
    for i in range(4):
        box((W / 2 + 0.2, D / 2 - 0.8, 0.26 + i * 0.1), (0.5, 1.2, 0.08), toon(OAK_END), oak, bevel=0.02, rot=(0, 0, 0.05 * (i % 2)))

    # 1: the Sawmill, with its copper blade.
    floor = part(1, 'stone-floor')
    box((0, 0, 0.1), (W, D, 0.2), toon('#a8a0a0'), floor, bevel=0.04)
    stones(floor, -W / 2, W / 2, -D / 2 - 0.02, 0.1, h=0.18, color=STONE_DARK)
    # A stone step up to the door.
    box((0, -D / 2 - 0.3, 0.08), (DOOR_W + 0.4, 0.55, 0.16), toon(STONE), floor, bevel=0.04)
    for x in (-W / 2 + 0.2, W / 2 - 0.2):
        for y in (FRONT, D / 2 - 0.2):
            box((x, y, 0.26), (0.36, 0.36, 0.14), toon(STONE), floor, bevel=0.03)

    frame = part(1, 'pine-frame')
    dark = toon(PINE_DARK)
    # Inside, dark, seen through the open door: its floor, the back wall, and a glint of the saw bench.
    box((0, FRONT + 0.6, 0.22), (DOOR_W + 0.2, 1.1, 0.04), toon('#3a2a2a'), frame, bevel=0, line=0)
    box((0, FRONT + 1.0, 1.0), (DOOR_W + 0.3, 0.06, 1.7), toon(INSIDE), frame, bevel=0, line=0)
    box((0, FRONT + 0.85, 0.6), (DOOR_W * 0.8, 0.3, 0.08), toon('#5a3a2a'), frame, bevel=0.01, line=0.006)
    # The front wall in three pieces round the doorway, then the sides and the back.
    side = (W - DOOR_W) / 2
    for s in (-1, 1):
        plank_wall(frame, (s * (DOOR_W + side) / 2, FRONT, 0.2 + WALL / 2), side, WALL, PINE, PINE_DARK, depth=0.14)
    plank_wall(frame, (0, FRONT, 0.2 + DOOR_H + (WALL - DOOR_H) / 2), DOOR_W, WALL - DOOR_H, PINE, PINE_DARK, depth=0.14, n=1)
    for s in (-1, 1):
        box((s * (W / 2 - 0.07), 0.06, 0.2 + WALL / 2), (0.14, D - 0.1, WALL), toon(PINE, rim=0.4), frame, bevel=0.04)
    box((0, D / 2 - 0.1, 0.2 + WALL / 2), (W, 0.14, WALL), toon(PINE, rim=0.4), frame, bevel=0.04)
    # The front gable, closing the roof's end over the door.
    profile([(-W / 2, 0.2 + WALL), (0, RIDGE), (W / 2, 0.2 + WALL)], 0.14, toon(PINE, rim=0.4), frame, loc=(0, FRONT, 0), bevel=0.03)
    # Corner posts, and the door's frame: two jambs and a lintel.
    for x in (-W / 2 + 0.1, W / 2 - 0.1):
        box((x, FRONT - 0.04, 0.2 + WALL / 2), (0.22, 0.22, WALL), dark, frame, bevel=0.03)
    for x in (-DOOR_W / 2 - 0.07, DOOR_W / 2 + 0.07):
        box((x, FRONT - 0.06, 0.2 + DOOR_H / 2), (0.16, 0.2, DOOR_H), dark, frame, bevel=0.03)
    box((0, FRONT - 0.06, 0.2 + DOOR_H + 0.07), (DOOR_W + 0.42, 0.22, 0.16), dark, frame, bevel=0.03)
    # The door itself, swung wide open into the mill.
    leaf = empty('door', frame, (DOOR_W / 2, FRONT + 0.05, 0.2))
    leaf.rotation_euler = (0, 0, -1.2)
    box((-DOOR_W * 0.45, 0, DOOR_H / 2 - 0.02), (DOOR_W * 0.9, 0.08, DOOR_H - 0.06), toon('#a8703e'), leaf, bevel=0.03)
    # A little window either side, dark inside.
    for s in (-1, 1):
        x = s * (DOOR_W / 2 + side / 2 + 0.05)
        box((x, FRONT - 0.08, 1.35), (0.62, 0.06, 0.52), dark, frame, bevel=0.03)
        box((x, FRONT - 0.11, 1.35), (0.46, 0.04, 0.38), toon(INSIDE), frame, bevel=0.01, line=0.006)
        box((x, FRONT - 0.14, 1.35), (0.05, 0.02, 0.38), dark, frame, bevel=0, line=0)

    roof = part(1, 'pine-roof')
    half, rise = W / 2 + 0.3, RIDGE - WALL + 0.16
    slope = math.atan2(rise, half)
    for s in (-1, 1):
        panel = empty('roof', roof, (s * half / 2, 0.05, 0.2 + WALL + rise / 2 - 0.12))
        panel.rotation_euler = (0, s * slope, 0)
        box((0, 0, 0), (math.hypot(half, rise) + 0.12, D + 0.5, 0.12), toon('#8aa06a'), panel, bevel=0.04)
        for i in range(5):
            box((-math.hypot(half, rise) / 2 + (i + 0.5) * math.hypot(half, rise) / 5, 0, 0.07), (0.05, D + 0.5, 0.04), toon('#6a8a5a'),
                panel, bevel=0.01, line=0)
    cylinder((0, 0.05, RIDGE + 0.24), 0.09, D + 0.55, toon('#6a8a5a'), roof, seg=10, rot=(math.pi / 2, 0, 0))
    gable_edges(roof, toon(PINE_DARK), FRONT - 0.32, lift=0.16)
    if level == 1:
        blade(P('copper-blade'), 0.5, toon('#e8904a', rim=0.35), toon('#e8904a', rim=0.35))

    # 2: the Iron Sawmill: a stone ramp for the logs, a pine store, and the iron blade.
    if level >= 2:
        ramp = part(2, 'stone-ramp')
        for i in range(3):
            box((-W / 2 - 0.55, -0.3 + i * 0.4, 0.14 + i * 0.14), (0.9, 0.45, 0.28 + i * 0.28), toon(STONE if i % 2 else STONE_DARK),
                ramp, bevel=0.04)
        store = part(2, 'pine-store')
        logs(store, (W / 2 + 0.7, 0.9, 0), 2, PINE_DARK, PINE_END)
        lean = empty('lean', store, (W / 2 + 0.7, 0.75, 1.3))
        lean.rotation_euler = (0, -0.35, 0)
        box((0, 0, 0), (1.3, 1.5, 0.08), toon('#8aa06a'), lean, bevel=0.02)
        box((W / 2 + 1.25, 0.2, 0.6), (0.12, 0.12, 1.2), toon(PINE_DARK), store, bevel=0.02)
        if level == 2:
            iron = P('iron-blade')
            blade(iron, 0.5, toon('#c8d4e8', rim=0.35), toon('#c8d4e8', rim=0.35))
        bands = part(2, 'iron-blade') if level == 2 else P('base')
        for x in (-W / 2 + 0.1, W / 2 - 0.1):
            for z in (0.6, 1.7):
                box((x, FRONT - 0.04, z), (0.28, 0.28, 0.08), toon('#8a92a8'), bands, bevel=0.01, line=0.008)

    # 3: the Crystal Sawmill: a pine-plank deck before the door, Glimmerwood waiting its turn, and the crystal blade.
    if level >= 3:
        deck = part(3, 'plank-deck')
        dw = W - 1.6
        box((0, -D / 2 - 0.45, 0.2), (dw, 0.8, 0.1), toon('#e8b878'), deck, bevel=0.02)
        for i in range(1, 8):
            box((-dw / 2 + i * dw / 8, -D / 2 - 0.45, 0.255), (0.03, 0.76, 0.02), toon(PINE_DARK), deck, bevel=0, line=0)
        for x in (-dw / 2, dw / 2):
            box((x, -D / 2 - 0.82, 0.35), (0.08, 0.08, 0.3), toon('#d8a868'), deck, bevel=0.01, line=0.01)
        glim = part(3, 'glimwood-logs')
        logs(glim, (W / 2 + 0.65, -0.55, 0), 2, '#b8a8e8', GLIM, glow=0.35, grain=GLIM_GRAIN)
        if level == 3:
            cr = P('crystal-blade')
            blade(cr, 0.52, toon('#bfeefc', rim=0.7, emit=0.35), toon('#e8faff', rim=0.7, emit=0.5), hub='#8ab0d0')
            for s in (-1, 1):
                x = s * (DOOR_W / 2 + 0.07)
                cylinder((x, FRONT - 0.2, 1.78), 0.01, 0.2, toon(IRON), cr, seg=6, line=0)
                crystal((x, FRONT - 0.2, 1.42), 0.07, 0.26, toon('#9ae6ff', rim=0.6, emit=0.6), cr, sides=6)

    # 4: the Obsidian Sawmill: Glimmerwood trim and sign, Emberwood logs and the obsidian blade.
    if level >= 4:
        trim = part(4, 'glimplank-trim')
        gable_edges(trim, glimwood(0.35), FRONT - 0.4, lift=0.3, size=0.1)
        box((0, FRONT - 0.2, 0.2 + DOOR_H + 0.2), (DOOR_W + 0.2, 0.06, 0.2), glimwood(0.25), trim, bevel=0.03, line=0.012)
        for dx in (-0.35, 0, 0.35):
            box((dx, FRONT - 0.24, 0.2 + DOOR_H + 0.2), (0.22, 0.02, 0.04), toon(GLIM_GRAIN, emit=0.3), trim, bevel=0, line=0)
        ember = part(4, 'emberwood-logs')
        logs(ember, (-W / 2 - 0.45, -1.5, 0), 2, EMBER_WOOD, '#5a3a3a', grain=EMBER_GRAIN)
        ob = P('obsidian-blade')
        blade(ob, 0.54, obsidian(), toon('#ff8a3a', emit=0.8), hub='#1e1824')
        box((0, -D / 2 - 0.3, 0.28), (DOOR_W + 0.3, 0.45, 0.06), obsidian(), ob, bevel=0.02)
    return P.objects()
