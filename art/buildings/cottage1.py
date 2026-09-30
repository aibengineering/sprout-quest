"""cottage1: the Guest Cottage. A stone footing, pine frame, oak plank walls, a pine roof, copper touches and flowers."""
from buildings._cottage import build

CAMERA = dict(ppu=128, anchor=(0.1, 0, 1.35))


def build_building(root):
    return build(root, 1)
