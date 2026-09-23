"""Weapon models, laid flat in the XZ plane pointing +X with the grip at the origin.

They're rendered from the side and rotated in 2D by the game, so each one reads as a clean silhouette.
Higher tiers are physically bigger, with more ornament and glowing parts.
"""
import math

from lib import box, cone, crystal, cylinder, empty, profile, sphere, toon, torus

WOOD, DARKWOOD, STEEL, GOLD = '#b98a5a', '#7a5238', '#dfe6f0', '#ffd35a'
X = (0, math.pi / 2, 0)  # rotate a Z-aligned primitive to lie along X


def handle(root, length, color=DARKWOOD, r=0.035, wraps=0, wrap='#6a3a4a', start=-0.12):
    cylinder((start + length / 2, 0, 0), r, length, toon(color), root, rot=X, seg=12, line=0.016)
    for i in range(wraps):
        torus((start + 0.04 + i * (length - 0.08) / max(1, wraps - 1), 0, 0), r * 1.05, 0.012, toon(wrap), root, rot=X, line=0)


def sword_blade(root, length, width, color, tip=0.18, x0=0.1, bevel=0.01, line=0.016, flame=False):
    if flame:
        pts = [(x0, -width * 0.5), (x0 + length * 0.35, -width * 0.62), (x0 + length * 0.55, -width * 0.35),
               (x0 + length * 0.75, -width * 0.5), (x0 + length, 0), (x0 + length * 0.7, width * 0.55),
               (x0 + length * 0.5, width * 0.35), (x0 + length * 0.3, width * 0.6), (x0, width * 0.5)]
    else:
        pts = [(x0, -width / 2), (x0 + length - tip, -width / 2), (x0 + length, 0), (x0 + length - tip, width / 2), (x0, width / 2)]
    return profile(pts, 0.045, toon(color, rim=0.35), root, bevel=bevel, line=line)


def guard(root, width, color, x=0.08):
    box((x, 0, 0), (0.06, 0.08, width), toon(color), root, bevel=0.025, line=0.016)


def pommel(root, color, r=0.05, x=-0.15):
    sphere((x, 0, 0), r, toon(color, rim=0.35), root, line=0.014)


# ----------------------------------------------------------------------------- swords


def twig(root):
    handle(root, 0.3, WOOD, r=0.04)
    cylinder((0.5, 0, 0), 0.045, 0.75, toon(WOOD), root, rot=(0, math.pi / 2 - 0.05, 0), seg=10, r2=0.025, line=0.016)
    cylinder((0.55, 0, 0.1), 0.02, 0.2, toon(WOOD), root, rot=(0, 0.6, 0), seg=8, line=0.012)
    sphere((0.66, 0, 0.18), (0.1, 0.03, 0.05), toon('#7ad85a'), root, rot=(0, -0.5, 0), line=0.012)


def jelly(root):
    handle(root, 0.26, '#8a5a8a', wraps=2, wrap='#ffb4c8')
    guard(root, 0.28, '#ff9ac8')
    sword_blade(root, 0.82, 0.2, '#7aea8a')
    for x, z, r in ((0.35, 0.02, 0.03), (0.55, -0.03, 0.022), (0.7, 0.03, 0.018)):
        sphere((x, -0.035, z), r, toon('#ffffff', rim=0), root, line=0)
    pommel(root, '#ff9ac8')


def geode(root):
    handle(root, 0.28, '#4a3a6a', wraps=3, wrap=GOLD)
    guard(root, 0.36, GOLD)
    sword_blade(root, 0.95, 0.22, '#b8a0ff', tip=0.25, bevel=0)
    profile([(0.2, -0.03), (0.9, -0.02), (1.02, 0), (0.9, 0.02), (0.2, 0.03)], 0.05, toon('#e8dcff', rim=0.5), root, line=0)
    crystal((0.08, 0, 0.2), 0.04, 0.12, toon('#9af0ff', rim=0.4), root, line=0.012)
    crystal((0.08, 0, -0.2), 0.04, 0.12, toon('#9af0ff', rim=0.4), root, rot=(math.pi, 0, 0), line=0.012)
    pommel(root, '#9af0ff', 0.06)


def emberblade(root):
    handle(root, 0.3, '#3a2a2a', wraps=3, wrap='#e8703a')
    box((0.08, 0, 0), (0.07, 0.09, 0.3), toon('#3a2a2a'), root, bevel=0.02)
    for s in (-1, 1):
        cone((0.1, 0, 0.2 * s), 0.04, 0.16, toon('#3a2a2a'), root, rot=(0 if s > 0 else math.pi, 0.5 * s, 0), seg=8)
    sword_blade(root, 1.05, 0.26, '#ff8a3a', flame=True)
    sword_blade(root, 0.8, 0.1, '#ffe07a', x0=0.18, line=0, bevel=0).location.y = -0.03
    pommel(root, '#ff5a2a', 0.06)


