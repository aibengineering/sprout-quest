"""forge4: the Crystal Kiln: a crystal-brick kiln, glowing Glimmer Jelly glaze and an Echo Wing weathervane."""
from buildings._forge import build

CAMERA = dict(ppu=72, anchor=(0.4, 0, 1.4))


def build_building(root):
    return build(root, 4)
