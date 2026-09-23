"""Debug helper: blender -b -P montage.py -- out.png cols a.png b.png ... (checkerboard background)."""
import sys, bpy, numpy as np
args = sys.argv[sys.argv.index('--') + 1:]
out, cols, files = args[0], int(args[1]), args[2:]
imgs = []
for f in files:
    im = bpy.data.images.load(f)
    w, h = im.size
    imgs.append(np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4))
W = max(i.shape[1] for i in imgs); H = max(i.shape[0] for i in imgs)
rows = (len(imgs) + cols - 1) // cols
canvas = np.zeros((rows * H, cols * W, 4), np.float32)
yy, xx = np.mgrid[0:rows * H, 0:cols * W]
chk = (((yy // 8) + (xx // 8)) % 2) * 0.08 + 0.55
canvas[..., 0] = chk * 0.9; canvas[..., 1] = chk; canvas[..., 2] = chk * 0.8; canvas[..., 3] = 1
for k, im in enumerate(imgs):
    r, c = rows - 1 - k // cols, k % cols
    h, w = im.shape[:2]
    reg = canvas[r * H:r * H + h, c * W:c * W + w]
    a = im[..., 3:4]
    reg[..., :3] = im[..., :3] * a + reg[..., :3] * (1 - a)
o = bpy.data.images.new('m', cols * W, rows * H, alpha=True)
o.pixels = canvas.ravel()
o.filepath_raw = out; o.file_format = 'PNG'; o.save()
