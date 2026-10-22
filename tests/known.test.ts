import { describe, expect, test } from 'bun:test';
import { NEIGHBOURS } from '../src/neighbours';
import { knows, nameOf } from '../src/known';
import { LANDMARK_SIGNS, ROUTE_GUIDES } from '../src/mapDesign';
import { SHORTCUTS } from '../src/shortcuts';
import { UNLOCKS } from '../src/unlocks';
import { newState } from '../src/state';

describe('who you know by name', () => {
  test('a new adventure knows nobody', () => {
    const s = newState();
    for (const who of ['oswin', 'poppy', 'bram', 'pip', 'rook', 'moss'] as const) expect(knows(s, who)).toBe(false);
  });

  test('each name arrives with its introduction', () => {
    const s = newState();
    s.flags.push('village');
    expect(knows(s, 'oswin')).toBe(true);
    // Saved, but she hasn't said her name until the slimes are beaten.
    s.stories.poppy = 1;
    expect(knows(s, 'poppy')).toBe(false);
    s.stories.poppy = 2;
    expect(knows(s, 'poppy')).toBe(true);
    // Granny names Bram when she hands you the pie.
    s.flags.push('bram:pie');
    expect(knows(s, 'bram')).toBe(true);
    s.flags.push('pip:seam:met');
    expect(knows(s, 'pip')).toBe(true);
    s.flags.push('rook:journey:met');
    expect(knows(s, 'rook')).toBe(true);
    expect(knows(s, 'moss')).toBe(false);
  });

  test('older saves with a built home know its resident', () => {
    const s = newState();
    s.build.cottage = 1;
    s.homes.moss = 1;
    expect(knows(s, 'pip')).toBe(true);
    expect(knows(s, 'moss')).toBe(true);
  });

  test('newcomers are described until you meet them', () => {
    const s = newState();
    expect(nameOf(s, 'pip')).toBe('the miner');
    expect(nameOf(s, 'moss')).toBe('the baker');
    s.flags.push('moss:journey:met');
    expect(nameOf(s, 'moss')).toBe('Moss');
  });
});

describe('text you can read before meeting anyone', () => {
  const CAST = /Oswin|Granny|Clover|Poppy|Floppers|Bram|Pip|Rook|Moss/;
  test('signs, crossings and the Slime King’s plot card name nobody', () => {
    const early = [
      ...Object.values(ROUTE_GUIDES), ...LANDMARK_SIGNS.map((p) => p.text),
      ...SHORTCUTS.flatMap((p) => [p.name, p.benefit]),
      UNLOCKS.find((u) => u.id === 'plots')!.text,
    ];
    for (const text of early) expect(text).not.toMatch(CAST);
  });
});

test("Bram's tips point you to a newcomer without naming them: you learn their name when you meet them", () => {
  for (const id of ['pip', 'rook', 'moss'] as const) expect({ id, named: NEIGHBOURS[id].lead.includes(NEIGHBOURS[id].name) }).toEqual({ id, named: false });
});
