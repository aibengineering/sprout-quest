"""garden3: the Bloom Garden. Eight more plots edged in glowing Glimmerwood, Ember lanterns, and flowers along the back fence."""
from buildings._garden import build

CAMERA = dict(ppu=80, anchor=(0, 0, 0.45))


def build_building(root):
    return build(root, 3)
