"""forge3: the Iron Smithy: a stack of pine fuel and a quench barrel, iron bands, and Golem Cores glowing by the hearth."""
from buildings._forge import build

CAMERA = dict(ppu=84, anchor=(-0.3, 0, 1.35))


def build_building(root):
    return build(root, 3)
