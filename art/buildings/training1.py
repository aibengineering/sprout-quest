"""training1: the Straw Dummy. An oak post and arms, stuffed with Bunny Fluff."""
from buildings._training import build

CAMERA = dict(ppu=160, anchor=(0, 0, 0.55))


def build_building(root):
    return build(root, 1)
