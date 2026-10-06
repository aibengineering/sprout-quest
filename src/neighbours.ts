// Returning together comes before a new roof. Existing buildings count as a settled neighbour.
import { FOX_SIGHT, FOX_DEN, foxTrusted } from './fox';
import { zoneById } from './data';
import type { SaveState } from './state';
export type NeighbourId = 'pip' | 'alder' | 'rook' | 'moss';
export const NEIGHBOUR_ORDER: NeighbourId[] = ['pip', 'alder', 'rook', 'moss'];
export const NEIGHBOURS = {
  pip: { name: 'Pip', icon: '⛏️', place: 'the Old Quarry tunnel in Echo Cavern', at: { x: zoneById('cave').x0 + 5.5, y: 33.8 }, town: { x: 36.5, y: 8.8 },
    lead: 'Hear that tapping under the Old Quarry? Pip’s found a promising tunnel in Echo Cavern. Go and have a look.',
    meet: ['I’m Pip! There’s a lovely rock through here. I can feel it in my whiskers.', 'This big one needs ten clean hits together. Miss, and the seam settles. You swing; I’ll count.'],
    arrived: 'A tunnel to Sowerby! Clover’s saved me a chair. Never had one of those underground.' },
  // Legacy construction key retained so old dojo levels and queued jobs survive. She never escorts into town.
  alder: { name: 'Masked Fox', icon: '🦊', place: 'the hidden glimmer trail', at: FOX_SIGHT, town: FOX_DEN,
    lead: 'There’s a little trail above Glimmer Hollow. Follow the glimmer dust. Whoever lives there seems to prefer her own company.',
    meet: ['Keep up, little boots.'], arrived: 'This clearing will do. Keep it quiet.' },
  rook: { name: 'Rook', icon: '🏹', place: 'the western shelter on Ember Peak', at: { x: zoneById('peak').x0 + 7.5, y: 29.8 }, town: { x: 33, y: 10.3 },
    lead: 'A traveller’s sheltering on Ember Peak, below the dragon’s ridge. Burnt coat, splendid manners. Says his name’s Rook.',
    meet: ['Rook. Pleasure! Followed the Emberwyrm up the Peak. Magnificent creature! It took exception.', 'This leg’s still protesting. Back home, collectors pay handsomely for a rare specimen.', 'Heard Sowerby has a builder. Walk me there?'],
    arrived: 'Clover’s hospitality! Bram’s craftsmanship! What a splendid base. And all those fine specimens just down the road.' },
  moss: { name: 'Moss', icon: '🥖', place: 'the ridge stop on East Road', at: { x: zoneById('meadow').x0 + 31.5, y: 4.8 }, town: { x: 29, y: 11.8 },
    lead: 'Clover heard Moss is waiting beside the East Road ridge. Tell him there’s room by her oven.',
    meet: ['I’m Moss. Used to bake for people passing through. Since the road closed, nobody’s come.', 'Clover’s lending me her oven? I’d like that. I’ve packed enough buns for the walk. Lead on.'],
    arrived: 'Clover’s saved me a place by the oven. Bram says we can manage a roof. Think I’ll unpack this time.' },
} as const;
export const neighbourBuilding = (s: SaveState, id: NeighbourId) => id === 'alder' ? s.build.training : Math.max(s.homes?.[id] ?? 0, id === 'pip' ? s.build.cottage : 0);
export const neighbourReturned = (s: SaveState, id: NeighbourId) => id === 'alder' ? foxTrusted(s) : neighbourBuilding(s, id) > 0 || (s.flags.includes(`${id}:returned`) || (s.stories[`journey-${id}`] ?? 0) >= 2);
export function neighbourAvailable(s: SaveState, id: NeighbourId) {
  if (!s.flags.includes('bram:hut') || !s.build.sawmill || neighbourReturned(s, id)) return false;
  if (id === 'alder') return s.bosses.includes('echoqueen');
  if (id === 'pip') return s.flags.includes('granny:extension');
  if (id === 'rook') return neighbourBuilding(s, 'pip') > 0 && s.bosses.includes('dragon');
  return neighbourBuilding(s, 'pip') > 0 && s.flags.includes('granny:extension');
}
