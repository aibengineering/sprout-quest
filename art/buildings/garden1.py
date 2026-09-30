"""garden1: the Sprout Patch. An oak picket fence and front edge, the first two beds, and clover in the grass."""
from buildings._garden import build

CAMERA = dict(ppu=118, anchor=(0, 1.3, 0.35))


def build_building(root):
    return build(root, 1)
