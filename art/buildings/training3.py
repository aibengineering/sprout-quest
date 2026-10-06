"""training3: the Dojo. A pine-plank deck and gate, an iron gong and Imp Horns on the gate."""
from buildings._training import build

CAMERA = dict(ppu=122, anchor=(0, 0.2, 1.0))


def build_building(root):
    return build(root, 3)
