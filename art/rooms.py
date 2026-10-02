"""Props for the rooms you walk into (src/room.ts) and the Garden's hand tools: what you work at by hand.

Granny's Kitchen: her pantry shelf, the stove with its pot, her recipe book on its stand and the table. Bram's
Sawmill: a log pile for each wood, the saw bench, its blade (drawn spinning on its own), the lever and stacks of
planks. Poppy's Garden: the water butt, the seed basket and the watering can you carry.

One map tile = 1.6 Blender units, as for the overworld scenery (art/env.py). Each prop's origin is the middle of its
footprint, front faces -Y (towards the camera). The game draws each at its station's box (src/game/*Room.ts); the
sizes here match those boxes. Rendered with `bun run art rooms`, packed into public/assets/rooms/ (its own atlas).
"""
import math

from lib import box, cone, cylinder, empty, lathe, sphere, toon, torus

TILE = 1.6
WOOD = '#a8714a'
WOOD_DARK = '#7a4a30'
WOOD_LIGHT = '#d8a878'
IRON = '#4a4652'


def _jar(root, loc, r, h, glass, lid, fill=None):
    """A glass jar with a lid, something showing inside."""
    x, y, z = loc
    if fill:
        cylinder((x, y, z + h * 0.4), r * 0.86, h * 0.8, toon(fill), root, seg=14, line=0)
    cylinder((x, y, z + h / 2), r, h, toon(glass, rim=0.5), root, seg=14, line=0.01)
    cylinder((x, y, z + h + 0.03), r * 1.05, 0.07, toon(lid), root, seg=14, line=0.01)


def _sack(root, loc, s, color):
    x, y, z = loc
    sphere((x, y, z + s * 0.55), (s * 0.75, s * 0.6, s * 0.6), toon(color), root, line=0.012)
    cone((x, y, z + s * 1.15), s * 0.25, s * 0.35, toon(color), root, seg=10, line=0.01, r2=s * 0.12)
    torus((x, y, z + s * 1.02), s * 0.2, 0.025, toon('#c86a4a'), root, line=0)


def pantry():
    """Granny's pantry: a cupboard with open shelves over it, full of jars, sacks and baskets of what you've
    gathered (fluff, goo, clover, caps, berries, a jar of rock candy)."""
    root = empty('k_pantry')
    w, d = 3.1, 0.75
    wood, dark = toon(WOOD), toon(WOOD_DARK)
    # The cupboard: two doors with knobs.
    box((0, 0, 0.45), (w, d, 0.9), wood, root, bevel=0.04)
    for s in (-1, 1):
        box((s * w / 4, -d / 2 - 0.02, 0.45), (w / 2 - 0.16, 0.05, 0.72), toon(WOOD_LIGHT), root, bevel=0.03, line=0.012)
        sphere((s * 0.12, -d / 2 - 0.07, 0.55), 0.05, toon('#ffd35a'), root, line=0.008)
    box((0, 0, 0.93), (w + 0.1, d + 0.1, 0.07), dark, root, bevel=0.02, line=0.012)
    # Shelves above, against the wall.
    for x in (-w / 2 + 0.06, w / 2 - 0.06):
        box((x, d * 0.15, 1.75), (0.1, d * 0.6, 1.6), dark, root, bevel=0.02, line=0.012)
    box((0, d * 0.42, 1.75), (w, 0.06, 1.6), toon('#c88a5a'), root, bevel=0.01, line=0)
    for z in (1.45, 2.05, 2.55):
        box((0, d * 0.15, z), (w, d * 0.6, 0.06), dark, root, bevel=0.01, line=0.01)
    # Lower shelf: a sack of flour, a basket of fluff, a jar of goo, a pot of clover.
    _sack(root, (-1.15, 0.1, 0.97), 0.42, '#f0e0c0')
    cylinder((-0.4, 0.05, 1.12), 0.3, 0.3, toon('#c89a5a'), root, seg=16, line=0.012)
    for i in range(5):
        a = i / 5 * math.tau
        sphere((-0.4 + math.cos(a) * 0.15, 0.05 + math.sin(a) * 0.1, 1.3), 0.13, toon('#ffffff'), root, line=0.008)
    _jar(root, (0.3, 0.05, 0.97), 0.2, 0.42, '#c8f0e0', '#e86a6a', '#5ac85a')
    cylinder((0.95, 0.05, 1.1), 0.22, 0.26, toon('#d8805a'), root, seg=14, line=0.012)
    for i in range(4):
        sphere((0.95 + (i - 1.5) * 0.08, 0.05, 1.3 + (i % 2) * 0.05), (0.09, 0.06, 0.03), toon('#4fb043'), root, line=0.006)
    # Middle shelf: jars and mushrooms.
    for i, (fill, lid) in enumerate((('#ffb0c8', '#ffd35a'), ('#ffe08a', '#e86a6a'), ('#b8e0ff', '#9a6aff'), ('#e8f0ff', '#ffd35a'))):
        _jar(root, (-1.15 + i * 0.55, 0.12, 1.49), 0.16, 0.36, '#d8f0ff', lid, fill)
    for i in range(3):
        x = 1.15 + (i - 1) * 0.16
        cylinder((x, 0.1, 1.55), 0.04, 0.12, toon('#f6ecd8'), root, seg=8, line=0)
        sphere((x, 0.1, 1.63), (0.1, 0.1, 0.06), toon('#e8505a'), root, line=0.008)
    # Top shelf: plates and a teapot.
    for i in range(4):
        cylinder((-1.1 + i * 0.32, 0.25, 2.25), 0.16, 0.03, toon('#ffffff'), root, seg=16, rot=(math.pi / 2 - 0.25, 0, 0), line=0.008)
    lathe([(0.0001, 2.09), (0.2, 2.1), (0.26, 2.2), (0.22, 2.36), (0.08, 2.42), (0.0001, 2.44)], toon('#9ad8ff'), root, loc=(0.8, 0.1, 0), seg=16, line=0.01)
    cylinder((1.08, 0.1, 2.24), 0.035, 0.24, toon('#9ad8ff'), root, rot=(0, 0.9, 0), seg=8, line=0.008)
    return root


