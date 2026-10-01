"""5 Bat Wings + 2 Golem Cores: folded-wing shaft, paired membrane crown, two stone-ring cores."""
from gear._iron_bat_common import core, membrane_shaft, piece, wing


def build_weapon(root):
    return {'wing-shaft':piece(lambda:membrane_shaft(root,.72,.034)),
            'left-wing':piece(lambda:wing(root,.79,1)), 'right-wing':piece(lambda:wing(root,.79,-1)),
            'core-crown':piece(lambda:core(root,.84,.092)), 'core-pommel':piece(lambda:core(root,-.115,.052))}


LENGTH = 1.3

# Assembly camera after standard diagonal weapon presentation (root Y=-pi/4, scale=(1,1.25,1.25)).
