"""Sowerby's herbalist and baker. Native chibi models on the villagers' shared walking pivots."""
import math
from lib import box, cylinder, empty, sphere, toon, torus


def neighbour(name, coat, hair, skin, baker=False, trainer=False):
    P = {}
    root = P['root'] = empty(name)
    body = P['body'] = empty('bodyPivot', root)
    for side in (-1, 1):
        foot = P[f'foot{side}'] = empty(f'foot{side}', root, (.13*side, 0, 0))
        sphere((0, -.04, .065), (.105, .15, .065), toon('#6b4838'), foot)
    sphere((0, 0, .42), (.29, .22, .32), toon(coat), body)
    box((0, -.216, .38), (.31, .04, .40), toon('#fff1d3' if baker else '#b4d58a'), body, bevel=.08, line=.01)
    for side in (-1, 1):
        arm = P[f'arm{side}'] = empty(f'arm{side}', body, (.26*side, 0, .55))
        sphere((.025*side, 0, -.10), (.095, .10, .16), toon(coat), arm)
        sphere((.035*side, -.03, -.24), .08, toon(skin), arm)
    head = P['head'] = empty('head', body, (0, 0, .95))
    sphere((0, .04, .06), (.33, .27, .31), toon(hair), head)
    sphere((0, -.075, -.015), (.295, .255, .265), toon(skin), head)
    sphere((0, -.31, -.045), (.05, .04, .05), toon(skin), head, line=.008)
    for side in (-1, 1):
        sphere((.11*side, -.304, .025), (.033, .017, .045), toon('#302536', rim=0), head, line=0)
        sphere((.11*side-.012, -.322, .042), .009, toon('#fff9ec'), head, line=0)
        sphere((.19*side, -.277, -.065), (.045, .012, .023), toon('#e79888'), head, line=0)
    sphere((0, -.31, -.135), (.037, .012, .016), toon('#974e4c'), head, line=0)
    if not trainer:
        basket = empty('basket', body, (.29, -.22, .28))
        cylinder((0, 0, 0), .15, .18, toon('#b99159'), basket, seg=12, line=.012)
        for z in (-.06, 0, .06):
            torus((0, 0, z), .153, .009, toon('#815b37'), basket, seg=12, line=.004)
        torus((0, 0, .12), .15, .016, toon('#815b37'), basket, rot=(math.pi/2, 0, 0), seg=16)
    if baker and not trainer:
        for side in (-1, 1):
            torus((.11*side, -.325, .025), .064, .009, toon('#745e50'), head, rot=(math.pi/2, 0, 0), seg=20, line=.004)
        box((0, -.329, .035), (.095, .01, .012), toon('#745e50'), head, line=0)
        sphere((0, .02, .24), (.34, .28, .17), toon('#ffefd7'), head)
        torus((0, 0, .21), .29, .04, toon('#dfb786'), head, seg=24)
        for dx in (-.065, .065):
            sphere((dx, 0, .115), (.065, .085, .065), toon('#e8b269'), basket)
    elif not trainer:
        cylinder((0, 0, .24), .39, .035, toon('#dac18b'), head, seg=32)
        sphere((0, .03, .28), (.27, .24, .13), toon('#e8cf96'), head)
        torus((0, .015, .25), .25, .035, toon('#578761'), head, seg=24)
        for k in range(4):
            sphere((-.275, -.03, .08-k*.095), (.06, .065, .075), toon(hair), head)
        for k in range(5):
            sphere((math.sin(k*2)*.07, math.cos(k*2)*.07, .15), (.035, .065, .095), toon('#579b58'), basket, rot=(0, k*.4, k), line=.006)
    return P


def build_hazel():
    return neighbour('hazel', '#678b64', '#90563b', '#efc098')


def build_moss():
    return neighbour('moss', '#788fa7', '#6f5145', '#d69b76', baker=True)



def build_alder():
    P = neighbour('alder', '#8c6552', '#d1b998', '#d69b76', baker=True, trainer=True)
    torus((0, 0, .17), .29, .035, toon('#526f72'), P['head'], seg=24)
    sphere((0,.055,.23),(.28,.22,.11),toon('#d1b998'),P['head'])
    cylinder((.37, -.12, .62), .025, 1.3, toon('#89633f'), P['body'], seg=8, line=.006)
    box((0,-.245,.27),(.46,.035,.09),toon('#526f72'),P['body'],bevel=.02)
    return P


