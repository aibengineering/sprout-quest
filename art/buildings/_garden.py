"""Poppy's Garden: a grassy patch with a white picket fence round the back and sides and a wooden bed for each plot
(two more with every level; the game draws the soil and whatever's growing in them), and a few of her things.

It rises from its materials: the oak fence and the first two beds, then clover luck; plank beds, a stone gateway and
stepping stones, and a basket of Shroom Caps for compost; then Glimmerwood beds, Ember lanterns, and flowers climbing
the back fence."""
import math

from lib import box, cone, cylinder, empty, lathe, sphere, toon, torus

from buildings._common import EMBER_GRAIN, GLIM_GRAIN, STONE, STONE_DARK, Parts, flowers, glimwood, lantern

# Where each plot's bed sits, from the front middle, in planting order (the middle column, then the left, then the
# right). The game draws each plot's soil and crop on these spots (GARDEN_BEDS in src/overworld.ts).
GARDEN_BEDS = [(0, 2.0), (0, 0.7), (-1.45, 2.0), (-1.45, 0.7), (1.45, 2.0), (1.45, 0.7)]
GARDEN_PLOTS = {1: 2, 2: 4, 3: 6}
TIMBER = '#b98a5a'


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


def bed(parent, bx, by, frame):
    """A wooden bed frame round a patch of bare earth."""
    box((bx, by, 0.05), (1.22, 1.1, 0.06), toon('#7a5236'), parent, bevel=0.02, line=0)
    for dy in (-0.55, 0.55):
        box((bx, by + dy, 0.08), (1.26, 0.08, 0.14), frame, parent, bevel=0.02, line=0.01)
    for dx in (-0.61, 0.61):
        box((bx + dx, by, 0.08), (0.08, 1.1, 0.14), frame, parent, bevel=0.02, line=0.01)


