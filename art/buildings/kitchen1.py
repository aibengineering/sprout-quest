"""Clover keeps her blue house. Bram adds a large kitchen behind it, leaving the original doorstep clear."""
from lib import box, cylinder, profile, toon
from buildings._common import Parts, flowers
import env


def build_building(root):
    P = Parts(root)
    base = P('base')
    house = env.house('#6a9ae0')
    house.parent = base
    stone = P('stone')
    box((0, 2.25, .12), (4.35, 3.15, .24), toon('#b8aca8'), stone, bevel=.06)
    box((1.60, 2.8, 1.95), (.50, .55, 2.45), toon('#a89c98'), stone, bevel=.05)
    frame = P('frame')
    for x in (-2.05, 2.05):
        for y in (.85, 3.7):
            box((x, y, .95), (.16, .16, 1.65), toon('#8a5a3a'), frame, bevel=.03)
    walls = P('walls')
    box((0, 2.25, .95), (4.15, 3, 1.6), toon('#fff0dc'), walls, bevel=.06)
    for x in (-2.10, 2.10):
        box((x, 2.15, 1.15), (.05, 1.4, .75), toon('#bfe8ff', emit=.12), walls, bevel=.03)
        for y in (1.8, 2.15, 2.5):
            box((x, y, 1.15), (.07, .035, .75), toon('#8a5a3a'), frame, line=0)
    roof = P('roof')
    profile([(-2.3, 1.72), (0, 3.1), (2.3, 1.72)], 3.4, toon('#6294d5'), roof, loc=(0, 2.25, 0), bevel=.06)
    copper = P('copper')
    cylinder((1.6, 2.8, 3.18), .35, .13, toon('#b87445'), copper, seg=12)
    box((2.15, 2.18, 1.42), (.10, .25, .28), toon('#c38a50'), copper, bevel=.04)
    flower = P('flower')
    for x in (-2.15, 2.15):
        box((x, 2.15, .67), (.18, 1.45, .16), toon('#9a6a44'), flower, bevel=.03)
        flowers(flower, 2, [(x/2, y/2, col) for y,col in [(1.65,'#ff8ab0'),(1.98,'#ffd35a'),(2.30,'#ffffff'),(2.65,'#ff8ab0')]], z=.73)
    return P.objects()
