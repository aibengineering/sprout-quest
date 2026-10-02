"""Resident cottages and additions: every paid material owns a named visible construction layer."""
import math
from lib import box, cylinder, empty, profile, sphere, toon
from buildings._common import Parts, TILE, plank_wall, lantern, flowers
from buildings._cottage import build as guest_cottage


def cottage(root, who):
    P = Parts(root)
    w, d = (2.4 if who == 'hazel' else 2.5)*TILE*.82, 1.5*TILE*.72
    front = -d/2
    stone = P('stone')
    box((0, 0, .14), (w, d, .28), toon('#aba197'), stone, bevel=.06)
    box((0, front-.16, .14), (.70, .32, .22), toon('#c9b7a1'), stone, bevel=.04)
    box((w*.29, .20, 2.15), (.30, .32, 1.25), toon('#a38d7f'), stone, bevel=.04)
    frame = P('frame')
    for x in (-w/2, w/2):
        for y in (front, -front):
            box((x, y, .90), (.15, .15, 1.35), toon('#765b40'), frame, bevel=.025)
    walls = P('walls')
    box((0, 0, .94), (w-.1, d-.1, 1.35), toon('#cda975'), walls, bevel=.04)
    plank_wall(walls, (0, front-.03, .94), w-.1, 1.35, '#d6b883' if who == 'hazel' else '#c79261', '#957146')
    box((0, front-.105, .74), (.56, .075, 1.02), toon('#527960' if who == 'hazel' else '#8f4c46'), walls, bevel=.06)
    sphere((.18, front-.15, .73), .035, toon('#e5c88a'), walls, line=.006)
    for x in (-w*.30, w*.30):
        box((x, front-.12, 1.12), (.51, .09, .50), toon('#775d49'), walls, bevel=.03)
        box((x, front-.18, 1.12), (.40, .025, .40), toon('#ddedd5' if who == 'hazel' else '#ffe5b1', emit=.12), walls, line=0)
        box((x, front-.205, 1.12), (.025, .025, .42), toon('#775d49'), walls, line=0)
    roof = P('roof')
    profile([(-w/2-.18, 1.59), (0, 2.55), (w/2+.18, 1.59)], d+.30, toon('#64836b' if who == 'hazel' else '#a9644e'), roof, bevel=.035)
    for side in (-1, 1):
        for i in range(6):
            x = side*(i+.5)*(w/2+.18)/6
            z = 2.55-abs(x)*.96/(w/2+.18)
            box((x, 0, z+.015), (.035, d+.30, .025), toon('#405f50' if who == 'hazel' else '#805144'), roof, line=0)
    garden = P('herb' if who == 'hazel' else 'berry')
    for x in (-w*.30, w*.30):
        box((x, front-.26, .82), (.62, .26, .16), toon('#8b6348'), garden, bevel=.02)
        for k in range(5):
            dx = x+(k-2)*.1
            sphere((dx, front-.27, .96), (.06, .06, .12), toon('#58874f'), garden, line=.006)
            if who == 'moss':
                sphere((dx+.02, front-.31, .98), .035, toon('#ce617b'), garden, line=.004)
    return P.objects()


def build(root, who, level):
    if level == 1:
        return cottage(root, who)
    P = Parts(root)
    base = P('base')
    guest_cottage(base) if who == 'pip' else cottage(base, who)
    # A compact glazed herb porch / pantry dormer / timber study extends the existing house without replacing it.
    front = -1.03
    frame, walls, roof = P('frame'), P('walls'), P('roof')
    col = '#e4d7f6' if who == 'moss' else '#c9925a'
    for x in (-.48, .48):
        box((x, front, 2.42), (.10, .10, .94), toon(col), frame, bevel=.02)
    box((0, front-.02, 2.13), (1.02, .12, .22), toon(col), walls, bevel=.025)
    box((0, front+.24, 2.52), (.96, .48, .72), toon('#dfcee9' if who == 'moss' else '#d7b180'), walls, bevel=.02)
    profile([(-.62, 2.84), (0, 3.27), (.62, 2.84)], .68, toon('#a998cc' if who == 'moss' else '#617e60'), roof, loc=(0, front+.19, 0), bevel=.025)
    special = P('iron' if who == 'pip' else 'crystal')
    if who == 'pip':
        for x in (-.47, .47):
            box((x, front-.08, 2.20), (.12, .07, .28), toon('#67707a'), special, bevel=.015)
            for z in (2.13, 2.26):
                sphere((x, front-.12, z), .022, toon('#bac1c7'), special, line=.004)
        box((0, front-.08, 2.55), (.58, .10, .32), toon('#67707a'), special, bevel=.025)
        box((0, front-.14, 2.55), (.46, .02, .21), toon('#bdced0'), special, line=0)
    else:
        box((0, front-.105, 2.56), (.79, .045, .55), toon('#b8e8df', emit=.15), special, bevel=.02, line=.01)
        for x in (-.26, 0, .26):
            box((x, front-.14, 2.56), (.025, .02, .55), toon('#849d8d'), special, line=0)
        lantern(special, (.55, front-.18, 1.21), '#b5e8ee', '#8173a1')
    return P.objects()
