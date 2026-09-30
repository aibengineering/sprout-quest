"""Recipe-led geometry for all six gathering tools, sharing their established grip and contact points.

No economy changes. The stone tier repairs Oswin's existing tool: only its goo
joint and wool binding are new. All other components are made from their recipe.
Builders return separate meshes for registered assembly layers, and the complete
root can be used by the gathering sprite renderer without a second model.
"""
import math
from lib import box, cylinder, empty, profile, sphere, toon, torus
from gather import HANDLE, HEAD_SCALE, _curve

IDS = ('axe1', 'axe2', 'pick1', 'pick2', 'pick3', 'pick4')


def build(item_id, parent=None):
    if item_id not in IDS:
        raise ValueError('Unknown gathering tool: ' + item_id)
    axe = item_id.startswith('axe')
    tier = int(item_id[-1])
    root = empty(item_id, parent)
    parts = {}

    def add(key, obj):
        parts.setdefault(key, []).append(obj)
        return obj

    # The origin is the gathering grip, not the center of the model. Leave the
    # head at the existing 0.7-unit height so its blade/point still hits the node.
    if tier == 1:
        add('existing-tool', cylinder((0, 0, HANDLE / 2 - .02), .042, HANDLE + .06,
                                      toon('#947252'), root, seg=12, line=.014))
        # Old wood grain and a worn stone head remain visible after the repair.
        for x, z in ((-.018, .29), (.019, .45)):
            add('existing-tool', box((x, -.042, z), (.005, .006, .15),
                                     toon('#6b503e'), root, bevel=.002, line=0))
        shaft_key = 'existing-tool'
    elif tier == 2:
        shaft_key = 'bark-haft'
        add(shaft_key, cylinder((0, 0, HANDLE / 2 - .02), .048, HANDLE + .06,
                               toon('#9a6a44'), root, seg=10, line=.014))
        # The actual oak bark material stays as deep irregular ridges: no
        # unlisted leather grip, decoration, or adhesive.
        for x, z, length in ((-.031, .24, .26), (.006, .31, .30), (.033, .40, .23)):
            add(shaft_key, box((x, -.042, z), (.009, .013, length),
                               toon('#68462f'), root, bevel=.003, line=0))
        for z in (.05, .13, .21):
            add(shaft_key, torus((0, 0, z), .048, .006, toon('#c19a62'), root, seg=12, line=0))
    elif tier == 3:
        shaft_key = 'pine-haft'
        add(shaft_key, cylinder((0, 0, HANDLE / 2 - .02), .046, HANDLE + .06,
                               toon('#a8703e'), root, seg=12, line=.014))
        for x in (-.023, .016):
            add(shaft_key, box((x, -.044, .33), (.005, .006, .48),
                               toon('#f0dca0'), root, bevel=.002, line=0))
        # An oval pine knot, not an added gem or monster-drop flourish.
        knot = add(shaft_key, torus((.006, -.047, .29), .018, .004,
                                   toon('#684525'), root, seg=12, line=0, rot=(math.pi / 2, 0, 0)))
        knot.scale = (.65, 1.5, 1)
    else:
        shaft_key = 'iron-haft'
        add(shaft_key, cylinder((0, 0, HANDLE / 2 - .02), .041, HANDLE + .06,
                               toon('#9aa7bc', rim=.35), root, seg=8, line=.014))
        # Forged iron grip knurling: the crystal recipe contains no wood.
        for z in (.035, .08, .125, .17):
            add(shaft_key, torus((0, 0, z), .043, .008, toon('#596579'), root, seg=12, line=.002))
        add(shaft_key, cylinder((0, 0, -.03), .051, .035,
                               toon('#d6dde8'), root, seg=8, line=.008))

    head = empty('head', root, loc=(0, 0, HANDLE))
    head.scale = (HEAD_SCALE['axe' if axe else 'pick'],) * 3
    color = {1: '#a8a8b4', 2: '#f0a060', 3: '#d6dde8', 4: '#9ae6ff'}[tier]
    dark = {1: '#7c7c8a', 2: '#b86432', 3: '#8390a4', 4: '#5ab0e0'}[tier]
    head_key = 'existing-tool' if tier == 1 else 'crystal-head' if tier == 4 else 'copper-head' if tier == 2 else 'iron-head'
    if axe:
        points = [(.03, -.02), (.03, -.16), (-.12, -.22)]
        points += _curve((-.12, -.22), (-.27, -.1), (-.23, .13))
        points += [(-.1, .05), (.03, .05)]
        edge = [(-.12, -.2)] + _curve((-.12, -.2), (-.26, -.1), (-.22, .11)) + [(-.19, .09)]
        edge += _curve((-.19, .09), (-.22, -.08), (-.1, -.17))
    else:
        top = [(-.36, -.12)] + _curve((-.36, -.12), (-.18, .13), (0, .13))
        top += _curve((0, .13), (.17, .13), (.31, -.07))
        bottom = _curve((.31, -.07), (.15, -.01), (0, -.01))
        bottom += _curve((0, -.01), (-.17, -.01), (-.36, -.12))
        points = top + bottom[:-1]
    add(head_key, profile(points, .055, toon(color, rim=.4, emit=.10 if tier == 4 else 0),
                          head, bevel=.005 if tier == 4 else .01, line=.014))
    if axe:
        add(head_key, profile(edge, .060, toon('#c8c8d2' if tier == 1 else '#ffe0b8', rim=.2),
                              head, bevel=0, line=0))
    elif tier == 4:
        # Three large front facets keep the whole working head crystalline at
        # phone size, rather than placing a token gem on a generic metal pick.
        for pts, shade in (([(-.35, -.115), (-.16, .069), (-.07, -.013)], '#dffaff'),
                           ([(.015, .128), (.16, .095), (.29, -.057), (.10, .02)], '#5ab0e0'),
                           ([(-.18, .071), (0, .128), (-.07, -.013)], '#7ecdf0')):
            add(head_key, profile(pts, .004, toon(shade, emit=.10), head,
                                  loc=(0, -.03, 0), bevel=0, line=0))
    else:
        # Worn stone grain or broad forged bevel, still the same head material.
        add(head_key, profile([(-.30, -.08), (-.17, .035), (-.045, .071), (-.15, -.025)],
                              .004, toon('#7c7c8a' if tier == 1 else '#ffe0b8' if tier == 2 else '#edf5ff'),
                              head, loc=(0, -.030, 0), bevel=0, line=0))

    if tier == 1:
        # Glue seats the inherited head; wool winds into a grip and two broad
        # protective bands. They are distinct registered ingredient destinations.
        add('goo-joint', box((.014, -.002, -.049), (.12, .095, .16),
                             toon('#8cda9a', rim=.12), head, bevel=.025, line=.008))
        add('goo-joint', sphere((.051, -.046, -.09), (.024, .014, .029),
                                toon('#bdf4c8'), head, line=0))
        add('fluff-grip', cylinder((0, 0, .085), .054, .18, toon('#fff1e6'), root,
                                   seg=12, line=.011, bevel=.01))
        for z in (.03, .075, .12, .165):
            add('fluff-grip', torus((0, 0, z), .051, .010, toon('#fff9f7'), root, seg=14, line=.002))
        for z in (-.10, -.008):
            add('fluff-binding', torus((.009, 0, z), .057, .014,
                                      toon('#fff9f7'), head, seg=14, line=.005))
        # Frayed soft ends make the material readable, without a fluffy blade.
        for x, z in ((-.047, -.042), (-.043, -.061), (-.037, -.078)):
            add('fluff-binding', sphere((x, -.061, z), (.009, .007, .014),
                                        toon('#fff1e6'), head, line=.002))
    else:
        socket_key = 'iron-socket' if tier == 4 else head_key
        socket_color = '#8390a4' if tier == 4 else dark
        add(socket_key, box((.055 if axe else 0, 0, -.06 if axe else .035),
                            (.10 if axe else .115, .085, .135), toon(socket_color, rim=.3),
                            head, bevel=.015, line=.012))
        for z in (-.12, -.035):
            add(socket_key, torus((0, 0, z), .048, .010, toon(socket_color), head, seg=12, line=.003))
        add(socket_key, sphere((.055 if axe else 0, -.051, -.062 if axe else .035),
                               (.020, .008, .020), toon('#ffe0b8' if tier == 2 else '#edf5ff'), head, line=.003))

    if tier == 1:
        parts['fluff-wrap'] = parts.pop('fluff-grip') + parts.pop('fluff-binding')
    return {'root': root, 'parts': parts, 'existing': ['existing-tool'] if tier == 1 else [],
            'grip': (0, 0, 0), 'tip': (-.29, 0, .65) if axe else (-.40, 0, .57)}
