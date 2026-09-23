"""Shared Blender helpers: scene setup, cel-shaded materials, primitive builders and sprite rendering.

All models are built from code so the art is reproducible: run `bun run art` to regenerate every sprite.
"""
import math
import os

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

OUT = os.environ.get('ART_OUT', os.path.join(os.path.dirname(__file__), 'out'))
ELEVATION = math.radians(30)  # camera tilt above the horizon for world sprites
OUTLINE = (0.19, 0.11, 0.24)


# ----------------------------------------------------------------------------- colors


def srgb(h):
    """Hex '#rrggbb' → linear RGB tuple (Blender node inputs are linear)."""
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


# ----------------------------------------------------------------------------- scene


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.eevee.taa_render_samples = 16
    sc.render.film_transparent = True
    sc.render.filter_size = 1.2
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    world = bpy.data.worlds.new('World')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.35
    sc.world = world
    # Key light from the upper-left-front so shading reads the same as the canvas art.
    sun = bpy.data.lights.new('Key', 'SUN')
    sun.energy = 5.0
    sun.angle = math.radians(8)
    key = bpy.data.objects.new('Key', sun)
    key.rotation_euler = (math.radians(50), 0, math.radians(-35))
    sc.collection.objects.link(key)
    _MATS.clear()


def camera(ortho_scale, elevation=ELEVATION, target=(0, 0, 0)):
    """Orthographic camera looking north (+Y), tilted down by `elevation`."""
    sc = bpy.context.scene
    cam = sc.camera
    if cam is None:
        cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
        sc.collection.objects.link(cam)
        sc.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = ortho_scale
    cam.data.clip_start = 0.01
    cam.data.clip_end = 100
    d = 20
    t = Vector(target)
    cam.location = t + Vector((0, -math.cos(elevation) * d, math.sin(elevation) * d))
    cam.rotation_euler = (math.pi / 2 - elevation, 0, 0)
    return cam


# ----------------------------------------------------------------------------- materials

_MATS = {}


def toon(color, shade=None, rim=0.22, emit=0.0, name=None):
    """Flat cel-shaded material: two-tone ramp from a Diffuse→ShaderToRGB, plus a soft rim light.

    Output is an Emission shader so colors come out exactly as picked (no exposure surprises).
    """
    key = (color, shade, rim, emit)
    if key in _MATS:
        return _MATS[key]
    base = srgb(color) if isinstance(color, str) else color
    sh = srgb(shade) if isinstance(shade, str) else shade
    if sh is None:
        # Shadows lean purple instead of going grey — keeps things soft and cute.
        sh = mix(tuple(c * 0.74 for c in base), srgb('#7a5aa8'), 0.14)
    m = bpy.data.materials.new(name or f'toon_{color}')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    diff = nt.nodes.new('ShaderNodeBsdfDiffuse')
    s2r = nt.nodes.new('ShaderNodeShaderToRGB')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'EASE'
    ramp.color_ramp.elements[0].position = 0.72
    ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp.color_ramp.elements[1].position = 0.84
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    mixc = nt.nodes.new('ShaderNodeMix')
    mixc.data_type = 'RGBA'
    mixc.inputs[6].default_value = (*sh, 1)
    mixc.inputs[7].default_value = (*base, 1)
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs[0].default_value = 0.25
    rr = nt.nodes.new('ShaderNodeMapRange')
    rr.inputs[1].default_value = 0.55
    rr.inputs[2].default_value = 0.8
    rr.inputs[3].default_value = 0
    rr.inputs[4].default_value = rim
    add = nt.nodes.new('ShaderNodeMix')
    add.data_type = 'RGBA'
    add.blend_type = 'ADD'
    add.inputs[7].default_value = (1, 1, 1, 1)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[1].default_value = 1.0 + emit
    L = nt.links.new
    L(diff.outputs[0], s2r.inputs[0])
    L(s2r.outputs[0], ramp.inputs[0])
    L(ramp.outputs[0], mixc.inputs[0])
    L(lw.outputs['Facing'], rr.inputs[0])
    L(rr.outputs[0], add.inputs[0])
    L(mixc.outputs[2], add.inputs[6])
    L(add.outputs[2], em.inputs[0])
    L(em.outputs[0], out.inputs[0])
    if emit:
        # Glowing parts ignore the light ramp entirely.
        mixc.inputs[6].default_value = (*base, 1)
    _MATS[key] = m
    return m


def outline_mat():
    if 'outline' in _MATS:
        return _MATS['outline']
    m = bpy.data.materials.new('outline')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.remove(nt.nodes['Principled BSDF'])
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs[0].default_value = (*srgb('#3a2448'), 1)
    nt.links.new(em.outputs[0], nt.nodes['Material Output'].inputs[0])
    m.use_backface_culling = True
    _MATS['outline'] = m
    return m


def outline(obj, thickness=0.022):
    """Inverted-hull outline: a flipped Solidify shell that only shows its back faces."""
    if obj.type != 'MESH':
        return
    obj.data.materials.append(outline_mat())
    mod = obj.modifiers.new('Outline', 'SOLIDIFY')
    mod.thickness = -thickness
    mod.use_flip_normals = True
    mod.use_rim = False
    mod.material_offset = len(obj.data.materials) - 1
    mod.offset = 1


# ----------------------------------------------------------------------------- primitives


def _finish(obj, mat, parent, smooth=True, line=0.022, bevel=0.0):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    if bevel:
        b = obj.modifiers.new('Bevel', 'BEVEL')
        b.width = bevel
        b.segments = 3
        b.limit_method = 'ANGLE'
    if parent is not None:
        obj.parent = parent
    if line:
        outline(obj, line)
    return obj


