"""6 Bat Wings + 1 Golem Core + 2 Sharp Fangs. Keep lash color compatible with whipGrip."""
import math
from lib import profile, toon, torus
from gear._iron_bat_common import LASH, core, membrane_shaft, piece


def build_weapon(root):
    def coils():
        for i in range(3):
            torus((.26+.05*i,0,-.1-.03*i),.13-.02*i,.025,toon(LASH),root,
                  rot=(math.pi/2,0,.35*i),seg=24,line=.012)
        # Broad scalloped tab gives the lash an unmistakable wing silhouette.
        profile([(.35,-.24),(.42,-.34),(.48,-.29),(.5,-.4),(.43,-.39),(.4,-.33)],
                .023,toon(LASH),root,bevel=.007,line=.01)
    def fangs():
        for s in (-1,1):
            profile([(-.115,s*.041),(-.1,s*.079),(-.06,s*.11),(-.074,s*.061),(-.095,s*.036)],
                    .023,toon('#f4eee0'),root,bevel=.005,line=.007)
    return {'wing-grip':piece(lambda:membrane_shaft(root,.19)), 'wing-lash':piece(coils),
            'core-pommel':piece(lambda:core(root,-.12,.061)), 'fang-hooks':piece(fangs)}


LENGTH = .9

# Assembly camera after standard diagonal weapon presentation (root Y=-pi/4, scale=(1,1.25,1.25)).