def stove():
    """A cast-iron stove and adjoining wooden prep bench: one cooking station with a clear worktop."""
    root = empty('k_stove')
    w, d, h = 2.0, 1.0, 0.95
    iron, dark = toon(IRON), toon('#2e2a34')
    box((0, 0, h / 2), (w, d, h), iron, root, bevel=0.08)
    box((0, 0, h + 0.03), (w + 0.12, d + 0.1, 0.07), dark, root, bevel=0.02, line=0.012)
    for x in (-w / 2 + 0.12, w / 2 - 0.12):
        for y in (-d / 2 + 0.12, d / 2 - 0.12):
            cylinder((x, y, 0.05), 0.08, 0.1, dark, root, seg=8, line=0.008)
    # The oven door, with the fire glowing through it.
    box((-0.35, -d / 2 - 0.03, 0.45), (0.85, 0.06, 0.55), dark, root, bevel=0.04, line=0.012)
    box((-0.35, -d / 2 - 0.06, 0.45), (0.5, 0.03, 0.26), toon('#ff8a3a', emit=0.9), root, bevel=0.03, line=0)
    cylinder((0.08, -d / 2 - 0.08, 0.45), 0.04, 0.12, toon('#d8c8b8'), root, rot=(math.pi / 2, 0, 0), seg=8, line=0.006)
    # Dials and a towel on the rail.
    for i in range(2):
        cylinder((0.5 + i * 0.25, -d / 2 - 0.04, 0.78), 0.06, 0.05, toon('#d8c8b8'), root, rot=(math.pi / 2, 0, 0), seg=10, line=0.006)
    cylinder((0, -d / 2 - 0.12, 0.88), 0.025, w * 0.9, toon('#d8c8b8'), root, rot=(0, math.pi / 2, 0), seg=8, line=0.006)
    box((0.62, -d / 2 - 0.14, 0.72), (0.34, 0.03, 0.34), toon('#ff8ab0'), root, bevel=0.02, line=0.008)
    # The pipe up the wall.
    cylinder((0.62, d / 2 - 0.15, h + 1.1), 0.13, 2.2, dark, root, seg=12, line=0.012)
    # The pot: copper, with handles, sitting on the hob (its top is open: the game draws what's cooking in it).
    copper = toon('#e0884a', rim=0.4)
    lathe([(0.0001, h + 0.06), (0.4, h + 0.08), (0.48, h + 0.25), (0.5, h + 0.5), (0.53, h + 0.55), (0.46, h + 0.56), (0.42, h + 0.32), (0.0001, h + 0.3)],
          copper, root, loc=(-0.25, 0, 0), seg=24, line=0.014)
    for s in (-1, 1):
        torus((-0.25 + s * 0.55, 0, h + 0.45), 0.08, 0.025, copper, root, rot=(math.pi / 2, 0, 0), line=0.006)
    cylinder((-0.25, 0, h + 0.42), 0.4, 0.04, toon('#5a3020'), root, seg=24, line=0)
    # Keep the stove at the left of the combined station, with preparation space on its right.
    for child in root.children:
        child.location.x -= 0.65
    wood, counter = toon(WOOD), toon('#f4dfb8')
    box((1.0, 0, h / 2), (1.3, d, h), wood, root, bevel=0.04)
    box((1.0, 0, h + 0.035), (1.4, d + 0.1, 0.08), counter, root, bevel=0.03, line=0.012)
    box((1.0, -d / 2 - 0.025, 0.55), (1.1, 0.05, 0.3), toon(WOOD_LIGHT), root, bevel=0.02, line=0.01)
    cylinder((1.0, -d / 2 - 0.08, 0.55), 0.035, 0.35, dark, root, rot=(0, math.pi / 2, 0), seg=8, line=0.006)
    box((1.0, -0.06, h + 0.1), (0.82, 0.65, 0.06), toon('#c99763'), root, bevel=0.04, line=0.012)
    # A mixing bowl and wooden spoon leave most of the board clear for the carried ingredient plate.
    lathe([(0.0001, 0), (0.12, 0.01), (0.23, 0.22), (0.25, 0.25), (0.21, 0.26), (0.1, 0.06), (0.0001, 0.05)],
          toon('#9ad8ff'), root, loc=(1.28, 0.22, h + 0.09), seg=16, line=0.01)
    cylinder((0.68, -0.05, h + 0.16), 0.025, 0.5, toon(WOOD_DARK), root, rot=(0, math.pi / 2, 0), seg=8, line=0.006)
    sphere((0.44, -0.05, h + 0.16), (0.1, 0.06, 0.025), toon(WOOD_DARK), root, line=0.006)
    return root


