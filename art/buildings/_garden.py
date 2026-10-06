"""Poppy's Garden: a fenced field of tilled plots, a rectangle that grows a block at a time (the game's map lays out
the same field, a plot per tile: FIELD_PLOTS in src/garden.ts).

The Sprout Patch: an oak picket fence round a patch of grass with a gate at the front, its first two rows of three plots
edged in oak, the water butt and watering can by the gate, and clover and wildflowers where the rest will go. The Berry
Garden tills a row and a column more (twelve plots) edged in Oak Planks, with stone gateposts and stepping stones round
the paths, and a basket of Shroom Caps for compost. The Bloom Garden fills the field out to twenty plots edged in
Glimmerwood, with Ember lanterns at the back corners and flowers all along the back fence."""
import math

from lib import box, cone, cylinder, empty, lathe, sphere, toon, torus

from buildings._common import EMBER_GRAIN, GLIM_GRAIN, STONE, STONE_DARK, Parts, flowers, glimwood, lantern

TIMBER = '#b98a5a'
RIDGE, FURROW = '#7a5236', '#4a2e1c'
PICKET = '#fff4e2'
# The field: five columns by four rows of plots, a plot every PITCH, the front row nearest the gate. Each level's block
# is the one before plus a row and a column (as FIELD_BLOCKS in src/garden.ts): [first column, past the last, rows].
COLS, ROWS, PITCH, PLOT = 5, 4, 1.0, 0.86
BLOCKS = {1: (1, 4, 2), 2: (0, 4, 3), 3: (0, 5, 4)}
# The field sits round the model's origin: the fence's front (with the gate) at FRONT, its back at BACK, sides at ±SIDE.
FRONT, SIDE = -2.4, 3.2
BACK = FRONT + 0.95 + (ROWS - 1) * PITCH + PLOT / 2 + 0.45


def plot_at(c, r):
    return ((c - (COLS - 1) / 2) * PITCH, FRONT + 0.95 + r * PITCH)


def block(lv):
    c0, c1, r1 = BLOCKS[lv]
    return {(c, r) for c in range(c0, c1) for r in range(r1)}


def tilled(parent, c, r, edge):
    """One plot: a square of dark tilled earth in ridged rows, edged with boards of `edge`."""
    x, y = plot_at(c, r)
    box((x, y, 0.05), (PLOT, PLOT, 0.08), toon(FURROW), parent, bevel=0, line=0.01)
    for k in range(3):
        box((x, y - PLOT / 2 + PLOT * (k + 0.5) / 3, 0.1), (PLOT * 0.86, 0.19, 0.07), toon(RIDGE), parent, bevel=0, line=0)
    for dy in (-1, 1):
        box((x, y + dy * (PLOT / 2 + 0.02), 0.07), (PLOT + 0.08, 0.05, 0.1), edge, parent, bevel=0, line=0.008)
    for dx in (-1, 1):
        box((x + dx * (PLOT / 2 + 0.02), y, 0.07), (0.05, PLOT, 0.1), edge, parent, bevel=0, line=0.008)


def picket(parent, x, y, h=0.44):
    box((x, y, h / 2), (0.09, 0.07, h), toon(PICKET), parent, bevel=0, line=0.01)
    cone((x, y, h + 0.035), 0.065, 0.07, toon(PICKET), parent, seg=4, line=0.008, rot=(0, 0, math.pi / 4))


def fence_run(parent, x0, y0, x1, y1, gap=None):
    """Pickets on two rails from (x0, y0) to (x1, y1), leaving out a gate `gap` (x from, x to) on a run across."""
    n = max(1, round(math.hypot(x1 - x0, y1 - y0) / 0.5))
    for i in range(n + 1):
        x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
        if gap and gap[0] < x < gap[1]:
            continue
        picket(parent, x, y)
    runs = [(x0, gap[0]), (gap[1], x1)] if gap else [(x0, x1)]
    for a, b in runs:
        for z in (0.14, 0.32):
            if y0 == y1:
                box(((a + b) / 2, y0, z), (abs(b - a), 0.04, 0.05), toon(PICKET), parent, bevel=0.01, line=0.008)
            else:
                box((x0, (y0 + y1) / 2, z), (0.04, abs(y1 - y0), 0.05), toon(PICKET), parent, bevel=0.01, line=0.008)


