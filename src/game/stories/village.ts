// One construction goal at a time. Existing buildings satisfy their jobs without charging again.
import { VILLAGE_JOBS, jobDone, villageDue } from '../../villageJobs';
import { G } from '../context';
import { BRAM_AT } from './bram';
import type { Story } from '../stories';
export const VILLAGE_STORY: Story = {
  id: 'building', title: 'A Place for Everyone', icon: '🏘️', available: () => villageDue(G.save), objs: [], cast: () => [],
  steps: VILLAGE_JOBS.map((j) => ({ id: j.id, label: `Help Bram build ${j.name}`, target: () => BRAM_AT, done: () => jobDone(G.save, j) })),
};
