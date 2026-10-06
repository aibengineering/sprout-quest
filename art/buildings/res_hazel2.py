"""res_hazel2: hazel's native residential building."""
from buildings._residence import build


def build_building(root):
    return build(root, 'hazel', 2)
