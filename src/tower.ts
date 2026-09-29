// The Battle Tower: a climb through every area's monsters and guardians, one fight per floor, with nothing to walk to
// or gather. For now it's a dev tool for trying the combat at any stage (see src/dev/devtools.ts); it's shaped so it can
// grow into post-game content with its own rewards.
import { CHECKPOINTS, type Checkpoint } from './balance';
import { GEAR, MONSTERS, NODES, ZONES, type MatId, type MonsterKind, type Zone, type ZoneId } from './data';

export interface TowerFloor {
  /** 1-based. */
  n: number;
  zone: Zone;
  foes: { kind: MonsterKind; lv: number }[];
  boss: boolean;
  /** "Sunny Meadow 2/3", or the guardian's name. */
  label: string;
  /** The gear tier this stage of the climb is about (1–5). */
  tier: number;
}

/** Regular floors per area before the next guardian. */
const PER_ZONE = 3;
/** The Emberwyrm, at the top. */
const DRAGON_LV = 20;

/**
 * The floors, bottom to top: three fights in each area (a few monsters at the bottom of its levels, then more and
 * stronger), then the guardian that stands at the next area's gate, and the Emberwyrm last. The same floor always
 * holds the same fight, so you can replay one to compare.
 */
export const TOWER: TowerFloor[] = (() => {
  const floors: Omit<TowerFloor, 'n'>[] = [];
  const areas = ZONES.filter((z) => z.monsters.length);
  areas.forEach((z, i) => {
    for (let k = 0; k < PER_ZONE; k++) {
      const count = Math.min(z.maxEnemies, k + 1 + (i > 0 ? 1 : 0));
      const lv = Math.round(z.lv[0] + ((z.lv[1] - z.lv[0]) * k) / (PER_ZONE - 1));
      const foes = Array.from({ length: count }, (_, j) => ({ kind: z.monsters[(k + j) % z.monsters.length].kind, lv }));
      floors.push({ zone: z, foes, boss: false, label: `${z.name} ${k + 1}/${PER_ZONE}`, tier: i + 1 });
    }
    const next = areas[i + 1];
    if (next?.guardian) floors.push({ zone: next, foes: [{ kind: next.guardian.kind, lv: next.guardian.lv }], boss: true, label: MONSTERS[next.guardian.kind].name, tier: i + 1 });
  });
  const peak = ZONES.find((z) => z.id === 'peak')!;
  floors.push({ zone: peak, foes: [{ kind: 'dragon', lv: DRAGON_LV }], boss: true, label: 'The Emberwyrm', tier: 5 });
  return floors.map((f, i) => ({ ...f, n: i + 1 }));
})();

/** The balance checkpoint for a floor's area: the level and gear the game expects you to have there. */
export function checkpointFor(f: TowerFloor): Checkpoint {
  const zone: ZoneId = f.boss && f.foes[0].kind !== 'dragon' ? previousArea(f.zone.id) : f.zone.id;
  if (f.foes[0].kind === 'dragon') return CHECKPOINTS.find((c) => c.id === 'dragon')!;
  return [...CHECKPOINTS].reverse().find((c) => c.zone === zone && c.id !== 'dragon') ?? CHECKPOINTS[1];
}

/** A guardian is fought with the gear of the area before its gate. */
function previousArea(id: ZoneId): ZoneId {
  const areas = ZONES.filter((z) => z.monsters.length);
  const i = areas.findIndex((z) => z.id === id);
  return areas[Math.max(0, i - 1)].id;
}

const gathered = (m: string) => Object.values(NODES).some((n) => n.mat === m);

/**
 * What a cleared floor hands you besides the monsters' drops: the wood, stone and ore its tier's weapons and armor are
 * made of (there's nothing to gather in the tower). An area's four floors bring enough for a weapon and a suit of
 * armor from its tier, whichever you choose.
 */
export function towerSupplies(f: TowerFloor): Partial<Record<MatId, number>> {
  const out: Partial<Record<MatId, number>> = {};
  for (const slot of ['weapon', 'armor'] as const) {
    const need: Partial<Record<MatId, number>> = {};
    for (const g of Object.values(GEAR)) {
      if (g.slot !== slot || g.tier !== f.tier || !g.recipe) continue;
      for (const [m, n] of Object.entries(g.recipe) as [MatId, number][]) if (gathered(m)) need[m] = Math.max(need[m] ?? 0, n);
    }
    for (const [m, n] of Object.entries(need) as [MatId, number][]) out[m] = (out[m] ?? 0) + Math.ceil(n / (PER_ZONE + 1));
  }
  return out;
}
