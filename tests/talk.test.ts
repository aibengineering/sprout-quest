import { describe, expect, test } from 'bun:test';
import { Overworld } from '../src/overworld';
import { newState } from '../src/state';
import { World } from '../src/world';

describe('talking to people on the map', () => {
  // In the village, on open ground, with nothing else close by.
  const world = new World();
  const setUp = (face: number) => {
    const over = new Overworld(world, newState());
    over.teleport(24.5, 16.5);
    over.face = face;
    over.actors.add({ id: 'npc', look: { kind: 'walker', name: 'poppy' }, x: 25.5, y: 16.5, label: 'Talk', talk: () => {} });
    return over;
  };

  test('you can talk to someone you are facing', () => {
    expect(setUp(0).nearbyObject()?.id).toBe('npc');
    expect(setUp(0.8).nearbyObject()?.id).toBe('npc');
  });

  test("someone beside or behind you (like a follower) doesn't take over the action button", () => {
    expect(setUp(Math.PI).nearbyObject()?.id).not.toBe('npc');
    expect(setUp(Math.PI / 2).nearbyObject()?.id).not.toBe('npc');
  });
});
