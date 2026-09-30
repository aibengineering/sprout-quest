"""Isolated renderer; writes only the four owned weapons, no registry/atlas mutations.

blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_iron_bat.py
blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_iron_bat.py -- models
"""
import importlib
import json
import math
import os
import runpy
import sys

HERE = os.path.dirname(__file__)
ART = os.path.dirname(HERE)
ROOT = os.path.dirname(ART)
sys.path[:0] = [HERE, ART]
IDS = ('ironsword', 'ironhammer', 'batwhip', 'batwand')
args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if args not in ([], ['models']):
    raise SystemExit('Use no arguments for layers/icons, or -- models for the four GLBs.')


def builder(wid):
    return lambda root: importlib.import_module('gear.'+wid).build_weapon(root)


if args == ['models']:
    # Import modules lazily after the canonical exporter tags toon materials.
    import weapons
    for wid in IDS:
        weapons.WEAPONS[wid] = (builder(wid), weapons.WEAPONS[wid][1])
    sys.argv = [os.path.join(ART, 'models.py'), '--', ','.join(f'wpn_{w}' for w in IDS)]
    runpy.run_path(os.path.join(ART, 'models.py'), run_name='__main__')
else:
    import bpy
    import numpy as np
    import lib
    import weapons
    dest = os.path.join(ROOT, 'public', 'assets', 'crafting')
    previews = os.path.join(ROOT, 'docs', 'iron-bat-weapons')
    os.makedirs(dest, exist_ok=True)
    os.makedirs(previews, exist_ok=True)

    def webp(source, target, size=None):
        img = bpy.data.images.load(source)
        pixels = np.array(img.pixels[:], dtype=np.float32).reshape(512,512,4)[::-1]
        ys, xs = np.where(pixels[...,3] > 0)
        bounds = [int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1]
        if size: img.scale(size,size)
        bpy.context.scene.render.image_settings.file_format = 'WEBP'
        bpy.context.scene.render.image_settings.quality = 90
        img.save_render(target,scene=bpy.context.scene)
        bpy.data.images.remove(img)
        return {'src':'assets/crafting/'+os.path.basename(target), 'bounds':bounds,
                'center':[round((bounds[0]+bounds[2])/1024,4),round((bounds[1]+bounds[3])/1024,4)]}

    for wid in IDS:
        lib.reset()
        root = lib.empty('weapon')
        parts = importlib.import_module('gear.'+wid).build_weapon(root)
        root.scale = (1,1.25,1.25)
        root.rotation_euler = (0,-math.pi/4,0)
        length = weapons.WEAPONS[wid][1]
        mid = length/2-.1
        # One fixed camera for every layer, including complete. Never frame individual components.
        ppu = 472/(length*.8+.2)
        manifest = {'size':[512,512],'parts':{},'stack':list(parts)}
        for part in [*parts,'complete']:
            for key, objects in parts.items():
                for obj in objects: obj.hide_render = part != 'complete' and key != part
            source = os.path.join(ART,'out','iron-bat',wid+'-'+part+'.png')
            bpy.context.scene.render.image_settings.file_format = 'PNG'
            lib.render(source,512,512,ppu,anchor=(mid*.707,0,mid*.707),elevation=0,fit_origin=.5)
            manifest['parts'][part] = webp(source,os.path.join(dest,wid+'-'+part+'.webp'))
            if part == 'complete':
                webp(source,os.path.join(ROOT,'public','assets','icons',wid+'.webp'),128)
                webp(source,os.path.join(previews,wid+'-after.webp'))
        if not args:
            with open(os.path.join(dest,wid+'.json'),'w') as file:
                json.dump(manifest,file,indent=2)
                file.write('\n')
        print('RENDERED',wid,args or 'layers')
