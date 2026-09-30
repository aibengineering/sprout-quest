"""training2: the Training Yard. A fang-studded sparring post, copper practice blades and a Royal Jelly target."""
from buildings._training import build

CAMERA = dict(ppu=152, anchor=(0, 0, 0.55))


def build_building(root):
    return build(root, 2)
