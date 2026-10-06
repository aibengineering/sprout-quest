"""Crystal 5 + Iron 3 + Glimmerwood 2: crystal edge, iron cradle, Glimmerwood grip."""
from lib import box, cylinder, toon
from gear._crystal_glimmer_detail import IRON, IRON_LIGHT, X, facet, rod

PARTS = ('glimwood-grip', 'iron-cradle', 'crystal-edge')


def build_parts(root):
    grip = [rod(root, -.17, .12, .044, '#e4e0f0')]
    # Pale Glimmerwood end grain and two softly glowing lilac/cyan grain stripes, visible at icon size.
    grip.append(cylinder((-.17, 0, 0), .044, .008, toon('#f6f2ff', emit=.2), root, rot=X, seg=10, line=0))
    grip.append(box((-.025, -.041, .012), (.20, .007, .012), toon('#b8a0ff', emit=.45), root, bevel=0, line=0))
    grip.append(box((-.04, -.041, -.012), (.16, .007, .01), toon('#9ae6ff', emit=.45), root, bevel=0, line=0))
    iron = [box((.105, 0, 0), (.075, .10, .36), toon(IRON), root, bevel=.014, line=.014),
            rod(root, -.20, -.15, .053, IRON_LIGHT), rod(root, .04, .075, .05, IRON_LIGHT),
            box((.28, 0, 0), (.32, .067, .09), toon(IRON), root, bevel=.012, line=.012)]
    # Existing sword tip remains exactly 1.10 along +X for the combat rig.
    edge = facet([(.16, -.114), (.75, -.124), (1.1, 0), (.75, .124), (.16, .114)], root)
    return dict(zip(PARTS, (grip, iron, edge)))


def build_weapon(root):
    return build_parts(root)


# Assembly camera after the standard diagonal weapon presentation (root Y=-pi/4,
# scale=(1,1.25,1.25)), so the reveal matches the tilted inventory icon.
LENGTH = 1.55
