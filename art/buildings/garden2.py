"""garden2: the Berry Garden. Six more plots edged in planks, stone gateposts and stepping stones, and a basket of Shroom Caps."""
from buildings._garden import build

CAMERA = dict(ppu=80, anchor=(0, 0, 0.35))


def build_building(root):
    return build(root, 2)
