"""2 Embers warm an orange tonic; gentle bright swirls retain their source colour."""
from lib import sphere, toon, torus
from gear._consumable_shapes import EMBER, bottle, icon, liquid, part


def build_item(root):
    parts = {}
    part(parts, 'bottle', root, lambda: bottle(root, EMBER, tall=True))
    part(parts, 'ember-infusion', root, lambda: liquid(root, '#f18b50', tall=True))
    def warmth():
        for z,rad,angle in ((-.18,.305,-.18),(.02,.308,.18),(.19,.22,-.15)):
            torus((0,0,z), rad, .017, toon('#ffd27c', emit=.05), root, rot=(angle,0,0), line=0, name='warm_swirl')
        for x,y,z in ((-.10,-.27,-.11),(.12,-.265,.045),(.08,-.18,.23)):
            sphere((x,y,z), (.028,.017,.043), toon('#ffe29c', emit=.08), root, line=0, name='ember_glow')
    part(parts, 'warm-swirl', root, warmth)
    return parts


def build_icon():
    return icon(build_item)


CAMERA = dict(ppu=440, anchor=(0, 0, .03), elevation=0.41887902047863906)

