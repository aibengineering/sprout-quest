// Returning together comes before a new roof. Existing buildings count as a settled neighbour.
import { zoneById } from './data';
import type { SaveState } from './state';
export type NeighbourId = 'pip' | 'alder' | 'hazel' | 'moss';
export const NEIGHBOUR_ORDER: NeighbourId[] = ['pip', 'alder', 'hazel', 'moss'];
export const NEIGHBOURS = {
  pip: { name: 'Pip', icon: '⛏️', at: { x: zoneById('woods').x0 + 5.5, y: 12.3 }, town: { x: 36.5, y: 8.8 },
    lead: 'Pip has surfaced beside the west road in Whisper Woods. Bring him back and I’ll measure a cottage.',
    meet: ['Oof! I’m Pip. I dig. Mostly rocks. Took a wrong turn under the Woods.', 'I’ve always had downstairs. Never had anywhere to put a doorstep. Could I walk back with you?'],
    arrived: 'So this is Sowerby! Clover says I can stay while Bram works out a roof. A proper roof!' },
  alder: { name: 'Alder', icon: '🥋', at: { x: zoneById('woods').x0 + 13.5, y: 12.3 }, town: { x: 42.45, y: 11.3 },
    lead: 'Alder’s checking the road through Whisper Woods. Find him, and ask if he’ll come back with you.',
    meet: ['I’m Alder. Used to escort people along this road. Fewer travellers now. More Woolves.', 'Heard you carried Bram home. I could help with the footwork. Show me where he’s settled?'],
    arrived: 'There’s room here. Bram can build a dojo; I’ll set the lessons. People ought to have somewhere to practise before taking that road.' },
  hazel: { name: 'Hazel', icon: '🌿', at: { x: zoneById('meadow').x0 + 22.5, y: 12.3 }, town: { x: 33, y: 10.3 },
    lead: 'Pip saw Hazel with a basket of cuttings by the Meadow road. Poppy’s saved a bed for them.',
    meet: ['I’m Hazel. These cuttings have come a long way in my coat pocket.', 'Pip mentioned a garden in Sowerby. I’d like to see it. Can we carry these back together?'],
    arrived: 'Poppy’s already chosen a bed for the fern. Clover’s put the kettle on. I think we can take root here.' },
  moss: { name: 'Moss', icon: '🥖', at: { x: zoneById('meadow').x0 + 31.5, y: 16.8 }, town: { x: 29, y: 11.8 },
    lead: 'Clover heard Moss is waiting beside the east Meadow road. Tell him there’s room by her oven.',
    meet: ['I’m Moss. Used to bake for people passing through. Since the road closed, nobody’s come.', 'Clover’s lending me her oven? I’d like that. I’ve packed enough buns for the walk. Lead on.'],
    arrived: 'Clover’s saved me a place by the oven. Bram says we can manage a roof. Think I’ll unpack this time.' },
} as const;
export const neighbourBuilding = (s: SaveState, id: NeighbourId) => id === 'alder' ? s.build.training : Math.max(s.homes?.[id] ?? 0, id === 'pip' ? s.build.cottage : 0);
export const neighbourReturned = (s: SaveState, id: NeighbourId) => neighbourBuilding(s, id) > 0 || (s.flags.includes(`${id}:returned`) || (s.stories[`journey-${id}`] ?? 0) >= 2);
export function neighbourAvailable(s: SaveState, id: NeighbourId) {
  if (!s.flags.includes('bram:hut') || !s.build.sawmill || neighbourReturned(s, id)) return false;
  if (id === 'pip' || id === 'alder') return s.flags.includes('granny:extension');
  if (id === 'hazel') return neighbourBuilding(s, 'pip') > 0 && s.build.garden > 0;
  return neighbourBuilding(s, 'hazel') > 0 && s.flags.includes('granny:extension');
}
