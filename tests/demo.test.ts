import { describe, expect, test } from 'bun:test';
import type { Audio } from '../src/audio';
import { MoveDemo, moveAt } from '../src/battle/demo';
import type { Style } from '../src/data';
import { newState } from '../src/state';
import { MASTERY_MAX } from '../src/rules';

const STYLES: Style[] = ['sword', 'hammer', 'whip', 'wand'];
const quiet = { play: () => {} } as unknown as Audio;

/** Plays a preview for up to `secs` seconds; true if the move it shows actually landed. */
function landed(style: Style, lv: number, secs = 6) {
  const move = moveAt(style, lv)!;
  const d = new MoveDemo(move, newState(), quiet);
  // A Blink counts once a bolt lands after it (its cooldown can be over by then).
  let blinked = false;
  for (let t = 0; t < secs; t += 1 / 60) {
    d.update(1 / 60);
    const b = d.battle;
    blinked ||= b.p.dodgeCd > 0;
    if (move.kind === 'skill' && b.p.skillCd > 0 && b.hits > 0) return true;
    if (move.kind === 'trick') {
      const n = { riposte: b.ripostes, stagger: b.staggers, snare: b.snares, blink: blinked && b.hits > 0 ? 1 : 0 }[move.trick];
      if (n > 0) return true;
    }
  }
  return false;
}

describe('move previews', () => {
  test('every special rank and class trick has a preview, and speed steps have none', () => {
    for (const style of STYLES) {
      const moves = Array.from({ length: MASTERY_MAX }, (_, i) => moveAt(style, i + 1)).filter(Boolean);
      // Four special ranks and the trick.
      expect({ style, n: moves.length }).toEqual({ style, n: 5 });
    }
  });

  test('the scripted hand lands each move it shows, for every class and rank', () => {
    for (const style of STYLES) for (let lv = 1; lv <= MASTERY_MAX; lv++) {
      if (!moveAt(style, lv)) continue;
      expect({ style, lv, landed: landed(style, lv) }).toEqual({ style, lv, landed: true });
    }
  });

  test("a preview never touches the save it's shown from", () => {
    const save = newState();
    const before = JSON.stringify(save);
    const d = new MoveDemo(moveAt('sword', 3)!, save, quiet);
    for (let i = 0; i < 600; i++) d.update(1 / 60);
    expect(JSON.stringify(save)).toBe(before);
  });
});
