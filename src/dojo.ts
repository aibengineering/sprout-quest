// Optional combat lessons: generous first-clear XP, then practice without loot or story kills.
import { GEAR, type MonsterKind } from './data';
import { gainMastery, gainXp } from './rules';
import type { SaveState } from './state';
import type { BattleOutcome, BattleSetup } from './battle/types';
export interface DojoChallenge { id: string; name: string; rank: number; reward: number; foes: { kind: MonsterKind; lv: number }[]; evades: number; skills: number; seconds?: number; damage?: number; hint: string }
export const DOJO_CHALLENGES: DojoChallenge[] = [
  { id: 'footwork', name: 'Find Your Feet', rank: 1, reward: 180, foes: [{ kind: 'slime', lv: 6 }], evades: 1, skills: 0, hint: 'Wait for the target to wind up. Dodge through its swing, then clear it.' },
  { id: 'charge', name: 'Let It Pass', rank: 1, reward: 240, foes: [{ kind: 'bunny', lv: 7 }], evades: 2, skills: 0, hint: 'Two clean dodges through the rush. Swing when the target has gone past.' },
  { id: 'pack', name: 'Room to Move', rank: 2, reward: 400, foes: [{ kind: 'wolf', lv: 9 }, { kind: 'wolf', lv: 9 }], evades: 2, skills: 0, seconds: 90, hint: 'Keep both targets in front. Dodge through two attacks and clear them within 90 seconds.' },
  { id: 'special', name: 'Make It Count', rank: 2, reward: 500, foes: [{ kind: 'shroom', lv: 10 }, { kind: 'wolf', lv: 9 }], evades: 0, skills: 1, hint: 'Land your weapon’s special, then clear both targets. An empty swing won’t count.' },
  { id: 'stone', name: 'After the Slam', rank: 3, reward: 750, foes: [{ kind: 'golem', lv: 12 }], evades: 2, skills: 0, seconds: 90, hint: 'The heavy target opens after its slam. Dodge through two attacks, then finish within 90 seconds.' },
  { id: 'crowd', name: 'Hold Your Ground', rank: 3, reward: 1000, foes: [{ kind: 'golem', lv: 13 }, { kind: 'wolf', lv: 12 }, { kind: 'bat', lv: 12 }], evades: 1, skills: 2, damage: .5, hint: 'One clean dodge, two specials that connect. Clear the targets while taking at most half your practice HP.' },
];
export const dojoChallenge = (id: string) => DOJO_CHALLENGES.find((c) => c.id === id);
export const dojoCleared = (s: SaveState, id: string) => s.flags.includes(`dojo:clear:${id}`);
export function dojoLock(s: SaveState, c: DojoChallenge): string | null {
  if (s.build.training < c.rank) return `Bram needs to finish dojo level ${c.rank}.`;
  const previous = DOJO_CHALLENGES[DOJO_CHALLENGES.indexOf(c) - 1];
  if (previous && !dojoCleared(s, previous.id)) return `Clear “${previous.name}” first.`;
  if (c.skills && s.mastery[GEAR[s.equip.weapon]?.style ?? 'sword'].lv < 2) return 'Equip a weapon class with its special unlocked (handling Lv 2).';
  return null;
}
export interface DojoPerformance { evades: number; skillHits: number; maxHp: number }
export function dojoMisses(c: DojoChallenge, o: BattleOutcome, p: DojoPerformance): string[] {
  return [
    ...(o.result !== 'win' ? ['Clear all the practice targets.'] : []),
    ...(p.evades < c.evades ? [`Dodge through ${c.evades} attacks (${p.evades}/${c.evades}).`] : []),
    ...(o.log.skills < c.skills || p.skillHits < c.skills ? [`Use ${c.skills} specials that connect.`] : []),
    ...(c.seconds && o.log.time > c.seconds ? [`Finish within ${c.seconds} seconds.`] : []),
    ...(c.damage !== undefined && o.log.taken > p.maxHp * c.damage ? ['Take no more than half your practice HP in damage.'] : []),
  ];
}
/** Durable once-only reward. Neither normal battle XP nor food/dev multipliers apply. */
export function claimDojo(s: SaveState, id: string, o: BattleOutcome, p: DojoPerformance): number {
  const c = dojoChallenge(id);
  if (!c || dojoLock(s, c) || dojoMisses(c, o, p).length || dojoCleared(s, id)) return 0;
  s.flags.push(`dojo:clear:${id}`);
  gainXp(s, c.reward); gainMastery(s, GEAR[s.equip.weapon]?.style ?? 'sword', c.reward);
  return c.reward;
}
export const dojoSetup = (c: DojoChallenge): Pick<BattleSetup, 'foes' | 'boss' | 'dojo'> => ({ foes: c.foes.map((f) => ({ ...f, golden: false })), boss: false, dojo: c.id });
