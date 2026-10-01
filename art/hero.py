"""The chibi hero, with a distinct look for every armor."""
import math

from lib import box, cone, crystal, cylinder, empty, profile, sphere, toon, torus
from gear_parts import item_module

SKIN = '#ffe2c8'


def face_skin(color=SKIN):
    """Skin that the light ramp leaves alone: a round chibi head lit from above puts the bottom half of the face in
    shadow, which reads as a beard. A whisper of glow (too little to see) skips the shadow in both the Blender renders
    and the game's shader, the usual cel-shading choice for faces."""
    return toon(color, emit=0.02)
HAIR = '#8a5a3a'

ARMORS = {
    'tunic': dict(body='#6fa8ff', trim='#b98a5a'),
    'fluffvest': dict(body='#ffd8e0', trim='#ffffff'),
    'shroomhood': dict(body='#e8505a', trim='#fff0d8'),
    'batcloak': dict(body='#7a5ab8', trim='#4a3a78'),
    'crystalmail': dict(body='#7ad0f0', trim='#e0fbff'),
    'magmamail': dict(body='#4a3a44', trim='#ff9a3a'),
    'dragonmail': dict(body='#c83a3a', trim='#ffd35a'),
    'barkvest': dict(body='#9a6a44', trim='#6fbf5a'),
    'coppermail': dict(body='#e8904a', trim='#8a5a3a'),
    'ironplate': dict(body='#aab4c8', trim='#5e6272'),
    'glimmershawl': dict(body='#c8b0ff', trim='#ffd35a'),
}