def recipe_stand():
    """Granny's recipe book, open on a little wooden stand, a ribbon hanging out and a pencil."""
    root = empty('k_book')
    wood = toon(WOOD)
    cylinder((0, 0, 0.45), 0.06, 0.9, wood, root, seg=10, line=0.012)
    box((0, 0, 0.04), (0.6, 0.45, 0.08), toon(WOOD_DARK), root, bevel=0.03, line=0.012)
    top = empty('top', root, (0, 0, 0.95))
    top.rotation_euler = (math.radians(35), 0, 0)
    box((0, 0, 0), (1.1, 0.7, 0.06), wood, top, bevel=0.02, line=0.012)
    for s in (-1, 1):
        box((s * 0.26, 0, 0.06), (0.5, 0.62, 0.05), toon('#fffaf0'), top, bevel=0.02, line=0.01, rot=(0, s * -0.08, 0))
        for i in range(4):
            box((s * 0.26, -0.18 + i * 0.12, 0.09), (0.36, 0.025, 0.01), toon('#b8a8c8'), top, bevel=0, line=0)
    box((0, 0, 0.03), (1.1, 0.7, 0.03), toon('#e8584a'), top, bevel=0.02, line=0)
    box((0.05, -0.38, -0.05), (0.06, 0.02, 0.3), toon('#ffd35a'), top, bevel=0, line=0.006)
    sphere((-0.25, -0.05, 0.12), (0.06, 0.06, 0.03), toon('#ff8ab0'), top, line=0.006)
    return root


