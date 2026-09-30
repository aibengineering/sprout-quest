"""Three Pine Logs heat the pot; two Shroom Caps remain visible in the stew.

The fuel is a bench layer, excluded from the finished food icon. No wood is
shown as an edible ingredient and no new recipe material is introduced.
"""
import math
from lib import cylinder, lathe, sphere, toon, torus
from gear._consumable_shapes import icon, mushroom, part, steam


def build_item(root):
    parts = {}
    def pot():
        lathe([(0,-.25),(.30,-.25),(.43,-.05),(.44,.16),(.39,.16),(.38,.01),(0,.01)],
              toon('#897494'),root,seg=40,line=.015,name='stew_pot')
        torus((0,0,.16),.42,.025,toon('#e4ced6'),root,seg=40,line=.01,name='pot_rim')
        for sign in (-1,1):
            torus((sign*.46,0,.055),.11,.033,toon('#897494'),root,rot=(math.pi/2,0,0),line=.011,name='pot_handle')
    part(parts, 'pot', root, pot)
    def fuel():
        for x,y,angle in ((-.15,0,-.10),(.13,.08,.12),(0,-.18,1.3)):
            cylinder((x,y,-.385),.061,.72,toon('#a87647'),root,rot=(0,math.pi/2,angle),seg=12,line=.01,name='pine_fuel')
        for x,y in ((-.14,-.02),(.08,-.10)):
            sphere((x,y,-.28),(.045,.055,.06),toon('#ffc27b',emit=.04),root,line=0,name='gentle_heat')
    part(parts, 'pine-fuel', root, fuel)
    part(parts, 'cap-broth', root, lambda: cylinder((0,0,.125),.39,.028,toon('#e1ad7c',rim=.25),root,seg=40,line=0,name='broth'))
    part(parts, 'shroom-caps', root, lambda: (mushroom(root,-.13,-.12,.15,.16),mushroom(root,.14,.08,.14,.13)))
    part(parts, 'steam', root, lambda: steam(root, -.035, .36))
    return {'pine-fuel': parts['pine-fuel'], **{key: value for key, value in parts.items() if key != 'pine-fuel'}}


def build_icon():
    root = icon(build_item)
    for obj in root.children:
        if obj.name.startswith('pine-fuel_'):
            obj.hide_render = True
    return root


CAMERA = dict(ppu=385, anchor=(0, 0, -.015), elevation=0.41887902047863906)
# Consumed fuel belongs to the workbench, not the completed food.
COMPLETE_PARTS = ('pot', 'cap-broth', 'shroom-caps', 'steam')

# Keep this recipe’s on-demand assembly set inside its mobile byte budget.
WEBP_QUALITY = 92
