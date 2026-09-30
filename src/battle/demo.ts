// A move's preview: a real battle, played by a scripted hand against practice dummies, so you can watch a special or
// a class trick do its thing (on unlocking it, and again from the Skills menu). Nothing here touches your save.
import type { Audio } from '../audio';
import { GEAR, MONSTERS, zoneById, type Style } from '../data';
import type { Action, Input } from '../input';
import { newState, type SaveState } from '../state';
import { MOVESETS, handlingStep, skillAt, type Trick } from '../weapons';
import { Battle } from './battle';
import type { Enemy } from './types';

/** What a preview shows: the special at the rank a level brings, or the class's trick. */
export type DemoMove = { kind: 'skill'; style: Style; lv: number } | { kind: 'trick'; style: Style; trick: Trick };

/** The move a handling level unlocks, if it's one worth watching (speed steps aren't). */
export function moveAt(style: Style, lv: number): DemoMove | null {
  const step = handlingStep(lv);
  if (step === 'skill') return { kind: 'skill', style, lv };
  if (step === 'trick') return { kind: 'trick', style, trick: MOVESETS[style].trick };
  return null;
}

/** A plain weapon of each class, for when you're not holding one of that class. */
const DEMO_WEAPON: Record<Style, string> = { sword: 'stonesword', hammer: 'stonehammer', whip: 'jellywhip', wand: 'jellywand' };

/** Pretend presses: the script queues them, and the battle takes them like yours. */
class ScriptInput {
  private queued = new Set<Action>();
  move = { x: 0, y: 0 };
  press(a: Action) {
    this.queued.add(a);
  }
  axis() {
    return this.move;
  }
  consume(a: Action) {
    return this.queued.delete(a);
  }
  isHeld() {
    return false;
  }
  flush() {
    this.queued.clear();
  }
  reset() {
    this.flush();
  }
}

/** How long to watch after the move lands before it starts over, and how long to wait for a chance at most. */
const AFTER = 1.4;
const GIVE_UP = 6;

export class MoveDemo {
  battle!: Battle;
  private input = new ScriptInput();
  private t = 0;
  /** When the move was done (the loop ends a moment after), or -1. */
  private did = -1;
  private phase = 0;
  /** Where each dummy stands until it acts. */
  private spots: { x: number; y: number }[] = [];

  constructor(readonly move: DemoMove, private base: SaveState, private audio: Audio) {
    this.restart();
  }

  /** A fresh go: you in the middle, the dummies where this move wants them. */
  restart() {
    const m = this.move, style = m.style;
    const save = newState();
    const own = GEAR[this.base.equip.weapon];
    save.equip.weapon = own?.style === style ? own.id : DEMO_WEAPON[style];
    save.equip.armor = this.base.equip.armor;
    save.lv = 5;
    save.mastery[style].lv = m.kind === 'skill' ? m.lv : Math.max(3, this.base.mastery[style].lv);
    save.hp = 1e6;
    const foes = this.foes();
    this.input = new ScriptInput();
    this.battle = new Battle({ zone: zoneById('meadow'), foes: foes.map((f) => ({ kind: f.kind, lv: 1, golden: false })), boss: false }, save, this.input as unknown as Input, this.audio, () => {});
    const b = this.battle;
    b.intro = 0;
    // Practice dummies: they never fall (so no victory fanfare), and stand where the move shows best.
    this.spots = foes.map((f) => ({ x: b.p.x + f.x, y: b.p.y + f.y }));
    b.enemies.forEach((e, i) => {
      e.hp = e.maxHp = 1e6;
      e.x = this.spots[i].x;
      e.y = this.spots[i].y;
      // Get on with it: a Hopbun winds up its charge soon, rather than wandering first.
      if (e.kind === 'bunny') e.t = 0.35;
    });
    b.p.face = 0;
    this.t = 0;
    this.did = -1;
    this.phase = 0;
  }

