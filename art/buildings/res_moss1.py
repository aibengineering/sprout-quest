"""res_moss1: moss's native residential building."""
from buildings._residence import build


def build_building(root):
    return build(root, 'moss', 1)
