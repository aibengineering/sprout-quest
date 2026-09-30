"""home2: the Cottage. Stone footing, an oak frame filled with wattle walls, a green shingle roof, a stone chimney and
a Lucky Clover over the door."""
from buildings._home import cottage

CAMERA = dict(ppu=92, anchor=(0, 0, 1.45))


def build_building(root):
    return cottage(root)
