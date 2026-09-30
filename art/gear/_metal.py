"""Small geometry helpers exclusive to the three ore-armors.

No rig or exporter is duplicated here. Builders accept the existing hero pivots,
and return mesh lists for the registered, headless crafting layers.
"""
import math

import bmesh
import bpy
from lib import _finish, _link, box, empty, sphere, toon


def pivots(body, arms=None, head=None):
    arms = arms or {s: empty('armor_arm' + str(s), body, (s * .29, 0, .37)) for s in (-1, 1)}
    head = head or empty('armor_head', body, (0, 0, .8))
    return arms, head


def shell(parent, color, name, bands=3):
    """A hollow, rounded cuirass, with open neck/hem and overlapping forged bands."""
    material = toon(color, rim=.16)
    objects = []
    for band in range(bands):
        z0 = .135 + band * .125
        z1 = z0 + .145
        rings = []
        bm = bmesh.new()
        for z, inset in ((z0, 0), (z1, 0), (z1, -.018), (z0, -.018)):
            # The upper rim tapers into the neck rather than a solid ellipsoid.
            rx = (.282 if z < .41 else .282 - (z - .41) * .8) + inset
            ry = (.226 if z < .41 else .226 - (z - .41) * .6) + inset
            rings.append([bm.verts.new((rx * math.sin(i / 24 * math.tau),
                                       -ry * math.cos(i / 24 * math.tau), z)) for i in range(24)])
        for a, b in zip(rings, rings[1:] + rings[:1]):
            for i in range(24):
                j = (i + 1) % 24
                bm.faces.new((a[i], a[j], b[j], b[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        obj = _link(bpy.data.objects.new(name, mesh))
        _finish(obj, material, parent, smooth=False, bevel=.006, line=.012)
        objects.append(obj)
    return objects


def shoulder(parent, color, name, size=(.127, .135, .065)):
    return sphere((.025 if parent.location.x > 0 else -.025, 0, .103), size,
                  toon(color, rim=.16), parent, seg=16, line=.012, name=name)


def stone(loc, parent, name, scale=(.047, .018, .042)):
    """Rounded six-sided stone, deliberately matte beside metal/crystal."""
    return sphere(loc, scale, toon('#9d9caa', rim=.025), parent, seg=8, line=.009, name=name)


def rivet(loc, parent, name, radius=.018):
    return sphere(loc, radius, toon('#efa663', rim=.16), parent, seg=10, line=.004, name=name)


def beam(loc, parent, name, size, tilt=0):
    """Pine has a warm cut face and one broad dark grain rather than tiny noise."""
    return [box(loc, size, toon('#bd8858', rim=.06), parent, rot=(0, tilt, 0),
                bevel=.008, line=.008, name=name),
            box((loc[0], loc[1] - size[1] / 2 - .002, loc[2]),
                (size[0] * .15, .003, size[2] * .7), toon('#80573c', rim=.02), parent,
                rot=(0, tilt, 0), bevel=.001, line=0, name=name + '_grain')]
