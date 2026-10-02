// Quest presentation is separate from battle actions to keep story registration free of runtime cycles.
import { huntDef } from '../../hunts';
import { residentDoor } from '../../villageLayout';
import { G } from '../context';
import type { Story } from '../stories';
export const HUNT_STORY: Story = { id: 'hunts', title: 'Rook’s Commission', icon: '🏹', available: () => !!G.save.hunting?.active, started: () => !!G.save.hunting?.active, objs: [], cast: () => [], steps: [{
      id: 'commission', get label() { const a = G.save.hunting?.active; return a ? a.status === 'defeated' ? 'Bring Rook the completed commission' : `Hunt ${huntDef(a.id)!.name} · Lv ${a.lv}` : 'Ask Rook about a commission'; },
      target: () => { const a = G.save.hunting?.active; return a?.status === 'tracking' ? huntDef(a.id)!.at : residentDoor('rook'); }, done: () => false,
    }] };