def watering_can(parent, loc, rot=0.0):
    """Poppy's little blue watering can."""
    r = empty('can', parent, loc)
    r.rotation_euler = (0, 0, rot)
    tin = toon('#6ab8f0', rim=0.35)
    cylinder((0, 0, 0.14), 0.13, 0.26, tin, r, seg=16, line=0.012)
    cylinder((0.2, 0, 0.2), 0.03, 0.3, tin, r, seg=8, rot=(0, 0.9, 0), line=0.01)
    cylinder((0.32, 0, 0.3), 0.055, 0.04, toon('#4a98d0'), r, seg=10, rot=(0, 0.9, 0), line=0.008)
    torus((-0.02, 0, 0.3), 0.1, 0.022, tin, r, rot=(math.pi / 2, 0, 0), line=0.008)
    return r


def water_butt(parent, x, y):
    """An oak barrel of rainwater, banded, brimming blue."""
    lathe([(0.0001, 0.0), (0.22, 0.0), (0.26, 0.25), (0.22, 0.5), (0.0001, 0.5)], toon(TIMBER), parent, loc=(x, y, 0), seg=14, line=0.01)
    for z in (0.1, 0.4):
        torus((x, y, z), 0.24, 0.018, toon('#6a4a3a'), parent, line=0.006)
    cylinder((x, y, 0.49), 0.2, 0.02, toon('#6ac8f0', emit=0.15), parent, seg=14, line=0)


