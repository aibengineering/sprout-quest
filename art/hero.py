"""The chibi hero, with a distinct look for every armor."""
import math

from lib import box, cone, crystal, cylinder, empty, profile, sphere, toon, torus

SKIN = '#ffe2c8'
HAIR = '#8a5a3a'

ARMORS = {
    'tunic': dict(body='#6fa8ff', trim='#b98a5a'),
    'fluffvest': dict(body='#fff1e6', trim='#f0d0c0'),
    'shroomhood': dict(body='#e8505a', trim='#fff0d8'),
    'batcloak': dict(body='#7a5ab8', trim='#4a3a78'),
    'crystalmail': dict(body='#8ad8f0', trim='#c8b0ff'),
    'magmamail': dict(body='#e8703a', trim='#5a3a3a'),
    'dragonmail': dict(body='#c83a3a', trim='#ffd35a'),
}


def build(armor):
    """Returns a dict of named parts; `root` faces -Y (towards the camera) at rest."""
    a = ARMORS[armor]
    P = {}
    root = P['root'] = empty('hero')
    bodyp = P['body'] = empty('bodyPivot', root)
    skin, hair = toon(SKIN), toon(HAIR)
    body_m, trim_m = toon(a['body']), toon(a['trim'])
    boot = toon('#6b4a3a')

    # Feet sit under their own pivots so the walk cycle can swing them.
    for side in (-1, 1):
        f = P[f'foot{side}'] = empty(f'foot{side}', root, (0.13 * side, 0, 0))
        sphere((0, -0.03, 0.06), (0.1, 0.13, 0.075), boot, f)

    # Body
    sphere((0, 0, 0.32), (0.27, 0.23, 0.25), body_m, bodyp)
    torus((0, 0, 0.2), 0.235, 0.035, trim_m, bodyp)
    for side in (-1, 1):
        arm = P[f'arm{side}'] = empty(f'arm{side}', bodyp, (0.27 * side, 0, 0.36))
        sphere((0.02 * side, 0, -0.04), (0.085, 0.085, 0.1), body_m, arm)
        sphere((0.03 * side, -0.01, -0.13), 0.065, skin, arm)

    # Head
    head = P['head'] = empty('head', bodyp, (0, 0, 0.78))
    sphere((0, 0, 0), (0.37, 0.34, 0.33), skin, head, seg=32)
    face_y = -0.315
    for side in (-1, 1):
        sphere((0.125 * side, face_y, -0.03), (0.05, 0.03, 0.075), toon('#2a2233', rim=0), head, line=0)
        sphere((0.125 * side - 0.018, face_y - 0.025, 0.0), 0.018, toon('#ffffff', rim=0), head, line=0)
        sphere((0.21 * side, -0.27, -0.11), (0.055, 0.02, 0.03), toon('#ff9aaa', rim=0), head, line=0)
    sphere((0, -0.33, -0.12), (0.03, 0.012, 0.014), toon('#8a3a4a', rim=0), head, line=0)

    helm = armor in ('shroomhood', 'dragonmail')
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

    if armor == 'fluffvest':
        for i in range(10):
            ang = i / 10 * math.tau
            sphere((math.cos(ang) * 0.21, math.sin(ang) * 0.17, 0.52), 0.07, toon('#ffffff'), bodyp)
    elif armor == 'shroomhood':
        cap = toon('#e8505a')
        sphere((0, 0, 0.2), (0.48, 0.46, 0.3), cap, head, seg=32)
        for x, y, z in ((-0.26, -0.22, 0.25), (0.2, -0.28, 0.22), (0.0, -0.1, 0.46), (0.33, 0.05, 0.3), (-0.3, 0.12, 0.33)):
            sphere((x, y, z), 0.075, toon('#fff6ea'), head, line=0.012)
    elif armor == 'batcloak':
        cape = toon('#4a3a78')
        profile([(-0.3, 0.55), (0.3, 0.55), (0.38, 0.0), (0.2, 0.06), (0.0, -0.02), (-0.2, 0.06), (-0.38, 0.0)], 0.05, cape, bodyp, loc=(0, 0.2, 0.02))
        for side in (-1, 1):
            cone((0.2 * side, 0.02, 0.33), 0.08, 0.2, toon('#7a5ab8'), head, rot=(0, 0.35 * side, 0))
    elif armor == 'crystalmail':
        gem = toon('#c8b0ff', rim=0.4)
        for side in (-1, 1):
            crystal((0.26 * side, 0, 0.44), 0.07, 0.24, gem, bodyp, rot=(0, 0.6 * side, 0))
        crystal((0, -0.21, 0.3), 0.05, 0.14, toon('#9af0ff', rim=0.4), bodyp, rot=(math.pi / 2, 0, 0))
    elif armor == 'magmamail':
        plate = toon('#5a3a3a')
        glow = toon('#ffb03a', emit=0.6)
        for side in (-1, 1):
            sphere((0.25 * side, 0, 0.45), (0.12, 0.12, 0.08), plate, bodyp)
        box((0, -0.2, 0.3), (0.28, 0.06, 0.16), plate, bodyp, bevel=0.03)
        box((0, -0.235, 0.3), (0.16, 0.02, 0.04), glow, bodyp, bevel=0.01, line=0)
    elif armor == 'dragonmail':
        helmet = toon('#c83a3a')
        sphere((0, 0.03, 0.1), (0.41, 0.37, 0.3), helmet, head, seg=32)
        box((0, -0.3, 0.12), (0.5, 0.06, 0.08), toon('#ffd35a'), head, bevel=0.02)
        for side in (-1, 1):
            cone((0.26 * side, 0.02, 0.33), 0.06, 0.28, toon('#fff0d0'), head, rot=(0, 0.5 * side, 0))
            sphere((0.26 * side, 0, 0.46), (0.13, 0.12, 0.08), toon('#ffd35a'), bodyp)
    else:  # tunic
        box((0, -0.22, 0.2), (0.06, 0.02, 0.05), toon('#ffd35a'), bodyp, bevel=0.01, line=0.01)
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
