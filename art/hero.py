"""The chibi hero, with a distinct look for every armor."""
import math

from lib import box, cone, crystal, cylinder, empty, profile, sphere, toon, torus

SKIN = '#ffe2c8'
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


def build(armor):
    """Returns a dict of named parts; `root` faces -Y (towards the camera) at rest.

    Every armor changes the silhouette as well as the colors (a collar, pauldrons, a cape, a hat or helmet), so they
    still read apart at phone size, where the torso is only a few pixels tall.
    """
    a = ARMORS[armor]
    P = {}
    root = P['root'] = empty('hero')
    bodyp = P['body'] = empty('bodyPivot', root)
    skin, hair = toon(SKIN), toon(HAIR)
    body_m, trim_m = toon(a['body']), toon(a['trim'])
    boot = toon('#6b4a3a')

    # Feet sit under their own pivots so the walk cycle can swing them.
    for side in (-1, 1):
        f = P[f'foot{side}'] = empty(f'foot{side}', root, (0.14 * side, 0, 0))
        sphere((0, -0.03, 0.06), (0.11, 0.14, 0.08), boot, f)

    # Body: a touch bigger than a pure chibi so the armor has room to show.
    sphere((0, 0, 0.33), (0.3, 0.25, 0.27), body_m, bodyp)
    torus((0, 0, 0.2), 0.26, 0.04, trim_m, bodyp)
    for side in (-1, 1):
        arm = P[f'arm{side}'] = empty(f'arm{side}', bodyp, (0.29 * side, 0, 0.37))
        sphere((0.02 * side, 0, -0.04), (0.09, 0.09, 0.11), body_m, arm)
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

    helm = armor in ('shroomhood', 'dragonmail', 'ironplate')
    # Hair: a cap over the back/top of the head plus soft bangs.
    sphere((0, 0.05, 0.07), (0.39, 0.34, 0.31), hair, head, seg=32)
    if not helm:
        for x, z, s in ((-0.2, 0.17, 0.12), (-0.07, 0.21, 0.13), (0.08, 0.21, 0.13), (0.21, 0.16, 0.11)):
            sphere((x, -0.22, z), (s, 0.09, s * 0.8), hair, head)
        # Signature leaf sprout
        sprout = P['sprout'] = empty('sprout', head, (0, 0, 0.33))
        cylinder((0, 0, 0.07), 0.016, 0.14, toon('#4a9a3a'), sprout, seg=8)
        for side in (-1, 1):
            sphere((0.09 * side, 0, 0.15), (0.1, 0.04, 0.05), toon('#7ad85a'), sprout, rot=(0, -0.5 * side, 0))

    def pauldrons(mat, size=(0.15, 0.14, 0.09), z=0.47):
        for side in (-1, 1):
            sphere((0.28 * side, 0, z), size, mat, bodyp)

    def cape(color, bottom=0.14):
        # Thick enough to read as cloth from the side, and stopping above the feet.
        profile([(-0.3, 0.56), (0.3, 0.56), (0.4, bottom), (0.2, bottom + 0.06), (0.0, bottom - 0.02), (-0.2, bottom + 0.06), (-0.4, bottom)],
                0.1, toon(color), bodyp, loc=(0, 0.2, 0.02))

    if armor == 'fluffvest':
        # A big fluffy collar and cuffs.
        fluff = toon('#ffffff')
        for i in range(11):
            ang = i / 11 * math.tau
            sphere((math.cos(ang) * 0.22, math.sin(ang) * 0.18, 0.54), 0.1, fluff, bodyp)
        for side in (-1, 1):
            sphere((0.3 * side, -0.01, 0.26), 0.075, fluff, bodyp)
    elif armor == 'shroomhood':
        cap = toon('#e8505a')
        sphere((0, 0, 0.2), (0.48, 0.46, 0.3), cap, head, seg=32)
        for x, y, z in ((-0.26, -0.22, 0.25), (0.2, -0.28, 0.22), (0.0, -0.1, 0.46), (0.33, 0.05, 0.3), (-0.3, 0.12, 0.33)):
            sphere((x, y, z), 0.075, toon('#fff6ea'), head, line=0.012)
    elif armor == 'batcloak':
        cape('#4a3a78')
        # A high collar and bat ears.
        for side in (-1, 1):
            cone((0.2 * side, 0.02, 0.33), 0.09, 0.24, toon('#7a5ab8'), head, rot=(0, 0.35 * side, 0))
            cone((0.17 * side, 0.08, 0.58), 0.1, 0.2, toon('#4a3a78'), bodyp, rot=(0.3, 0.3 * side, 0))
    elif armor == 'crystalmail':
        # Big crystal spikes on the shoulders and a crystal crest.
        gem = toon('#e0fbff', rim=0.4, emit=0.15)
        for side in (-1, 1):
            crystal((0.28 * side, 0, 0.47), 0.09, 0.34, gem, bodyp, rot=(0, 0.6 * side, 0))
        crystal((0, -0.24, 0.32), 0.06, 0.16, toon('#9af0ff', rim=0.4, emit=0.2), bodyp, rot=(math.pi / 2, 0, 0))
        crystal((0, 0.02, 0.36), 0.07, 0.26, gem, head)
    elif armor == 'magmamail':
        # Dark basalt plates with lava glowing through the cracks.
        plate = toon('#3a2a30')
        glow = toon('#ffb03a', emit=0.8)
        pauldrons(plate, (0.16, 0.14, 0.1))
        for side in (-1, 1):
            sphere((0.28 * side, -0.02, 0.53), (0.09, 0.08, 0.03), glow, bodyp, line=0)
        box((0, -0.21, 0.31), (0.3, 0.06, 0.18), plate, bodyp, bevel=0.03)
        for x, z, w in ((-0.06, 0.34, 0.12), (0.07, 0.28, 0.1), (0.0, 0.4, 0.06)):
            box((x, -0.25, z), (w, 0.02, 0.025), glow, bodyp, bevel=0.005, line=0, rot=(0, 0.4 * (1 if x > 0 else -1), 0))
    elif armor == 'glimmershawl':
        cape('#e0a8f0')
        # A golden tiara with a glimmering star.
        gold = toon('#ffd35a')
        torus((0, -0.02, 0.14), 0.33, 0.028, gold, head, rot=(0.25, 0, 0))
        crystal((0, -0.32, 0.22), 0.06, 0.16, toon('#fff6a0', rim=0.5, emit=0.4), head, rot=(math.pi / 2, 0, 0), sides=5)
        crystal((0, -0.23, 0.45), 0.05, 0.12, toon('#9ae6ff', rim=0.5, emit=0.3), bodyp, rot=(math.pi / 2, 0, 0), sides=5)
    elif armor == 'barkvest':
        # Bark shoulder plates and a leafy crown.
        leaf = toon('#6fbf5a')
        pauldrons(toon('#7a5238'), (0.13, 0.13, 0.08))
        for i in range(6):
            ang = i / 6 * math.tau
            sphere((math.cos(ang) * 0.3, math.sin(ang) * 0.27, 0.2), (0.13, 0.05, 0.07), leaf, head, rot=(0, 0.4, ang), line=0.014)
        sphere((0, -0.26, 0.3), 0.045, toon('#9aa0b0'), bodyp, line=0.012)
    elif armor == 'coppermail':
        # Copper pauldrons, rivets and a copper circlet with a gem.
        plate = toon('#c8703a')
        pauldrons(plate)
        for x, z in ((-0.13, 0.4), (0.13, 0.4), (-0.15, 0.27), (0.15, 0.27)):
            sphere((x, -0.235, z), 0.026, toon('#ffd8a0'), bodyp, line=0)
        box((0, -0.24, 0.2), (0.11, 0.03, 0.08), toon('#ffd35a'), bodyp, bevel=0.01)
        torus((0, 0, 0.12), 0.36, 0.035, plate, head, rot=(0.15, 0, 0))
        sphere((0, -0.34, 0.17), 0.045, toon('#5ae0c8', rim=0.4), head, line=0.012)
    elif armor == 'ironplate':
        # A full helm with a red plume.
        iron = toon('#8a94a8')
        sphere((0, 0.03, 0.12), (0.4, 0.36, 0.29), iron, head, seg=32)
        box((0, -0.31, 0.08), (0.46, 0.05, 0.06), toon('#5e6272'), head, bevel=0.02)
        for i, (y, z) in enumerate(((-0.06, 0.42), (0.08, 0.45), (0.22, 0.4))):
            sphere((0, y, z), (0.07, 0.1, 0.08), toon('#e8505a'), head, line=0.016)
        pauldrons(iron, (0.16, 0.15, 0.1))
        box((0, -0.22, 0.33), (0.32, 0.06, 0.18), toon('#c8d4e8'), bodyp, bevel=0.03)
    elif armor == 'dragonmail':
        # A horned red helm, gold pauldrons and little dragon wings.
        helmet = toon('#c83a3a')
        sphere((0, 0.03, 0.1), (0.41, 0.37, 0.3), helmet, head, seg=32)
        box((0, -0.3, 0.12), (0.5, 0.06, 0.08), toon('#ffd35a'), head, bevel=0.02)
        for side in (-1, 1):
            cone((0.26 * side, 0.02, 0.33), 0.07, 0.3, toon('#fff0d0'), head, rot=(0, 0.5 * side, 0))
        pauldrons(toon('#ffd35a'))
        wing = toon('#a82a2a')
        for side in (-1, 1):
            pts = [(0, 0), (0.28, 0.34), (0.6, 0.4), (0.52, 0.18), (0.39, 0.21), (0.31, 0.02), (0.15, 0.08)]
            profile([(x * side, z) for x, z in pts], 0.04, wing, bodyp, loc=(0.1 * side, 0.22, 0.34), rot=(0, 0, -0.5 * side))
    else:  # tunic
        # The starter look: a red scarf with a trailing end, and a brass buckle.
        scarf = toon('#ff6a6a')
        torus((0, 0, 0.55), 0.19, 0.055, scarf, bodyp)
        sphere((0.12, 0.2, 0.46), (0.07, 0.05, 0.13), scarf, bodyp, rot=(0.3, 0, -0.3))
        box((0, -0.25, 0.2), (0.07, 0.02, 0.06), toon('#ffd35a'), bodyp, bevel=0.01, line=0.01)
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
    """Elder Bloom: a tiny old sprout with a big leafy hat, fluffy beard and a flower staff."""
    P = {}
    root = P['root'] = empty('elder')
    bodyp = P['body'] = empty('bodyPivot', root)
    skin, robe = toon(SKIN), toon('#6ab86a')
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
    for i in range(5):
        a = i / 5 * math.tau
        sphere((math.cos(a) * 0.07, -0.02, 1.12 + math.sin(a) * 0.07), 0.05, toon('#ff8ab0'), staff, line=0.01)
    sphere((0, -0.05, 1.12), 0.035, toon('#ffd35a'), staff, line=0)
    sphere((0.3, -0.04, 0.36), 0.065, skin, bodyp)
    return P
