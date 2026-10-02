from lib import box, profile, toon
from buildings._common import Parts, flowers
from buildings.kitchen1 import build_building as first


def build(root,level):
    P=Parts(root)
    first(P('base')) if level==2 else build(P('base'),2)
    frame,walls,roof=P('frame'),P('walls'),P('roof')
    col='#a77d58' if level==2 else '#a590bd'
    for x in (-.8,.8): box((x,1.00,3.2),(.12,.12,.65),toon(col),frame,bevel=.02)
    box((0,1.04,3.2),(1.65,.45,.64),toon('#ead7bd'),walls,bevel=.03)
    profile([(-.98,3.48),(0,3.90),(.98,3.48)],.72,toon('#6294d5' if level==2 else '#9b87b4'),roof,loc=(0,1.17,0),bevel=.03)
    if level==2:
        iron=P('iron')
        for x in (-.78,.78): box((x,.78,3.15),(.15,.06,.30),toon('#737c85'),iron,bevel=.02)
        herb=P('herb')
        for x in (-.50,-.25,0,.25,.50): box((x,.78,3.23),(.10,.08,.30),toon('#648656'),herb,bevel=.04)
    else:
        crystal=P('crystal')
        box((0,.78,3.23),(1.40,.045,.43),toon('#b8e8df',emit=.18),crystal,bevel=.025)
    flower=P('flower')
    box((0,.77,2.90),(1.75,.27,.16),toon(col),flower,bevel=.03)
    flowers(flower,1,[(x,.73,'#ff8ab0' if i%2 else '#ffd35a') for i,x in enumerate([-.7,-.4,0,.4,.7])],z=3.03)
    return P.objects()