# ----------------------------------------------------------------------------- spears


def spear_shaft(root, length, color, rings=(), ring_color=GOLD):
    cylinder((length / 2 - 0.3, 0, 0), 0.032, length, toon(color), root, rot=X, seg=12, line=0.014)
    for x in rings:
        torus((x, 0, 0), 0.036, 0.014, toon(ring_color), root, rot=X, line=0.008)


def fangspear(root):
    spear_shaft(root, 1.45, WOOD, rings=(0.95, 1.02))
    profile([(1.05, -0.08), (1.22, -0.1), (1.5, 0.02), (1.24, 0.05), (1.05, 0.06)], 0.05, toon('#f4eee0', rim=0.4), root, bevel=0.015)
    for i in range(3):
        cylinder((1.05 - i * 0.03, 0.02, -0.1 - i * 0.04), 0.008, 0.12, toon('#c83a3a'), root, seg=6, line=0)


def wyrmfang(root):
    spear_shaft(root, 1.75, '#8a2a2a', rings=(0.0, 0.5, 1.12, 1.2), ring_color=GOLD)
    profile([(1.2, -0.13), (1.45, -0.16), (1.85, 0.0), (1.5, 0.1), (1.35, 0.14), (1.2, 0.1)], 0.06, toon('#ff5a4a', rim=0.4), root, bevel=0.02)
    profile([(1.3, -0.06), (1.7, -0.0), (1.4, 0.05)], 0.07, toon('#ffe07a', emit=0.5), root, bevel=0, line=0)
    for s in (-1, 1):
        cone((1.2, 0, 0.12 * s), 0.05, 0.2, toon(GOLD), root, rot=(0.9 * s if s > 0 else math.pi - 0.9, 0, 0), seg=8)
    sphere((1.16, -0.04, 0), 0.045, toon('#9af0ff', emit=0.4), root, line=0.01)
    for i in range(2):
        profile([(1.1, 0), (1.14, 0), (1.0 - i * 0.05, -0.35), (0.95 - i * 0.05, -0.33)], 0.02, toon('#ffd35a'), root, bevel=0, line=0.01)


# ----------------------------------------------------------------------------- axes


def clover_hatchet(root):
    handle(root, 0.72, WOOD, r=0.035, wraps=2, wrap='#7ad85a')
    profile([(0.42, 0.02), (0.44, 0.22), (0.55, 0.3), (0.66, 0.26), (0.66, 0.02)], 0.05, toon('#a8e8b0', rim=0.4), root, bevel=0.015)
    for dx, dz in ((0.0, 0.035), (0.035, 0.0), (0.0, -0.035), (-0.035, 0.0)):
        sphere((0.55 + dx, -0.03, 0.14 + dz), 0.028, toon('#4aa84a', rim=0), root, line=0)


def timber_axe(root):
    handle(root, 0.9, WOOD, r=0.038, wraps=2, wrap='#6a3a4a')
    profile([(0.58, 0.03), (0.56, 0.2), (0.62, 0.36), (0.8, 0.4), (0.9, 0.3), (0.86, 0.03)], 0.06, toon(STEEL, rim=0.4), root, bevel=0.015)
    profile([(0.62, 0.34), (0.8, 0.39), (0.89, 0.3), (0.85, 0.28), (0.78, 0.35), (0.64, 0.31)], 0.07, toon('#ffffff', rim=0), root, bevel=0, line=0)
    profile([(0.62, -0.03), (0.72, -0.18), (0.8, -0.03)], 0.05, toon('#aab4c8'), root, bevel=0.01)


def magma_cleaver(root):
    handle(root, 1.05, '#3a2a2a', r=0.045, wraps=3, wrap='#e8703a')
    pts = [(0.6, 0.04), (0.52, 0.3), (0.62, 0.55), (0.9, 0.62), (1.1, 0.48), (1.12, 0.2), (1.02, 0.04)]
    profile(pts, 0.08, toon('#4a3a44', rim=0.3), root, bevel=0.02)
    profile([(0.58, 0.5), (0.64, 0.58), (0.9, 0.64), (1.1, 0.5), (1.08, 0.44), (0.9, 0.56), (0.66, 0.5)], 0.09, toon('#ffb03a', emit=0.7), root, bevel=0, line=0)
    for (a, b) in (((0.7, 0.18), (0.82, 0.38)), ((0.9, 0.12), (0.86, 0.34)), ((1.0, 0.3), (0.92, 0.46))):
        profile([a, (a[0] + 0.02, a[1]), (b[0] + 0.02, b[1]), b], 0.09, toon('#ff7a2a', emit=0.8), root, bevel=0, line=0)
    profile([(0.62, -0.04), (0.8, -0.26), (0.98, -0.04)], 0.07, toon('#3a2a2a'), root, bevel=0.015)
    sphere((0.82, -0.05, 0.02), 0.05, toon('#ff5a2a', emit=0.6), root, line=0.01)


