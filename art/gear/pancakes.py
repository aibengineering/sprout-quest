"""5 Bunny Fluff become airy pancakes; 3 Slime Goo become glossy green syrup."""
from lib import cylinder, lathe, sphere, toon
from gear._consumable_shapes import GOO, icon, part, plate


def build_item(root):
    parts = {}
    part(parts, 'plate', root, lambda: plate(root))
    for key,z in (('lower-pancake',-.23),('middle-pancake',-.075),('upper-pancake',.08)):
        def pancake(z=z):
            lathe([(0,z-.075),(.30,z-.075),(.365,z-.04),(.375,z),(.365,z+.04),(.30,z+.067),(0,z+.067)], toon('#f2d19d'), root, seg=40, line=.012, name='airy_fluff')
            cylinder((0,0,z+.055), .325, .012, toon('#dfa26f', rim=.15), root, seg=40, line=0, name='seared_top')
            for x,y in ((-.23,-.28),(-.1,-.355),(.11,-.35),(.25,-.24)):
                sphere((x,y,z), (.010,.004,.007), toon('#dfb781', rim=0), root, line=0, name='fluff_crumb')
        part(parts, key, root, pancake)
    def syrup():
        cylinder((0,0,.175), .31, .025, toon(GOO, rim=.35), root, seg=40, line=.008, name='goo_syrup')
        for x,y,z in ((-.10,-.36,.095),(.24,-.29,.06),(-.31,-.21,.07)):
            sphere((x,y,z), (.025,.025,.105), toon(GOO, rim=.3), root, line=.007, name='goo_drip')
        sphere((-.08,-.16,.196), (.09,.04,.008), toon('#e8ffd8', rim=0), root, line=0)
    part(parts, 'goo-syrup', root, syrup)
    return parts


def build_icon():
    return icon(build_item)


CAMERA = dict(ppu=385, anchor=(0, 0, -.015), elevation=0.41887902047863906)

