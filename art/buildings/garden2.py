"""garden2: the Berry Garden. Two plank beds, a stone gateway and stepping stones, and a basket of Shroom Caps."""
from buildings._garden import build

CAMERA = dict(ppu=118, anchor=(0, 1.3, 0.35))


def build_building(root):
    return build(root, 2)
