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


def emberblade(root):
    handle(root, 0.3, '#3a2a2a', wraps=3, wrap='#e8703a')
    box((0.08, 0, 0), (0.07, 0.09, 0.3), toon('#3a2a2a'), root, bevel=0.02)
    for s in (-1, 1):
        cone((0.1, 0, 0.2 * s), 0.04, 0.16, toon('#3a2a2a'), root, rot=(0 if s > 0 else math.pi, 0.5 * s, 0), seg=8)
    sword_blade(root, 1.05, 0.26, '#ff8a3a', flame=True)
    sword_blade(root, 0.8, 0.1, '#ffe07a', x0=0.18, line=0, bevel=0).location.y = -0.03
    pommel(root, '#ff5a2a', 0.06)


# ----------------------------------------------------------------------------- hammers


def wyrmbreaker(root):
    handle(root, 1.12, '#5a1a1a', r=0.05, wraps=4, wrap=GOLD)
    box((1.05, 0, 0), (0.4, 0.36, 0.62), toon('#c83a3a'), root, bevel=0.1)
    for s in (-1, 1):
        box((1.05, 0, 0.3 * s), (0.44, 0.4, 0.08), toon(GOLD), root, bevel=0.03)
        cone((1.05, 0, 0.42 * s), 0.07, 0.24, toon('#fff0d0'), root, rot=(0 if s > 0 else math.pi, 0.4 * s, 0), seg=10)
    sphere((1.05, -0.2, 0), 0.08, toon('#ffb03a', emit=0.8), root, line=0.012)
    cone((1.3, 0, 0), 0.08, 0.2, toon(GOLD), root, rot=X, seg=8)


# ----------------------------------------------------------------------------- wand


# ----------------------------------------------------------------------------- gatherer lines: metal swords and hammers

# blade/head color, darker trim, grip color for each material tier
METALS = {
    'stone': ('#b8bcc8', '#7a7e8c', WOOD),
    'copper': ('#e8904a', '#a85a2a', DARKWOOD),
    'iron': ('#dfe6f0', '#7a8498', '#4a3a3a'),
    'crystal': ('#9ae6ff', '#8a70e0', '#4a3a6a'),
}


def metal_sword(root, metal, tier):
    blade, dark, grip = METALS[metal]
    handle(root, 0.26 + 0.02 * tier, grip, wraps=tier, wrap=dark)
    guard(root, 0.26 + 0.03 * tier, dark)
    length, width = 0.72 + 0.07 * tier, 0.2 + 0.012 * tier
    sword_blade(root, length, width + (0.04 if metal == 'stone' else 0), blade, tip=0.14 + 0.03 * tier, bevel=0 if metal == 'crystal' else 0.012)
    sword_blade(root, length * 0.72, 0.045, '#ffffff', x0=0.16, line=0, bevel=0).location.y = -0.028
    pommel(root, dark)
    if metal == 'crystal':
        for s in (-1, 1):
            crystal((0.09, -0.03, 0.12 * s), 0.035, 0.08, toon('#c8b0ff', rim=0.5), root, rot=(math.pi / 2 if s > 0 else -math.pi / 2, 0, 0), sides=5, line=0.01)


def metal_hammer(root, metal, tier):
    head, dark, grip = METALS[metal]
    handle(root, 0.85 + 0.05 * tier, grip, r=0.038, wraps=tier, wrap=dark)
    x = 0.8 + 0.05 * tier
    if metal == 'stone':
        sphere((x, 0, 0), (0.18, 0.16, 0.26), toon(head), root, seg=10)
        sphere((x + 0.05, -0.04, 0.12), (0.1, 0.1, 0.1), toon('#9aa0b0'), root, seg=8)
        torus((x - 0.12, 0, 0), 0.05, 0.02, toon('#c8a070'), root, rot=X, line=0.008)
        return
    box((x, 0, 0), (0.26 + 0.02 * tier, 0.24, 0.42 + 0.03 * tier), toon(head, rim=0.3), root, bevel=0.07)
    box((x, 0, 0), (0.3 + 0.02 * tier, 0.28, 0.08), toon(dark), root, bevel=0.03)
    if metal == 'crystal':
        for dz in (-0.18, 0.18):
            crystal((x, 0, dz), 0.05, 0.16, toon('#c8b0ff', rim=0.5), root, rot=(0, 0, 0) if dz > 0 else (math.pi, 0, 0), sides=5)


# ----------------------------------------------------------------------------- hunter lines: whips and wands


def whip(root, color, trim, grip='#6a3a4a', flame=False):
    """The grip with a few coils of the lash hanging off it (the rest of the lash is drawn by the game when it cracks)."""
    handle(root, 0.34, grip, r=0.042, wraps=2, wrap=trim)
    pommel(root, trim, 0.05)
    for i in range(3):
        torus((0.26 + 0.05 * i, 0, -0.1 - 0.03 * i), 0.13 - 0.02 * i, 0.024, toon(color), root, rot=(math.pi / 2, 0, 0.35 * i), line=0.012)
    sphere((0.42, 0, -0.26), 0.045, toon(trim, emit=0.5 if flame else 0), root, line=0.01)
    if flame:
        cone((0.44, 0, -0.34), 0.05, 0.16, toon('#ffb03a', emit=0.8), root, rot=(math.pi, 0, 0), seg=8, line=0)


