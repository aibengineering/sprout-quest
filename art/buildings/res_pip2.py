"""res_pip2: pip's native residential building."""
from buildings._residence import build


def build_building(root):
    return build(root, 'pip', 2)
