"""Small recipe-faithful shapes shared only by the four charm contributions."""
import math

import bpy
from lib import empty, profile, sphere, toon


def collect(fn):
    before = set(bpy.data.objects)
    fn()
    return [obj for obj in bpy.data.objects if obj not in before]


def cord(root, points, radius, color, name='cord'):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, xyz in zip(spline.points, points):
        p.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = root
    curve.materials.append(toon(color))
    # Mesh geometry also works with the shared model exporter's material baking.
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj


def leaf_cluster(root, x, y, z, scale, color='#5ac85a'):
    for i in range(4):
        a = math.pi / 4 + i * math.tau / 4
        lx, lz = x + math.cos(a) * .115 * scale, z + math.sin(a) * .115 * scale
        sphere((lx, y, lz), (.115 * scale, .036 * scale, .11 * scale), toon(color), root, line=.012 * scale, seg=16)
        cord(root, [(x, y - .038 * scale, z), (lx, y - .04 * scale, lz)], .009 * scale, '#97e577', 'leaf-vein')
    sphere((x, y - .038 * scale, z), .027 * scale, toon('#338d49'), root, line=0, seg=12)


def jelly_heart(root, scale=1, y=0, color='#b8a8f8'):
    points = []
    for i in range(48):
        t = i / 48 * math.tau
        points.append((16 * math.sin(t) ** 3 / 17 * .35 * scale,
                       (13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t)) / 17 * .35 * scale))
    return profile(points, .15 * scale, toon(color, rim=.28), root, loc=(0, y, 0), bevel=.045 * scale, line=.014)