# ----------------------------------------------------------------------------- hammers


def mushroom_mallet(root):
    handle(root, 0.9, WOOD, r=0.036, wraps=2, wrap='#e8505a')
    from lib import lathe
    head = empty('head', root, (0.8, 0, 0))
    lathe([(0.0001, 0.18), (0.14, 0.16), (0.24, 0.08), (0.26, 0.0), (0.2, -0.04), (0.0001, -0.03)], toon('#e8505a'), head, seg=24)
    cylinder((0, 0, -0.1), 0.1, 0.16, toon('#fff0d8'), head, seg=16)
    for a in range(5):
        ang = a / 5 * math.tau
        sphere((math.cos(ang) * 0.15, math.sin(ang) * 0.15, 0.12), 0.035, toon('#ffffff'), head, line=0.008)


def boulder_hammer(root):
    handle(root, 1.0, '#6a5a4a', r=0.042, wraps=3, wrap='#4a3a3a')
    box((0.92, 0, 0), (0.32, 0.3, 0.52), toon('#9aa0b0'), root, bevel=0.08)
    box((0.92, 0, 0), (0.36, 0.34, 0.1), toon('#6a7080'), root, bevel=0.03)
    sphere((0.86, -0.05, 0.2), (0.14, 0.12, 0.06), toon('#7ab86a'), root, line=0.012)
    crystal((1.0, 0, 0.24), 0.05, 0.18, toon('#b8a0ff', rim=0.4), root, rot=(0, 0.3, 0))


def wyrmbreaker(root):
    handle(root, 1.12, '#5a1a1a', r=0.05, wraps=4, wrap=GOLD)
    box((1.05, 0, 0), (0.4, 0.36, 0.62), toon('#c83a3a'), root, bevel=0.1)
    for s in (-1, 1):
        box((1.05, 0, 0.3 * s), (0.44, 0.4, 0.08), toon(GOLD), root, bevel=0.03)
        cone((1.05, 0, 0.42 * s), 0.07, 0.24, toon('#fff0d0'), root, rot=(0 if s > 0 else math.pi, 0.4 * s, 0), seg=10)
    sphere((1.05, -0.2, 0), 0.08, toon('#ffb03a', emit=0.8), root, line=0.012)
    cone((1.3, 0, 0), 0.08, 0.2, toon(GOLD), root, rot=X, seg=8)


# ----------------------------------------------------------------------------- wand


def crystalwand(root):
    cylinder((0.3, 0, 0), 0.03, 0.8, toon('#6b4a8a'), root, rot=X, seg=10, line=0.014, r2=0.022)
    torus((0.68, 0, 0), 0.04, 0.015, toon(GOLD), root, rot=X, line=0.008)
    star = empty('star', root, (0.82, 0, 0))
    pts = []
    for i in range(10):
        a = i / 10 * math.tau + math.pi / 2
        r = 0.16 if i % 2 == 0 else 0.07
        pts.append((math.cos(a) * r, math.sin(a) * r))
    profile(pts, 0.07, toon('#9ae6ff', rim=0.5), star, bevel=0.02, line=0.016)
    sphere((0, -0.05, 0), 0.04, toon('#ffffff', emit=0.4), star, line=0)


WEAPONS = {
    'twig': (twig, 1.4),
    'jelly': (jelly, 1.4),
    'geode': (geode, 1.5),
    'emberblade': (emberblade, 1.6),
    'fangspear': (fangspear, 2.1),
    'wyrmfang': (wyrmfang, 2.4),
    'cloverhatchet': (clover_hatchet, 1.2),
    'timberaxe': (timber_axe, 1.4),
    'magmacleaver': (magma_cleaver, 1.6),
    'mushmallet': (mushroom_mallet, 1.4),
    'boulder': (boulder_hammer, 1.5),
    'wyrmbreaker': (wyrmbreaker, 1.7),
    'crystalwand': (crystalwand, 1.4),
}
