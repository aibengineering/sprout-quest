"""Monster models. Sizes match the game's collision radii (1 Blender unit = 25 arena units).

Each builder returns (parts, animate) where animate(parts, phase) poses an idle loop, phase ∈ [0, 1).
Passing gold=True swaps every color for a gold palette (eyes stay the same) for the rare golden variants.
"""
import math

from lib import box, cone, crystal, cylinder, empty, profile, sphere, srgb, toon

EYE = '#2a2233'
WHITE = '#ffffff'
_gold = False


def M(color, **kw):
    """Material helper that respects golden mode."""
    if _gold and color not in (EYE, WHITE, '#ff9aaa', '#6af0ff'):
        r, g, b = srgb(color)
        lum = 0.3 * r + 0.6 * g + 0.1 * b
        color = '#fff2a8' if lum > 0.6 else '#ffd84a' if lum > 0.15 else '#d8a020'
    return toon(color, **kw)


def surf(rx, ry, rz, x, dz, inset=0.97):
    """Y coordinate on the front (-Y) of an ellipsoid for a point (x, dz relative to its center)."""
    k = 1 - (x / rx) ** 2 - (dz / rz) ** 2
    return -ry * math.sqrt(max(0.0, k)) * inset


def face(parent, cx, cz, rx, ry, rz, gap, eye=0.06, blush=True, mouth=True, cy=0.0, pupil=EYE, smile=True):
    """Big shiny cute eyes + blush on the front of an ellipsoid."""
    for s in (-1, 1):
        x = gap * s
        y = cy + surf(rx, ry, rz, x, 0)
        sphere((x, y, cz), (eye * 0.7, eye * 0.45, eye), M(pupil, rim=0), parent, line=0)
        sphere((x - eye * 0.25, y - eye * 0.35, cz + eye * 0.35), eye * 0.3, M(WHITE, rim=0), parent, line=0)
        if blush:
            bx = gap * 1.7 * s
            sphere((bx, cy + surf(rx, ry, rz, bx, -eye * 1.4), cz - eye * 1.4), (eye * 0.8, eye * 0.3, eye * 0.45), M('#ff9aaa', rim=0), parent, line=0)
    if mouth:
        my = cy + surf(rx, ry, rz, 0, -eye * 1.6)
        sphere((0, my, cz - eye * 1.6), (eye * 0.45, eye * 0.2, eye * (0.25 if smile else 0.4)), M('#8a3a4a', rim=0), parent, line=0)


# ----------------------------------------------------------------------------- builders


def slime(magma=False, color=None, crystals=False):
    P = {}
    root = P['root'] = empty('slime')
    piv = P['piv'] = empty('piv', root)
    body = M(color or ('#ff7a3a' if magma else '#6fdc7a'))
    rx, ry, rz, cz = 0.6, 0.55, 0.46, 0.44
    sphere((0, 0, cz), (rx, ry, rz), body, piv, seg=32)
    sphere((-0.24, surf(rx, ry, rz, -0.24, 0.24) + 0.03, cz + 0.24), (0.12, 0.05, 0.08), M(WHITE, rim=0), piv, line=0, rot=(0.6, 0, 0.4))
    if magma:
        crust = M('#8a3a2a')
        glow = M('#ffd35a', emit=0.8)
        for x, dz, s in ((0.3, 0.2, 0.13), (-0.35, -0.05, 0.1), (0.1, 0.35, 0.09), (0.42, -0.12, 0.08)):
            sphere((x, surf(rx, ry, rz, x, dz), cz + dz), (s, 0.04, s * 0.8), crust, piv, line=0.01)
        for x, dz, s in ((0.3, 0.2, 0.06), (-0.35, -0.05, 0.045)):
            sphere((x, surf(rx, ry, rz, x, dz) - 0.03, cz + dz), (s, 0.03, s * 0.8), glow, piv, line=0)
    if crystals:
        # Glimmer slime: crystal shards poking out of its top.
        for x, dz, h, col in ((-0.15, 0.36, 0.3, '#e0d0ff'), (0.14, 0.4, 0.36, '#9ae6ff'), (0.34, 0.24, 0.24, '#e0d0ff')):
            crystal((x, 0.02, cz + dz), 0.07, h, M(col, rim=0.5), piv, rot=(0, x * 0.8, 0), sides=5)
    face(piv, 0, cz + 0.04, rx, ry, rz, 0.19, eye=0.1, cy=0)
    return P, _anim_slime