def build(root, level):
    P = Parts(root)
    if level > 1:
        P('base')
    part = lambda lv, name: P(name if lv == level else 'base')
    gate = (-0.5, 0.5)

    # 1: the Sprout Patch. Oak for the fence round the field and the first six plots' edging, the butt and the can.
    fence = part(1, 'oak-fence')
    box((0, (FRONT + BACK) / 2, 0.02), (SIDE * 2 + 0.2, BACK - FRONT + 0.2, 0.04), toon('#86c864'), fence, bevel=0.05, line=0.012)
    fence_run(fence, -SIDE, FRONT, SIDE, FRONT, gap=gate)
    fence_run(fence, -SIDE, BACK, SIDE, BACK)
    for sx in (-1, 1):
        fence_run(fence, sx * SIDE, FRONT, sx * SIDE, BACK)
        cylinder((gate[1 if sx > 0 else 0] + sx * 0.04, FRONT, 0.3), 0.06, 0.6, toon(TIMBER), fence, seg=8, line=0.01)
    first = part(1, 'tilled-plots')
    for c, r in sorted(block(1)):
        tilled(first, c, r, toon(TIMBER))
    water_butt(first, -SIDE + 0.45, FRONT + 0.55)
    watering_can(first, (-SIDE + 0.5, FRONT + 1.15, 0.02), 0.5)
    # The Lucky Clover: clover and wildflowers in the grass where the rest of the field will go.
    luck = part(1, 'clover-patch')
    for c, r in sorted({(c, r) for c in range(COLS) for r in range(ROWS)} - block(level)):
        x, y = plot_at(c, r)
        flowers(luck, 2.2, [(x / 2.2 - 0.1, (y - 0.1) / 2.2, ('#ff8ab0', '#ffd35a', '#ffffff')[(c + r) % 3])], z=0.05)
        for i in range(3):
            a = i / 3 * math.tau + math.pi / 4
            sphere((x + 0.2 + math.cos(a) * 0.06, y + 0.15 + math.sin(a) * 0.06, 0.06), (0.06, 0.06, 0.02), toon('#5ac85a'), luck, seg=8, line=0.008)

    # 2: the Berry Garden. A row and a column more, edged in Oak Planks; stone gateposts and stepping stones; compost.
    if level >= 2:
        planks = part(2, 'plank-plots')
        for c, r in sorted(block(2) - block(1)):
            tilled(planks, c, r, toon('#e8c890'))
        path = part(2, 'stone-path')
        for x in gate:
            gx = x + (0.12 if x > 0 else -0.12)
            box((gx, FRONT - 0.05, 0.24), (0.26, 0.26, 0.48), toon(STONE), path, bevel=0.05)
            box((gx, FRONT - 0.05, 0.52), (0.32, 0.32, 0.08), toon(STONE_DARK), path, bevel=0.03)
        for k, x in enumerate((-2.0, -1.0, 0.0, 1.0, 2.0)):
            sphere((x + (k % 2) * 0.05, FRONT + 0.3, 0.035), (0.14, 0.11, 0.035), toon(STONE if k % 2 else STONE_DARK), path, seg=12, line=0.01)
        for k, y in enumerate((0.95, 1.95, 2.95)):
            sphere((SIDE - 0.4, FRONT + y, 0.035), (0.12, 0.14, 0.035), toon(STONE_DARK if k % 2 else STONE), path, seg=12, line=0.01)
        caps = part(2, 'shroom-basket')
        bx, by = SIDE - 0.42, BACK - 0.45
        lathe([(0.0001, 0.0), (0.2, 0.0), (0.24, 0.2), (0.0001, 0.2)], toon('#d8a860'), caps, loc=(bx, by, 0.02), seg=14, line=0.01)
        torus((bx, by, 0.22), 0.16, 0.022, toon('#b8884a'), caps, rot=(math.pi / 2, 0, 0), line=0.008)
        for dx, dz in ((-0.08, 0.24), (0.08, 0.26), (0.0, 0.3)):
            sphere((bx + dx, by - 0.05, dz), (0.09, 0.09, 0.05), toon('#e8505a'), caps, seg=12, line=0.01)
            sphere((bx + dx, by - 0.12, dz + 0.02), 0.018, toon('#ffffff'), caps, seg=6, line=0)

    # 3: the Bloom Garden. The field filled out to twenty plots in Glimmerwood, Ember lanterns, flowers on the back fence.
    if level >= 3:
        glim = part(3, 'glim-plots')
        for c, r in sorted(block(3) - block(2)):
            tilled(glim, c, r, glimwood(0.3))
            x, y = plot_at(c, r)
            box((x, y - PLOT / 2 - 0.047, 0.1), (PLOT * 0.8, 0.01, 0.02), toon(GLIM_GRAIN, emit=0.4), glim, bevel=0, line=0)
        ember = part(3, 'ember-lanterns')
        for x in (-SIDE, SIDE):
            cylinder((x, BACK, 0.7), 0.03, 0.6, toon('#6a4a3a'), ember, seg=8, line=0.01)
            lantern(ember, (x, BACK, 1.07), glow='#ff9a3a')
            sphere((x, BACK - 0.07, 1.07), 0.04, toon(EMBER_GRAIN, emit=1.2), ember, seg=8, line=0)
        bloom = part(3, 'flowers')
        for i in range(16):
            x = -SIDE + 0.2 + i * (2 * SIDE - 0.4) / 15
            col = ('#ff8ab0', '#ffd35a', '#b08aff', '#ffffff')[i % 4]
            z = 0.36 + (i % 2) * 0.12
            for p in range(5):
                a = p / 5 * math.tau
                sphere((x + math.cos(a) * 0.05, BACK - 0.07, z + math.sin(a) * 0.05), 0.045, toon(col), bloom, seg=8, line=0.006)
            sphere((x, BACK - 0.1, z), 0.03, toon('#ffb03a'), bloom, seg=8, line=0)
    return P.objects()
