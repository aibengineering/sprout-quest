"""Shared pieces for the village buildings: the parts collector, the material palette and a few building blocks."""
import math

from lib import box, cylinder, empty, sphere, toon

TILE = 1.6

# What each material looks like once it's built into something. The new woods and obsidian are meant to read at a
# glance: pale glowing Glimmerwood, charcoal Emberwood with ember in the grain, glossy black Obsidian.
OAK, OAK_DARK, OAK_END = '#b98a5a', '#8a5a3a', '#e8c890'
PINE, PINE_DARK, PINE_END = '#c9925a', '#7a5238', '#f0dca0'
STONE, STONE_DARK = '#b8aca8', '#a89c98'
COPPER, IRON = '#e8904a', '#5e6272'
GLIM, GLIM_GRAIN, GLIM_ROOF = '#efe6ff', '#c9b6f6', '#8a78e8'
EMBER_WOOD, EMBER_GRAIN = '#3e3038', '#ff8a3a'
OBSIDIAN = '#2c2434'
CRYSTAL, CRYSTAL_PINK = '#9ae6ff', '#c8b0ff'


class Parts:
    """Each layer is an empty under the building's root; everything built under it belongs to that layer."""

    def __init__(self, root):
        self.root = root
        self.layers = {}

    def __call__(self, name, loc=(0, 0, 0)):
        if name not in self.layers:
            self.layers[name] = empty('part_' + name, self.root)
        if loc == (0, 0, 0):
            return self.layers[name]
        return empty(name + '_at', self.layers[name], loc)

    def objects(self):
        def meshes(obj):
            out = [obj] if obj.type == 'MESH' else []
            for child in obj.children:
                out += meshes(child)
            return out
        return {name: meshes(e) for name, e in self.layers.items()}


def glimwood(emit=0.25):
    return toon(GLIM, rim=0.5, emit=emit)


def obsidian():
    return toon(OBSIDIAN, shade='#16121c', rim=0.9)


def plank_wall(parent, loc, w, h, color, grain, depth=0.1, n=None, glow=0.0):
    """A wall of horizontal planks facing the camera (-Y), with a grain line between each board."""
    x, y, z = loc
    box(loc, (w, depth, h), toon(color, rim=0.4, emit=glow), parent, bevel=0.04)
    n = n or max(2, round(h / 0.32))
    for i in range(1, n):
        box((x, y - depth / 2 - 0.005, z - h / 2 + i * h / n), (w - 0.08, 0.02, 0.035), toon(grain, emit=glow), parent,
            bevel=0, line=0)


def ember_beam(parent, loc, size):
    """A charcoal Emberwood beam (upright or lying along X) with glowing ember grain along its face."""
    x, y, z = loc
    w, d, h = size
    box(loc, size, toon(EMBER_WOOD, shade='#241a22', rim=0.35), parent, bevel=0.03)
    ember = toon(EMBER_GRAIN, emit=1.2)
    fy = y - d / 2 - 0.006
    if w >= h:
        for dz, dx, f in ((-0.2, -0.22, 0.22), (0.18, 0.2, 0.18)):
            box((x + dx * w, fy, z + dz * h), (w * f, 0.02, 0.03), ember, parent, bevel=0, line=0)
    else:
        for dx, dz, f in ((-0.15, 0.2, 0.22), (0.18, -0.18, 0.16)):
            box((x + dx * w, fy, z + dz * h), (0.03, 0.02, h * f), ember, parent, bevel=0, line=0)


def stones(parent, x0, x1, y, z, rows=1, h=0.22, color=STONE_DARK, seed=0):
    """Rough squared stones laid in courses along X, facing the camera."""
    for j in range(rows):
        n = max(2, round((x1 - x0) / 0.55))
        step = (x1 - x0) / n
        for i in range(n + (j % 2)):
            x = x0 + (i + 0.5 - (j % 2) * 0.5) * step
            x = min(max(x, x0 + step * 0.25), x1 - step * 0.25)
            wob = ((i * 7 + j * 3 + seed) % 5 - 2) * 0.012
            box((x, y, z + j * h + wob), (step * 0.92 * (0.5 if j % 2 and i in (0, n) else 1), 0.12, h * 0.86), toon(color), parent,
                bevel=0.035, line=0.012)


def lantern(parent, loc, glow='#ffd35a', frame=IRON):
    x, y, z = loc
    box((x, y, z), (0.14, 0.14, 0.2), toon(glow, emit=0.9), parent, bevel=0.02, line=0.01)
    box((x, y, z + 0.12), (0.2, 0.2, 0.04), toon(frame), parent, bevel=0.01, line=0.01)
    cylinder((x, y, z - 0.12), 0.08, 0.04, toon(frame), parent, seg=8, line=0.01)


def flowers(parent, s, spots, z=0.0):
    """Little flowers (a stem and a five-petal head) at the given (x, y, colour) spots, as env.py draws them."""
    for x, y, col in spots:
        cylinder((x * s, y * s, z + 0.05 * s), 0.008 * s, 0.1 * s, toon('#4fae4f'), parent, seg=6, line=0)
        for p in range(5):
            a = p / 5 * math.tau
            sphere((x * s + math.cos(a) * 0.025 * s, y * s, z + 0.11 * s + math.sin(a) * 0.025 * s), 0.02 * s, toon(col), parent,
                   seg=8, line=0.006)
        sphere((x * s, (y - 0.01) * s, z + 0.11 * s), 0.013 * s, toon('#ffb03a'), parent, seg=8, line=0)