def _anim_slime(P, t):
    s = math.sin(t * math.tau)
    P['piv'].scale = (1 + 0.06 * s, 1 + 0.06 * s, 1 - 0.08 * s)


def bunny():
    P = {}
    root = P['root'] = empty('bunny')
    piv = P['piv'] = empty('piv', root)
    fur, inner = M('#fff6f0'), M('#ffb4c8')
    sphere((0, 0.08, 0.28), (0.32, 0.34, 0.28), fur, piv)
    sphere((0, 0.42, 0.3), 0.11, M(WHITE), piv)
    for s in (-1, 1):
        sphere((0.17 * s, -0.12, 0.05), (0.09, 0.14, 0.06), fur, piv)
    head = P['head'] = empty('head', piv, (0, -0.1, 0.58))
    sphere((0, 0, 0), (0.27, 0.25, 0.24), fur, head, seg=32)
    face(head, 0, 0.0, 0.27, 0.25, 0.24, 0.1, eye=0.055)
    sphere((0, surf(0.27, 0.25, 0.24, 0, -0.04) - 0.01, -0.04), (0.03, 0.02, 0.022), M('#ff8aa8', rim=0), head, line=0)
    for s in (-1, 1):
        ear = P[f'ear{s}'] = empty(f'ear{s}', head, (0.1 * s, 0.02, 0.17))
        sphere((0, 0, 0.2), (0.075, 0.05, 0.22), fur, ear)
        sphere((0, -0.035, 0.2), (0.04, 0.02, 0.16), inner, ear, line=0)
    return P, _anim_bunny


def _anim_bunny(P, t):
    s = math.sin(t * math.tau)
    P['piv'].location.z = abs(math.sin(t * math.tau)) * 0.04
    for side in (-1, 1):
        P[f'ear{side}'].rotation_euler = (0.15 * s, 0.18 * side + 0.08 * math.cos(t * math.tau) * side, 0)


def shroom():
    P = {}
    root = P['root'] = empty('shroom')
    piv = P['piv'] = empty('piv', root)
    stem = M('#fff0d8')
    for s in (-1, 1):
        sphere((0.13 * s, -0.05, 0.05), (0.09, 0.11, 0.06), M('#e8c8a8'), piv)
    sphere((0, 0, 0.3), (0.3, 0.27, 0.32), stem, piv)
    face(piv, 0, 0.28, 0.3, 0.27, 0.32, 0.11, eye=0.065)
    cap = P['cap'] = empty('cap', piv, (0, 0.03, 0.55))
    from lib import lathe
    lathe([(0.0001, 0.36), (0.22, 0.33), (0.38, 0.23), (0.48, 0.09), (0.5, 0.02), (0.43, -0.03), (0.26, 0.01), (0.0001, 0.03)], M('#e8505a'), cap, seg=32)
    for x, y, z, s in ((-0.27, -0.22, 0.18, 0.08), (0.2, -0.28, 0.16, 0.07), (0.0, -0.1, 0.33, 0.09), (0.33, 0.05, 0.18, 0.06), (-0.31, 0.12, 0.21, 0.07), (0.1, 0.26, 0.26, 0.07)):
        sphere((x, y, z), (s, s, s * 0.5), M(WHITE), cap, line=0.01, rot=(math.atan2(-y, 0.3) * 0.6, math.atan2(x, 0.4) * 0.6, 0))
    return P, _anim_shroom


def _anim_shroom(P, t):
    s = math.sin(t * math.tau)
    P['piv'].scale = (1 + 0.03 * s, 1 + 0.03 * s, 1 - 0.04 * s)
    P['cap'].rotation_euler = (0, 0.06 * s, 0)


