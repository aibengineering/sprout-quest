"""Echo Cavern props, packed separately so changing the quest preserves the world atlas."""
import math
from lib import box, cone, empty, sphere, toon, torus


def core():
    root = empty('echo_core')
    torus((0, 0, .4), .33, .10, toon('#848caa'), root, rot=(math.pi / 2, 0, 0))
    sphere((0, -.04, .4), .26, toon('#b8a0ff', emit=.6), root)
    sphere((-.09, -.25, .48), .065, toon('#f3eaff', emit=1), root, line=0)
    return root


def mouth():
    root = empty('cave_mouth')
    stone = toon('#716d85', '#393a50')
    # A dark opening under a rough arch. Its centre remains an open walking shaft.
    box((0, .35, 1), (2.4, .1, 2.1), toon('#090b18'), root, bevel=.45)
    for side in (-1, 1):
        for i in range(3):
            sphere((side * 1.15, 0, .3 + i * .6), (.45, .5, .43), stone, root, seg=12)
    for i in range(5):
        sphere(((i - 2) * .49, .05, 1.95 + .12 * math.cos(i)), (.39, .5, .38), stone, root, seg=12)
    for x in (-.75, -.2, .45):
        cone((x, -.15, 1.78), .11, .38, stone, root, rot=(math.pi, 0, 0))
    for side in (-1, 1):
        box((side * 1.18, -.5, .85), (.10, .10, .5), toon('#6c4b3c'), root, bevel=.02)
        sphere((side * 1.18, -.5, 1.15), (.13, .12, .24), toon('#ffb75a', emit=1), root, line=0)
        sphere((side * 1.18, -.58, 1.17), (.07, .07, .16), toon('#fff1b8', emit=1), root, line=0)
    return root


def gate(side=False):
    root = empty('stone_lattice')
    stone = toon('#55516c', '#343449')
    for x in (-.7, .7):
        box((x, 0, .6), (.22, .38, 1.2), stone, root, bevel=.08)
    for x in (-.42, -.14, .14, .42):
        box((x, 0, .58), (.085, .12, 1.1), toon('#8b819c'), root, bevel=.02)
    for z in (.28, .9):
        box((0, 0, z), (1.5, .16, .10), stone, root, bevel=.02)
    if side:
        root.rotation_euler.z = math.pi / 2
    return root


PROPS = {
    'prop_echo_core': (core, 100, 100),
    'prop_cavemouth': (mouth, 240, 240),
    'prop_echo_gate': (gate, 140, 160),
    'prop_echo_gate_side': (lambda: gate(True), 140, 160),
}
