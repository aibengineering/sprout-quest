"""Village buildings as 3D models for the live crafting scene: public/assets/crafting3d/<id>.glb.

The same builders as the pre-rendered layers (art/buildings), with each layer merged into one mesh that's a top-level
node named after its layer id, so the scene can show a building's layers one by one. Vertex data carries the toon
settings exactly as the character models do (see art/models.py): colour in COLOR_0, rim, glow and outline width ×10 in
COLOR_1. Z-up in Blender, front facing -Y, origin at the plot centre on the ground; exported Y-up, then compressed with
gltfpack (see build.sh).

Usage: blender -b --factory-startup -P art/building_models.py -- [id,id,...|all]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import bpy  # noqa: E402
import lib  # noqa: E402
import models  # noqa: E402  (tags every toon material, so this comes before the buildings import theirs)

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'crafting3d')

# The renders were tessellated for still images; a model downloads every triangle, so curves get just enough segments
# for their size on screen (patched before the builders import these). Bevels are halved the same way, in export().
_sphere, _torus = lib.sphere, lib.torus
SPHERE_SEG = int(os.environ.get('SPHERE_SEG', 16))
TORUS_SEG = int(os.environ.get('TORUS_SEG', 16))
BEVEL_SEG = int(os.environ.get('BEVEL_SEG', 2))


def _sphere_lod(loc, scale, mat, parent=None, seg=24, *args, **kw):
    r = max(scale) if isinstance(scale, (tuple, list)) else scale
    cap = SPHERE_SEG if r >= 0.25 else max(8, SPHERE_SEG * 3 // 4) if r >= 0.08 else 8
    return _sphere(loc, scale, mat, parent, min(seg, cap), *args, **kw)


def _torus_lod(*args, seg=32, **kw):
    return _torus(*args, seg=min(seg, TORUS_SEG), **kw)


lib.sphere, lib.torus = _sphere_lod, _torus_lod

import buildings  # noqa: E402


def merge_layer(name, objects):
    """One mesh in world space (modifiers applied) for everything in a layer, at the scene root."""
    dg = bpy.context.evaluated_depsgraph_get()
    pieces = []
    for o in objects:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        me.transform(o.matrix_world)
        if o.matrix_world.determinant() < 0:
            me.flip_normals()
        piece = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(piece)
        pieces.append(piece)
    with bpy.context.temp_override(active_object=pieces[0], selected_editable_objects=pieces):
        bpy.ops.object.join()
    layer = pieces[0]
    layer.name = layer.data.name = name
    return layer


def export(building_id):
    lib.reset()
    root = lib.empty('build_' + building_id)
    parts = buildings.module(building_id).build_building(root)
    models.prepare_meshes()
    for o in bpy.data.objects:
        for m in o.modifiers:
            if m.type == 'BEVEL':
                m.segments = min(m.segments, BEVEL_SEG)
    owned = {o for objects in parts.values() for o in objects}
    stray = [o.name for o in bpy.data.objects if o.type == 'MESH' and o not in owned]
    if stray:
        raise ValueError(f'{building_id}: meshes outside every layer: {stray[:5]}')
    # Free the layer names first: Blender gives clashing objects a .001 suffix.
    for o in list(bpy.data.objects):
        o.name = '_' + o.name
    layers = [merge_layer(name, objects) for name, objects in parts.items()]
    for o in list(bpy.data.objects):
        if o not in layers:
            bpy.data.objects.remove(o, do_unlink=True)
    assert [o.name for o in layers] == list(parts), [o.name for o in layers]
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f'{building_id}.raw.glb'), export_format='GLB', export_apply=True,
        export_animations=False, export_materials='NONE', export_texcoords=False, export_normals=True,
        export_vertex_color='ACTIVE', export_all_vertex_colors=True, export_active_vertex_color_when_no_material=True,
        export_cameras=False, export_lights=False, export_extras=False, export_yup=True,
    )
    print(f'EXPORTED {building_id}: {", ".join(parts)}')


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ids = buildings.ids() if not args or args[0] in ('', 'all') else args[0].split(',')
    for building_id in ids:
        export(building_id)
