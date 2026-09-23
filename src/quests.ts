// Story progression: evaluates the current quest's goal against the save and advances the chain.
import { MAX_POTIONS, MONSTERS, PROJECTS, QUESTS, ZONES, type Quest } from './data';
import { mergeDrops } from './rules';
import type { SaveState } from './state';

export function currentQuest(s: SaveState): Quest | null {
  return QUESTS[s.quest] ?? null;
}

export function progress(s: SaveState, q: Quest): { cur: number; max: number; label: string } {
  const g = q.goal;
  switch (g.type) {
    case 'talk':
      return { cur: s.talked ? 1 : 0, max: 1, label: 'Talk to Elder Bloom' };
    case 'flag':
      return { cur: s.flags.includes(g.flag) ? 1 : 0, max: 1, label: g.label };
    case 'kills': {
      const zone = ZONES.find((z) => z.id === g.zone)!;
      return { cur: Math.min(g.count, s.questKills), max: g.count, label: `Monsters in ${zone.name}` };
    }
    case 'craft':
      return { cur: s.crafted > 0 ? 1 : 0, max: 1, label: 'Craft new gear' };
    case 'build': {
      const lvl = PROJECTS[g.project].levels[g.level - 1];
      return { cur: Math.min(1, s.build[g.project] >= g.level ? 1 : 0), max: 1, label: `Build: ${lvl.name}` };
    }
    case 'boss':
      return { cur: s.bosses.includes(g.kind) ? 1 : 0, max: 1, label: `Defeat ${MONSTERS[g.kind].name}` };
  }
}

export function isDone(s: SaveState, q: Quest) {
  const p = progress(s, q);
  return p.cur >= p.max;
}

/** Completes every finished step in order, granting rewards. Returns the completed quests. */
export function advanceQuests(s: SaveState): Quest[] {
  const done: Quest[] = [];
  for (let q = currentQuest(s); q && isDone(s, q); q = currentQuest(s)) {
    if (q.reward?.mats) mergeDrops(s.mats, q.reward.mats);
    if (q.reward?.potions) s.potions = Math.min(MAX_POTIONS, s.potions + q.reward.potions);
    done.push(q);
    s.quest++;
    s.questKills = 0;
    s.talked = false;
  }
  return done;
}

/** Count monsters defeated in a zone toward the current kill goal. */
export function recordKills(s: SaveState, zone: string, n: number) {
  const q = currentQuest(s);
  if (q?.goal.type === 'kills' && q.goal.zone === zone) s.questKills += n;
}
