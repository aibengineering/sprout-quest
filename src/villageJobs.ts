// Bram builds one requested place at a time. Its resident runs the activity.
import { MATS, PROJECTS, type ProjectId, type Recipe } from './data';
import { HOMES, buildHome, homeLevel, type HomeId } from './housing';
import { build, canBuild, hasMats, spend } from './rules';
import type { SaveState } from './state';

export interface VillageJob { id: string; name: string; owner: string; request: string; perk: string; cost: Recipe; mill: number; project?: ProjectId; home?: HomeId; level: number }
const project = (id: string, key: 'garden' | 'training', level: number, owner: string, request: string, mill: number): VillageJob => ({ id, project: key, level, owner, request, mill, ...PROJECTS[key].levels[level - 1] });
const home = (id: HomeId, level: number, request: string): VillageJob => ({ id: `${id}${level}`, home: id, level, owner: HOMES[id].name, request, ...HOMES[id].plans[level - 1] });
export const KITCHEN_EXTENSION: VillageJob = { id: 'kitchen', name: "Granny’s Kitchen Extension", owner: 'Granny Clover', level: 1, mill: 1,
  cost: { plank: 64, stone: 24, copper: 9, flower: 6 }, perk: 'A roomy kitchen: choose a recipe with Clover, carry one plate and cook together.',
  request: 'Clover wants room to cook with you. Timber for the benches, stone for the oven. Poppy offered flowers for the windows.' };
export const VILLAGE_JOBS: VillageJob[] = [
  project('garden1', 'garden', 1, 'Poppy', 'Poppy wants a patch of her own. I’ll put up the fence. She’s already saved the seeds.', 1),
  KITCHEN_EXTENSION,
  home('pip', 1, 'Pip’s been sleeping underground. Reckon we can manage a roof. Clover wants flowers by his door.'),
  project('training1', 'training', 1, 'Alder', 'Alder heard about the Woolves. Says we need somewhere to practise our footwork. I’ll build his dojo; he does the teaching.', 1),
  home('hazel', 1, 'Pip knows an herbalist. Hazel brought cuttings for Poppy’s beds. Let’s give her somewhere to keep them.'),
  project('garden2', 'garden', 2, 'Poppy', 'Poppy’s running out of beds. Hazel has herbs waiting. More plots, same gate.', 1),
  home('pip', 2, 'Pip’s stones are taking over the floor. A study should keep them out of Clover’s kitchen.'),
  project('training2', 'training', 2, 'Alder', 'Alder needs room for the moving targets. Pine for the deck. He’ll show you how to meet a rush.', 2),
  home('moss', 1, 'Clover knows a baker who needs an oven and a roof. Moss can use her new kitchen. Berries and flowers will make him welcome.'),
  home('hazel', 2, 'Hazel wants to shelter Poppy’s cuttings through winter. Pine beams, crystal glass, flowers round the sill.'),
  project('garden3', 'garden', 3, 'Poppy', 'Poppy and Hazel have filled the beds again. Let’s give them the whole field, with lamps for the late watering.', 3),
  home('moss', 2, 'Moss needs a cool place for his dough. Glimmerwood and crystal. He asked for flowers where Clover can see them.'),
  project('training3', 'training', 3, 'Alder', 'Alder’s ready for the harder lessons. Stronger timber, a proper gong. Poppy insists on flowers beside the door.', 3),
];
export const jobDone = (s: SaveState, j: VillageJob) => j.home ? homeLevel(s, j.home) >= j.level : j.project ? s.build[j.project] >= j.level : s.flags.includes('granny:extension');
export const nextVillageJob = (s: SaveState) => VILLAGE_JOBS.find((j) => !jobDone(s, j));
export const villageDue = (s: SaveState) => s.flags.includes('bram:hut') && s.build.sawmill > 0;
export function jobLock(s: SaveState, j: VillageJob): string | null {
  if (!villageDue(s)) return 'Help Bram settle into Sowerby first.';
  if (nextVillageJob(s)?.id !== j.id) return 'Finish Bram’s current building job first.';
  if (s.build.sawmill < j.mill) return `Upgrade the Sawmill to level ${j.mill} for this timber.`;
  if (j.home && j.level > 1 && !s.flags.includes(j.home === 'pip' ? 'pip:candy' : `${j.home}:recipe`)) return `Meet ${j.owner} at their home first.`;
  return null;
}
export const jobGoal = (j: VillageJob) => `Bring Bram ${Object.entries(j.cost).map(([m,n]) => `${n} ${MATS[m as keyof Recipe].name}`).join(', ')} for ${j.name}`;
/** The job identity and current level make queued/stale hand-ins harmless. Commit before presenting assembly. */
export function completeVillageJob(s: SaveState, id: string): 'ok' | 'locked' | 'missing' | 'stale' {
  const j = nextVillageJob(s);
  if (!j || j.id !== id) return 'stale';
  if (jobLock(s, j)) return 'locked';
  if (!hasMats(s, j.cost)) return 'missing';
  if (j.home) return buildHome(s, j.home, j.level - 1) === 'ok' ? 'ok' : 'locked';
  if (j.project) {
    if (canBuild(s, j.project) !== 'ok') return 'locked';
    return build(s, j.project) === 'ok' ? 'ok' : 'locked';
  }
  spend(s, j.cost); s.flags.push('granny:extension'); return 'ok';
}
