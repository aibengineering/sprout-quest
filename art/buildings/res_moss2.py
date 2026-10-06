"""res_moss2: moss's native residential building."""
from buildings._residence import build


def build_building(root):
    return build(root, 'moss', 2)
