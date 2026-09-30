"""Small geometry helpers owned by the four crystal/glimmer weapons.

All geometry uses the existing +X weapon axis and grip origin. No textures,
transparent materials, or animation nodes are needed in the equipped model.
"""
import math

import bpy
from lib import _finish, _link, cylinder, lathe, profile, sphere, toon

X = (0, math.pi / 2, 0)
IRON = '#7a8498'
IRON_LIGHT = '#cbd9e5'
JELLY = '#c8b0ff'  # Keep the current coil color: the combat renderer removes it.
# Glimmer Jelly hardened into glass: luminous lilac/pink bodies with pale icy facets.
GLOW = '#f1c4ff'
GLOW_PINK = '#ffd3ef'
GLOW_DEEP = '#d59cf2'
ICE = '#d8f8ff'
ICE_MID = '#a6e6f6'
SHINE = '#fff6ff'


def facet(points, root, colors=('#9ae6ff', '#72bddc', '#dcf7ff'), depth=.07):
    """Raised triangular faces make crystal read without texture or bloom."""
    objects = [profile(points, depth, toon(colors[1], rim=.28), root, bevel=0, line=.012)]
    cx = sum(p[0] for p in points) / len(points)
    cz = sum(p[1] for p in points) / len(points)
    for side in (-1, 1):
        for i, p in enumerate(points):
            q = points[(i + 1) % len(points)]
            mesh = bpy.data.meshes.new('crystal_facet')
            mesh.from_pydata([(p[0], side * depth / 2, p[1]),
                             (q[0], side * depth / 2, q[1]),
                             (cx, side * (depth / 2 + .018), cz)], [], [(0, 1, 2)])
            obj = _link(bpy.data.objects.new('crystal_facet', mesh))
            objects.append(_finish(obj, toon(colors[i % len(colors)], rim=.2), root,
                                   smooth=False, line=0))
    return objects


def rod(root, start, end, radius, color, line=.012):
    return cylinder(((start + end) / 2, 0, 0), radius, end - start,
                    toon(color), root, rot=X, seg=10, line=line)


def bead(root, x, z=0, radius=.025):
    # Restrained glimmer: a small milky fleck, not a glowing silhouette.
    return sphere((x, -.045, z), radius, toon('#f4edff', rim=.25, emit=.12),
                  root, seg=8, line=0)


def glow(color=GLOW, emit=.22, rim=.3):
    """Lit-from-within jelly: pale shadow so it never goes dusky like bat membrane."""
    return toon(color, shade='#c79ae8' if color != ICE else '#86c9e6', rim=rim, emit=emit)


def shard(root, loc, radius, back, front, color, rot=(0, 0, 0), sides=6, line=.010, mid=None):
    """Double-pointed faceted shard along local Z (back tip at -back, front tip at +front)."""
    body = front * .55 if mid is None else mid
    obj = lathe([(.0001, -back), (radius, 0), (radius, body), (.0001, front)],
                color if not isinstance(color, str) else glow(color), root, loc=loc,
                seg=sides, rot=rot, line=line, name='glimmer_shard')
    for p in obj.data.polygons:
        p.use_smooth = False
    return obj
