"""sawmill1: the Sawmill. A stone floor, a pine shed and roof and a copper blade, by the logs on the site."""
from buildings._sawmill import build

CAMERA = dict(ppu=86, anchor=(0, 0, 1.3))


def build_building(root):
    return build(root, 1)
