"""forge2: the Smithy: an oak porch, copper ridge, chimney and weathervane, and royal bellows sealed with Royal Jelly."""
from buildings._forge import build

CAMERA = dict(ppu=90, anchor=(-0.15, 0, 1.35))


def build_building(root):
    return build(root, 2)