def table():
    """A small side table: a checked cloth, a jug of flowers, and one stool tucked under."""
    root = empty('k_table')
    w, d, h = 2.0, 1.1, 0.8
    wood, dark = toon(WOOD), toon(WOOD_DARK)
    for x in (-w / 2 + 0.2, w / 2 - 0.2):
        for y in (-d / 2 + 0.18, d / 2 - 0.18):
            cylinder((x, y, h / 2), 0.08, h, dark, root, seg=10, line=0.012)
    box((0, 0, h), (w, d, 0.1), wood, root, bevel=0.04)
    # The cloth: white with red checks, hanging over the front edge.
    box((0, 0, h + 0.06), (w * 0.82, d + 0.08, 0.03), toon('#fff6ee'), root, bevel=0.01, line=0.01)
    box((0, -d / 2 - 0.05, h - 0.1), (w * 0.82, 0.03, 0.3), toon('#fff6ee'), root, bevel=0.01, line=0.01)
    red = toon('#f07a7a')
    for i in range(5):
        x = (i - 2) * w * 0.82 / 5
        box((x, 0, h + 0.08), (w * 0.82 / 10, d + 0.08, 0.012), red, root, bevel=0, line=0)
        box((x, -d / 2 - 0.07, h - 0.1), (w * 0.82 / 10, 0.012, 0.3), red, root, bevel=0, line=0)
    # A jug of flowers.
    lathe([(0.0001, 0), (0.14, 0.01), (0.18, 0.12), (0.12, 0.3), (0.15, 0.36), (0.0001, 0.34)], toon('#9ad8ff'), root, loc=(0.5, 0.2, h + 0.09), seg=14, line=0.01)
    for i, c in enumerate(('#ff8ab0', '#ffd35a', '#ffffff', '#b08aff')):
        a = i / 4 * math.tau
        cylinder((0.5 + math.cos(a) * 0.05, 0.2 + math.sin(a) * 0.05, h + 0.55), 0.015, 0.3, toon('#4fb043'), root, seg=6, line=0)
        sphere((0.5 + math.cos(a) * 0.1, 0.2 + math.sin(a) * 0.08, h + 0.72), 0.08, toon(c), root, line=0.006)
    # Stools in front.
    for x in (-0.45,):
        cylinder((x, -d / 2 - 0.35, 0.42), 0.26, 0.08, wood, root, seg=16, line=0.012)
        for a in (0.5, 2.6, 4.7):
            cylinder((x + math.cos(a) * 0.15, -d / 2 - 0.35 + math.sin(a) * 0.15, 0.2), 0.035, 0.42, dark, root, seg=6, line=0.008)
    return root


# ----------------------------------------------------------------------------- Bram's Sawmill

WOODS = {
    'bark': ('#8a5a3a', '#e8c890'),
    'pine': ('#6a4630', '#f0dca0'),
    'glimwood': ('#e4e0f0', '#f6f2ff'),
    'emberwood': ('#3a3238', '#ffb45a'),
}


def log_pile(wood, n=3):
    """Logs of one wood stacked in a little pyramid, their ends towards you."""
    bark, end = WOODS[wood]
    root = empty(f's_pile_{wood}')
    glow = 0.5 if wood == 'emberwood' else 0.25 if wood == 'glimwood' else 0.0
    for row, count in enumerate(range(n, 0, -1)):
        for i in range(count):
            x = (i - (count - 1) / 2) * 0.46
            z = 0.22 + row * 0.38
            cylinder((x, 0, z), 0.22, 1.1, toon(bark), root, seg=12, rot=(math.pi / 2, 0, 0))
            cylinder((x, -0.56, z), 0.18, 0.02, toon(end, emit=glow), root, seg=12, rot=(math.pi / 2, 0, 0), line=0.01)
            torus((x, -0.565, z), 0.09, 0.012, toon(bark), root, rot=(math.pi / 2, 0, 0), line=0)
    # Chocks either side.
    for s in (-1, 1):
        box((s * (n * 0.25 + 0.05), 0, 0.12), (0.1, 1.0, 0.24), toon(WOOD_DARK), root, bevel=0.02, line=0.01)
    return root


def saw_bench():
    """Bram's saw bench: a long trestle table with a slot down the middle for the blade (drawn on its own), the fence
    along the back, and a bucket of sawdust."""
    root = empty('s_bench')
    w, d, h = 3.9, 1.3, 0.85
    wood, dark = toon(WOOD_LIGHT), toon(WOOD_DARK)
    for x in (-w / 2 + 0.3, w / 2 - 0.3):
        for s in (-1, 1):
            box((x, s * 0.4, h / 2), (0.12, 0.12, h), dark, root, bevel=0.02, line=0.01, rot=(s * 0.15, 0, 0))
        box((x, 0, 0.3), (0.12, 0.9, 0.1), dark, root, bevel=0.02, line=0.01)
    for s in (-1, 1):
        box((s * (w / 4 + 0.15), 0, h), (w / 2 - 0.3, d, 0.12), wood, root, bevel=0.03)
    box((0, d / 2 - 0.1, h + 0.15), (w, 0.1, 0.2), dark, root, bevel=0.02, line=0.01)
    # The blade's housing under the table.
    box((0, 0, h * 0.55), (0.6, 0.7, 0.5), toon(IRON), root, bevel=0.05, line=0.012)
    cylinder((0, -0.36, h * 0.55), 0.12, 0.06, toon('#c8d0dc'), root, rot=(math.pi / 2, 0, 0), seg=12, line=0.008)
    # A bucket of sawdust at the end.
    cylinder((w / 2 + 0.15, -0.35, 0.22), 0.22, 0.44, toon('#9a6a44'), root, seg=14, line=0.012)
    sphere((w / 2 + 0.15, -0.35, 0.42), (0.2, 0.2, 0.08), toon('#f0d8a0'), root, line=0.008)
    return root


