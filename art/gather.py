"""Close-up art for the chopping and mining minigame (src/gather.ts), rendered big and nearly side-on.

Trees come as the whole tree (while you chop) plus the stump and the top it splits into once felled, all anchored at
the base so they line up. Rocks crack and break apart in the game, so each is one sprite. Tools are drawn handle-up
with the grip at the origin, one per tier.

Keep the numbers the game relies on in sync with GATHER_ART in src/gather.ts: where each tree is cut (CUT), the trunk's
radius there, and the render scale (PPU) and camera tilt (ELEVATION).
"""
import math
import random

from lib import box, crystal, cylinder, empty, lathe, profile, sphere, toon, torus

PPU = 240
ELEVATION = math.radians(15)
CUT = {'oak': 0.3, 'pine': 0.22}
TRUNK_R = {'oak': 0.2, 'pine': 0.15}


# ----------------------------------------------------------------------------- trees


def _ridges(root, z0, z1, r0, r1, color, n=5, seed=0):
    """Bark: thin darker ridges running up the front of the trunk, in short pieces that follow its taper."""
    rnd = random.Random(seed)
    for i in range(n):
        a = -math.pi / 2 + (i - (n - 1) / 2) * 0.42 + rnd.uniform(-0.08, 0.08)
        za, zb = z0 + rnd.uniform(0, 0.04), z1 - rnd.uniform(0, 0.06)
        steps = max(1, round((zb - za) / 0.14))
        for k in range(steps):
            lo, hi = za + (zb - za) * k / steps, za + (zb - za) * (k + 1) / steps
            r = r0 + (r1 - r0) * (((lo + hi) / 2 - z0) / max(1e-6, z1 - z0)) + 0.002
            cylinder((math.cos(a) * r, math.sin(a) * r, (lo + hi) / 2), 0.018, hi - lo + 0.01, toon(color), root, seg=6,
                     line=0)


def _rings(root, z, r, heart, ring):
    """A fresh cut face: pale heartwood with growth rings."""
    cylinder((0, 0, z), r, 0.012, toon(heart), root, seg=28, line=0.01)
    for k in (0.33, 0.62, 0.86):
        torus((0, 0, z + 0.007), r * k, 0.008, toon(ring), root, seg=28, line=0)
    sphere((0, 0, z + 0.008), (0.025, 0.025, 0.006), toon(ring), root, seg=10, line=0)


def _trunk(root, part, flare, cut, rc, rt, top, bark, seg=24):
    """A trunk that flares out at the foot, lathed so it can be split at the cut: the whole thing, the stump below the
    cut (capped, for its rings to sit on), or the part above (open at the bottom, so no outline runs along the cut)."""
    foot = [(0.0001, 0), (flare, 0), (flare * 0.84, 0.05), (flare * 0.74, 0.14)]
    if part == 'whole':
        pts = foot + [(rc, cut), (rt, top), (0.0001, top)]
    elif part == 'stump':
        pts = foot + [(rc, cut), (0.0001, cut)]
    else:
        pts = [(rc, cut), (rt, top), (0.0001, top)]
    lathe(pts, toon(bark), root, seg=seg)
    if part != 'top':
        # Root knuckles where the trunk meets the ground.
        for a in (-2.3, -1.2, -0.3, 0.6):
            sphere((math.cos(a) * flare * 0.9, math.sin(a) * flare * 0.9, 0.04), (0.09, 0.06, 0.06), toon(bark), root,
                   seg=12, rot=(0, 0, a), line=0.016)


def oak(part='whole'):
    """A chunky oak: a flared, ridged trunk, a couple of branches and a canopy of rounded lobes with apples."""
    root = empty('oak')
    bark, ridge, heart, ring = '#9a6a44', '#7a5236', '#f3dcaa', '#c89a60'
    cut, rc, rt, top = CUT['oak'], TRUNK_R['oak'], 0.15, 1.05
    _trunk(root, part, 0.3, cut, rc, rt, top, bark)
    lo, hi = (0.12, cut) if part == 'stump' else (cut, top) if part == 'top' else (0.12, top)
    _ridges(root, lo, hi, 0.22 if lo < cut else rc, rc if hi <= cut else rt, ridge, seed=1)
    if part == 'stump':
        _rings(root, cut, rc, heart, ring)
        return root
    for a, tilt, z in ((-0.5, 0.75, 0.8), (2.6, 0.85, 0.86)):
        cylinder((math.cos(a) * 0.16, math.sin(a) * 0.1, z), 0.05, 0.42, toon(bark), root, seg=8, r2=0.025,
                 rot=(0, tilt * (1 if math.cos(a) > 0 else -1), 0), line=0.016)
    # Canopy lobes, back to front: darker behind, lighter in front, so each one reads.
    dark, mid, light = '#3f9a45', '#52b052', '#6ac666'
    lobes = [(-0.46, 0.18, 1.18, 0.38, dark), (0.46, 0.18, 1.2, 0.38, dark), (0, 0.22, 1.6, 0.42, dark),
             (-0.3, -0.04, 1.4, 0.36, mid), (0.3, -0.04, 1.42, 0.36, mid), (0, 0.0, 1.12, 0.4, mid),
             (-0.24, -0.3, 1.1, 0.27, light), (0.26, -0.28, 1.2, 0.26, light), (0.0, -0.26, 1.5, 0.25, light)]
    for x, y, z, r, col in lobes:
        sphere((x, y, z), r, toon(col), root, seg=28)
    for x, y, z, r, _ in lobes[6:]:
        for dx, dz in ((-0.1, -0.08), (0.12, 0.1)):
            sphere((x + dx, y - r * 0.88, z + dz), 0.07, toon('#ff5e5e'), root, seg=14, line=0.014)
    return root


