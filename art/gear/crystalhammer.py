"""Crystal 6 + Iron 3: twin crystal striking blocks in an iron yoke."""
from lib import box, toon
from gear._crystal_glimmer_detail import IRON, IRON_LIGHT, facet, rod

PARTS = ('iron-shaft', 'crystal-lower', 'crystal-upper', 'iron-yoke')


def build_parts(root):
    shaft = [rod(root, -.17, 1.07, .039, IRON), rod(root, -.20, -.15, .05, IRON_LIGHT)]
    for x in (-.10, -.025, .05):
        shaft.append(rod(root, x, x + .03, .047, IRON_LIGHT))
    # Head center is 1.00, as expected by hammerHead(); no wood in this recipe.
    lower = facet([(.82, -.055), (1.18, -.055), (1.17, -.25), (1.10, -.31), (.87, -.31), (.81, -.25)], root, depth=.22)
    upper = facet([(.82, .055), (.81, .25), (.87, .31), (1.10, .31), (1.17, .25), (1.18, .055)], root, depth=.22)
    yoke = [box((1.0, 0, 0), (.40, .265, .11), toon(IRON), root, bevel=.015, line=.014)]
    for z in (-.18, .18):
        yoke.append(box((1.0, -.122, z), (.06, .03, .29), toon(IRON_LIGHT), root, bevel=.006, line=.008))
    return dict(zip(PARTS, (shaft, lower, upper, yoke)))


def build_weapon(root):
    return build_parts(root)


CAMERA = dict(ppu=320, anchor=(0.49, 0, 0), elevation=0.15707963267948966)
LENGTH = 1.5
