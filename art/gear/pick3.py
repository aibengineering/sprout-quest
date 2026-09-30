"""pick3: recipe-faithful gathering tool, keeping the established grip and strike point."""
import math
from gear._gathering_tools import build as build_tool

CAMERA = dict(ppu=520, anchor=(0, 0, .39), elevation=math.radians(8))


def build_item(root):
    return build_tool('pick3', root)['parts']


def build(parent=None):
    """Owned gathering-frame renderer metadata; the shared icon/assembly hook uses build_item."""
    return build_tool('pick3', parent)