# Each Sawmill level's blade, as on the map (art/buildings/_sawmill.py): disc, teeth and hub.
BLADES = {
    1: lambda: (toon('#e8904a', rim=0.4), toon('#e8904a', rim=0.4), toon('#6a7080')),
    2: lambda: (toon('#c8d4e8', rim=0.4), toon('#c8d4e8', rim=0.4), toon('#6a7080')),
    3: lambda: (toon('#bfeefc', rim=0.7, emit=0.35), toon('#e8faff', rim=0.7, emit=0.5), toon('#8ab0d0')),
    4: lambda: (toon('#2c2434', shade='#16121c', rim=0.9), toon('#ff8a3a', emit=0.8), toon('#1e1824')),
}


def blade(level=1):
    """The saw blade of a Sawmill level (copper, iron, crystal, obsidian), face on (it stands in the bench's slot and
    the game spins it)."""
    root = empty(f's_blade{level}')
    disc, teeth, hub = BLADES[level]()
    r = 0.55
    cylinder((0, 0, 0), r, 0.04, disc, root, seg=32, rot=(math.pi / 2, 0, 0), line=0.012)
    cylinder((0, -0.03, 0), r * 0.25, 0.06, hub, root, seg=12, rot=(math.pi / 2, 0, 0), line=0.008)
    for i in range(18):
        a = i / 18 * math.tau
        x, z = math.cos(a) * r, math.sin(a) * r
        box((x, 0, z), (0.11, 0.035, 0.11), teeth, root, rot=(0, -a + math.pi / 4, 0), bevel=0.0, line=0.006)
    for i in range(3):
        a = i / 3 * math.tau
        cylinder((math.cos(a) * r * 0.55, -0.025, math.sin(a) * r * 0.55), 0.07, 0.03, hub, root, seg=10, rot=(math.pi / 2, 0, 0), line=0)
    return root


def bench_log(wood):
    """A log of one wood lying along the bench, waiting for the blade."""
    bark, end = WOODS[wood]
    root = empty(f's_benchlog_{wood}')
    cylinder((0, 0, 0.22), 0.22, 1.6, toon(bark), root, seg=12, rot=(0, math.pi / 2, 0))
    for s in (-1, 1):
        cylinder((s * 0.81, 0, 0.22), 0.18, 0.02, toon(end), root, seg=12, rot=(0, math.pi / 2, 0), line=0.01)
    return root


def lever(down):
    """The lever that starts the blade: a post on an iron box, its handle up (off) or pulled down (on)."""
    root = empty('s_lever1' if down else 's_lever0')
    box((0, 0, 0.3), (0.55, 0.45, 0.6), toon(IRON), root, bevel=0.05)
    box((0, -0.23, 0.38), (0.2, 0.03, 0.2), toon('#ffd35a' if down else '#8a8a9a', emit=0.5 if down else 0), root, bevel=0.02, line=0.008)
    # It swings sideways, in plain view: up and to the left when off, pulled down to the right when on.
    arm = empty('arm', root, (0, -0.05, 0.62))
    arm.rotation_euler = (0, math.radians(70 if down else -25), 0)
    cylinder((0, 0, 0.4), 0.05, 0.8, toon('#9a6a44'), arm, seg=10, line=0.01)
    sphere((0, 0, 0.82), 0.12, toon('#e8584a'), arm, line=0.01)
    cylinder((0, -0.05, 0.62), 0.1, 0.2, toon('#2e2a34'), root, rot=(math.pi / 2, 0, 0), seg=12, line=0.01)
    return root


def plank_stack(n):
    """Sawn planks stacked crosswise: a few, a pile, or a big stack."""
    root = empty(f's_planks{n}')
    layers = (2, 4, 7)[n - 1]
    for i in range(layers):
        z = 0.06 + i * 0.1
        rot = 0.05 * ((i * 7) % 3 - 1)
        for k in range(3):
            box((0, (k - 1) * 0.3, z), (1.9, 0.28, 0.08), toon('#e8c890' if (i + k) % 2 else '#dcb880'), root, rot=(0, 0, rot), bevel=0.015, line=0.01)
    return root


# ----------------------------------------------------------------------------- Poppy's Garden

