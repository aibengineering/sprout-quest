"""Crystal 5 + Iron 3 + Pine Wood 2: crystal edge, iron cradle, pine grip."""
from lib import box, cylinder, toon
from gear._crystal_glimmer_detail import IRON, IRON_LIGHT, X, facet, rod

PARTS = ('pine-grip', 'iron-cradle', 'crystal-edge')


def build_parts(root):
    pine = [rod(root, -.17, .12, .044, '#b98a5a')]
    # Pine end grain and one broad grain stripe remain visible at icon size.
    pine.append(cylinder((-.17, 0, 0), .044, .008, toon('#dfbf86'), root, rot=X, seg=10, line=0))
    pine.append(box((-.025, -.041, 0), (.20, .007, .014), toon('#7a5238'), root, bevel=0, line=0))
    iron = [box((.105, 0, 0), (.075, .10, .36), toon(IRON), root, bevel=.014, line=.014),
            rod(root, -.20, -.15, .053, IRON_LIGHT), rod(root, .04, .075, .05, IRON_LIGHT),
            box((.28, 0, 0), (.32, .067, .09), toon(IRON), root, bevel=.012, line=.012)]
    # Existing sword tip remains exactly 1.10 along +X for the combat rig.
    edge = facet([(.16, -.114), (.75, -.124), (1.1, 0), (.75, .124), (.16, .114)], root)
    return dict(zip(PARTS, (pine, iron, edge)))


def build_weapon(root):
    return build_parts(root)


# Assembly camera after the standard diagonal weapon presentation (root Y=-pi/4,
# scale=(1,1.25,1.25)), so the reveal matches the tilted inventory icon.
CAMERA = dict(ppu=440, anchor=(0.295, 0, 0.295), elevation=0.15707963267948966)
LENGTH = 1.55
