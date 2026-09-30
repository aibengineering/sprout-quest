"""forge5: the Master Forge: Obsidian steps, crucible and anvil face, Glimmerwood gable boards and banner, and the King Crystal on the ridge."""
from buildings._forge import build

CAMERA = dict(ppu=72, anchor=(0.4, 0, 1.4))


def build_building(root):
    return build(root, 5)