def _link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def empty(name='root', parent=None, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    if parent is not None:
        e.parent = parent
    return _link(e)


def sphere(loc, scale, mat, parent=None, seg=24, line=0.022, rot=(0, 0, 0), name='sphere'):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(8, seg // 2), radius=1)
    # Bake the scale into the mesh so outline thickness stays in world units.
    bmesh.ops.scale(bm, vec=scale if isinstance(scale, (tuple, list)) else (scale,) * 3, verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    o = _link(bpy.data.objects.new(name, me))
    o.location = loc
    o.rotation_euler = rot
    return _finish(o, mat, parent, line=line)


def cylinder(loc, radius, depth, mat, parent=None, seg=20, rot=(0, 0, 0), line=0.022, r2=None, name='cyl', bevel=0.0):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=radius,
                          radius2=radius if r2 is None else r2, depth=depth)
    bm.to_mesh(me)
    bm.free()
    o = _link(bpy.data.objects.new(name, me))
    o.location = loc
    o.rotation_euler = rot
    _finish(o, mat, parent, smooth=True, line=line, bevel=bevel)
    # Flat caps look cleaner with auto-smooth-by-angle.
    for p in o.data.polygons:
        p.use_smooth = abs(p.normal.z) < 0.9
    return o


def cone(loc, radius, depth, mat, parent=None, seg=20, rot=(0, 0, 0), line=0.022, name='cone', r2=0.0):
    return cylinder(loc, radius, depth, mat, parent, seg, rot, line, r2=r2, name=name)


def box(loc, size, mat, parent=None, rot=(0, 0, 0), bevel=0.05, line=0.022, name='box'):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bm.to_mesh(me)
    bm.free()
    o = _link(bpy.data.objects.new(name, me))
    o.location = loc
    o.scale = size
    o.rotation_euler = rot
    _finish(o, mat, parent, smooth=False, line=0, bevel=0)
    if bevel:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        o.select_set(False)
        b = o.modifiers.new('Bevel', 'BEVEL')
        b.width = bevel
        b.segments = 4
        for p in o.data.polygons:
            p.use_smooth = True
        o.data.shade_smooth()
    if line:
        outline(o, line)
    return o


def torus(loc, major, minor, mat, parent=None, rot=(0, 0, 0), line=0.018, name='torus', seg=32):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    for i in range(seg):
        a = i / seg * math.tau
        ring = []
        for j in range(12):
            b = j / 12 * math.tau
            r = major + minor * math.cos(b)
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), minor * math.sin(b))))
        if i:
            for j in range(12):
                bm.faces.new((prev[j], prev[(j + 1) % 12], ring[(j + 1) % 12], ring[j]))
        else:
            first = ring
        prev = ring
    for j in range(12):
        bm.faces.new((prev[j], prev[(j + 1) % 12], first[(j + 1) % 12], first[j]))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = _link(bpy.data.objects.new(name, me))
    o.location = loc
    o.rotation_euler = rot
    return _finish(o, mat, parent, line=line)


def profile(points, depth, mat, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.02, line=0.02, name='profile'):
    """Extrudes a 2D outline drawn in the XZ plane (x right, z up) by `depth` along Y.

    Great for blades, axe heads, wings and signs.
    """
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in points]
    back = [bm.verts.new((x, depth / 2, z)) for x, z in points]
    bm.faces.new(front[::-1])
    bm.faces.new(back)
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = _link(bpy.data.objects.new(name, me))
    o.location = loc
    o.rotation_euler = rot
    _finish(o, mat, parent, smooth=False, line=line, bevel=bevel)
    return o


def lathe(points, mat, parent=None, loc=(0, 0, 0), seg=24, rot=(0, 0, 0), line=0.02, name='lathe'):
    """Spins a (radius, z) profile around Z — vases, fountains, mushroom caps, roofs."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for i in range(seg):
        a = i / seg * math.tau
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in points])
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for j in range(len(points) - 1):
            bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = _link(bpy.data.objects.new(name, me))
    o.location = loc
    o.rotation_euler = rot
    return _finish(o, mat, parent, line=line)


def crystal(loc, radius, height, mat, parent=None, rot=(0, 0, 0), sides=6, line=0.02, name='crystal'):
    """Hexagonal prism with a pointed tip."""
    pts = [(radius, 0), (radius, height * 0.72), (0.0001, height)]
    o = lathe(pts, mat, parent, loc, seg=sides, rot=rot, line=line, name=name)
    for p in o.data.polygons:
        p.use_smooth = False
    return o


# ----------------------------------------------------------------------------- rendering


def render(path, width, height, ppu, anchor=(0, 0, 0), elevation=ELEVATION, fit_origin=0.8, fit_x=0.5):
    """Renders the scene to `path`. The world point `anchor` lands at (0.5, fit_origin) of the frame.

    Returns the anchor's pixel position (from top-left) so the game knows where the "feet" are.
    """
    sc = bpy.context.scene
    sc.render.resolution_x = width
    sc.render.resolution_y = height
    sc.render.resolution_percentage = 100
    ortho = max(width, height) / ppu
    cam = camera(ortho, elevation)
    # Shift so the anchor sits at the requested spot; shift is relative to the larger frame side.
    big = max(width, height)
    cam.data.shift_x = (0.5 - fit_x) * width / big
    cam.data.shift_y = (fit_origin - 0.5) * height / big
    cam.location += Vector(anchor) - Vector((0, 0, 0))
    bpy.context.view_layer.update()
    p = world_to_camera_view(sc, cam, Vector(anchor))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return (p.x * width, (1 - p.y) * height)


def clear_objects(keep=('Key', 'Cam')):
    for o in list(bpy.data.objects):
        if o.name not in keep:
            bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)
