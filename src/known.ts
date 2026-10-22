// Who the player knows by name: met in person, or introduced by someone who does. Until then, text describes them
// instead of naming them, so nothing introduces a character before their story does.
import { NEIGHBOURS, neighbourReturned } from './neighbours';
import type { SaveState } from './state';

export type Who = 'oswin' | 'poppy' | 'bram' | 'pip' | 'rook' | 'moss';

export function knows(s: SaveState, who: Who): boolean {
  const flag = (f: string) => s.flags.includes(f);
  switch (who) {
    // He greets you as you walk into Sowerby.
    case 'oswin': return flag('village');
    // She tells you her name once you've saved her from the slimes.
    case 'poppy': return (s.stories.poppy ?? 0) >= 2;
    // Granny names him when she asks you to take him a pie.
    case 'bram': return flag('bram:pie') || (s.stories.bram ?? 0) >= 1;
    // Pip can introduce himself in his tunnel before he's ready to walk home.
    case 'pip': return flag('pip:seam:met') || flag('pip:journey:met') || neighbourReturned(s, 'pip');
    case 'rook': case 'moss': return flag(`${who}:journey:met`) || neighbourReturned(s, who);
  }
}

/** How text refers to a newcomer: by name once you know them, by what you can see of them before. */
const STRANGERS = { pip: 'the miner', rook: 'the traveller', moss: 'the baker' } as const;
export const nameOf = (s: SaveState, id: keyof typeof STRANGERS) => (knows(s, id) ? NEIGHBOURS[id].name : STRANGERS[id]);
