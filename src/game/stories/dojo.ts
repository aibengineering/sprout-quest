import type { Story } from '../stories';
import { G } from '../context';
import { TOWN_TRAINING } from '../../villageLayout';
import { visitDojo } from '../dojo';
export const DOJO_STORY: Story = {
  id: 'alder', title: 'Alder’s Dojo', icon: '🥋', available: () => G.save.build.training > 0, objs: [],
  steps: [{ id: 'meet', label: 'Meet Alder at his dojo', target: () => ({ x: TOWN_TRAINING.x + 1.5, y: TOWN_TRAINING.y + 2.2 }), done: () => G.save.flags.includes('alder:met') }],
  cast: () => [{ id: 'alder:alder', name: 'Alder', look: { kind: 'walker', name: 'alder' }, x: TOWN_TRAINING.x + TOWN_TRAINING.w + .45, y: TOWN_TRAINING.y + TOWN_TRAINING.h + .3, face: Math.PI / 2, label: 'Train with Alder', talk: visitDojo }],
};
