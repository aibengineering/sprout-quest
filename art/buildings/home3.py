"""home3: the Manor. Obsidian steps, charcoal Emberwood beams, pale glowing Glimmerwood planking and roof, and crystal
windows with a crystal spire on the tower."""
from buildings._home import manor

CAMERA = dict(ppu=76, anchor=(0.1, 0, 2.2))


def build_building(root):
    return manor(root)