def wolf(fur='#9aa4c8', light='#e8ecf8', dark='#7a84a8'):
    P = {}
    root = P['root'] = empty('wolf')
    piv = P['piv'] = empty('piv', root)
    fur, light, dark = M(fur), M(light), M(dark)
    for x in (-0.14, 0.14):
        for y in (-0.2, 0.22):
            cylinder((x, y, 0.1), 0.07, 0.2, dark, piv, seg=12)
            sphere((x, y - 0.02, 0.03), (0.08, 0.1, 0.05), dark, piv)
    sphere((0, 0.05, 0.36), (0.27, 0.42, 0.24), fur, piv)
    sphere((0, -0.2, 0.36), (0.2, 0.18, 0.2), light, piv)
    tail = P['tail'] = empty('tail', piv, (0, 0.42, 0.45))
    sphere((0, 0.15, 0.1), (0.1, 0.22, 0.1), fur, tail, rot=(0.8, 0, 0))
    sphere((0, 0.3, 0.24), 0.08, light, tail)
    head = P['head'] = empty('head', piv, (0, -0.38, 0.62))
    sphere((0, 0, 0), (0.25, 0.23, 0.22), fur, head, seg=32)
    sphere((0, -0.2, -0.07), (0.13, 0.14, 0.1), light, head)
    sphere((0, -0.33, -0.04), (0.045, 0.03, 0.035), M(EYE, rim=0), head, line=0)
    for s in (-1, 1):
        cone((0.14 * s, 0.02, 0.2), 0.08, 0.2, fur, head, rot=(0, 0.3 * s, 0), seg=12)
        cone((0.14 * s, -0.01, 0.19), 0.04, 0.13, M('#ffb4c8'), head, rot=(0, 0.3 * s, 0), seg=12, line=0)
    face(head, 0, 0.05, 0.25, 0.23, 0.22, 0.1, eye=0.05, mouth=False)
    return P, _anim_wolf


def _anim_wolf(P, t):
    s = math.sin(t * math.tau)
    P['tail'].rotation_euler = (0, 0, 0.5 * math.sin(t * math.tau * 2))
    P['piv'].scale = (1, 1, 1 + 0.025 * s)
    P['head'].rotation_euler = (0.05 * s, 0, 0)


def _wing(parent, side, mat, span=0.55, h=0.35):
    pts = [(0, 0.1), (span * 0.5, h), (span, h * 0.7), (span * 0.95, h * 0.1), (span * 0.8, -h * 0.25),
           (span * 0.62, 0.0), (span * 0.45, -h * 0.3), (span * 0.3, -0.02), (span * 0.15, -h * 0.25), (0, -0.05)]
    if side < 0:
        pts = [(-x, z) for x, z in pts][::-1]
    return profile(pts, 0.035, mat, parent, bevel=0.012, line=0.016)


def bat():
    P = {}
    root = P['root'] = empty('bat')
    piv = P['piv'] = empty('piv', root, (0, 0, 0.5))
    fur, wingm = M('#7a5ab8'), M('#5a3a8a')
    for s in (-1, 1):
        w = P[f'wing{s}'] = empty(f'wing{s}', piv, (0.18 * s, 0.05, 0.05))
        _wing(w, s, wingm)
    sphere((0, 0, 0), (0.28, 0.26, 0.26), fur, piv, seg=32)
    sphere((0, -0.08, -0.08), (0.16, 0.14, 0.12), M('#a08ad8'), piv)
    for s in (-1, 1):
        cone((0.13 * s, 0.0, 0.26), 0.09, 0.2, fur, piv, rot=(0, 0.35 * s, 0), seg=12)
        cone((0.05 * s, surf(0.28, 0.26, 0.26, 0.05, -0.1) - 0.01, -0.13), 0.02, 0.06, M(WHITE), piv, rot=(math.pi, 0, 0), seg=8, line=0.008)
    face(piv, 0, 0.03, 0.28, 0.26, 0.26, 0.1, eye=0.06, mouth=False)
    return P, _anim_bat


def _anim_bat(P, t):
    s = math.sin(t * math.tau)
    for side in (-1, 1):
        P[f'wing{side}'].rotation_euler = (0, -0.7 * s * side, 0)
    P['piv'].location.z = 0.5 + 0.05 * math.cos(t * math.tau)


