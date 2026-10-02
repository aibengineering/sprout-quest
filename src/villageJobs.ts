// Bram builds one requested place at a time. Its resident runs the activity.
import { KITCHEN_PLANS, kitchenLevel } from './kitchenUpgrades';
import { NEIGHBOURS, neighbourReturned, type NeighbourId } from './neighbours';
import { MATS, PROJECTS, type ProjectId, type Recipe } from './data';
import { HOMES, buildHome, homeLevel, type HomeId } from './housing';
import { build, canBuild, hasMats, spend } from './rules';
import type { SaveState } from './state';

export interface VillageJob { id: string; name: string; owner: string; request: string; perk: string; cost: Recipe; mill: number; project?: ProjectId; home?: HomeId; level: number; recruit?: NeighbourId }
const project = (id: string, key: 'garden' | 'training', level: number, owner: string, request: string, mill: number): VillageJob => ({ id, project: key, level, owner, request, mill, ...PROJECTS[key].levels[level - 1] });
const home = (id: HomeId, level: number, request: string): VillageJob => ({ id: `${id}${level}`, home: id, level, ...(level === 1 ? { recruit: id } : {}), owner: HOMES[id].name, request, ...HOMES[id].plans[level - 1] });
const kitchen = (level: number): VillageJob => ({ id: level === 1 ? 'kitchen' : `kitchen${level}`, owner: 'Granny Clover', level, ...KITCHEN_PLANS[level-1] });
export const KITCHEN_EXTENSION = kitchen(1);
export const VILLAGE_JOBS: VillageJob[] = [
  project('garden1', 'garden', 1, 'Poppy', 'Poppy wants a patch of her own. I’ll put up the fence. She’s already saved the seeds.', 1),
  KITCHEN_EXTENSION,
  home('pip', 1, 'Pip’s been sleeping underground. Reckon we can manage a roof. Clover wants flowers by his door.'),
  { ...project('training1', 'training', 1, 'Alder', 'Alder heard about the Woolves. Says we need somewhere to practise our footwork. I’ll build his dojo; he does the teaching.', 1), recruit: 'alder' },
  home('hazel', 1, 'Pip knows an herbalist. Hazel brought cuttings for Poppy’s beds. Let’s give her somewhere to keep them.'),
  project('garden2', 'garden', 2, 'Poppy', 'Poppy’s running out of beds. She wants room for herbs. More plots, same gate.', 1),
  home('pip', 2, 'Pip’s stones are taking over the floor. A study should keep them out of Clover’s kitchen.'),
  project('training2', 'training', 2, 'Alder', 'Alder needs room for the moving targets. Pine for the deck. He’ll show you how to meet a rush.', 2),
  home('moss', 1, 'Clover knows a baker who needs an oven and a roof. Moss can use her new kitchen. Berries and flowers will make him welcome.'),
  home('hazel', 2, 'Hazel wants to shelter Poppy’s cuttings through winter. Pine beams, crystal glass, flowers round the sill.'),
  project('garden3', 'garden', 3, 'Poppy', 'Poppy has filled the beds again. Let’s give them the whole field, with lamps for the late watering.', 3),
  home('moss', 2, 'Moss needs a cool place for his dough. Glimmerwood and crystal. He asked for flowers where Clover can see them.'),
  project('training3', 'training', 3, 'Alder', 'Alder’s ready for the harder lessons. Stronger timber, a proper gong. Poppy insists on flowers beside the door.', 3),
  kitchen(2), kitchen(3),
  home('pip', 3, 'Pip wants to catalogue the stones he’s brought home. Glimmer shelves, iron brackets, crystal windows.'),
  home('hazel', 3, 'Hazel’s delicate cuttings need a warm conservatory. Glimmer timber, crystal and flowers from the beds.'),
  home('moss', 3, 'Moss wants an oven of his own beside the larder. Ember beams and obsidian, with berries for the first batch.'),
];
export const jobDone = (s: SaveState, j: VillageJob) => j.home ? homeLevel(s, j.home) >= j.level : j.project ? s.build[j.project] >= j.level : kitchenLevel(s) >= j.level;
export const villageDue = (s: SaveState) => s.flags.includes('bram:hut') && s.build.sawmill > 0;
const completed = (s: SaveState, id: string) => jobDone(s, VILLAGE_JOBS.find((j) => j.id === id)!);
const FOUNDATIONS: Record<string, string[]> = { kitchen: ['garden1'], pip1: ['kitchen'], training1: ['pip1'], hazel1: ['pip1', 'garden1'], moss1: ['hazel1', 'kitchen'] };
export function jobLock(s: SaveState, j: VillageJob): string | null {
  if (!villageDue(s)) return 'Help Bram settle into Sowerby first.';
  if (jobDone(s, j)) return 'That work is already complete.';
  if (j.level > 1) {
    const previous = VILLAGE_JOBS.find((p) => p.owner === j.owner && p.level === j.level - 1)!;
    if (!jobDone(s, previous)) return `Build ${previous.name} first.`;
    if (j.home && !s.flags.includes(j.home === 'pip' ? 'pip:candy' : `${j.home}:recipe`)) return `Visit ${j.owner} at their home first.`;
    if (j.project === 'training' && !s.flags.includes('alder:met')) return 'Meet Alder at his dojo first.';
  }
  if ((FOUNDATIONS[j.id] ?? []).some((id) => !completed(s, id))) return 'Finish the earlier village foundations first.';
  if (j.recruit && !neighbourReturned(s, j.recruit)) return `Meet ${NEIGHBOURS[j.recruit].name} and bring them back to Sowerby first.`;
  if (s.build.sawmill < j.mill) return `Upgrade the Sawmill to level ${j.mill} for this timber.`;
  return null;
}
/** New places get first offer; residents can request their next addition without blocking anyone's arrival. */
export function nextVillageJob(s: SaveState) {
  const chosen = VILLAGE_JOBS.find((j) => j.id === s.buildingJob && !jobDone(s,j));
  if (chosen) return chosen;
  const foundation = VILLAGE_JOBS.find((j) => j.level === 1 && !jobDone(s,j) && !jobLock(s,j));
  if (foundation) return foundation;
  return VILLAGE_JOBS.find((j) => j.level > 1 && !jobDone(s,j) && !jobLock(s,j))
    ?? VILLAGE_JOBS.find((j) => !jobDone(s,j));
}
/** An owner's conversation proposes exactly one next tier, and never charges materials. */
export function requestVillageUpgrade(s: SaveState, owner: string) {
  if (!villageDue(s)) return null;
  const j = VILLAGE_JOBS.find((j) => j.owner === owner && j.level > 1 && !jobDone(s,j));
  if (!j) return null;
  const previous = VILLAGE_JOBS.find((p) => p.owner === owner && p.level === j.level - 1)!;
  if (!jobDone(s,previous)) return null;
  s.buildingJob = j.id; return j;
}
export const jobGoal = (j: VillageJob) => `${j.level > 1 ? 'Help Bram upgrade' : 'Help Bram build'} ${j.name}`;
/** The job identity and current level make queued/stale hand-ins harmless. Commit before presenting assembly. */
export function completeVillageJob(s: SaveState, id: string): 'ok' | 'locked' | 'missing' | 'stale' {
  const j = nextVillageJob(s);
  if (!j || j.id !== id) return 'stale';
  if (jobLock(s, j)) return 'locked';
  if (!hasMats(s, j.cost)) return 'missing';
  if (j.home) {
    if (buildHome(s, j.home, j.level - 1) !== 'ok') return 'locked';
  } else if (j.project) {
    if (canBuild(s, j.project) !== 'ok' || build(s, j.project) !== 'ok') return 'locked';
  } else {
    spend(s, j.cost); s.kitchenLevel = j.level;
    if (!s.flags.includes('granny:extension')) s.flags.push('granny:extension');
  }
  delete s.buildingJob; return 'ok';
}
