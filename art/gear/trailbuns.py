"""Moss's golden bread rolls, split to show berry jam inside."""
from lib import sphere, toon
from gear._consumable_shapes import icon, part, plate, steam


def build_item(root):
    parts = {}
    part(parts, 'plate', root, lambda: plate(root))
    spots = [(-.23,-.10),(.23,-.10),(0,.21)]
    def bread():
        for x,y in spots:
            sphere((x,y,-.22), (.22,.17,.12), toon('#d79752'), root, line=.014)
            sphere((x,y,-.095), (.22,.17,.095), toon('#ecc47e'), root, line=.010)
            for dx in (-.075,.025):
                sphere((x+dx,y,-.003), (.015,.10,.008), toon('#ac7846'), root, line=.003)
    part(parts, 'fluff-bread', root, bread)
    def berries():
        for x,y in spots:
            sphere((x,y-.125,-.15), (.17,.05,.045), toon('#b44666'), root, line=.006)
            sphere((x+.045,y-.16,-.135), .025, toon('#e897a1'), root, line=.003)
    part(parts, 'berry-filling', root, berries)
    part(parts, 'steam', root, lambda: steam(root, .06, .11))
    return parts


def build_icon():
    return icon(build_item)