def golem(stone='#9aa0b0', dark='#7a8090', moss='#7ab86a'):
    P = {}
    root = P['root'] = empty('golem')
    piv = P['piv'] = empty('piv', root)
    stone, dark, moss = M(stone), M(dark), M(moss)
    for s in (-1, 1):
        box((0.22 * s, 0, 0.12), (0.26, 0.3, 0.26), dark, piv, bevel=0.07)
    box((0, 0, 0.55), (0.82, 0.58, 0.6), stone, piv, bevel=0.14)
    head = P['head'] = empty('head', piv, (0, -0.04, 0.98))
    box((0, 0, 0), (0.5, 0.42, 0.36), stone, head, bevel=0.1)
    glow = M('#6af0ff', emit=0.6)
    for s in (-1, 1):
        sphere((0.11 * s, -0.21, 0.02), (0.05, 0.02, 0.035), glow, head, line=0)
    sphere((-0.12, 0.02, 0.18), (0.2, 0.18, 0.06), moss, head, line=0.012)
    sphere((0.1, 0.1, 0.31), (0.3, 0.22, 0.05), moss, piv, line=0.012)
    gem = M('#b8a0ff', rim=0.4)
    crystal((0.12, 0.05, 0.14), 0.06, 0.24, gem, head, rot=(0, 0.3, 0))
    crystal((-0.22, 0.2, 0.8), 0.07, 0.3, M('#8ae8ff', rim=0.4), piv, rot=(0.4, -0.4, 0))
    for s in (-1, 1):
        arm = P[f'arm{s}'] = empty(f'arm{s}', piv, (0.48 * s, 0, 0.72))
        sphere((0.06 * s, 0, 0), 0.16, dark, arm)
        box((0.1 * s, -0.02, -0.28), (0.26, 0.28, 0.32), stone, arm, bevel=0.09)
    return P, _anim_golem


def _anim_golem(P, t):
    s = math.sin(t * math.tau)
    P['piv'].rotation_euler = (0, 0.03 * s, 0)
    for side in (-1, 1):
        P[f'arm{side}'].rotation_euler = (0.12 * s * side, 0, 0)
    P['head'].location.z = 0.98 + 0.015 * math.cos(t * math.tau)


def imp():
    P = {}
    root = P['root'] = empty('imp')
    piv = P['piv'] = empty('piv', root, (0, 0, 0.5))
    skin = M('#e8505a')
    for s in (-1, 1):
        w = P[f'wing{s}'] = empty(f'wing{s}', piv, (0.18 * s, 0.1, 0.1))
        _wing(w, s, M('#8a2a3a'), span=0.38, h=0.26)
    tail = P['tail'] = empty('tail', piv, (0, 0.22, -0.12))
    for i in range(6):
        a = i / 6
        sphere((0, 0.05 + a * 0.2, -0.05 + math.sin(a * 3) * 0.12), 0.04, M('#c83a4a'), tail, line=0.01)
    cone((0, 0.28, 0.1), 0.07, 0.12, M('#c83a4a'), tail, rot=(-0.6, 0, 0), seg=4)
    sphere((0, 0, 0), (0.3, 0.28, 0.29), skin, piv, seg=32)
    sphere((0, -0.1, -0.1), (0.17, 0.14, 0.13), M('#ff8a8a'), piv)
    for s in (-1, 1):
        horn = empty('horn', piv, (0.14 * s, 0, 0.22))
        cone((0, 0, 0.08), 0.055, 0.18, M('#fff0d0'), horn, rot=(0, 0.45 * s, 0), seg=12)
        sphere((0.12 * s, -0.05, -0.3), (0.06, 0.08, 0.05), M('#c83a4a'), piv)
    face(piv, 0, 0.04, 0.3, 0.28, 0.29, 0.11, eye=0.06, mouth=False)
    y = surf(0.3, 0.28, 0.29, 0, -0.1)
    sphere((0, y, -0.1), (0.1, 0.03, 0.035), M('#5a1a2a', rim=0), piv, line=0)
    for s in (-1, 1):
        cone((0.05 * s, y - 0.01, -0.11), 0.018, 0.04, M(WHITE), piv, rot=(math.pi, 0, 0), seg=6, line=0)
    return P, _anim_imp


