"""garden3: the Bloom Garden. Two glowing Glimmerwood beds, Ember lanterns, and flowers along the back fence."""
from buildings._garden import build

CAMERA = dict(ppu=118, anchor=(0, 1.3, 0.45))


def build_building(root):
    return build(root, 3)
