"""A notched stone mallet clamped by split oak; no invented adhesive."""
from lib import box, profile, toon
from ._stone_jelly import component, oak, OAK, OAK_DARK

LENGTH = 1.3
PARTS = ('oak-shaft', 'stone-head', 'oak-clamp')


def build_weapon(root):
    parts = {}
    component(parts, 'oak-shaft', lambda: oak(root, .99, .047))

    def head():
        profile([(.71, -.24), (.79, -.285), (.98, -.27), (1.075, -.17),
                 (1.07, .19), (.99, .28), (.79, .265), (.69, .18), (.70, -.10)],
                .29, toon('#9fa7b6', rim=.16), root, bevel=.027, line=.018)
        profile([(.77, .14), (.88, .21), (.99, .18), (1.025, .06), (.93, .035)],
                .009, toon('#ccd2da', rim=.08), root, loc=(0, -.156, 0), bevel=0, line=0)
        profile([(.75, -.19), (.81, -.24), (.97, -.22), (1.01, -.13), (.88, -.1)],
                .009, toon('#7b8496', rim=.08), root, loc=(0, -.156, 0), bevel=0, line=0)
    component(parts, 'stone-head', head)

    def clamp():
        box((.88, -.178, 0), (.12, .045, .55), toon(OAK_DARK), root,
            bevel=.018, line=.01)
        box((.88, .178, 0), (.12, .045, .55), toon(OAK_DARK), root,
            bevel=.018, line=.01)
        box((.88, 0, .28), (.15, .41, .07), toon(OAK), root, bevel=.016, line=.01)
    component(parts, 'oak-clamp', clamp)
    return parts
