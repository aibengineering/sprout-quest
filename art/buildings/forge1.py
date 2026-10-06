"""forge1: the repaired Forge: stone walls and chimney, an oak roof and door, and a hearth sealed with Slime Goo."""
from buildings._forge import build

CAMERA = dict(ppu=94, anchor=(0, 0, 1.35))


def build_building(root):
    return build(root, 1)
