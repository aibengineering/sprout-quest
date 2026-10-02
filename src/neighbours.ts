// Returning together comes before a new roof. Existing buildings count as a settled neighbour.
import { zoneById } from './data';
import type { SaveState } from './state';
export type NeighbourId = 'pip' | 'alder' | 'rook' | 'moss';
export const NEIGHBOUR_ORDER: NeighbourId[] = ['pip', 'alder', 'rook', 'moss'];
export const NEIGHBOURS = {
  pip: { name: 'Pip', icon: '⛏️', place: 'the Old Quarry tunnel in Echo Cavern', at: { x: zoneById('cave').x0 + 12.5, y: 20.8 }, town: { x: 36.5, y: 8.8 },
    lead: 'Hear that tapping under the Old Quarry? Pip’s found a promising tunnel in Echo Cavern. Go and have a look.',
    meet: ['I’m Pip! There’s a lovely rock through here. I can feel it in my whiskers.', 'This big one needs ten clean hits together. Miss, and the seam settles. You swing; I’ll count.'],
    arrived: 'A tunnel to Sowerby! Clover’s saved me a chair. Never had one of those underground.' },
  alder: { name: 'Alder', icon: '🥋', place: 'the Woods road', at: { x: zoneById('woods').x0 + 13.5, y: 12.3 }, town: { x: 42.45, y: 11.3 },
    lead: 'Alder’s checking the road through Whisper Woods. Find him, and ask if he’ll come back with you.',
    meet: ['I’m Alder. Used to escort people along this road. Fewer travellers now. More Woolves.', 'Heard you carried Bram home. I could help with the footwork. Show me where he’s settled?'],
    arrived: 'There’s room here. Bram can build a dojo; I’ll set the lessons. People ought to have somewhere to practise before taking that road.' },
  rook: { name: 'Rook', icon: '🏹', place: 'the shelter in Glimmer Hollow', at: { x: zoneById('hollow').x0 + 5.5, y: 12.3 }, town: { x: 33, y: 10.3 },
    lead: 'A traveller’s sheltering in Glimmer Hollow. Burnt coat, splendid manners. Says his name’s Rook.',
    meet: ['Rook. Pleasure! Followed the Emberwyrm up the Peak. Magnificent creature! It took exception.', 'This leg’s still protesting. Back home, collectors pay handsomely for a rare specimen.', 'Heard Sowerby has a builder. Walk me there?'],
    arrived: 'Clover’s hospitality! Bram’s craftsmanship! What a splendid base. And all those fine specimens just down the road.' },
  moss: { name: 'Moss', icon: '🥖', place: 'the Meadow road', at: { x: zoneById('meadow').x0 + 31.5, y: 16.8 }, town: { x: 29, y: 11.8 },
    lead: 'Clover heard Moss is waiting beside the east Meadow road. Tell him there’s room by her oven.',
    meet: ['I’m Moss. Used to bake for people passing through. Since the road closed, nobody’s come.', 'Clover’s lending me her oven? I’d like that. I’ve packed enough buns for the walk. Lead on.'],
    arrived: 'Clover’s saved me a place by the oven. Bram says we can manage a roof. Think I’ll unpack this time.' },
} as const;
export const neighbourBuilding = (s: SaveState, id: NeighbourId) => id === 'alder' ? s.build.training : Math.max(s.homes?.[id] ?? 0, id === 'pip' ? s.build.cottage : 0);
export const neighbourReturned = (s: SaveState, id: NeighbourId) => neighbourBuilding(s, id) > 0 || (s.flags.includes(`${id}:returned`) || (s.stories[`journey-${id}`] ?? 0) >= 2);
export function neighbourAvailable(s: SaveState, id: NeighbourId) {
  if (!s.flags.includes('bram:hut') || !s.build.sawmill || neighbourReturned(s, id)) return false;
  if (id === 'pip' || id === 'alder') return s.flags.includes('granny:extension');
  if (id === 'rook') return neighbourBuilding(s, 'pip') > 0 && s.bosses.includes('echoqueen');
  return neighbourBuilding(s, 'pip') > 0 && s.flags.includes('granny:extension');
}
