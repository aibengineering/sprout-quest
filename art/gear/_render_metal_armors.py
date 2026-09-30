"""Item-local build using the shared hero/export hooks and registered layer occlusion.

blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_metal_armors.py
blender -b --factory-startup --python-exit-code 1 -P art/gear/_render_metal_armors.py -- models

The shared pipeline calls each module's build_armor(P).
This helper reuses that hook, the hero rig and the model exporter.
"""
import importlib
import json
import math
import os
import runpy
import sys

ART = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ART)
IDS = ('coppermail', 'ironplate', 'crystalmail')


def equipped():
    sys.argv = [sys.argv[0], '--', ','.join('hero_' + item for item in IDS)]
    runpy.run_path(os.path.join(ART, 'models.py'), run_name='__main__')


def crafting():
    import bpy
    import lib
    import numpy as np
    from gear_parts import preview_parts

    dest = os.path.join(ART, '..', 'public', 'assets', 'crafting')
    os.makedirs(dest, exist_ok=True)
    for item in (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else IDS):
        lib.reset()
        module = importlib.import_module('gear.' + item)
        _, parts = preview_parts(module)
        scene = bpy.context.scene
        scene.eevee.taa_render_samples = 32
        meshes = [obj for group in parts.values() for obj in group]
        originals = {obj: list(obj.data.materials) for obj in meshes}
        holdout = bpy.data.materials.new('layer_occluder')
        holdout.use_nodes = True
        tree = holdout.node_tree
        tree.nodes.clear()
        tree.links.new(tree.nodes.new('ShaderNodeHoldout').outputs[0],
                       tree.nodes.new('ShaderNodeOutputMaterial').inputs[0])
        manifest = {'size': [512, 512], 'parts': {}, 'stack': list(module.PARTS)}
        for layer in (*module.PARTS, 'complete'):
            for obj in meshes:
                obj.data.materials.clear()
                active = layer == 'complete' or obj in parts[layer]
                for mat in originals[obj]:
                    obj.data.materials.append(mat if active else holdout)
            path = os.path.join(ART, 'out', 'crafting', f'{item}-{layer}.png')
            lib.render(path, 512, 512, **module.CAMERA, fit_origin=.5)
            image = bpy.data.images.load(path)
            pixels = np.array(image.pixels[:], dtype=np.float32).reshape(512, 512, 4)[::-1]
            ys, xs = np.where(pixels[..., 3] > .02)
            x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
            scene.render.image_settings.file_format = 'WEBP'
            scene.render.image_settings.color_mode = 'RGBA'
            scene.render.image_settings.quality = 95
            image.save_render(os.path.join(dest, f'{item}-{layer}.webp'), scene=scene)
            manifest['parts'][layer] = {'src': f'assets/crafting/{item}-{layer}.webp',
                                        'center': [round((x0 + x1) / 1024, 4), round((y0 + y1) / 1024, 4)],
                                        'bounds': [x0, y0, x1, y1]}
            if layer == 'complete':
                image.scale(128, 128)
                image.save_render(os.path.join(dest, '..', 'icons', item + '.webp'), scene=scene)
            bpy.data.images.remove(image)
            scene.render.image_settings.file_format = 'PNG'
            print('RENDERED ' + item + ':' + layer, flush=True)
        with open(os.path.join(dest, item + '.json'), 'w') as file:
            json.dump(manifest, file, indent=2)
            file.write('\n')


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if args == ['models']:
        equipped()
    else:
        crafting()