def pine(part='whole'):
    """A tall pine: a straight, flared trunk under four tiers of needles."""
    root = empty('pine')
    bark, ridge, heart, ring = '#7a5238', '#5e3e2a', '#f0dca0', '#c8a070'
    cut, rc, rt, top = CUT['pine'], TRUNK_R['pine'], 0.11, 0.7
    _trunk(root, part, 0.22, cut, rc, rt, top, bark, seg=20)
    lo, hi = (0.1, cut) if part == 'stump' else (cut, top) if part == 'top' else (0.1, top)
    _ridges(root, lo, hi, 0.16 if lo < cut else rc, rc if hi <= cut else rt, ridge, n=4, seed=3)
    if part == 'stump':
        _rings(root, cut, rc, heart, ring)
        return root
    cols = ('#2f7a45', '#3d8f52')
    for i in range(4):
        w = 0.72 - i * 0.14
        lathe([(0.0001, 0.58 - i * 0.04), (w, 0.0), (w - 0.12, -0.07), (0.0001, -0.03)], toon(cols[i % 2]), root,
              loc=(0, 0, 0.5 + i * 0.36), seg=20)
    sphere((0, 0, 0.5 + 3 * 0.36 + 0.56), 0.07, toon('#fff6c0', emit=0.3), root, line=0.012)
    return root


# ----------------------------------------------------------------------------- rocks


ROCKS = {
    # body, darker lumps, what glints in it (matching the map's rock nodes in env.py)
    'rock': ('#9aa0b0', '#80869a', '#c4c9d6'),
    'copper': ('#8a7a6a', '#6e6054', '#ff9a4a'),
    'iron': ('#5e6272', '#4a4d5c', '#c8dcf8'),
}


def boulder(name):
    """A big mineable boulder: a main body, lumps and pebbles around its foot, and nuggets of its ore."""
    body, dark, nugget = ROCKS[name]
    root = empty('boulder')
    sphere((0, 0, 0.42), (0.66, 0.5, 0.46), toon(body), root, seg=18, rot=(0, 0.08, 0.35))
    sphere((0.4, -0.16, 0.24), (0.34, 0.3, 0.26), toon(dark), root, seg=14)
    sphere((-0.42, 0.02, 0.22), (0.3, 0.28, 0.24), toon(dark), root, seg=14)
    # A lighter, sunlit cap on top.
    sphere((-0.08, -0.12, 0.74), (0.4, 0.3, 0.14), toon('#b6bccb' if name == 'rock' else body), root, seg=16, rot=(0, -0.2, 0))
    for x, y, s in ((0.7, -0.3, 0.09), (-0.72, -0.28, 0.08), (0.55, -0.48, 0.06), (-0.5, -0.5, 0.05)):
        sphere((x, y, s * 0.6), (s, s * 0.9, s * 0.7), toon(dark), root, seg=10, line=0.014)
    shine = name != 'rock'
    for x, z, s in ((-0.3, 0.55, 0.075), (0.12, 0.72, 0.065), (0.32, 0.46, 0.08), (-0.05, 0.36, 0.055),
                    (0.48, 0.28, 0.055), (-0.48, 0.32, 0.05)):
        if shine:
            crystal((x, -0.44 + abs(x) * 0.12, z), s, s * 1.8, toon(nugget, emit=0.35, rim=0.5), root, rot=(1.0, 0.25 * x, 0),
                    sides=5, line=0.012)
        else:
            sphere((x, -0.46 + abs(x) * 0.12, z), (s * 0.9, s * 0.4, s * 0.6), toon(nugget), root, seg=8, line=0)
    return root


def crystal_rock():
    """A crystal cluster: a stubby rock base sprouting big glowing shards."""
    root = empty('xtal')
    sphere((0, 0, 0.22), (0.6, 0.45, 0.28), toon('#6a6488'), root, seg=16)
    sphere((0.42, -0.12, 0.14), (0.24, 0.2, 0.16), toon('#5a5478'), root, seg=12)
    for x, y, h, tilt, col in ((-0.24, 0, 0.86, -0.35, '#9ae6ff'), (0.14, -0.06, 1.08, 0.18, '#c8b0ff'),
                               (0.42, 0.05, 0.66, 0.55, '#9ae6ff'), (-0.02, -0.24, 0.56, -0.1, '#e0d0ff'),
                               (-0.46, -0.1, 0.5, -0.7, '#c8b0ff')):
        crystal((x, y, 0.26), 0.13, h, toon(col, rim=0.5, emit=0.15), root, rot=(0, tilt, 0), sides=6)
    return root


