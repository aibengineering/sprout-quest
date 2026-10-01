"""Dragon Mail: four worked dragon-scale panels, iron, ember seams and crystal.

No gold, Imp Horn or wing membranes: none occur in the recipe. The dragon outline
comes from scalloped scale shoulders and a scale crown, leaving the carried rig clear.
"""
import math

from lib import box, crystal, empty, profile, sphere, toon, torus

PARTS = ('iron-shell', 'back-scales', 'front-scales', 'left-mantle', 'right-mantle', 'ember-seams', 'crystal-clasps')
HELMET = True
CAMERA = dict(ppu=370, anchor=(0, 0, .635), elevation=math.radians(12))


def build_armor(P):
    return build(P['body'], {side: P['arm' + str(side)] for side in (-1, 1)}, P['head'])


def build(body, arms=None, head=None):
    arms = arms or {side: empty('dragon_arm' + str(side), body, (side * .29, 0, .37)) for side in (-1, 1)}
    head = head or empty('dragon_head', body, (0, 0, .8))
    parts = {name: [] for name in PARTS}
    iron = toon('#778394', rim=.16)
    dark = toon('#414453', rim=.08)
    scale = toon('#c54c50', rim=.15)
    shade = toon('#953d4b', rim=.12)
    edge = toon('#e57568', rim=.12)
    ember = toon('#ffa35a', rim=.08, emit=.12)
    gem = toon('#a8e9f2', rim=.25, emit=.025)
    shell = parts['iron-shell']
    shell.append(sphere((0, 0, .33), (.276, .215, .246), dark, body, seg=20, line=.016, name='dragon_iron_lining'))
    shell.append(torus((0, 0, .18), .241, .023, iron, body, seg=20, line=.009, name='dragon_iron_hem'))
    # A light open crown leaves the face readable; scale offcuts finish its ridges.
    shell.append(sphere((0, .055, .17), (.39, .325, .24), iron, head, seg=24, line=.014, name='dragon_iron_crown'))
    shell.append(box((0, -.293, .16), (.44, .037, .043), iron, head, bevel=.015, line=.01, name='dragon_iron_brow'))

    def tile(key, parent, loc, width, height, mat, rot=(0, 0, 0)):
        pts = [(-width / 2, height * .35), (0, height * .5), (width / 2, height * .35),
               (width * .45, -height * .14), (width * .24, -height * .37), (0, -height / 2),
               (-width * .24, -height * .37), (-width * .45, -height * .14)]
        obj = profile(pts, .04, mat, parent, loc=loc, rot=rot, bevel=.012, line=.009, name='dragon_worked_scale')
        parts[key].append(obj)

    for key, direction in (('front-scales', -1), ('back-scales', 1)):
        # One large scale is split into overlapping articulated rows at the workbench.
        for row in range(3):
            z = .22 + row * .107
            for side in (-1, 1):
                tile(key, body, (.103 * side, direction * (.238 + .008 * (2 - row)), z), .211, .155,
                     scale if row % 2 == 0 else shade, rot=(0, -.075 * side, 0))
        # Upper scale offcuts cover the crown front/back and form a low dragon crest.
        for x in (-.22, 0, .22):
            tile(key, head, (x, direction * .314, .255 + (.04 if x == 0 else 0)), .215, .235, scale,
                 rot=(0, -.25 * x, 0))
        # Folded scale offcuts cover the crown's sides as well, so the helmet reads
        # as dragon scale from the front, side and back, with only a slim iron rim.
        side = direction
        tile(key, head, (side * .355, .025, .235), .225, .23, shade,
             rot=(0, 0, side * math.pi / 2))
    for side in (-1, 1):
        arm = arms[side]
        shell.append(sphere((.02 * side, 0, -.04), (.095, .09, .103), iron, arm, seg=16, line=.011, name='dragon_iron_sleeve'))
        key = 'left-mantle' if side == -1 else 'right-mantle'
        parts[key].append(sphere((.026 * side, .02, .09), (.145, .125, .087), shade, arm, seg=16, line=.012, name='dragon_scale_shoulder'))
        for i in range(3):
            tile(key, arm, ((.055 + .044 * i) * side, -.095, .115 - .033 * i), .135, .165, scale if i != 1 else edge,
                 rot=(0, -.26 * side, 0))
        # Warm seams stay narrow so they never turn the entire armor into a glowing blob.
        for z in (.274, .381):
            parts['ember-seams'].append(box((.104 * side, -.282, z), (.174, .015, .012), ember, body,
                                           bevel=.004, line=0, name='dragon_ember_seam'))
        parts['ember-seams'].append(box((.064 * side, -.127, .1), (.102, .012, .014), ember, arm,
                                       bevel=.004, line=0, name='dragon_shoulder_ember'))
        for z in (.212, .462):
            parts['crystal-clasps'].append(crystal((.173 * side, -.29, z), .048, .08, gem, body,
                                                 rot=(math.pi / 2, 0, 0), sides=5, line=.01, name='dragon_crystal_clasp'))
        parts['crystal-clasps'].append(crystal((.147 * side, -.335, .17), .05, .085, gem, head,
                                             rot=(math.pi / 2, 0, 0), sides=5, line=.01, name='dragon_crown_crystal'))
    return parts
