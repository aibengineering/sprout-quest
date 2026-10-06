"""Stone blade held in a split oak hilt; exactly Stone + Oak Logs."""
from lib import box, profile, toon
from ._stone_jelly import component, oak, OAK, OAK_DARK

LENGTH = 1.3
PARTS = ('oak-hilt', 'stone-blade', 'oak-splints')


def build_weapon(root):
    parts = {}
    component(parts, 'oak-hilt', lambda: oak(root, .34, .049))

    def blade():
        # A knapped slab: chipped edges, broad rock facets, no polished steel stripe.
        profile([(.14, -.12), (.36, -.13), (.42, -.105), (.65, -.125),
                 (.75, -.095), (.84, -.10), (1.0, .005), (.84, .12),
                 (.7, .10), (.62, .135), (.39, .12), (.33, .10), (.14, .12)],
                .085, toon('#aab0bf', rim=.15), root, bevel=.009, line=.015)
        profile([(.25, -.018), (.43, -.064), (.75, -.04), (.9, .008),
                 (.65, .052), (.39, .061)], .008, toon('#d5d8df', rim=.08),
                root, loc=(0, -.048, 0), bevel=0, line=0)
        profile([(.42, -.11), (.66, -.095), (.7, -.071), (.53, -.057)],
                .009, toon('#7f8698', rim=.1), root, loc=(0, -.049, 0), bevel=0, line=0)
    component(parts, 'stone-blade', blade)

    def splints():
        for z in (-.091, .091):
            box((.195, -.063, z), (.21, .035, .044), toon(OAK), root,
                rot=(0, -.09 if z < 0 else .09, 0), bevel=.012, line=.009)
        box((.075, 0, 0), (.085, .115, .31), toon(OAK_DARK), root, bevel=.023, line=.012)
    component(parts, 'oak-splints', splints)
    return parts
