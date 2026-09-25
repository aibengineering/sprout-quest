// Where the waypoint arrow points for the current goal.
import { GEAR, GEAR_ORDER, NODES, PROJECTS, ZONES, forgeLevelFor, zoneById, type MatId, type Recipe } from '../data';
import { currentQuest } from '../quests';
import { canGather, missingSkill } from '../rules';
import { has } from '../unlocks';
import type { WorldObj } from '../world';
import { G } from './context';

/** The spot in front of an object, where you actually stand to use it. */
const front = (o?: { x: number; y: number; w: number; h: number }) => (o ? { x: o.x + o.w / 2, y: o.y + o.h + 0.7 } : null);

export function objective(): { x: number; y: number } | null {
  const s = G.save, w = G.world;
  const q = currentQuest(s);
  if (!q) return null;
  const g = q.goal;
  switch (g.type) {
    case 'talk':
      return front(w.obj('elder'));
    case 'flag': {
      if (g.flag === 'sword') return front(w.objs.find((o) => o.kind === 'pickup'));
      if (g.flag === 'village') return w.entryPoint('village');
      const foe = w.objs.find((o) => o.kind === 'foe' && o.flag === g.flag);
      return foe ? { x: foe.x + 0.5, y: foe.y + 2.7 } : null;
    }
    case 'craft': {
      if (!has(s, 'forge')) return null;
      // Aim for the gear that's closest to craftable; if it's short on stone or wood, send you to gather it.
      const options = GEAR_ORDER.map((id) => GEAR[id]).filter((g) => g.recipe && !s.owned.includes(g.id) && forgeLevelFor(g) <= s.build.forge && !missingSkill(s, g.needs));
      const short = (g: typeof options[number]) => Object.entries(g.recipe!).reduce((a, [m, n]) => a + Math.max(0, (n ?? 0) - s.mats[m as MatId]), 0);
      const target = options.sort((a, b) => short(a) - short(b))[0];
      return (target && gatherPointer(target.recipe!)) ?? front(w.obj('forge'));
    }
    case 'build': {
      const lvl = PROJECTS[g.project].levels[s.build[g.project]];
      const gather = lvl && gatherPointer(lvl.cost);
      if (gather) return gather;
      return g.project === 'forge' ? front(w.obj('forge')) : front(w.obj('plot', g.project));
    }
    case 'boss': {
      if (g.kind === 'dragon') return front(w.obj('lair'));
      const gate = w.obj('gate', ZONES.find((z) => z.guardian?.kind === g.kind)?.id);
      // The guardian stands on the path just west of its gate.
      return gate ? { x: gate.x - 0.8, y: gate.y + 2.6 } : null;
    }
    case 'mats':
    case 'kills': {
      // Outside the zone: head for its entrance. Inside: the nearest node for gathered materials, else a monster.
      const z = zoneById(g.zone);
      if (G.over.currentZone.id !== g.zone) return w.entryPoint(z.id);
      if (g.type === 'mats') {
        const gather = gatherPointer(g.need);
        if (gather) return gather;
      }
      const m = G.over.roamers.nearestIn(z.id, G.over.x, G.over.y);
      return m && Math.hypot(m.x - G.over.x, m.y - G.over.y) > 2.5 ? { x: m.x, y: m.y } : null;
    }
  }
}

/**
 * Where to go for a recipe's missing gathered material: the Forge if you still need the tool, otherwise the nearest
 * ready tree or rock. Null if nothing gathered is missing.
 */
function gatherPointer(cost: Recipe): { x: number; y: number } | null {
  const s = G.save;
  const mat = (Object.keys(cost) as MatId[]).find((m) => s.mats[m] < (cost[m] ?? 0) && Object.values(NODES).some((n) => n.mat === m));
  if (!mat) return null;
  const n = Object.values(NODES).find((n) => n.mat === mat)!;
  const forge = G.world.obj('forge')!;
  if (s.tools[n.skill] < n.tier) return has(s, 'forge') ? { x: forge.x + forge.w / 2, y: forge.y + forge.h + 0.7 } : null;
  const node = nearestNode(mat);
  return node ? { x: node.x + node.w / 2, y: node.y + node.h + 0.5 } : null;
}

/** Nearest ready node that gives `mat` and that you can gather. */
function nearestNode(mat: MatId): WorldObj | null {
  let best: WorldObj | null = null, bd = Infinity;
  for (const o of G.world.objs) {
    if (o.kind !== 'node' || NODES[o.node!].mat !== mat || canGather(G.save, o.node!, o.id!) !== 'ok') continue;
    const d = (o.x - G.over.x) ** 2 + (o.y - G.over.y) ** 2;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
