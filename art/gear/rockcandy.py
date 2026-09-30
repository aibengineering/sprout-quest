"""Pip's Rock Candy: 4 Stone become a pile of sugary pebble candies; 2 Copper become amber crystals on two sticks.

The plate is reusable cookware. The sticks are only the candy's handles, not an ingredient.
"""
import math
from lib import crystal, cylinder, sphere, toon
from gear._consumable_shapes import icon, part, plate

ICON_ID = 'meal_rockcandy'
PEBBLES = ('#c9c3d8', '#f2c4d6', '#c4dcef', '#e9e2d0')


def _pebbles(root, spots):
    for i, (x, y, z, s, turn) in enumerate(spots):
        sphere((x, y, z), (s, s * .85, s * .62), toon(PEBBLES[i % len(PEBBLES)], rim=.3), root,
               rot=(0, 0, turn), line=.009, name='stone_candy')
        # Sugar glints, catching the light.
        sphere((x - s * .35, y - s * .5, z + s * .38), (s * .22, s * .1, s * .12), toon('#ffffff', rim=0), root,
               line=0, name='sugar_glint')


def _stick(root, x, y, lean, turn):
    """A little wooden stick, crusted with amber copper crystals over its top half."""
    dx, dz = math.sin(lean) * math.cos(turn), math.cos(lean)
    dy = math.sin(lean) * math.sin(turn)
    base = (x, y, -.3)
    cylinder((x + dx * .26, y + dy * .26, base[2] + dz * .26), .018, .56, toon('#e8c890'), root,
             rot=(0, lean, turn), seg=8, line=.006, name='candy_stick')
    # A chunky cluster: crystals spiralling up the stick, each pointing out and a little up.
    for k in range(14):
        t = .3 + k * .02
        a = k * 2.4
        cx, cy, cz = x + dx * t + math.cos(a) * .02, y + dy * t + math.sin(a) * .02, base[2] + dz * t
        crystal((cx, cy, cz), .042, .12, toon('#ffa24e' if k % 3 else '#ffcf8a', rim=.35, emit=.05), root,
                rot=(0, 1.15, a), line=.008, name='copper_crystal')
    crystal((x + dx * .6, y + dy * .6, base[2] + dz * .6), .045, .13, toon('#ffb468', rim=.35, emit=.05), root,
            rot=(0, lean, turn), line=.008, name='copper_crystal')


def build_item(root):
    parts = {}
    part(parts, 'plate', root, lambda: plate(root))
    part(parts, 'pebbles-back', root, lambda: _pebbles(root, (
        (-.2, .12, -.27, .12, .3), (.02, .18, -.27, .13, 1.4), (.23, .1, -.27, .115, 2.2), (-.06, .06, -.16, .115, .8), (.14, .04, -.17, .1, 2.8))))
    part(parts, 'pebbles-front', root, lambda: _pebbles(root, (
        (-.28, -.14, -.28, .1, 1.1), (-.08, -.2, -.28, .11, 2.4), (.13, -.19, -.28, .105, .2), (.31, -.1, -.28, .095, 1.9), (.02, -.06, -.19, .1, 3.0))))
    part(parts, 'copper-sticks', root, lambda: (_stick(root, -.1, .02, .45, 2.6), _stick(root, .12, .0, .4, .5)))
    return parts


def build_icon():
    return icon(build_item)


CAMERA = dict(ppu=385, anchor=(0, 0, -.015), elevation=0.41887902047863906)

# Keep this recipe’s on-demand assembly set inside its mobile byte budget.
WEBP_QUALITY = 92