def build(root, level):
    P = Parts(root)
    if level > 1:
        P('base')
    part = lambda lv, name: P(name if lv == level else 'base')
    beds = GARDEN_BEDS[:GARDEN_PLOTS[level]]

    # 1: the Sprout Patch. Oak for the grass patch's fence and front edge, then the first two beds and the can.
    fence = part(1, 'oak-fence')
    box((0, 1.4, 0.03), (4.6, 2.95, 0.06), toon('#86c864'), fence, bevel=0.05, line=0.012)
    picket = toon('#fff4e2')
    for i in range(9):
        x = -2.2 + i * 0.55
        box((x, 2.85, 0.22), (0.1, 0.07, 0.44), picket, fence, bevel=0.02, line=0.01)
        cone((x, 2.85, 0.47), 0.07, 0.08, picket, fence, seg=4, line=0.008, rot=(0, 0, math.pi / 4))
    box((0, 2.85, 0.3), (4.5, 0.05, 0.06), picket, fence, bevel=0.01, line=0.01)
    for sx in (-1, 1):
        for i in range(5):
            box((2.25 * sx, 0.2 + i * 0.65, 0.2), (0.07, 0.1, 0.4), picket, fence, bevel=0.02, line=0.01)
        box((2.25 * sx, 1.5, 0.28), (0.05, 2.7, 0.06), picket, fence, bevel=0.01, line=0.01)
    # A low timber edge along the front, so it reads as a garden from the path.
    box((0, -0.04, 0.07), (4.5, 0.1, 0.14), toon(TIMBER), fence, bevel=0.02, line=0.01)
    first = part(1, 'oak-beds')
    for bx, by in beds[:2]:
        bed(first, bx, by, toon(TIMBER))
    watering_can(first, (-2.0, -0.35, 0.02) if level < 3 else (2.0, -0.35, 0.02), 0.5 if level < 3 else 2.6)
    # The Lucky Clover: clover and wildflowers in the grass where the next beds will go.
    luck = part(1, 'clover-patch')
    for bx, by in GARDEN_BEDS[len(beds):]:
        flowers(luck, 2.2, [(bx / 2.2 - 0.12, (by - 0.1) / 2.2, '#ff8ab0'), (bx / 2.2 + 0.1, (by + 0.15) / 2.2, '#ffd35a'),
                            (bx / 2.2 + 0.02, (by - 0.25) / 2.2, '#ffffff')], z=0.05)
    for x, y in ((-1.2, -0.25), (-0.45, -0.3), (0.45, -0.28), (1.2, -0.25)):
        for i in range(4):
            a = i / 4 * math.tau + math.pi / 4
            sphere((x + math.cos(a) * 0.07, y + math.sin(a) * 0.07, 0.08), (0.07, 0.07, 0.02), toon('#5ac85a'), luck, line=0.008)

    # 2: the Berry Garden. Two more beds of Oak Planks, a stone gateway and stepping stones, and a basket of caps.
    if level >= 2:
        planks = part(2, 'plank-beds')
        for bx, by in beds[2:4]:
            bed(planks, bx, by, toon('#e8c890'))
        path = part(2, 'stone-path')
        for sx in (-1, 1):
            box((2.25 * sx, -0.04, 0.24), (0.3, 0.3, 0.48), toon(STONE), path, bevel=0.05)
            box((2.25 * sx, -0.04, 0.52), (0.36, 0.36, 0.08), toon(STONE_DARK), path, bevel=0.03)
            for k, y in enumerate((0.35, 1.0, 1.65, 2.3)):
                sphere((0.73 * sx + (k % 2) * 0.03, y, 0.04), (0.12, 0.14, 0.04), toon(STONE if k % 2 else STONE_DARK), path, seg=12,
                       line=0.01)
        caps = part(2, 'shroom-basket')
        bx = 2.0 if level < 3 else -2.0
        lathe([(0.0001, 0.0), (0.2, 0.0), (0.24, 0.2), (0.0001, 0.2)], toon('#d8a860'), caps, loc=(bx, -0.35, 0.02), seg=14, line=0.01)
        torus((bx, -0.35, 0.22), 0.16, 0.022, toon('#b8884a'), caps, rot=(math.pi / 2, 0, 0), line=0.008)
        for dx, dz in ((-0.08, 0.24), (0.08, 0.26), (0.0, 0.3)):
            sphere((bx + dx, -0.4, dz), (0.09, 0.09, 0.05), toon('#e8505a'), caps, seg=12, line=0.01)
            sphere((bx + dx, -0.47, dz + 0.02), 0.018, toon('#ffffff'), caps, seg=6, line=0)

    # 3: the Bloom Garden. The last two beds in Glimmerwood, Ember lanterns, and flowers along the back fence.
    if level >= 3:
        glim = part(3, 'glim-beds')
        for bx, by in beds[4:6]:
            bed(glim, bx, by, glimwood(0.3))
            box((bx, by - 0.595, 0.12), (1.0, 0.01, 0.025), toon(GLIM_GRAIN, emit=0.3), glim, bevel=0, line=0)
        ember = part(3, 'ember-lanterns')
        for x in (-2.25, 2.25):
            cylinder((x, 2.85, 0.75), 0.03, 0.6, toon('#6a4a3a'), ember, seg=8, line=0.01)
            lantern(ember, (x, 2.85, 1.12), glow='#ff9a3a')
            sphere((x, 2.78, 1.12), 0.04, toon(EMBER_GRAIN, emit=1.2), ember, seg=8, line=0)
        bloom = part(3, 'flowers')
        for i in range(12):
            x = -2.1 + i * 0.38
            col = ('#ff8ab0', '#ffd35a', '#b08aff', '#ffffff')[i % 4]
            for p in range(5):
                a = p / 5 * math.tau
                sphere((x + math.cos(a) * 0.05, 2.78, 0.4 + (i % 2) * 0.12 + math.sin(a) * 0.05), 0.045, toon(col), bloom, seg=8, line=0.006)
            sphere((x, 2.75, 0.4 + (i % 2) * 0.12), 0.03, toon('#ffb03a'), bloom, seg=8, line=0)
    return P.objects()