def _anim_imp(P, t):
    s = math.sin(t * math.tau)
    for side in (-1, 1):
        P[f'wing{side}'].rotation_euler = (0, -0.5 * math.sin(t * math.tau * 2) * side, 0)
    P['piv'].location.z = 0.5 + 0.05 * s
    P['tail'].rotation_euler = (0, 0, 0.35 * math.cos(t * math.tau))


def dragon():
    P = {}
    root = P['root'] = empty('dragon')
    piv = P['piv'] = empty('piv', root)
    red, belly, dark = M('#e8603c'), M('#ffd28a'), M('#a8303a')
    horn, gold = M('#fff0d0'), M('#ffd35a')
    # Wings
    for s in (-1, 1):
        w = P[f'wing{s}'] = empty(f'wing{s}', piv, (0.45 * s, 0.25, 1.35))
        _wing(w, s, dark, span=1.9, h=1.1)
    # Tail
    tail = P['tail'] = empty('tail', piv, (0.3, 0.55, 0.35))
    for i in range(7):
        a = i / 6
        sphere((a * 0.9, a * 0.5, 0.05 - a * 0.1 + math.sin(a * 3) * 0.05), 0.24 - a * 0.14, red, tail)
    cone((1.02, 0.56, 0.02), 0.16, 0.3, gold, tail, rot=(0, math.pi / 2, 0.5), seg=4)
    # Legs + body
    for s in (-1, 1):
        sphere((0.42 * s, -0.1, 0.18), (0.24, 0.3, 0.2), red, piv)
        for k in (-1, 0, 1):
            cone((0.42 * s + k * 0.08, -0.36, 0.06), 0.035, 0.1, horn, piv, rot=(math.pi / 2, 0, 0), seg=8, line=0.01)
    sphere((0, 0.05, 0.85), (0.8, 0.72, 0.75), red, piv, seg=40)
    sphere((0, -0.35, 0.78), (0.52, 0.42, 0.58), belly, piv)
    for i in range(4):
        z = 0.45 + i * 0.22
        sphere((0, surf(0.52, 0.42, 0.58, 0, z - 0.78) - 0.35 - 0.01, z), (0.4 - abs(i - 1.5) * 0.06, 0.03, 0.035), M('#e8b070'), piv, line=0)
    for i in range(4):
        cone((0, 0.35 + i * 0.12, 1.55 - i * 0.18), 0.1, 0.22, gold, piv, rot=(-0.5 - i * 0.2, 0, 0), seg=8)
    for s in (-1, 1):
        arm = empty('arm', piv, (0.55 * s, -0.4, 0.95))
        sphere((0, 0, 0), (0.14, 0.16, 0.2), red, arm, rot=(0.4, 0.3 * s, 0))
    # Head
    head = P['head'] = empty('head', piv, (0, -0.35, 1.72))
    sphere((0, 0, 0), (0.52, 0.46, 0.44), red, head, seg=40)
    sphere((0, -0.38, -0.12), (0.34, 0.3, 0.22), M('#f07a50'), head)
    for s in (-1, 1):
        sphere((0.1 * s, surf(0.34, 0.3, 0.22, 0.1 * s, 0.05) - 0.38, -0.07), (0.04, 0.02, 0.03), M(EYE, rim=0), head, line=0)
        horn_p = empty('horn', head, (0.3 * s, 0.1, 0.32))
        cone((0, 0, 0.18), 0.1, 0.45, horn, horn_p, rot=(-0.4, 0.5 * s, 0), seg=12)
        cone((0.45 * s, 0.1, 0.05), 0.12, 0.2, dark, head, rot=(0, math.pi / 2 * s, 0), seg=10)
    face(head, 0, 0.12, 0.52, 0.46, 0.44, 0.2, eye=0.1, mouth=False)
    return P, _anim_dragon


