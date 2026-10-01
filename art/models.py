"""Characters as 3D models for the game's real-time renderer (src/models.ts): the hero in every armor, the villagers and
every monster, each with its animations, written to public/assets/models/<name>.glb.

Every mesh carries its cel-shading settings in its vertex data, its colour (COLOR_0) and its rim light, glow and outline
width ×10 (COLOR_1), so gltfpack (see build.sh) can merge the pieces that move together and compress the result. Poses come
from the same functions the sprites were rendered with (hero.pose, each monster's idle loop), keyed as animations.

Usage: blender -b --factory-startup -P art/models.py -- [name,name,...]
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import bmesh  # noqa: E402
import bpy  # noqa: E402
import lib  # noqa: E402

# Remember every material's toon settings; this has to happen before the models import `toon`.
_toon = lib.toon


def _tagged(color, shade=None, rim=0.22, emit=0.0, name=None):
    m = _toon(color, shade, rim, emit, name)
    m['toon'] = json.dumps({'color': color, 'rim': rim, 'emit': emit})
    return m


lib.toon = _tagged

import hero  # noqa: E402
import monsters  # noqa: E402
import weapons  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'models')
FPS = 24


def breathe(P, t, part='body', head=None):
    """A gentle idle: the body swells and settles, and something small sways."""
    s = math.sin(t * math.tau)
    P[part].scale = (1 + 0.02 * s, 1 + 0.02 * s, 1 - 0.025 * s)
    if head:
        P[head].rotation_euler = (0, 0.05 * s, 0)


def walker(P, t, moving):
    """The hero's walk cycle, and standing (breathing) when not moving."""
    hero.pose(P, t, moving)
    P['body'].scale = (1, 1, 1)
    if not moving:
        s = math.sin(t * math.tau)
        P['body'].scale = (1 - 0.008 * s, 1 - 0.008 * s, 1 + 0.015 * s)


def walker_anims():
    return {'idle': (lambda P, t: walker(P, t, False), 50), 'walk': (lambda P, t: walker(P, t, True), 12)}


def monster(kind):
    def build():
        P, anim = monsters.build(kind)
        return P, {'idle': (anim, FPS)}
    return build


def weapon(wid):
    """A weapon for the hero's hand: grip at the origin, pointing along +X (see art/weapons.py). A little chunkier across
    than life, as the sprites were, so it reads at phone size."""
    root = lib.empty('weapon')
    weapons.WEAPONS[wid][0](root)
    root.scale = (1, 1.25, 1.25)
    return {'root': root}, {}


# name: () -> (parts, {animation: (pose(parts, phase), frames at 24 fps)})
CHARACTERS = {
    **{f'hero_{a}': (lambda a=a: (hero.build(a), walker_anims())) for a in hero.ARMORS},
    'npc_poppy': lambda: (hero.build_poppy(), walker_anims()),
    'npc_poppy_hug': lambda: (hero.build_poppy(hug=True), {'idle': (lambda P, t: breathe(P, t), 32)}),
    'npc_elder': lambda: (hero.build_elder(), {'idle': (lambda P, t: breathe(P, t, head='hat'), 32)}),
    'npc_granny': lambda: (hero.build_granny(), {'idle': (lambda P, t: breathe(P, t, head='head'), 32)}),
    'npc_bram': lambda: (hero.build_bram(), walker_anims()),
    'npc_bram_hurt': lambda: (hero.build_bram('hurt', hurt=True), walker_anims()),
    'npc_pip': lambda: (hero.build_pip(), walker_anims()),
    **{f'mon_{k}': monster(k) for k in monsters.BUILDERS},
    **{f'wpn_{w}': (lambda w=w: weapon(w)) for w in weapons.WEAPONS},
}


def linear(hex_color):
    return (*lib.srgb(hex_color), 1.0)


def prepare_meshes():
    """Bake each mesh's toon settings into its vertices, drop the Blender-only outline shells, and point normals out."""
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        mod = o.modifiers.get('Outline')
        line = -mod.thickness if mod else 0.0
        if mod:
            o.modifiers.remove(mod)
        mats = [m for m in o.data.materials if m and m.name != 'outline']
        t = json.loads(mats[0]['toon']) if mats and 'toon' in mats[0] else {'color': '#ff00ff', 'rim': 0.22, 'emit': 0}
        me = o.data
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        # Only the model's own faces (the outline shell's material slot is gone with its modifier).
        while len(me.materials) > 1:
            me.materials.pop()
        col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        c = linear(t['color'])
        for d in col.data:
            d.color = c
        me.color_attributes.active_color = col
        # Rim light, glow and outline width (×10, to fit 8-bit colour precision) ride along as a second colour set.
        toon = me.color_attributes.new('Toon', 'FLOAT_COLOR', 'POINT')
        v = (float(t.get('rim', 0.22)), float(t.get('emit', 0.0)), float(line) * 10, 1.0)
        for d in toon.data:
            d.color = v
        me.color_attributes.active_color = col
        me.color_attributes.render_color_index = me.color_attributes.find('Col')


def key_animations(P, anims):
    parts = [o for k, o in P.items() if not k.startswith('_') and isinstance(o, bpy.types.Object)]
    rest = {o: (tuple(o.location), tuple(o.rotation_euler), tuple(o.scale)) for o in parts}
    bpy.context.scene.render.fps = FPS
    for name, (pose, frames) in anims.items():
        for f in range(frames + 1):
            for o, (loc, rot, scale) in rest.items():
                o.location, o.rotation_euler, o.scale = loc, rot, scale
            pose(P, (f % frames) / frames)
            for o in parts:
                for path in ('location', 'rotation_euler', 'scale'):
                    o.keyframe_insert(path, frame=f)
        for o in parts:
            ad = o.animation_data
            act = ad.action
            act.name = f'{o.name}_{name}'
            for fc in act.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = 'LINEAR'
            ad.nla_tracks.new().name = name
            ad.nla_tracks[-1].strips.new(name, 0, act)
            ad.action = None
    for o, (loc, rot, scale) in rest.items():
        o.location, o.rotation_euler, o.scale = loc, rot, scale


def export(name):
    lib.reset()
    P, anims = CHARACTERS[name]()
    prepare_meshes()
    key_animations(P, anims)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f'{name}.raw.glb'), export_format='GLB', export_apply=True, export_animations=True,
        export_animation_mode='NLA_TRACKS', export_materials='NONE', export_texcoords=False, export_normals=True,
        export_vertex_color='ACTIVE', export_all_vertex_colors=True, export_active_vertex_color_when_no_material=True,
        export_cameras=False, export_lights=False, export_extras=False, export_yup=True,
        # Every animation sets every part it poses, even values that hold still, so switching animations never
        # leaves a part where the last one put it.
        export_optimize_animation_size=False, export_optimize_animation_keep_anim_object=True,
    )


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    names = args[0].split(',') if args and args[0] else list(CHARACTERS)
    for n in names:
        export(n)
    print(f'EXPORTED {len(names)} models')