def build_rook():
    P = neighbour('rook', '#80564d', '#6a4434', '#e7b88b', trainer=True)
    head, body = P['head'], P['body']
    cylinder((0, 0, .24), .40, .045, toon('#695643'), head, seg=24)
    cylinder((0, .025, .33), .255, .20, toon('#80694f'), head, seg=24)
    torus((0, .025, .27), .26, .025, toon('#ad7657'), head, seg=24)
    sphere((-.26,.045,.38),(.045,.055,.19),toon('#d9c59a'),head,rot=(0,.35,0),line=.008)
    # A tidy travelling waistcoat, specimen case, and a bandaged leg from Ember Peak.
    box((0,-.24,.39),(.34,.035,.40),toon('#d9c59a'),body,bevel=.05)
    for z in (.30,.41,.52): sphere((0,-.268,z),.024,toon('#bd8c52'),body,line=.004)
    box((.29,-.1,.24),(.23,.22,.30),toon('#674633'),body,bevel=.035)
    box((.29,-.22,.26),(.12,.025,.06),toon('#d8b576'),body,bevel=.015)
    for z in (.09,.14,.19): torus((0,0,z),.095,.018,toon('#e5d5b6'),P['foot1'],seg=12)
    sphere((.10,-.32,.1),(.09,.018,.025),toon('#6a4434'),head,line=.004)
    return P


def build_fox():
    """A masked spirit: long ears, fox muzzle and a real tail, on shared walker pivots."""
    P = {}
    root = P['root'] = empty('fox')
    body = P['body'] = empty('bodyPivot', root)
    fur, cream, cloth = toon('#b85f45'), toon('#f8debd'), toon('#47465e')
    for side in (-1, 1):
        foot = P[f'foot{side}'] = empty(f'foot{side}', root, (.13*side, 0, 0))
        sphere((0,-.04,.065),(.105,.15,.065),cloth,foot)
    sphere((0,0,.43),(.27,.21,.32),cloth,body)
    box((0,-.20,.38),(.26,.05,.35),toon('#686279'),body,bevel=.06)
    for side in (-1,1):
        arm=P[f'arm{side}']=empty(f'arm{side}',body,(.26*side,0,.55))
        sphere((.025*side,0,-.1),(.085,.09,.15),cloth,arm)
        sphere((.025*side,-.03,-.24),.075,fur,arm)
    # Tail reaches behind, with a cream tip, so the silhouette reads as a fox from every side.
    sphere((.20,.27,.38),(.16,.18,.30),fur,body,rot=(0,.65,0))
    sphere((.35,.29,.62),(.13,.16,.17),cream,body,rot=(0,.65,0))
    head=P['head']=empty('head',body,(0,0,.96))
    sphere((0,0,0),(.30,.25,.27),fur,head)
    for side in (-1,1):
        cylinder((.21*side,0,.30),.14,.34,fur,head,seg=3,rot=(0,.18*side,0))
        cylinder((.21*side,-.04,.30),.08,.24,toon('#eab391'),head,seg=3,rot=(0,.18*side,0),line=.006)
    sphere((0,-.22,-.08),(.21,.20,.12),cream,head)
    sphere((0,-.39,-.07),(.045,.025,.03),toon('#342d38'),head,line=.006)
    # Ivory eye mask, fitted rather than a human face; dark glimmer eyes remain visible.
    for side in (-1,1):
        sphere((.11*side,-.24,.035),(.145,.045,.105),cream,head,rot=(0,0,-.22*side))
        sphere((.11*side,-.285,.03),(.052,.02,.036),toon('#302b46'),head,line=.003)
        sphere((.11*side,-.308,.035),(.014,.008,.02),toon('#b5e9da'),head,line=0)
        box((.19*side,-.278,.07),(.035,.015,.09),toon('#ab6055'),head,rot=(0,.3*side,0),line=0)
    torus((0,0,.71),.25,.048,toon('#8983ae'),body,seg=20)
    box((-.15,.13,.61),(.13,.035,.32),toon('#aaa1d0'),body,bevel=.04,rot=(0,-.25,0))
    return P
