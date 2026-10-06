"""garden1: the Sprout Patch. An oak picket fence round a field, its first six plots tilled, and clover where the rest will go."""
from buildings._garden import build

CAMERA = dict(ppu=80, anchor=(0, 0, 0.35))


def build_building(root):
    return build(root, 1)