def build_fluffvest(bodyp, arms=None):
    """The actual fluffy garment, also used for the Forge's registered assembly layers.

    Two pressed-wool panels, a cloud collar and cuffs are held together by mint Slime Goo.
    Keep these parts separate: crafting.py renders each list on the same camera/canvas.
    Optional arm pivots let the sleeves/cuffs follow the existing hero rig unchanged.
    """
    import bmesh
    import bpy
    from lib import _finish, _link
    from mathutils import Vector

    pink = toon('#ffd8e0')
    wool = toon('#fff9f7')
    goo = toon('#8cda9a', rim=0.12)
    shine = toon('#ddfbe0', rim=0.05)
    parts = {key: [] for key in ('left-panel', 'right-panel', 'collar', 'left-cuff', 'right-cuff', 'goo-seams')}

    def binding(points, radius, parent):
        """A continuous glossy ribbon of goo, not a row of decorative beads."""
        points = [Vector(p) for p in points]
        bm = bmesh.new()
        rows = []
        for i, p in enumerate(points):
            tangent = (points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]).normalized()
            axis = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((0, 1, 0))
            u = tangent.cross(axis).normalized()
            v = tangent.cross(u).normalized()
            rows.append([bm.verts.new(p + radius * (math.cos(j / 10 * math.tau) * u +
                                                   math.sin(j / 10 * math.tau) * v)) for j in range(10)])
        for lower, upper in zip(rows, rows[1:]):
            for j in range(10):
                bm.faces.new((lower[j], lower[(j + 1) % 10], upper[(j + 1) % 10], upper[j]))
        bm.faces.new(rows[0][::-1])
        bm.faces.new(rows[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new('slime_goo_binding')
        bm.to_mesh(mesh)
        bm.free()
        obj = _link(bpy.data.objects.new('slime_goo_binding', mesh))
        _finish(obj, goo, parent, line=0.003)
        parts['goo-seams'].append(obj)

    # A rounded waist and shoulders, rather than a complete ball: the opening and hem
    # make this read as a wearable even without the hero's head, hands or feet.
    rings = [(0.125, 0.215, 0.155), (0.14, 0.255, 0.19), (0.18, 0.28, 0.22),
             (0.28, 0.286, 0.246), (0.39, 0.274, 0.242), (0.47, 0.252, 0.207),
             (0.535, 0.185, 0.145)]
    for side, key in ((-1, 'left-panel'), (1, 'right-panel')):
        me = bpy.data.meshes.new('fluffy_panel')
        bm = bmesh.new()
        rows = []
        for z, rx, ry in rings:
            rows.append([bm.verts.new((side * (0.009 + rx * math.sin(i / 20 * math.pi)),
                                      -ry * math.cos(i / 20 * math.pi), z)) for i in range(21)])
        for lower, upper in zip(rows, rows[1:]):
            for i in range(20):
                bm.faces.new((lower[i], lower[i + 1], upper[i + 1], upper[i]))
        bm.faces.new(rows[0][::-1])
        bm.faces.new(rows[-1])
        # The flat center edge closes each half, and is covered by the goo binding.
        bm.faces.new([row[0] for row in rows] + [row[-1] for row in rows[::-1]])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        panel = _link(bpy.data.objects.new('fluffy_' + key, me))
        _finish(panel, pink, bodyp, line=0.012)
        sub = panel.modifiers.new('Soft pressed wool', 'SUBSURF')
        sub.levels = sub.render_levels = 2
        # Apply the smoothing before the outline shell, preserving a crisp cute edge.
        panel.modifiers.move(len(panel.modifiers) - 1, 0)
        parts[key].append(panel)
        arm = arms[side] if arms else empty('fluffy_sleeve_pivot', bodyp, (0.29 * side, 0, 0.37))
        parts[key].append(sphere((0.02 * side, 0, -0.035), (0.098, 0.102, 0.12), pink, arm, line=0.012))
        # Tiny wool tufts in the panels tie their material to the fluffy collar.
        for x, y, z, tilt in ((0.125, -0.245, 0.36, -0.35), (0.145, -0.23, 0.27, 0.25)):
            parts[key].append(sphere((side * x, y, z), (0.035, 0.008, 0.01), wool, bodyp,
                                     line=0, rot=(0, side * tilt, 0)))
        cuff_key = 'left-cuff' if side < 0 else 'right-cuff'
        parts[cuff_key].append(torus((0.02 * side, 0, -0.12), 0.071, 0.025, wool, arm, line=0.01))
        for i in range(7):
            a = i / 7 * math.tau
            parts[cuff_key].append(sphere((0.02 * side + math.cos(a) * 0.07,
                                          math.sin(a) * 0.07, -0.12),
                                         (0.033, 0.033, 0.037), wool, arm, line=0.007))
        # Only the exposed front edge is green, so the registered top layer also
        # composites correctly without drawing back-facing rings over the wool.
        binding([(0.02 * side + math.cos(math.pi + i / 20 * math.pi) * 0.072,
                  math.sin(math.pi + i / 20 * math.pi) * 0.085 - 0.008, -0.078)
                 for i in range(21)], 0.01, arm)

    # The neck stays open: a ring of separate soft puffs, with a lower front edge.
    for i in range(13):
        a = i / 13 * math.tau
        front = max(0, -math.sin(a))
        parts['collar'].append(sphere((math.cos(a) * 0.21, math.sin(a) * 0.165,
                                       0.545 - front * 0.035),
                                      (0.084, 0.077, 0.083), wool, bodyp, line=0.012))
    # A glossy, continuous binding runs down the front and around the lower hem.
    # At gameplay size it remains a small green signature instead of recoloring the vest.
    binding([(0, -0.216 - 0.044 * math.sin(i / 20 * math.pi), 0.145 + i / 20 * 0.325)
             for i in range(21)], 0.012, bodyp)
    binding([(math.cos(math.pi + i / 28 * math.pi) * 0.249,
              math.sin(math.pi + i / 28 * math.pi) * 0.197 - 0.007, 0.145)
             for i in range(29)], 0.009, bodyp)
    for z in (0.235, 0.355, 0.44):
        parts['goo-seams'].append(sphere((-0.003, -0.269 if z < 0.4 else -0.238, z),
                                         (0.004, 0.004, 0.014), shine, bodyp, line=0))
    return parts


def helmet(armor):
    """Does this armour cover the head (hiding the bangs and the leaf sprout)?"""
    return getattr(item_module(armor), 'HELMET', False)


def build_base():
    """The hero without armour: feet, hands, head, face and hair, on the named pivots the animations move.

    Armour hangs on these same pivots (`build_armor`); helmets hide the `bangs` and `sprout` pivots. The game composes
    the two at load time (src/models.ts), so every armour shares one base model.
    """
    P = {}
    root = P['root'] = empty('hero')
    bodyp = P['body'] = empty('bodyPivot', root)
    skin, hair = face_skin(), toon(HAIR)
    boot = toon('#6b4a3a')

    # Feet sit under their own pivots so the walk cycle can swing them.
    for side in (-1, 1):
        f = P[f'foot{side}'] = empty(f'foot{side}', root, (0.14 * side, 0, 0))
        sphere((0, -0.03, 0.06), (0.11, 0.14, 0.08), boot, f)
    for side in (-1, 1):
        arm = P[f'arm{side}'] = empty(f'arm{side}', bodyp, (0.29 * side, 0, 0.37))
        sphere((0.03 * side, -0.01, -0.14), 0.07, skin, arm)

    # Head
    head = P['head'] = empty('head', bodyp, (0, 0, 0.8))
    sphere((0, 0, 0), (0.37, 0.34, 0.33), skin, head, seg=32)
    face_y = -0.315
    for side in (-1, 1):
        sphere((0.125 * side, face_y, -0.03), (0.05, 0.03, 0.075), toon('#2a2233', rim=0), head, line=0)
        sphere((0.125 * side - 0.018, face_y - 0.025, 0.0), 0.018, toon('#ffffff', rim=0), head, line=0)
        sphere((0.21 * side, -0.27, -0.11), (0.055, 0.02, 0.03), toon('#ff9aaa', rim=0), head, line=0)
    sphere((0, -0.33, -0.12), (0.03, 0.012, 0.014), toon('#8a3a4a', rim=0), head, line=0)

    # Hair: a cap over the back/top of the head plus soft bangs.
    sphere((0, 0.05, 0.07), (0.39, 0.34, 0.31), hair, head, seg=32)
    bangs = P['bangs'] = empty('bangs', head)
    for x, z, s in ((-0.2, 0.17, 0.12), (-0.07, 0.21, 0.13), (0.08, 0.21, 0.13), (0.21, 0.16, 0.11)):
        sphere((x, -0.22, z), (s, 0.09, s * 0.8), hair, bangs)
    # Signature leaf sprout
    sprout = P['sprout'] = empty('sprout', head, (0, 0, 0.33))
    cylinder((0, 0, 0.07), 0.016, 0.14, toon('#4a9a3a'), sprout, seg=8)
    for side in (-1, 1):
        sphere((0.09 * side, 0, 0.15), (0.1, 0.04, 0.05), toon('#7ad85a'), sprout, rot=(0, -0.5 * side, 0))
    return P


def build_armor(P, armor):
    """Hangs an armour on the hero's pivots (`P` from build_base, or bare pivots with the same names and places)."""
    contribution = item_module(armor)
    if contribution is not None and hasattr(contribution, 'build_armor'):
        contribution.build_armor(P)
    elif armor == 'fluffvest':
        build_fluffvest(P['body'], {side: P[f'arm{side}'] for side in (-1, 1)})
    else:  # tunic
        a = ARMORS[armor]
        body_m, trim_m = toon(a['body']), toon(a['trim'])
        bodyp = P['body']
        # Body: a touch bigger than a pure chibi so the armor has room to show.
        sphere((0, 0, 0.33), (0.3, 0.25, 0.27), body_m, bodyp)
        torus((0, 0, 0.2), 0.26, 0.04, trim_m, bodyp)
        for side in (-1, 1):
            sphere((0.02 * side, 0, -0.04), (0.09, 0.09, 0.11), body_m, P[f'arm{side}'])
        # The starter look: a red scarf with a trailing end, and a brass buckle.
        scarf = toon('#ff6a6a')
        torus((0, 0, 0.55), 0.19, 0.055, scarf, bodyp)
        sphere((0.12, 0.2, 0.46), (0.07, 0.05, 0.13), scarf, bodyp, rot=(0.3, 0, -0.3))
        box((0, -0.25, 0.2), (0.07, 0.02, 0.06), toon('#ffd35a'), bodyp, bevel=0.01, line=0.01)


def build(armor):
    """The whole hero in an armour (for sprites and icons): the base with the armour on, bangs and sprout gone under
    a helmet. Returns a dict of named parts; `root` faces -Y (towards the camera) at rest.

    Every armor changes the silhouette as well as the colors (a collar, pauldrons, a cape, a hat or helmet), so they
    still read apart at phone size, where the torso is only a few pixels tall.
    """
    import bpy
    P = build_base()
    build_armor(P, armor)
    if helmet(armor):
        for key in ('bangs', 'sprout'):
            for o in [P[key], *P.pop(key).children_recursive]:
                bpy.data.objects.remove(o)
    return P


def pose(P, phase, moving):
    """Walk cycle. `phase` in [0, 1)."""
    s = math.sin(phase * math.tau)
    c = math.cos(phase * math.tau)
    if moving:
        for side in (-1, 1):
            f = P[f'foot{side}']
            f.location.y = 0.1 * s * side
            f.location.z = max(0, 0.06 * c * side)
            P[f'arm{side}'].rotation_euler = (0.5 * s * -side, 0, 0)
        P['body'].location.z = abs(s) * 0.05
        P['body'].rotation_euler = (0.06, 0, 0.05 * s)
    else:
        for side in (-1, 1):
            P[f'foot{side}'].location.y = 0
            P[f'foot{side}'].location.z = 0
            P[f'arm{side}'].rotation_euler = (0, 0, 0)
        P['body'].location.z = 0
        P['body'].rotation_euler = (0, 0, 0)


def build_elder():
    """Elder Oswin, Veyra's priest in Sowerby: a little old man in a green robe, a crown of leaves, a fluffy beard, a golden
    seed pendant and a staff topped with Veyra's sickle."""
    P = {}
    root = P['root'] = empty('elder')
    bodyp = P['body'] = empty('bodyPivot', root)
    skin, robe = face_skin(), toon('#6ab86a')
    for side in (-1, 1):
        sphere((0.12 * side, -0.03, 0.05), (0.09, 0.12, 0.06), toon('#6b4a3a'), root)
    sphere((0, 0, 0.3), (0.3, 0.26, 0.3), robe, bodyp)
    torus((0, 0, 0.18), 0.27, 0.035, toon('#ffd35a'), bodyp)
    head = P['head'] = empty('head', bodyp, (0, 0, 0.76))
    sphere((0, 0, 0), (0.35, 0.32, 0.31), skin, head, seg=32)
    for side in (-1, 1):
        # Kind, squinty eyes.
        sphere((0.12 * side, -0.3, 0.0), (0.05, 0.02, 0.018), toon('#2a2233', rim=0), head, line=0)
        sphere((0.2 * side, -0.26, -0.08), (0.05, 0.02, 0.03), toon('#ff9aaa', rim=0), head, line=0)
        sphere((0.13 * side, -0.29, 0.07), (0.07, 0.02, 0.025), toon('#ffffff'), head, line=0.01)
    for x, z, s in ((0, -0.2, 0.17), (-0.13, -0.14, 0.12), (0.13, -0.14, 0.12), (0, -0.33, 0.12)):
        sphere((x, -0.22, z), s, toon('#ffffff'), head)
    sphere((0, -0.33, -0.04), (0.06, 0.04, 0.05), toon('#ffc8b0'), head, line=0.01)
    hat = P['hat'] = empty('hat', head, (0, 0, 0.2))
    for i in range(6):
        a = i / 6 * math.tau
        sphere((math.cos(a) * 0.28, math.sin(a) * 0.26, 0.02), (0.22, 0.12, 0.05), toon('#5ac85a' if i % 2 else '#7ad85a'), hat, rot=(0, 0, a))
    sphere((0, 0, 0.1), (0.2, 0.2, 0.16), toon('#4aa84a'), hat)
    cone((0, 0, 0.3), 0.04, 0.18, toon('#4aa84a'), hat, seg=8)
    staff = empty('staff', bodyp, (0.36, -0.05, 0.0))
    cylinder((0, 0, 0.55), 0.03, 1.1, toon('#9a6a44'), staff, seg=8)
    # Veyra's sickle crowns the staff, with a golden seed where blade meets pole.
    from env import crescent
    blade = empty('blade', staff, (0, 0, 1.08))
    profile(crescent(0.14, 0.09), 0.03, toon('#e0e4ee'), blade, bevel=0.005, line=0.012)
    sphere((0, -0.02, 1.1), 0.045, toon('#ffd35a', emit=0.3), staff, line=0.01)
    # A golden seed pendant on a cord.
    torus((0, 0, 0.52), 0.16, 0.012, toon('#8a5a3a'), bodyp, rot=(0.35, 0, 0), line=0)
    sphere((0, -0.27, 0.38), (0.045, 0.03, 0.06), toon('#ffd35a', emit=0.3), bodyp, line=0.01)
    sphere((0.3, -0.04, 0.36), 0.065, skin, bodyp)
    return P


# ----------------------------------------------------------------------------- Poppy's story


def toy_bunny(parent, loc=(0, 0, 0), s=1.0):
    """Mr. Floppers: a well-loved blue plush bunny with one floppy ear, button eyes and a heart patch."""
    plush, inner = toon('#9ec4ff'), toon('#ffb4c8')
    t = empty('floppers', parent, loc)
    t.scale = (s, s, s)
    sphere((0, 0, 0.14), (0.14, 0.12, 0.15), plush, t)
    sphere((0, -0.105, 0.14), (0.05, 0.02, 0.05), toon('#ff6a8a'), t, line=0.01)  # heart patch
    head = empty('fhead', t, (0, 0, 0.34))
    sphere((0, 0, 0), (0.15, 0.13, 0.13), plush, head)
    for side in (-1, 1):
        sphere((0.06 * side, -0.12, 0.02), 0.022, toon('#2a2233', rim=0), head, line=0)  # button eyes
        sphere((0.13 * side, -0.04, 0.17), (0.05, 0.05, 0.05), plush, t)  # paws
    sphere((0, -0.13, -0.03), (0.02, 0.012, 0.014), toon('#ff8aa8', rim=0), head, line=0)
    # One ear up, one flopped over.
    up = empty('earup', head, (-0.06, 0, 0.1))
    sphere((0, 0, 0.12), (0.045, 0.03, 0.13), plush, up)
    sphere((0, -0.022, 0.12), (0.025, 0.01, 0.09), inner, up, line=0)
    flop = empty('earflop', head, (0.07, 0, 0.1))
    flop.rotation_euler = (0, 1.2, 0)
    sphere((0, 0, 0.1), (0.045, 0.03, 0.11), plush, flop)
    for side in (-1, 1):
        sphere((0.07 * side, -0.06, 0.03), (0.05, 0.06, 0.04), plush, t)  # feet
    return t


def _face(head, mood, hair):
    """Big chibi eyes, and a mood: happy, scared (tiny pupils, open mouth, raised brows, a sweat drop) or sad (tears)."""
    face_y = -0.315
    for side in (-1, 1):
        if mood == 'scared':
            sphere((0.125 * side, face_y, -0.02), (0.055, 0.03, 0.08), toon('#ffffff', rim=0), head, line=0.012)
            sphere((0.125 * side, face_y - 0.02, -0.01), (0.025, 0.02, 0.035), toon('#2a2233', rim=0), head, line=0)
        else:
            sphere((0.125 * side, face_y, -0.03), (0.05, 0.03, 0.075), toon('#2a2233', rim=0), head, line=0)
            sphere((0.125 * side - 0.018, face_y - 0.025, 0.0), 0.018, toon('#ffffff', rim=0), head, line=0)
        sphere((0.21 * side, -0.27, -0.11), (0.055, 0.02, 0.03), toon('#ff9aaa', rim=0), head, line=0)
        if mood in ('scared', 'sad'):
            # Brows tilted up at the middle.
            sphere((0.12 * side, -0.31, 0.1), (0.06, 0.015, 0.015), toon(hair, rim=0), head, rot=(0, -0.45 * side, 0), line=0)
        if mood == 'sad':
            sphere((0.13 * side, -0.33, -0.13), (0.025, 0.02, 0.04), toon('#8ad8ff', rim=0.4), head, line=0)  # tears
    if mood == 'scared':
        sphere((0, -0.33, -0.14), (0.035, 0.015, 0.04), toon('#8a3a4a', rim=0), head, line=0)  # "o"
        sphere((0.3, -0.2, 0.1), (0.035, 0.02, 0.05), toon('#bfe8ff', rim=0.4), head, line=0.01)  # sweat drop
    elif mood == 'sad':
        sphere((0, -0.33, -0.14), (0.04, 0.01, 0.01), toon('#8a3a4a', rim=0), head, line=0)
    else:
        sphere((0, -0.33, -0.12), (0.035, 0.012, 0.016), toon('#8a3a4a', rim=0), head, line=0)


def build_poppy(mood='happy', hug=False):
    """Poppy: a little girl from Sowerby, with auburn pigtails, pink bows and a sunny yellow dress.

    Same part names as the hero, so she walks with `pose`. With `hug`, she holds Mr. Floppers.
    """
    P = {}
    root = P['root'] = empty('poppy')
    bodyp = P['body'] = empty('bodyPivot', root)
    skin, hair = face_skin(), toon('#c8643a')
    dress, trim = toon('#ffd35a'), toon('#ffffff')
    for side in (-1, 1):
        f = P[f'foot{side}'] = empty(f'foot{side}', root, (0.11 * side, 0, 0))
        sphere((0, -0.03, 0.05), (0.08, 0.11, 0.06), toon('#e8505a'), f)
    # A flared dress with a white collar.
    cone((0, 0, 0.2), 0.3, 0.3, dress, bodyp, r2=0.18)
    sphere((0, 0, 0.36), (0.22, 0.19, 0.2), dress, bodyp)
    torus((0, 0, 0.5), 0.15, 0.035, trim, bodyp)
    for side in (-1, 1):
        arm = P[f'arm{side}'] = empty(f'arm{side}', bodyp, (0.22 * side, 0, 0.38))
        sphere((0.02 * side, 0, -0.03), (0.075, 0.075, 0.08), dress, arm)
        sphere((0.03 * side, -0.01, -0.11), 0.055, skin, arm)
    if hug:
        for side in (-1, 1):
            P[f'arm{side}'].rotation_euler = (1.1, 0, -0.5 * side)
        toy_bunny(bodyp, (0, -0.28, 0.2), 0.8)

    head = P['head'] = empty('head', bodyp, (0, 0, 0.74))
    sphere((0, 0, 0), (0.35, 0.32, 0.31), skin, head, seg=32)
    _face(head, mood, '#9a4a2a')
    sphere((0, 0.05, 0.07), (0.37, 0.33, 0.3), hair, head, seg=32)
    # Hair falling over the back of her neck, so no skin shows under it from behind.
    sphere((0, 0.14, -0.12), (0.33, 0.22, 0.22), hair, head, seg=24)
    for x, z, s in ((-0.19, 0.16, 0.11), (-0.06, 0.2, 0.12), (0.07, 0.2, 0.12), (0.19, 0.15, 0.1)):
        sphere((x, -0.2, z), (s, 0.08, s * 0.8), hair, head)
    bow = toon('#ff8ab0')
    for side in (-1, 1):
        # Pigtails with pink bows.
        sphere((0.36 * side, 0.08, -0.08), (0.11, 0.11, 0.17), hair, head)
        for k in (-1, 1):
            sphere((0.32 * side + 0.05 * k, 0.02, 0.1), (0.05, 0.03, 0.04), bow, head, line=0.012)
        sphere((0.32 * side, 0.0, 0.1), 0.025, bow, head, line=0.01)
    # A little flower clip.
    for i in range(5):
        a = i / 5 * math.tau
        sphere((-0.18 + math.cos(a) * 0.04, -0.2, 0.3 + math.sin(a) * 0.04), 0.03, toon('#ffffff'), head, line=0.008)
    sphere((-0.18, -0.22, 0.3), 0.022, toon('#ffd35a'), head, line=0)
    root.scale = (0.85, 0.85, 0.85)
    return P


def build_bram(mood='grumpy', hurt=False):
    """Bram, the lumberjack: big and broad, a red plaid shirt with braces, a green knit cap and a bushy russet beard.

    Same part names as the hero, so he walks with `pose`. Moods: grumpy (heavy brows, flat mouth), happy (a grin under
    the beard), hurt (a wince). With `hurt`, a bandage round his leg and a plaster on his brow.
    """
    P = {}
    root = P['root'] = empty('bram')
    bodyp = P['body'] = empty('bodyPivot', root)
    skin, beard = face_skin('#f0c8a8'), toon('#b0643a')
    red, black = toon('#d8483a'), toon('#3a2a2a')
    for side in (-1, 1):
        f = P[f'foot{side}'] = empty(f'foot{side}', root, (0.14 * side, 0, 0))
        sphere((0, -0.04, 0.06), (0.11, 0.15, 0.07), toon('#5a3a2a'), f)
        cylinder((0, 0, 0.16), 0.1, 0.2, toon('#4a5a7a'), f, seg=12)  # trousers
        if hurt and side == 1:
            torus((0, 0, 0.18), 0.1, 0.035, toon('#fff6e8'), f, line=0.01)
    # A barrel chest in red plaid, with dark braces.
    sphere((0, 0, 0.42), (0.36, 0.3, 0.32), red, bodyp)
    for z in (0.3, 0.46):
        torus((0, 0, z), 0.335 if z < 0.4 else 0.345, 0.018, black, bodyp, line=0)
    for x in (-0.14, 0.14):
        box((x, -0.27, 0.43), (0.022, 0.05, 0.5), black, bodyp, bevel=0.005, line=0)
    for side in (-1, 1):
        box((0.12 * side, -0.29, 0.44), (0.06, 0.04, 0.46), toon('#6a4a2a'), bodyp, bevel=0.01, line=0.008)  # braces
        arm = P[f'arm{side}'] = empty(f'arm{side}', bodyp, (0.36 * side, 0, 0.5))
        sphere((0.03 * side, 0, -0.06), (0.11, 0.11, 0.14), red, arm)
        sphere((0.05 * side, -0.02, -0.2), 0.08, skin, arm)
    head = P['head'] = empty('head', bodyp, (0, 0, 0.86))
    sphere((0, 0, 0), (0.33, 0.3, 0.3), skin, head, seg=32)
    face_y = -0.29
    brow = toon('#5a3222', rim=0)
    for side in (-1, 1):
        if mood == 'happy':
            # Squinting with a grin: flat, upturned eyes and rosy cheeks.
            sphere((0.12 * side, face_y, 0.01), (0.05, 0.02, 0.018), toon('#2a2233', rim=0), head, rot=(0, -0.3 * side, 0), line=0)
            sphere((0.21 * side, -0.25, -0.06), (0.06, 0.02, 0.035), toon('#ff9aaa', rim=0), head, line=0)
        elif mood == 'hurt':
            sphere((0.12 * side, face_y, 0.0), (0.05, 0.02, 0.022), toon('#2a2233', rim=0), head, rot=(0, 0.35 * side, 0), line=0)
        else:
            sphere((0.12 * side, face_y, -0.005), (0.04, 0.02, 0.035), toon('#2a2233', rim=0), head, line=0)
        # Heavy brows: slanted down to the middle when grumpy, up when hurt, relaxed when happy.
        tilt = {'grumpy': -0.5, 'hurt': 0.45}.get(mood, 0.1)
        box((0.12 * side, -0.3, 0.085), (0.15, 0.035, 0.05), brow, head, rot=(0, tilt * side, 0), bevel=0.015, line=0.008)
    sphere((0, -0.31, -0.03), (0.06, 0.05, 0.05), toon('#f4a888', rim=0), head, line=0.01)  # nose
    # The beard: a big bushy spade from ear to ear, with a moustache, and a mouth that shows his mood.
    sphere((0, -0.14, -0.2), (0.3, 0.22, 0.2), beard, head, seg=24)
    sphere((0, -0.2, -0.33), (0.2, 0.15, 0.14), beard, head)
    for side in (-1, 1):
        sphere((0.08 * side, -0.3, -0.1), (0.09, 0.04, 0.035), beard, head, rot=(0, 0.3 * side, 0), line=0.008)
    if mood == 'happy':
        sphere((0, -0.34, -0.15), (0.08, 0.02, 0.035), toon('#8a3a4a', rim=0), head, line=0)
    if mood == 'hurt':
        sphere((0.28, -0.18, 0.08), (0.035, 0.02, 0.05), toon('#bfe8ff', rim=0.4), head, line=0.01)  # sweat drop
    if hurt:
        box((0.16, -0.25, 0.14), (0.1, 0.02, 0.05), toon('#ffe0c0'), head, rot=(0, 0.4, 0), bevel=0.01, line=0.006)
    # A green knit cap with a turned-up brim.
    sphere((0, 0.03, 0.2), (0.34, 0.31, 0.22), toon('#4a8a4a'), head, seg=24)
    torus((0, 0.02, 0.16), 0.31, 0.05, toon('#3a7a3a'), head, line=0.012)
    sphere((0, 0.05, 0.42), 0.07, toon('#e8e0d0'), head, line=0.01)
    root.scale = (1.08, 1.08, 1.08)
    return P


def build_granny(mood='happy'):
    """Granny Clover, the village cobbler: silver bun, round glasses, a lilac shawl over her apron."""
    P = {}
    root = P['root'] = empty('granny')
    bodyp = P['body'] = empty('bodyPivot', root)
    skin, hair = face_skin(), toon('#e8e4f0')
    for side in (-1, 1):
        sphere((0.12 * side, -0.03, 0.05), (0.09, 0.12, 0.06), toon('#6b4a3a'), root)
    cone((0, 0, 0.22), 0.32, 0.36, toon('#8a6ab8'), bodyp, r2=0.22)
    sphere((0, 0, 0.4), (0.26, 0.22, 0.22), toon('#8a6ab8'), bodyp)
    box((0, -0.2, 0.26), (0.26, 0.04, 0.3), toon('#fff6e0'), bodyp, bevel=0.03)  # apron
    torus((0, 0, 0.52), 0.2, 0.06, toon('#e89ac8'), bodyp)  # shawl
    for side in (-1, 1):
        sphere((0.26 * side, -0.04, 0.34), (0.08, 0.08, 0.1), toon('#8a6ab8'), bodyp)
        sphere((0.27 * side, -0.07, 0.24), 0.06, skin, bodyp)
    head = P['head'] = empty('head', bodyp, (0, 0, 0.8))
    sphere((0, 0, 0), (0.33, 0.3, 0.29), skin, head, seg=32)
    face_y = -0.29
    for side in (-1, 1):
        # Kind, squinty eyes behind round glasses.
        sphere((0.12 * side, face_y, -0.01), (0.045, 0.02, 0.016), toon('#2a2233', rim=0), head, line=0)
        torus((0.12 * side, face_y - 0.02, -0.01), 0.075, 0.012, toon('#c89a4a'), head, rot=(math.pi / 2, 0, 0), line=0)
        sphere((0.2 * side, -0.25, -0.1), (0.05, 0.02, 0.03), toon('#ff9aaa', rim=0), head, line=0)
        if mood == 'worried':
            sphere((0.12 * side, -0.29, 0.1), (0.06, 0.015, 0.015), toon('#b8b4c0', rim=0), head, rot=(0, -0.4 * side, 0), line=0)
    sphere((0, -0.31, -0.13), (0.04, 0.012, 0.012 if mood == 'worried' else 0.018), toon('#8a3a4a', rim=0), head, line=0)
    sphere((0, 0.04, 0.08), (0.35, 0.31, 0.27), hair, head, seg=32)
    sphere((0, 0.12, 0.32), (0.16, 0.16, 0.14), hair, head)  # bun
    cylinder((0.08, 0.12, 0.34), 0.012, 0.3, toon('#c89a4a'), head, rot=(0, 1.2, 0), seg=8)  # hairpin
    return P


def build_pip(mood='happy'):
    """Pip, the mole miner: small and round, soft brown fur, a big pink nose, tiny bead eyes, a yellow hard hat with a
    lamp, big pink digging paws, a satchel on a strap and a little pick on his back.

    Same part names as the hero, so he walks with `pose`. Moods: happy (a smile) and wow (brows up, an "o" mouth).
    """
    P = {}
    root = P['root'] = empty('pip')
    bodyp = P['body'] = empty('bodyPivot', root)
    fur, belly, pink = toon('#8a6248'), toon('#d8b090'), toon('#ff9ab0')
    for side in (-1, 1):
        f = P[f'foot{side}'] = empty(f'foot{side}', root, (0.13 * side, 0, 0))
        sphere((0, -0.05, 0.045), (0.09, 0.12, 0.05), pink, f)
    # A round little body with a pale belly.
    sphere((0, 0, 0.32), (0.32, 0.29, 0.31), fur, bodyp, seg=32)
    sphere((0, -0.18, 0.29), (0.21, 0.14, 0.21), belly, bodyp, line=0.012)
    # A satchel on a strap across his chest, and a little pick slung on his back.
    torus((0, 0, 0.36), 0.33, 0.022, toon('#6a4a2a'), bodyp, rot=(0, 0.55, 0), line=0.008)
    bag = empty('satchel', bodyp, (0.3, -0.06, 0.18))
    box((0, 0, 0), (0.12, 0.2, 0.18), toon('#b8783a'), bag, bevel=0.03, line=0.012)
    box((-0.005, -0.01, 0.06), (0.13, 0.21, 0.08), toon('#a0642e'), bag, bevel=0.02, line=0.01)
    sphere((0.065, -0.01, 0.03), 0.02, toon('#ffd35a'), bag, line=0.006)
    pick = empty('pick', bodyp, (-0.05, 0.3, 0.4))
    pick.rotation_euler = (0, 0.6, 0)
    cylinder((0, 0, 0), 0.025, 0.62, toon('#c89a6a'), pick, seg=8, line=0.01)
    profile([(-0.2, 0.0), (0, 0.06), (0.2, 0.0), (0.2, -0.03), (0, 0.02), (-0.2, -0.03)], 0.05, toon('#9aa4b8', rim=0.35), pick,
            loc=(0, 0, 0.3), bevel=0.01, line=0.012)
    for side in (-1, 1):
        # Stubby arms, and the big pink digging paws of a mole, with pale claws.
        arm = P[f'arm{side}'] = empty(f'arm{side}', bodyp, (0.29 * side, -0.02, 0.4))
        sphere((0.03 * side, 0, -0.04), (0.085, 0.085, 0.1), fur, arm)
        paw = empty(f'paw{side}', arm, (0.06 * side, -0.05, -0.13))
        sphere((0, 0, 0), (0.1, 0.06, 0.09), pink, paw)
        for k in (-1, 0, 1):
            cone((0.035 * k, -0.02, -0.09), 0.02, 0.06, toon('#fff6e8'), paw, rot=(math.pi, 0, 0), seg=8, line=0.006)
    head = P['head'] = empty('head', bodyp, (0, 0, 0.72))
    sphere((0, 0, 0), (0.34, 0.31, 0.29), fur, head, seg=32)
    # A long soft snout, ending in the big pink nose.
    sphere((0, -0.24, -0.07), (0.13, 0.14, 0.1), belly, head, line=0.012)
    sphere((0, -0.38, -0.05), (0.09, 0.07, 0.075), pink, head, line=0.014)
    sphere((-0.03, -0.43, -0.02), (0.025, 0.012, 0.02), toon('#ffffff', rim=0), head, line=0)
    eye = toon('#2a2233', rim=0)
    for side in (-1, 1):
        big = 1.35 if mood == 'wow' else 1
        sphere((0.12 * side, -0.27, 0.05), (0.034 * big, 0.02, 0.04 * big), eye, head, line=0)
        sphere((0.12 * side - 0.012, -0.29, 0.068), 0.011 * big, toon('#ffffff', rim=0), head, line=0)
        sphere((0.21 * side, -0.22, -0.06), (0.055, 0.02, 0.03), toon('#ff8aa0', rim=0), head, line=0)  # rosy cheeks
        # Little round ears peeking out from under the hat.
        sphere((0.3 * side, 0.02, 0.06), (0.05, 0.035, 0.05), fur, head, line=0.01)
        if mood == 'wow':
            sphere((0.12 * side, -0.26, 0.15), (0.045, 0.012, 0.014), toon('#4a3222', rim=0), head, line=0)
    if mood == 'wow':
        sphere((0, -0.29, -0.17), (0.045, 0.02, 0.05), toon('#8a3a4a', rim=0), head, line=0)  # "o"
    else:
        for side in (-1, 1):
            sphere((0.03 * side, -0.29, -0.16), (0.035, 0.012, 0.012), toon('#8a3a4a', rim=0), head, rot=(0, 0.45 * side, 0), line=0)
    # The yellow hard hat, with its brim and a lamp on the front.
    hat = empty('hat', head, (0, 0.02, 0.13))
    if mood == 'wow':
        hat.rotation_euler = (-0.3, 0, 0)  # pushed up in surprise
    sphere((0, 0, 0.04), (0.29, 0.27, 0.2), toon('#ffd35a'), hat, seg=32)
    cylinder((0, -0.02, 0.0), 0.33, 0.035, toon('#f2c240'), hat, seg=32, line=0.012)
    box((0, 0.0, 0.2), (0.05, 0.4, 0.05), toon('#f2c240'), hat, bevel=0.02, line=0.008)  # ridge
    cylinder((0, -0.27, 0.1), 0.065, 0.07, toon('#6a6a78'), hat, rot=(math.pi / 2, 0, 0), seg=16, line=0.01)
    cylinder((0, -0.31, 0.1), 0.05, 0.012, toon('#fff6c8', emit=0.6), hat, rot=(math.pi / 2, 0, 0), seg=16, line=0.006)
    root.scale = (0.8, 0.8, 0.8)
    return P


def build_boots():
    """Trail Boots: sturdy little brown boots with green laces and a leaf charm."""
    root = empty('boots')
    leather, sole = toon('#9a6a44'), toon('#5a3a2a')
    for side in (-1, 1):
        b = empty(f'boot{side}', root, (0.16 * side, 0, 0))
        sphere((0, -0.06, 0.06), (0.12, 0.18, 0.08), leather, b)
        cylinder((0, 0.02, 0.2), 0.1, 0.26, leather, b, seg=16)
        box((0, -0.04, 0.0), (0.24, 0.38, 0.04), sole, b, bevel=0.02)
        for z in (0.14, 0.22, 0.3):
            box((0, -0.09, z), (0.12, 0.02, 0.018), toon('#6fbf5a'), b, bevel=0.005, line=0)
    sphere((0.2, -0.14, 0.3), (0.06, 0.02, 0.04), toon('#7ad85a'), root, rot=(0, 0.6, 0), line=0.01)
    # Turned to show off the toes and soles.
    root.rotation_euler = (0, 0, math.radians(60))
    return root