def _anim_dragon(P, t):
    s = math.sin(t * math.tau)
    for side in (-1, 1):
        P[f'wing{side}'].rotation_euler = (0, -0.35 * s * side - 0.1 * side, 0)
    P['piv'].scale = (1 + 0.015 * s, 1 + 0.015 * s, 1 + 0.025 * s)
    P['tail'].rotation_euler = (0, 0, 0.18 * math.cos(t * math.tau))
    P['head'].rotation_euler = (0.04 * s, 0, 0)


def crown(parent, loc, r=0.2, h=0.14):
    from lib import lathe
    c = empty('crown', parent, loc)
    lathe([(r, 0), (r * 1.08, h), (r * 0.96, h), (r * 0.88, 0.02), (0.0001, 0.02)], M('#ffd35a'), c, seg=24, line=0.014)
    for i in range(5):
        a = i / 5 * math.tau
        cone((math.cos(a) * r, math.sin(a) * r, h + 0.06), 0.05, 0.14, M('#ffd35a'), c, seg=8, line=0.012)
        sphere((math.cos(a) * r * 1.05, math.sin(a) * r * 1.05, h * 0.5), 0.03, M('#ff4a6a' if i % 2 else '#6ae0ff', rim=0.4), c, line=0)
    return c


def kingslime():
    P, anim = slime(color='#8ac8ff')
    crown(P['piv'], (0, 0.05, 0.86), r=0.22)
    sphere((0.34, -0.2, 0.2), (0.05, 0.02, 0.06), M('#ffffff', rim=0), P['piv'], line=0)
    return P, anim


def alphawolf():
    P, anim = wolf('#5a6488', '#f0f4ff', '#3a4468')
    from lib import torus
    torus((0, -0.3, 0.5), 0.2, 0.05, M('#e8404a'), P['piv'], rot=(1.1, 0, 0))
    profile([(-0.06, 0), (0.06, 0), (0.1, -0.22), (-0.02, -0.18)], 0.04, M('#e8404a'), P['piv'], loc=(0.05, -0.42, 0.42))
    for i in range(5):
        a = (i - 2) * 0.35
        sphere((math.sin(a) * 0.2, -0.28 + abs(a) * 0.05, 0.62 - abs(a) * 0.05), 0.09, M('#f0f4ff'), P['piv'])
    crown(P['head'], (0, 0.05, 0.2), r=0.12, h=0.08)
    return P, anim


def crystalking():
    P, anim = golem('#8a7ab8', '#6a5a98', '#b8a0ff')
    gem = M('#e0c8ff', rim=0.45)
    for x, y, z, h, rx, ry in ((-0.3, 0.2, 0.85, 0.45, 0.3, -0.5), (0.3, 0.2, 0.85, 0.4, 0.3, 0.5), (0, 0.28, 0.9, 0.55, 0.5, 0),
                               (-0.5, 0.05, 0.9, 0.3, 0, -0.9), (0.5, 0.05, 0.9, 0.3, 0, 0.9)):
        crystal((x, y, z), 0.09, h, gem, P['piv'], rot=(rx, ry, 0))
    crown(P['head'], (0, 0, 0.18), r=0.2, h=0.12)
    return P, anim


BUILDERS = {
    'slime': lambda: slime(False),
    'magma': lambda: slime(True),
    'glimmer': lambda: slime(color='#b8a8f8', crystals=True),
    'bunny': bunny,
    'shroom': shroom,
    'wolf': wolf,
    'bat': bat,
    'golem': golem,
    'imp': imp,
    'dragon': dragon,
    'kingslime': kingslime,
    'alphawolf': alphawolf,
    'crystalking': crystalking,
}

# Guardians are the base models scaled up to their hitbox size.
BOSS_SCALE = {'kingslime': 2.2, 'alphawolf': 2.1, 'crystalking': 1.7}


def build(kind, gold=False):
    global _gold
    _gold = gold
    try:
        P, anim = BUILDERS[kind]()
        if kind in BOSS_SCALE:
            P['root'].scale = (BOSS_SCALE[kind],) * 3
        return P, anim
    finally:
        _gold = False
