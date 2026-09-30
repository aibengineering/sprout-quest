"""sawmill2: the Iron Sawmill. A stone log ramp, a pine store under its own roof, and an iron blade."""
from buildings._sawmill import build

CAMERA = dict(ppu=80, anchor=(0.3, 0, 1.3))


def build_building(root):
    return build(root, 2)
