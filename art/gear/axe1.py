"""axe1: recipe-faithful gathering tool, keeping the established grip and strike point."""
from gear._gathering_tools import build as build_tool


def build_item(root):
    return build_tool('axe1', root)['parts']


def build(parent=None):
    """Owned gathering-frame renderer metadata; the shared icon/assembly hook uses build_item."""
    return build_tool('axe1', parent)
