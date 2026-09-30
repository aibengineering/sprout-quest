"""Render only the potion/Kitchen items, without touching shared atlases.

blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_consumables.py
blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_consumables.py -- tea

512px registered layers, 128px canonical icons, alpha bounds and material roles.
The shared generation owner can call the same item-local build_item/build_icon.
"""
import importlib
import json
import math
import os
import sys

HERE = os.path.dirname(__file__)
ART = os.path.dirname(HERE)
sys.path.insert(0, ART)

import bpy
import numpy as np
import lib

DEST = os.path.join(ART, '..', 'public', 'assets', 'crafting')
OUT = os.path.join(ART, 'out', 'consumables')
ITEMS = ('jellypot', 'shroombrew', 'embertonic', 'herbtonic', 'pancakes', 'tea', 'goojelly', 'stew', 'rockcandy', 'tart')
POTIONS = ('jellypot', 'shroombrew', 'embertonic', 'herbtonic')
ICON_IDS = {key: key if key in POTIONS else 'meal_'+key for key in ITEMS}
ROLES = {
    'jellypot': {'goo': ['goo-infusion'], 'fluff': ['fluff-foam']},
    'shroombrew': {'cap': ['cap-infusion', 'spotted-caps']},
    'embertonic': {'ember': ['ember-infusion', 'warm-swirl']},
    'pancakes': {'fluff': ['lower-pancake','middle-pancake','upper-pancake'], 'goo': ['goo-syrup']},
    'tea': {'clover': ['clover-infusion','clover-leaves']},
    'goojelly': {'goo': ['jelly-base','jelly-belly','jelly-top']},
    'stew': {'pine': ['pine-fuel'], 'cap': ['cap-broth','shroom-caps']},
    'rockcandy': {'stone': ['pebbles-back','pebbles-front'], 'copper': ['copper-sticks']},
    'herbtonic': {'herb': ['herb-infusion', 'herb-leaves']},
    'tart': {'fluff': ['fluff-crust'], 'berry': ['berry-filling', 'berries']},
}


def bounds(image):
    w, h = image.size
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(h,w,4)[::-1]
    ys, xs = np.where(pixels[:,:,3] > 0)
    if not len(xs):
        raise RuntimeError('Empty render')
    x0,y0,x1,y1 = int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1
    if min(x0,y0) < 6 or x1 > w-6 or y1 > h-6:
        raise RuntimeError(f'Clipped render: {x0,y0,x1,y1}')
    return {'bounds':[x0,y0,x1,y1], 'center':[round((x0+x1)/(w*2),4),round((y0+y1)/(h*2),4)]}


def webp(png, dest, size=None, quality=92):
    image = bpy.data.images.load(png)
    meta = bounds(image)
    if size:
        image.scale(size,size)
    sc = bpy.context.scene
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.quality = quality
    image.save_render(dest, scene=sc)
    bpy.data.images.remove(image)
    sc.render.image_settings.file_format = 'PNG'
    return meta


def render(item):
    lib.reset()
    module = importlib.import_module('gear.'+item)
    root = lib.empty('craft_'+item)
    parts = module.build_item(root)
    sc = bpy.context.scene
    sc.eevee.taa_render_samples = 32
    # Camera stays identical for every part and the complete image: never fit individual pieces.
    anchor = module.CAMERA['anchor']
    elevation = module.CAMERA['elevation']
    ppu = module.CAMERA['ppu']
    os.makedirs(DEST,exist_ok=True)
    os.makedirs(OUT,exist_ok=True)
    os.makedirs(os.path.join(DEST,'..','icons'),exist_ok=True)
    stack = list(parts)
    manifest = {'size':[512,512], 'parts':{}, 'stack':stack, 'ingredientRoles':ROLES[item],
                'camera':{'ppu':ppu,'elevation':24,'anchor':list(anchor)},
                'iconId':ICON_IDS[item], 'webpQuality':module.WEBP_QUALITY, 'completeParts':list(getattr(module, 'COMPLETE_PARTS', stack)), 'props':[key for key in parts if key in ('bottle','plate','cup','pot','steam')]}
    for key in [*stack,'complete']:
        for name, objects in parts.items():
            for obj in objects:
                obj.hide_render = name != key and key != 'complete'
                # Stew's logs are used under the pot during cooking; finished meal is food only.
                if key == 'complete' and name == 'pine-fuel':
                    obj.hide_render = True
        png = os.path.join(OUT,f'{item}-{key}.png')
        lib.render(png,512,512,ppu,anchor=anchor,elevation=elevation,fit_origin=.5)
        meta = webp(png,os.path.join(DEST,f'{item}-{key}.webp'), quality=module.WEBP_QUALITY)
        manifest['parts'][key] = {'src':f'assets/crafting/{item}-{key}.webp',**meta}
        if key == 'complete':
            webp(png,os.path.join(DEST,'..','icons',ICON_IDS[item]+'.webp'),128)
        print('RENDERED consumables/'+item+'-'+key,flush=True)
    with open(os.path.join(DEST,item+'.json'),'w') as out:
        json.dump(manifest,out,indent=2)
        out.write('\n')


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    if args and args[0] == 'pack':
        lib.reset()
        for item in args[1:] or ITEMS:
            with open(os.path.join(DEST, item+'.json')) as f:
                manifest = json.load(f)
            for key in [*manifest['stack'], 'complete']:
                png = os.path.join(OUT, f'{item}-{key}.png')
                webp(png, os.path.join(DEST, f'{item}-{key}.webp'))
                if key == 'complete':
                    webp(png, os.path.join(DEST, '..', 'icons', ICON_IDS[item]+'.webp'), 128)
            print('PACKED '+item, flush=True)
        sys.exit(0)
    for item in args or ITEMS:
        if item not in ITEMS:
            raise ValueError('Not a potion/Kitchen item: '+item)
        render(item)