def water_butt():
    """A wooden rain barrel with iron hoops and a tap, a little puddle under it."""
    root = empty('g_butt')
    staves = toon('#9a6a44')
    lathe([(0.0001, 0.02), (0.36, 0.02), (0.42, 0.45), (0.36, 0.9), (0.0001, 0.9)], staves, root, seg=20, line=0.014)
    for z, r in ((0.15, 0.39), (0.75, 0.39)):
        torus((0, 0, z), r, 0.025, toon('#5a5662'), root, line=0)
    cylinder((0, 0, 0.88), 0.34, 0.03, toon('#5ab8f0', rim=0.5), root, seg=20, line=0)
    cylinder((0, -0.42, 0.25), 0.04, 0.16, toon('#c8a050'), root, rot=(math.pi / 2, 0, 0), seg=8, line=0.008)
    cylinder((0, -0.5, 0.3), 0.025, 0.1, toon('#c8a050'), root, seg=8, line=0.006)
    sphere((0.05, -0.55, 0.01), (0.25, 0.15, 0.01), toon('#8ad0f8', rim=0.5), root, line=0)
    return root


def seed_basket():
    """A wicker basket with three seed pouches in it (berry, herb and flower), tied with string."""
    root = empty('g_basket')
    wicker = toon('#d8a860')
    lathe([(0.0001, 0.02), (0.3, 0.02), (0.36, 0.3), (0.32, 0.32), (0.0001, 0.3)], wicker, root, seg=18, line=0.012)
    torus((0, 0, 0.31), 0.34, 0.03, toon('#b88840'), root, line=0)
    torus((0, 0, 0.3), 0.3, 0.025, toon('#b88840'), root, rot=(math.pi / 2, 0, 0), line=0.008)
    for i, c in enumerate(('#6a4a8a', '#8a6a3a', '#5ab85a')):
        a = i / 3 * math.tau + 0.4
        x, y = math.cos(a) * 0.14, math.sin(a) * 0.12
        sphere((x, y, 0.36), (0.13, 0.11, 0.15), toon('#f0e0c0'), root, line=0.008)
        torus((x, y, 0.47), 0.05, 0.015, toon(c), root, line=0)
        cone((x, y, 0.52), 0.06, 0.08, toon('#f0e0c0'), root, seg=8, line=0.006, r2=0.03)
    return root


def watering_can():
    """Poppy's little blue watering can (the one you carry about)."""
    root = empty('g_can')
    tin = toon('#6ab8f0', rim=0.35)
    cylinder((0, 0, 0.17), 0.16, 0.32, tin, root, seg=16, line=0.012)
    cylinder((0.25, 0, 0.24), 0.035, 0.36, tin, root, seg=8, rot=(0, 0.9, 0), line=0.01)
    cylinder((0.39, 0, 0.36), 0.065, 0.05, toon('#4a98d0'), root, seg=10, rot=(0, 0.9, 0), line=0.008)
    torus((-0.03, 0, 0.36), 0.12, 0.026, tin, root, rot=(math.pi / 2, 0, 0), line=0.008)
    return root


# name: (builder, width, height[, where its origin sits down the frame]) in pixels at 64 per Blender unit, as
# art/env.py's SCENERY. The blade's origin is its middle (the game spins it about that).
PROPS = {
    'k_pantry': (pantry, 230, 230),
    'k_stove': (stove, 240, 260),
    'k_book': (recipe_stand, 90, 110),
    'k_table': (table, 160, 140),
    's_bench': (saw_bench, 290, 120),
    's_blade': (blade, 90, 90, 0.5),
    's_lever0': (lambda: lever(False), 80, 120),
    's_lever1': (lambda: lever(True), 80, 120),
    'g_butt': (water_butt, 80, 90),
    'g_basket': (seed_basket, 70, 60),
    'g_can': (watering_can, 70, 60),
}
for _w in WOODS:
    PROPS[f's_pile_{_w}'] = (lambda w=_w: log_pile(w, 3), 130, 120)
    PROPS[f's_pilelow_{_w}'] = (lambda w=_w: log_pile(w, 1), 100, 70)
    PROPS[f's_benchlog_{_w}'] = (lambda w=_w: bench_log(w), 140, 60)
# The blade at each Sawmill level, s_blade1..4 (s_blade is the copper one).
for _l in BLADES:
    PROPS[f's_blade{_l}'] = (lambda l=_l: blade(l), 90, 90, 0.5)
for _n in (1, 2, 3):
    PROPS[f's_planks{_n}'] = (lambda n=_n: plank_stack(n), 160, 110)
