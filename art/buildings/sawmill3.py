"""sawmill3: the Crystal Sawmill. A pine-plank deck, glowing Glimmerwood logs, and a crystal blade and lamp."""
from buildings._sawmill import build

CAMERA = dict(ppu=80, anchor=(0.3, 0, 1.3))


def build_building(root):
    return build(root, 3)
