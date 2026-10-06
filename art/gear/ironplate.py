"""Iron cuirass, articulated pauldrons, waist plates and an open helmet over a gambeson."""
from lib import box, lathe, profile, toon, torus
from gear._metal import pivots, rivet, shell
from gear._garment import lining, binding

PARTS = ('fluff-gambeson', 'goo-seams', 'iron-shell', 'iron-helmet', 'iron-guards', 'copper-rivets')
HELMET = True


def build_armor(P):
    return build(P['body'], {s: P[f'arm{s}'] for s in (-1, 1)}, P['head'])


def build(body, arms=None, head=None):
    arms, head = pivots(body, arms, head)
    parts = {p: [] for p in PARTS}
    lining(parts, 'fluff-gambeson', body, arms, '#d8cfc0')
    binding(parts, 'goo-seams', body, arms, '#716c72')
    iron, light, dark = toon('#aebbc9', rim=.23), toon('#d1dbe2', rim=.2), toon('#77889c', rim=.17)
    parts['iron-shell'] = shell(body, '#8999ad', 'iron_backplate', bands=2)
    outline = [(-.20, .49), (-.09, .535), (0, .50), (.09, .535), (.20, .49),
               (.245, .39), (.195, .235), (0, .205), (-.195, .235), (-.245, .39)]
    parts['iron-shell'].append(profile(outline, .075, iron, body, loc=(0, -.211, 0),
                                       bevel=.025, line=.009, name='iron_breastplate'))
    # The central forged ridge and narrow edge highlight give one broad metal chest.
    parts['iron-shell'].append(profile([(-.015, .48), (0, .50), (.015, .48),
                                        (.009, .25), (0, .225), (-.009, .25)],
                                       .012, light, body, loc=(0, -.256, 0),
                                       bevel=.004, line=.003, name='cuirass_ridge'))
    parts['iron-guards'].append(torus((0, 0, .225), .247, .02, dark, body,
                                     seg=24, line=.006, name='iron_waist_band'))
    for side in (-1, 1):
        arm = arms[side]
        # Rounded rectangular, overlapping shoulder lames instead of stone blobs.
        for i in range(3):
            parts['iron-guards'].append(box((side * (.015 + .035 * i), 0, .12 - .048 * i),
                                            (.19, .245, .065), iron if i != 1 else dark, arm,
                                            rot=(0, side * .18, 0), bevel=.025, line=.008,
                                            name='iron_pauldron_lame'))
        parts['iron-guards'].append(profile([(side * x, z) for x, z in
                    ((.025, .225), (.195, .23), (.245, .105), (.08, .09))], .04,
                    iron, body, loc=(0, -.207, 0), bevel=.012, line=.007, name='iron_tasset'))
        for z in (.27, .455):
            parts['copper-rivets'].append(rivet((side * .177, -.258, z), body, 'cuirass_rivet', .014))
        parts['copper-rivets'].append(rivet((side * .015, -.132, .12), arm, 'pauldron_rivet', .014))
    parts['iron-helmet'].append(lathe([(.001, .416), (.20, .385), (.33, .295),
                                      (.385, .16), (.384, .105), (.355, .105),
                                      (.35, .16), (.295, .285), (.18, .355), (.001, .38)],
                                     iron, head, loc=(0, .047, 0), seg=24,
                                     line=.009, name='iron_open_helm'))
    parts['iron-helmet'].append(box((0, -.305, .11), (.55, .045, .05), dark, head,
                                    bevel=.014, line=.006, name='iron_brow'))
    parts['iron-helmet'].append(box((0, .025, .411), (.027, .30, .02), light, head,
                                    bevel=.008, line=.004, name='iron_helm_ridge'))
    for side in (-1, 1):
        parts['iron-helmet'].append(profile([(side * x, z) for x, z in
                    ((.28, .15), (.36, .14), (.34, -.065), (.28, -.09), (.25, .025))],
                    .045, dark, head, loc=(0, -.085, 0), bevel=.012, line=.007,
                    name='iron_cheek_guard'))
        parts['copper-rivets'].append(rivet((side * .235, -.332, .11), head, 'helm_rivet', .015))
    parts['copper-rivets'].append(box((0, -.245, .21), (.063, .02, .041),
                                     toon('#d6975b'), body, bevel=.008, line=.004, name='belt_buckle'))
    return parts
