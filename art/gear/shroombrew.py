"""2 Shroom Caps steep into a rose-red brew with recognisable spotted cap slices."""
from lib import cylinder, sphere, toon
from gear._consumable_shapes import CAP, bottle, icon, liquid, mushroom, part


def build_item(root):
    parts = {}
    part(parts, 'bottle', root, lambda: bottle(root, CAP, tall=True))
    part(parts, 'cap-infusion', root, lambda: liquid(root, '#df818a', tall=True))
    def caps():
        mushroom(root, -.14, -.24, -.10, .105)
        mushroom(root, .11, -.21, .10, .10)
        cylinder((0,0,.535), .116, .025, toon(CAP), root, seg=24, line=.008, name='cap_surface')
        for x,y in ((-.055,-.04),(.048,.015)):
            sphere((x,y,.554), (.02,.02,.008), toon('#fff2df'), root, line=0)
    part(parts, 'spotted-caps', root, caps)
    return parts


def build_icon():
    return icon(build_item)


CAMERA = dict(ppu=440, anchor=(0, 0, .03), elevation=0.41887902047863906)