  /** Where the dummies stand (relative to you), for each move. */
  private foes(): { kind: keyof typeof MONSTERS; x: number; y: number }[] {
    const m = this.move, ring = (r: number) => [0, 2.1, 4.2].map((a) => ({ kind: 'slime' as const, x: Math.cos(a) * r, y: Math.sin(a) * r }));
    if (m.kind === 'skill') {
      switch (MOVESETS[m.style].skill) {
        case 'spin': return ring(70);
        case 'whirl': return ring(65);
        case 'quake': return [-0.4, 0, 0.4].map((a) => ({ kind: 'slime', x: Math.cos(a) * 105, y: Math.sin(a) * 105 }));
        case 'scatter': return [-0.3, 0, 0.3].map((a) => ({ kind: 'slime', x: Math.cos(a) * 170, y: Math.sin(a) * 170 }));
      }
    }
    switch (m.kind === 'trick' ? m.trick : 'riposte') {
      case 'snare': return [{ kind: 'slime', x: 105, y: 0 }];
      case 'stagger': return [{ kind: 'bunny', x: 75, y: 0 }];
      default: return [{ kind: 'bunny', x: 130, y: 0 }];
    }
  }

  /** The dummy nearest you, and turning to face it. */
  private aim(): Enemy | null {
    const b = this.battle, p = b.p;
    const e = b.enemies.filter((x) => !x.dead).sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y))[0];
    if (e && !p.swing && p.whirlT <= 0) p.face = Math.atan2(e.y - p.y, e.x - p.x);
    return e ?? null;
  }

  update(dt: number) {
    this.t += dt;
    const b = this.battle, p = b.p, inp = this.input;
    inp.move = { x: 0, y: 0 };
    this.script(b, inp);
    b.update(dt);
    // You can't be hurt watching.
    p.hp = b.stats.maxHp;
    if ((this.did >= 0 && this.t - this.did > AFTER) || (this.did < 0 && this.t > GIVE_UP)) this.restart();
  }

  /** The scripted hand: waits for the right moment, then presses what you'd press. */
  private script(b: Battle, inp: ScriptInput) {
    const m = this.move, p = b.p, e = this.aim();
    const done = () => {
      this.did = this.t;
      this.phase = 99;
    };
    if (m.kind === 'skill') {
      // The whip's whirl carries you through them as it spins.
      if (this.phase === 99 && p.whirlT > 0) inp.move = { x: 1, y: 0 };
      if (this.phase === 99) return;
      // Hold the dummies still until the special goes off.
      for (const x of b.enemies) x.stun = Math.max(x.stun, 0.2);
      if (this.t > 0.6 && p.skillCd <= 0) {
        inp.press('skill');
        done();
      }
      return;
    }
    if (this.phase === 99 || !e) return;
    // Until the move, a wandering dummy stays on its spot (a Hopbun still winds up and charges from there).
    if (this.phase === 0) b.enemies.forEach((x, i) => {
      if (x.state === 'idle') {
        x.x = this.spots[i].x;
        x.y = this.spots[i].y;
      }
    });
    const toward = { x: Math.cos(p.face), y: Math.sin(p.face) };
    switch (m.trick) {
      case 'riposte':
      case 'blink': {
        // Wait for its charge, then dodge as it arrives: Blades dodge right through it (readying a Riposte), Magic
        // blinks aside out of its path. Then answer at once.
        const close = Math.hypot(e.x - p.x, e.y - p.y) - e.r - p.r;
        if (this.phase === 0 && e.state === 'charge' && close < 45) {
          inp.move = m.trick === 'riposte' ? toward : { x: -toward.y, y: toward.x };
          inp.press('dodge');
          this.phase = 1;
        } else if (this.phase === 1 && p.dodgeT <= 0) {
          if (m.trick === 'riposte' && p.riposte > 0) {
            // It shot past you: step in, and strike while the Riposte is ready.
            if (close > 26) inp.move = toward;
            else if (b.canStrike) {
              inp.press('attack');
              done();
            }
          } else if (m.trick === 'blink' && e.state !== 'charge' && b.canStrike) {
            inp.press('attack');
            done();
          }
        }
        return;
      }
      case 'stagger':
        // Slam it just as it winds up.
        if (e.windup > 0.12 && b.canStrike) {
          inp.press('attack');
          done();
        }
        return;
      case 'snare':
        // A crack at the very tip of the whip.
        if (this.t > 0.6 && b.canStrike) {
          e.stun = 0;
          inp.press('attack');
          done();
        } else e.stun = Math.max(e.stun, 0.2);
        return;
    }
  }
}
