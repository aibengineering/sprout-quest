"""warp1: the Waystone. Pine posts round its old plinth, iron bands binding its crystal, and the Alpha Pelt."""
from buildings._warp import build

CAMERA = dict(ppu=150, anchor=(0, 0, 1.2))


def build_building(root):
    return build(root, 1)
