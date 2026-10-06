"""sawmill4: the Obsidian Sawmill. Glimmerwood trim and sign, Emberwood logs, and an obsidian blade."""
from buildings._sawmill import build

CAMERA = dict(ppu=80, anchor=(0.3, 0, 1.3))


def build_building(root):
    return build(root, 4)