# ----------------------------------------------------------------------------- tools

WOOD, GRIP = '#b07a4a', '#6b4a3a'
# Head metal per tier: stone, copper, iron, crystal (matching the Forge's tools).
METAL = {1: ('#a8a8b4', '#7c7c8a'), 2: ('#f0a060', '#c06a30'), 3: ('#d6dde8', '#9aa4b4'), 4: ('#9ae6ff', '#5ab0e0')}
HANDLE = 0.7
# How much bigger than life the heads are drawn (the game aims the tool by where the head's point or edge lands).
HEAD_SCALE = {'axe': 1.3, 'pick': 1.12}


def _handle(root, tier):
    cylinder((0, 0, HANDLE / 2 - 0.02), 0.042, HANDLE + 0.06, toon(WOOD), root, seg=12, line=0.016)
    cylinder((0, 0, 0.07), 0.048, 0.16, toon(GRIP), root, seg=12, line=0.016)
    if tier >= 3:
        for z in (0.02, 0.08, 0.14):
            torus((0, 0, z), 0.049, 0.01, toon('#4a2a3a'), root, seg=16, line=0)


def _curve(a, c, b, n=6):
    """Points along a quadratic curve from a to b (control c), excluding a."""
    return [((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1])
            for t in (i / n for i in range(1, n + 1))]


def axe(tier):
    """An axe, handle up, the blade on the left (the side it strikes with)."""
    base = empty('axe')
    _handle(base, tier)
    metal, dark = METAL[tier]
    # The head is built around the top of the handle, then drawn a bit larger than life so it reads at a glance.
    root = empty('head', base, loc=(0, 0, HANDLE))
    root.scale = (HEAD_SCALE['axe'],) * 3
    L = 0
    pts = [(0.03, L - 0.02), (0.03, L - 0.16), (-0.12, L - 0.22)]
    pts += _curve((-0.12, L - 0.22), (-0.27, L - 0.1), (-0.23, L + 0.13))
    pts += [(-0.1, L + 0.05), (0.03, L + 0.05)]
    profile(pts, 0.05, toon(metal, rim=0.4, emit=0.15 if tier == 4 else 0), root, bevel=0.012, line=0.016)
    # The sharpened edge.
    edge = [(-0.12, L - 0.2)] + _curve((-0.12, L - 0.2), (-0.26, L - 0.1), (-0.22, L + 0.11)) + [(-0.19, L + 0.09)] + \
        _curve((-0.19, L + 0.09), (-0.22, L - 0.08), (-0.1, L - 0.17))
    profile(edge, 0.056, toon('#ffffff', rim=0.2), root, bevel=0, line=0)
    box((0.06, 0, L - 0.06), (0.1, 0.07, 0.13), toon(dark), root, bevel=0.015, line=0.014)
    if tier == 1:
        # A stone head is lashed on.
        for z in (L - 0.13, L - 0.02):
            torus((0.02, 0, z), 0.05, 0.012, toon('#c8a870'), root, rot=(0, 0, 0), seg=14, line=0)
    return base


def pick(tier):
    """A pickaxe, handle up, the point on the left."""
    base = empty('pick')
    _handle(base, tier)
    metal, dark = METAL[tier]
    root = empty('head', base, loc=(0, 0, HANDLE))
    root.scale = (HEAD_SCALE['pick'],) * 3
    L = 0
    top = [(-0.36, L - 0.12)] + _curve((-0.36, L - 0.12), (-0.18, L + 0.13), (0, L + 0.13)) + \
        _curve((0, L + 0.13), (0.17, L + 0.13), (0.31, L - 0.07))
    bottom = _curve((0.31, L - 0.07), (0.15, L - 0.01), (0, L - 0.01)) + _curve((0, L - 0.01), (-0.17, L - 0.01), (-0.36, L - 0.12))
    profile(top + bottom[:-1], 0.055, toon(metal, rim=0.4, emit=0.15 if tier == 4 else 0), root, bevel=0.01, line=0.016)
    box((0, 0, L + 0.04), (0.11, 0.08, 0.13), toon(dark), root, bevel=0.015, line=0.014)
    if tier == 4:
        crystal((-0.34, 0, L - 0.1), 0.02, 0.08, toon('#ffffff', emit=0.5), root, rot=(0, -2.4, 0), sides=5, line=0)
    return base


def tools():
    """Every tool the Forge makes: (name, builder)."""
    from gear_parts import item_module
    def build(item_id, legacy):
        item = item_module(item_id)
        if item and hasattr(item, 'build_item'):
            root = empty(item_id)
            item.build_item(root)
            return root
        return legacy()
    return [(f'axe{t}', lambda t=t: build(f'axe{t}', lambda: axe(t))) for t in (1, 2)] + [(f'pick{t}', lambda t=t: build(f'pick{t}', lambda: pick(t))) for t in (1, 2, 3, 4)]