def slingshot(root, color, band):
    handle(root, 0.36, '#8a5a8a', r=0.04, wraps=2, wrap=band)
    for s in (-1, 1):
        cylinder((0.36, 0, 0.1 * s), 0.035, 0.3, toon(color), root, rot=(0, math.pi / 2 - 0.55 * s, 0), seg=10, line=0.014)
        sphere((0.48, 0, 0.18 * s), 0.045, toon(color), root, line=0.01)
    cylinder((0.47, 0.02, 0), 0.016, 0.36, toon(band), root, seg=8, line=0)
    sphere((0.4, -0.02, 0), 0.07, toon('#8af09a', rim=0.4), root, line=0.012)


def wand(root, stick, kind):
    cylinder((0.3, 0, 0), 0.03, 0.8, toon(stick), root, rot=X, seg=10, line=0.014, r2=0.022)
    torus((0.68, 0, 0), 0.04, 0.015, toon(GOLD), root, rot=X, line=0.008)
    head = empty('head', root, (0.82, 0, 0))
    if kind == 'spore':
        from lib import lathe
        lathe([(0.0001, 0.14), (0.12, 0.12), (0.18, 0.04), (0.18, -0.02), (0.0001, -0.02)], toon('#e8505a'), head, seg=20, rot=(0, math.pi / 2, 0))
        for a in range(4):
            ang = a / 4 * math.tau
            sphere((0.04, math.cos(ang) * 0.1, math.sin(ang) * 0.1), 0.028, toon('#ffffff'), head, line=0.006)
    elif kind == 'bat':
        for s in (-1, 1):
            profile([(0, 0), (0.06, 0.22 * s), (0.12, 0.14 * s), (0.18, 0.24 * s), (0.2, 0.05 * s)], 0.03, toon('#7a5ab8'), head, bevel=0.01)
        sphere((0.02, 0, 0), 0.06, toon('#ff6a8a', emit=0.4), head, line=0.01)
    elif kind == 'glimmer':
        pts = []
        for i in range(10):
            a = i / 10 * math.tau + math.pi / 2
            r = 0.16 if i % 2 == 0 else 0.07
            pts.append((math.cos(a) * r, math.sin(a) * r))
        profile(pts, 0.07, toon('#c8b0ff', rim=0.5), head, bevel=0.02, line=0.016)
        sphere((0, -0.05, 0), 0.04, toon('#ffffff', emit=0.4), head, line=0)
    elif kind == 'dragon':
        sphere((0.02, 0, 0), 0.1, toon('#ff5a2a', emit=0.7), head, line=0.012)
        for s in (-1, 1):
            cone((0.0, 0, 0.1 * s), 0.035, 0.16, toon(GOLD), head, rot=(0.6 * s if s > 0 else math.pi - 0.6, 0, 0), seg=8)
        cone((0.14, 0, 0), 0.07, 0.2, toon('#ffd35a', emit=0.8), head, rot=X, seg=10, line=0)


WEAPONS = {
    'twig': (twig, 1.4),
    'stonesword': (lambda r: metal_sword(r, 'stone', 1), 1.3),
    'coppersword': (lambda r: metal_sword(r, 'copper', 2), 1.4),
    'ironsword': (lambda r: metal_sword(r, 'iron', 3), 1.5),
    'crystalsword': (lambda r: metal_sword(r, 'crystal', 4), 1.55),
    'emberblade': (emberblade, 1.6),
    'stonehammer': (lambda r: metal_hammer(r, 'stone', 1), 1.3),
    'copperhammer': (lambda r: metal_hammer(r, 'copper', 2), 1.4),
    'ironhammer': (lambda r: metal_hammer(r, 'iron', 3), 1.45),
    'crystalhammer': (lambda r: metal_hammer(r, 'crystal', 4), 1.5),
    'wyrmbreaker': (wyrmbreaker, 1.7),
    'jellywhip': (lambda r: whip(r, '#6fdc7a', '#ffb4c8', '#8a5a8a'), 0.9),
    'sporewhip': (lambda r: whip(r, '#e8505a', '#fff0d8'), 0.9),
    'batwhip': (lambda r: whip(r, '#7a5ab8', '#ff6a8a', '#3a2a4a'), 0.9),
    'glimmerwhip': (lambda r: whip(r, '#c8b0ff', '#fff6c8', '#4a3a6a'), 0.9),
    'dragontail': (lambda r: whip(r, '#c83a3a', GOLD, '#3a1a1a', flame=True), 0.95),
    'jellysling': (lambda r: slingshot(r, '#6fdc7a', '#ffb4c8'), 1.0),
    'sporewand': (lambda r: wand(r, '#6a4a3a', 'spore'), 1.3),
    'batwand': (lambda r: wand(r, '#3a2a4a', 'bat'), 1.3),
    'glimmerwand': (lambda r: wand(r, '#6b4a8a', 'glimmer'), 1.3),
    'wyrmfire': (lambda r: wand(r, '#5a1a1a', 'dragon'), 1.35),
}
